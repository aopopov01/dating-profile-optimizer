# Backup and Disaster Recovery Configuration for Mobile Applications

# S3 Backup Buckets
resource "aws_s3_bucket" "backup_primary" {
  bucket = "${var.environment}-mobile-apps-backup-${data.aws_caller_identity.current.account_id}"
  
  tags = merge(var.tags, {
    Name = "${var.environment}-mobile-apps-backup"
    Purpose = "backup-primary"
  })
}

resource "aws_s3_bucket" "backup_cross_region" {
  bucket   = "${var.environment}-mobile-apps-backup-dr-${data.aws_caller_identity.current.account_id}"
  provider = aws.backup_region
  
  tags = merge(var.tags, {
    Name = "${var.environment}-mobile-apps-backup-dr"
    Purpose = "backup-cross-region"
  })
}

# S3 Bucket Configuration
resource "aws_s3_bucket_versioning" "backup_primary" {
  bucket = aws_s3_bucket.backup_primary.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "backup_cross_region" {
  bucket   = aws_s3_bucket.backup_cross_region.id
  provider = aws.backup_region
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup_primary" {
  bucket = aws_s3_bucket.backup_primary.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.backup.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup_cross_region" {
  bucket   = aws_s3_bucket.backup_cross_region.id
  provider = aws.backup_region

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.backup_cross_region.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# S3 Cross-Region Replication
resource "aws_s3_bucket_replication_configuration" "backup_replication" {
  role   = aws_iam_role.s3_replication.arn
  bucket = aws_s3_bucket.backup_primary.id

  rule {
    id     = "backup-replication"
    status = "Enabled"

    delete_marker_replication {
      status = "Enabled"
    }

    filter {
      prefix = ""
    }

    destination {
      bucket        = aws_s3_bucket.backup_cross_region.arn
      storage_class = "STANDARD_IA"
      
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.backup_cross_region.arn
      }
    }
  }

  depends_on = [aws_s3_bucket_versioning.backup_primary]
}

# Lifecycle Management
resource "aws_s3_bucket_lifecycle_configuration" "backup_primary" {
  bucket = aws_s3_bucket.backup_primary.id

  rule {
    id     = "backup_lifecycle"
    status = "Enabled"

    expiration {
      days = var.backup_retention_days * 3  # Keep for 3x retention period
    }

    noncurrent_version_expiration {
      noncurrent_days = var.backup_retention_days
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# KMS Keys for Backup Encryption
resource "aws_kms_key" "backup" {
  description             = "KMS key for backup encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow backup services"
        Effect = "Allow"
        Principal = {
          Service = [
            "backup.amazonaws.com",
            "s3.amazonaws.com",
            "rds.amazonaws.com"
          ]
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-backup-kms-key"
  })
}

resource "aws_kms_key" "backup_cross_region" {
  provider                = aws.backup_region
  description             = "KMS key for cross-region backup encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "${var.environment}-backup-cross-region-kms-key"
  })
}

resource "aws_kms_alias" "backup" {
  name          = "alias/${var.environment}-mobile-apps-backup"
  target_key_id = aws_kms_key.backup.key_id
}

resource "aws_kms_alias" "backup_cross_region" {
  provider      = aws.backup_region
  name          = "alias/${var.environment}-mobile-apps-backup-dr"
  target_key_id = aws_kms_key.backup_cross_region.key_id
}

# AWS Backup Vault
resource "aws_backup_vault" "main" {
  name        = "${var.environment}-mobile-apps-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = merge(var.tags, {
    Name = "${var.environment}-mobile-apps-backup-vault"
  })
}

resource "aws_backup_vault" "cross_region" {
  provider    = aws.backup_region
  name        = "${var.environment}-mobile-apps-vault-dr"
  kms_key_arn = aws_kms_key.backup_cross_region.arn

  tags = merge(var.tags, {
    Name = "${var.environment}-mobile-apps-backup-vault-dr"
  })
}

# Backup Plans
resource "aws_backup_plan" "database_backup" {
  name = "${var.environment}-database-backup-plan"

  rule {
    rule_name         = "database_daily_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 * * ? *)"  # Daily at 2 AM UTC

    recovery_point_tags = merge(var.tags, {
      BackupType = "automated"
      Service    = "rds"
    })

    lifecycle {
      cold_storage_after = 30
      delete_after       = var.backup_retention_days
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.cross_region.arn
      
      lifecycle {
        cold_storage_after = 30
        delete_after       = var.backup_retention_days
      }
    }
  }

  rule {
    rule_name         = "database_weekly_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * SUN *)"  # Weekly on Sunday at 3 AM UTC

    recovery_point_tags = merge(var.tags, {
      BackupType = "weekly"
      Service    = "rds"
    })

    lifecycle {
      cold_storage_after = 30
      delete_after       = var.backup_retention_days * 4  # Keep weekly for 4x longer
    }
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-database-backup-plan"
  })
}

resource "aws_backup_plan" "volume_backup" {
  name = "${var.environment}-volume-backup-plan"

  rule {
    rule_name         = "volume_daily_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 1 * * ? *)"  # Daily at 1 AM UTC

    recovery_point_tags = merge(var.tags, {
      BackupType = "automated"
      Service    = "ebs"
    })

    lifecycle {
      cold_storage_after = 30
      delete_after       = var.backup_retention_days
    }
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-volume-backup-plan"
  })
}

# Backup Selection
resource "aws_backup_selection" "database_backup" {
  iam_role_arn = aws_iam_role.backup_service.arn
  name         = "${var.environment}-database-backup-selection"
  plan_id      = aws_backup_plan.database_backup.id

  resources = [
    aws_db_instance.main.arn
  ]

  dynamic "condition" {
    for_each = var.environment == "production" ? [1] : []
    content {
      string_equals {
        key   = "aws:ResourceTag/BackupEnabled"
        value = "true"
      }
    }
  }
}

resource "aws_backup_selection" "volume_backup" {
  iam_role_arn = aws_iam_role.backup_service.arn
  name         = "${var.environment}-volume-backup-selection"
  plan_id      = aws_backup_plan.volume_backup.id

  resources = ["*"]

  condition {
    string_equals {
      key   = "aws:ResourceTag/BackupEnabled"
      value = "true"
    }
  }

  condition {
    string_equals {
      key   = "aws:ResourceTag/Environment"
      value = var.environment
    }
  }
}

# IAM Roles for Backup
resource "aws_iam_role" "backup_service" {
  name = "${var.environment}-backup-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-backup-service-role"
  })
}

resource "aws_iam_role_policy_attachment" "backup_service_backup" {
  role       = aws_iam_role.backup_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_service_restore" {
  role       = aws_iam_role.backup_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

resource "aws_iam_role" "s3_replication" {
  name = "${var.environment}-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-s3-replication-role"
  })
}

resource "aws_iam_role_policy" "s3_replication" {
  name = "${var.environment}-s3-replication-policy"
  role = aws_iam_role.s3_replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.backup_primary.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.backup_primary.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.backup_cross_region.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [
          aws_kms_key.backup.arn,
          aws_kms_key.backup_cross_region.arn
        ]
      }
    ]
  })
}