# AWS Secrets Manager Configuration for Mobile Applications

# LinkedIn Headshot Generator Secrets
resource "aws_secretsmanager_secret" "linkedin_headshot_database" {
  name        = "${var.environment}/linkedin-headshot/database"
  description = "Database credentials for LinkedIn Headshot Generator"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-linkedin-headshot-database"
    Application = "linkedin-headshot-generator"
    Component   = "database"
  })
}

resource "aws_secretsmanager_secret_version" "linkedin_headshot_database" {
  secret_id = aws_secretsmanager_secret.linkedin_headshot_database.id
  secret_string = jsonencode({
    url      = "postgresql://${aws_db_instance.main.username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    database = aws_db_instance.main.db_name
    username = aws_db_instance.main.username
    password = random_password.db_password.result
  })
}

resource "aws_secretsmanager_secret" "linkedin_headshot_redis" {
  name        = "${var.environment}/linkedin-headshot/redis"
  description = "Redis credentials for LinkedIn Headshot Generator"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-linkedin-headshot-redis"
    Application = "linkedin-headshot-generator"
    Component   = "cache"
  })
}

resource "aws_secretsmanager_secret_version" "linkedin_headshot_redis" {
  secret_id = aws_secretsmanager_secret.linkedin_headshot_redis.id
  secret_string = jsonencode({
    url      = "redis://:${random_password.redis_auth.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
    host     = aws_elasticache_replication_group.main.primary_endpoint_address
    port     = aws_elasticache_replication_group.main.port
    password = random_password.redis_auth.result
  })
}

resource "aws_secretsmanager_secret" "linkedin_headshot_auth" {
  name        = "${var.environment}/linkedin-headshot/auth"
  description = "Authentication secrets for LinkedIn Headshot Generator"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-linkedin-headshot-auth"
    Application = "linkedin-headshot-generator"
    Component   = "authentication"
  })
}

resource "aws_secretsmanager_secret_version" "linkedin_headshot_auth" {
  secret_id = aws_secretsmanager_secret.linkedin_headshot_auth.id
  secret_string = jsonencode({
    jwt-secret = random_password.linkedin_jwt_secret.result
  })
}

resource "aws_secretsmanager_secret" "linkedin_headshot_ai" {
  name        = "${var.environment}/linkedin-headshot/ai"
  description = "AI service credentials for LinkedIn Headshot Generator"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-linkedin-headshot-ai"
    Application = "linkedin-headshot-generator"
    Component   = "ai-processing"
  })
}

resource "aws_secretsmanager_secret_version" "linkedin_headshot_ai" {
  secret_id = aws_secretsmanager_secret.linkedin_headshot_ai.id
  secret_string = jsonencode({
    replicate-api-token = var.replicate_api_token
  })
}

resource "aws_secretsmanager_secret" "linkedin_headshot_storage" {
  name        = "${var.environment}/linkedin-headshot/storage"
  description = "Storage credentials for LinkedIn Headshot Generator"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-linkedin-headshot-storage"
    Application = "linkedin-headshot-generator"
    Component   = "storage"
  })
}

resource "aws_secretsmanager_secret_version" "linkedin_headshot_storage" {
  secret_id = aws_secretsmanager_secret.linkedin_headshot_storage.id
  secret_string = jsonencode({
    cloudinary-cloud-name = var.cloudinary_cloud_name
    cloudinary-api-key    = var.cloudinary_api_key
    cloudinary-api-secret = var.cloudinary_api_secret
  })
}

# Dating Profile Optimizer Secrets
resource "aws_secretsmanager_secret" "dating_optimizer_database" {
  name        = "${var.environment}/dating-optimizer/database"
  description = "Database credentials for Dating Profile Optimizer"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-dating-optimizer-database"
    Application = "dating-profile-optimizer"
    Component   = "database"
  })
}

resource "aws_secretsmanager_secret_version" "dating_optimizer_database" {
  secret_id = aws_secretsmanager_secret.dating_optimizer_database.id
  secret_string = jsonencode({
    url      = "postgresql://${aws_db_instance.main.username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/dating_optimizer"
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    database = "dating_optimizer"
    username = aws_db_instance.main.username
    password = random_password.db_password.result
  })
}

resource "aws_secretsmanager_secret" "dating_optimizer_redis" {
  name        = "${var.environment}/dating-optimizer/redis"
  description = "Redis credentials for Dating Profile Optimizer"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-dating-optimizer-redis"
    Application = "dating-profile-optimizer"
    Component   = "cache"
  })
}

resource "aws_secretsmanager_secret_version" "dating_optimizer_redis" {
  secret_id = aws_secretsmanager_secret.dating_optimizer_redis.id
  secret_string = jsonencode({
    url      = "redis://:${random_password.redis_auth.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}/1"
    host     = aws_elasticache_replication_group.main.primary_endpoint_address
    port     = aws_elasticache_replication_group.main.port
    password = random_password.redis_auth.result
    database = "1"
  })
}

resource "aws_secretsmanager_secret" "dating_optimizer_auth" {
  name        = "${var.environment}/dating-optimizer/auth"
  description = "Authentication secrets for Dating Profile Optimizer"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-dating-optimizer-auth"
    Application = "dating-profile-optimizer"
    Component   = "authentication"
  })
}

resource "aws_secretsmanager_secret_version" "dating_optimizer_auth" {
  secret_id = aws_secretsmanager_secret.dating_optimizer_auth.id
  secret_string = jsonencode({
    jwt-secret = random_password.dating_jwt_secret.result
  })
}

resource "aws_secretsmanager_secret" "dating_optimizer_ai" {
  name        = "${var.environment}/dating-optimizer/ai"
  description = "AI service credentials for Dating Profile Optimizer"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-dating-optimizer-ai"
    Application = "dating-profile-optimizer"
    Component   = "ai-processing"
  })
}

resource "aws_secretsmanager_secret_version" "dating_optimizer_ai" {
  secret_id = aws_secretsmanager_secret.dating_optimizer_ai.id
  secret_string = jsonencode({
    openai-api-key = var.openai_api_key
  })
}

resource "aws_secretsmanager_secret" "dating_optimizer_storage" {
  name        = "${var.environment}/dating-optimizer/storage"
  description = "Storage credentials for Dating Profile Optimizer"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-dating-optimizer-storage"
    Application = "dating-profile-optimizer"
    Component   = "storage"
  })
}

resource "aws_secretsmanager_secret_version" "dating_optimizer_storage" {
  secret_id = aws_secretsmanager_secret.dating_optimizer_storage.id
  secret_string = jsonencode({
    cloudinary-url = var.cloudinary_url
  })
}

# Payment Processing Secrets
resource "aws_secretsmanager_secret" "linkedin_headshot_payment" {
  name        = "${var.environment}/linkedin-headshot/payment"
  description = "Payment processing secrets for LinkedIn Headshot Generator"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-linkedin-headshot-payment"
    Application = "linkedin-headshot-generator"
    Component   = "payments"
  })
}

resource "aws_secretsmanager_secret_version" "linkedin_headshot_payment" {
  secret_id = aws_secretsmanager_secret.linkedin_headshot_payment.id
  secret_string = jsonencode({
    stripe-secret-key    = var.stripe_secret_key
    stripe-webhook-secret = var.stripe_webhook_secret
  })
}

resource "aws_secretsmanager_secret" "dating_optimizer_payment" {
  name        = "${var.environment}/dating-optimizer/payment"
  description = "Payment processing secrets for Dating Profile Optimizer"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-dating-optimizer-payment"
    Application = "dating-profile-optimizer"
    Component   = "payments"
  })
}

resource "aws_secretsmanager_secret_version" "dating_optimizer_payment" {
  secret_id = aws_secretsmanager_secret.dating_optimizer_payment.id
  secret_string = jsonencode({
    stripe-secret-key    = var.stripe_secret_key
    stripe-webhook-secret = var.stripe_webhook_secret_dating
  })
}

# Monitoring Secrets
resource "aws_secretsmanager_secret" "linkedin_headshot_monitoring" {
  name        = "${var.environment}/linkedin-headshot/monitoring"
  description = "Monitoring secrets for LinkedIn Headshot Generator"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-linkedin-headshot-monitoring"
    Application = "linkedin-headshot-generator"
    Component   = "monitoring"
  })
}

resource "aws_secretsmanager_secret_version" "linkedin_headshot_monitoring" {
  secret_id = aws_secretsmanager_secret.linkedin_headshot_monitoring.id
  secret_string = jsonencode({
    sentry-dsn = var.sentry_dsn_linkedin
  })
}

resource "aws_secretsmanager_secret" "dating_optimizer_monitoring" {
  name        = "${var.environment}/dating-optimizer/monitoring"
  description = "Monitoring secrets for Dating Profile Optimizer"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-dating-optimizer-monitoring"
    Application = "dating-profile-optimizer"
    Component   = "monitoring"
  })
}

resource "aws_secretsmanager_secret_version" "dating_optimizer_monitoring" {
  secret_id = aws_secretsmanager_secret.dating_optimizer_monitoring.id
  secret_string = jsonencode({
    sentry-dsn = var.sentry_dsn_dating
  })
}

# Analytics Secrets
resource "aws_secretsmanager_secret" "dating_optimizer_analytics" {
  name        = "${var.environment}/dating-optimizer/analytics"
  description = "Analytics secrets for Dating Profile Optimizer"
  
  tags = merge(var.tags, {
    Name        = "${var.environment}-dating-optimizer-analytics"
    Application = "dating-profile-optimizer"
    Component   = "analytics"
  })
}

resource "aws_secretsmanager_secret_version" "dating_optimizer_analytics" {
  secret_id = aws_secretsmanager_secret.dating_optimizer_analytics.id
  secret_string = jsonencode({
    segment-write-key = var.segment_write_key
  })
}

# Random passwords for JWT secrets
resource "random_password" "linkedin_jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "dating_jwt_secret" {
  length  = 64
  special = true
}

# IAM Role for External Secrets Operator
resource "aws_iam_role" "external_secrets_operator" {
  name = "${var.environment}-external-secrets-operator"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}"
        }
        Condition = {
          StringEquals = {
            "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:external-secrets-system:external-secrets-operator"
            "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-external-secrets-operator"
  })
}

resource "aws_iam_role_policy" "external_secrets_operator" {
  name = "${var.environment}-external-secrets-operator-policy"
  role = aws_iam_role.external_secrets_operator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "${aws_secretsmanager_secret.linkedin_headshot_database.arn}*",
          "${aws_secretsmanager_secret.linkedin_headshot_redis.arn}*",
          "${aws_secretsmanager_secret.linkedin_headshot_auth.arn}*",
          "${aws_secretsmanager_secret.linkedin_headshot_ai.arn}*",
          "${aws_secretsmanager_secret.linkedin_headshot_storage.arn}*",
          "${aws_secretsmanager_secret.linkedin_headshot_payment.arn}*",
          "${aws_secretsmanager_secret.linkedin_headshot_monitoring.arn}*",
          "${aws_secretsmanager_secret.dating_optimizer_database.arn}*",
          "${aws_secretsmanager_secret.dating_optimizer_redis.arn}*",
          "${aws_secretsmanager_secret.dating_optimizer_auth.arn}*",
          "${aws_secretsmanager_secret.dating_optimizer_ai.arn}*",
          "${aws_secretsmanager_secret.dating_optimizer_storage.arn}*",
          "${aws_secretsmanager_secret.dating_optimizer_payment.arn}*",
          "${aws_secretsmanager_secret.dating_optimizer_monitoring.arn}*",
          "${aws_secretsmanager_secret.dating_optimizer_analytics.arn}*"
        ]
      }
    ]
  })
}