#!/bin/bash

# PostgreSQL Full Backup Script for Dating Profile Optimizer
# Production-grade backup with compression, encryption, and verification

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../config/backup.conf"
LOG_FILE="/var/log/backup/db-full-backup.log"

# Source configuration
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
else
    echo "ERROR: Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Default configuration if not set in config file
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/database}"
S3_BUCKET="${S3_BUCKET:-dating-optimizer-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-9}"
ENCRYPT_BACKUPS="${ENCRYPT_BACKUPS:-true}"
VERIFY_BACKUPS="${VERIFY_BACKUPS:-true}"
PARALLEL_JOBS="${PARALLEL_JOBS:-4}"

# Database connection parameters
DB_HOST="${DB_HOST:-postgres-master}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-dating_optimizer}"
DB_USER="${DB_USER:-postgres}"
PGPASSWORD="${DB_PASSWORD}"
export PGPASSWORD

# Backup metadata
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PREFIX="dating_optimizer_full"
BACKUP_FILENAME="${BACKUP_PREFIX}_${BACKUP_DATE}.backup"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
METADATA_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}_${BACKUP_DATE}.metadata"

# Logging function
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Cleanup function
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log "ERROR" "Backup failed with exit code: $exit_code"
        # Clean up partial backup files
        [[ -f "$BACKUP_PATH" ]] && rm -f "$BACKUP_PATH"
        [[ -f "$METADATA_FILE" ]] && rm -f "$METADATA_FILE"
    fi
    exit $exit_code
}

trap cleanup EXIT

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log "INFO" "Starting full backup of $DB_NAME database"
log "INFO" "Backup file: $BACKUP_PATH"

# Check database connectivity
log "INFO" "Checking database connectivity..."
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    error_exit "Cannot connect to database $DB_NAME at $DB_HOST:$DB_PORT"
fi

# Get database size for monitoring
DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
log "INFO" "Database size: $DB_SIZE"

# Get database statistics
DB_STATS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT 
    COUNT(*) as table_count,
    (SELECT COUNT(*) FROM information_schema.columns) as column_count,
    (SELECT COUNT(*) FROM pg_stat_user_tables) as user_tables
FROM information_schema.tables 
WHERE table_schema = 'public';")

log "INFO" "Database statistics: $DB_STATS"

# Create backup metadata
cat > "$METADATA_FILE" << EOF
{
  "backup_type": "full",
  "database_name": "$DB_NAME",
  "backup_date": "$BACKUP_DATE",
  "database_size": "$DB_SIZE",
  "database_host": "$DB_HOST",
  "database_port": "$DB_PORT",
  "backup_filename": "$BACKUP_FILENAME",
  "compression_level": "$COMPRESSION_LEVEL",
  "encryption_enabled": "$ENCRYPT_BACKUPS",
  "backup_command": "pg_dump",
  "backup_format": "custom",
  "postgresql_version": "$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" | xargs)",
  "backup_start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Start backup process
log "INFO" "Starting pg_dump with custom format and compression level $COMPRESSION_LEVEL"

BACKUP_START_TIME=$(date +%s)

# Execute pg_dump with comprehensive options
pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --format=custom \
    --compress="$COMPRESSION_LEVEL" \
    --verbose \
    --no-password \
    --no-privileges \
    --no-tablespaces \
    --jobs="$PARALLEL_JOBS" \
    --file="$BACKUP_PATH" \
    2>&1 | tee -a "$LOG_FILE"

BACKUP_END_TIME=$(date +%s)
BACKUP_DURATION=$((BACKUP_END_TIME - BACKUP_START_TIME))

# Check if backup was successful
if [[ ! -f "$BACKUP_PATH" ]]; then
    error_exit "Backup file was not created: $BACKUP_PATH"
fi

# Get backup file size
BACKUP_SIZE=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH" 2>/dev/null)
BACKUP_SIZE_HUMAN=$(numfmt --to=iec-i --suffix=B "$BACKUP_SIZE")

log "INFO" "Backup completed in ${BACKUP_DURATION} seconds"
log "INFO" "Backup file size: $BACKUP_SIZE_HUMAN"

# Update metadata with completion info
jq --arg end_time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   --arg duration "$BACKUP_DURATION" \
   --arg file_size "$BACKUP_SIZE" \
   --arg file_size_human "$BACKUP_SIZE_HUMAN" \
   '. + {
     "backup_end_time": $end_time,
     "backup_duration_seconds": ($duration | tonumber),
     "backup_file_size_bytes": ($file_size | tonumber),
     "backup_file_size_human": $file_size_human,
     "backup_status": "completed"
   }' "$METADATA_FILE" > "${METADATA_FILE}.tmp" && mv "${METADATA_FILE}.tmp" "$METADATA_FILE"

# Verify backup integrity
if [[ "$VERIFY_BACKUPS" == "true" ]]; then
    log "INFO" "Verifying backup integrity..."
    
    # Use pg_restore to verify the backup file
    if pg_restore --list "$BACKUP_PATH" >/dev/null 2>&1; then
        log "INFO" "Backup integrity verification passed"
        jq '. + {"verification_status": "passed"}' "$METADATA_FILE" > "${METADATA_FILE}.tmp" && mv "${METADATA_FILE}.tmp" "$METADATA_FILE"
    else
        error_exit "Backup integrity verification failed"
    fi
fi

# Encrypt backup if enabled
if [[ "$ENCRYPT_BACKUPS" == "true" ]]; then
    log "INFO" "Encrypting backup file..."
    
    # Use AWS KMS or GPG for encryption
    if command -v aws >/dev/null 2>&1 && [[ -n "${AWS_KMS_KEY_ID:-}" ]]; then
        # Encrypt using AWS KMS
        aws kms encrypt \
            --key-id "$AWS_KMS_KEY_ID" \
            --plaintext "fileb://$BACKUP_PATH" \
            --output text \
            --query CiphertextBlob | base64 -d > "${BACKUP_PATH}.encrypted"
        
        # Replace original with encrypted version
        mv "${BACKUP_PATH}.encrypted" "$BACKUP_PATH"
        
        jq '. + {"encryption_method": "aws_kms", "kms_key_id": "'$AWS_KMS_KEY_ID'"}' "$METADATA_FILE" > "${METADATA_FILE}.tmp" && mv "${METADATA_FILE}.tmp" "$METADATA_FILE"
    elif command -v gpg >/dev/null 2>&1 && [[ -n "${GPG_RECIPIENT:-}" ]]; then
        # Encrypt using GPG
        gpg --trust-model always --encrypt --recipient "$GPG_RECIPIENT" --output "${BACKUP_PATH}.gpg" "$BACKUP_PATH"
        mv "${BACKUP_PATH}.gpg" "$BACKUP_PATH"
        
        jq '. + {"encryption_method": "gpg", "gpg_recipient": "'$GPG_RECIPIENT'"}' "$METADATA_FILE" > "${METADATA_FILE}.tmp" && mv "${METADATA_FILE}.tmp" "$METADATA_FILE"
    else
        log "WARN" "Encryption requested but no encryption method available"
    fi
    
    log "INFO" "Backup encryption completed"
fi

# Upload to cloud storage
if [[ -n "${S3_BUCKET:-}" ]]; then
    log "INFO" "Uploading backup to S3: s3://$S3_BUCKET/database/"
    
    # Upload backup file
    aws s3 cp "$BACKUP_PATH" "s3://$S3_BUCKET/database/" \
        --storage-class STANDARD_IA \
        --metadata backup-date="$BACKUP_DATE",database-name="$DB_NAME",backup-type="full"
    
    # Upload metadata
    aws s3 cp "$METADATA_FILE" "s3://$S3_BUCKET/database/" \
        --content-type "application/json"
    
    log "INFO" "Upload to S3 completed"
fi

# Upload to secondary cloud storage if configured
if [[ -n "${GCS_BUCKET:-}" ]]; then
    log "INFO" "Uploading backup to GCS: gs://$GCS_BUCKET/database/"
    
    gsutil cp "$BACKUP_PATH" "gs://$GCS_BUCKET/database/"
    gsutil cp "$METADATA_FILE" "gs://$GCS_BUCKET/database/"
    
    log "INFO" "Upload to GCS completed"
fi

# Clean up old local backups
log "INFO" "Cleaning up old backups (keeping last $RETENTION_DAYS days)"
find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.backup" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.metadata" -type f -mtime +$RETENTION_DAYS -delete

# Clean up old cloud backups
if [[ -n "${S3_BUCKET:-}" ]]; then
    log "INFO" "Cleaning up old S3 backups"
    aws s3api list-objects-v2 --bucket "$S3_BUCKET" --prefix "database/${BACKUP_PREFIX}_" \
        --query "Contents[?LastModified<='$(date -d "$RETENTION_DAYS days ago" -u +%Y-%m-%dT%H:%M:%SZ)'].Key" \
        --output text | xargs -r -I {} aws s3 rm "s3://$S3_BUCKET/{}"
fi

# Send metrics to monitoring system
if command -v curl >/dev/null 2>&1 && [[ -n "${METRICS_ENDPOINT:-}" ]]; then
    log "INFO" "Sending backup metrics"
    
    curl -X POST "$METRICS_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{
            \"metric\": \"database_backup_completed\",
            \"value\": 1,
            \"tags\": {
                \"database\": \"$DB_NAME\",
                \"backup_type\": \"full\",
                \"duration_seconds\": $BACKUP_DURATION,
                \"file_size_bytes\": $BACKUP_SIZE
            },
            \"timestamp\": $(date +%s)
        }" || log "WARN" "Failed to send metrics"
fi

# Send notification
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"✅ Database backup completed successfully\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Database\", \"value\": \"$DB_NAME\", \"short\": true},
                    {\"title\": \"Duration\", \"value\": \"${BACKUP_DURATION}s\", \"short\": true},
                    {\"title\": \"Size\", \"value\": \"$BACKUP_SIZE_HUMAN\", \"short\": true},
                    {\"title\": \"File\", \"value\": \"$BACKUP_FILENAME\", \"short\": true}
                ]
            }]
        }" || log "WARN" "Failed to send Slack notification"
fi

log "INFO" "Full backup process completed successfully"

# Output final summary
echo "Backup Summary:"
echo "  Database: $DB_NAME"
echo "  File: $BACKUP_FILENAME"
echo "  Size: $BACKUP_SIZE_HUMAN"
echo "  Duration: ${BACKUP_DURATION} seconds"
echo "  Status: SUCCESS"

exit 0