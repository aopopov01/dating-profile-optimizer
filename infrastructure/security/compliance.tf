# Compliance and Security Configuration for Mobile Applications

# S3 Bucket for Security Logs and Scan Results
resource "aws_s3_bucket" "security_logs" {
  bucket = "${var.environment}-mobile-apps-security-logs-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    Name        = "${var.environment}-security-logs"
    Purpose     = "security-compliance"
    Compliance  = "SOC2,PCI-DSS"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "security_logs" {
  bucket = aws_s3_bucket.security_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.security.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "security_logs" {
  bucket = aws_s3_bucket.security_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "security_logs" {
  bucket = aws_s3_bucket.security_logs.id

  rule {
    id     = "security_logs_lifecycle"
    status = "Enabled"

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

    expiration {
      days = 2555  # 7 years for compliance
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# KMS Key for Security Encryption
resource "aws_kms_key" "security" {
  description             = "KMS key for security and compliance encryption"
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
        Sid    = "Allow security services"
        Effect = "Allow"
        Principal = {
          Service = [
            "s3.amazonaws.com",
            "logs.amazonaws.com",
            "cloudtrail.amazonaws.com",
            "config.amazonaws.com",
            "securityhub.amazonaws.com"
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
    Name = "${var.environment}-security-kms-key"
  })
}

resource "aws_kms_alias" "security" {
  name          = "alias/${var.environment}-mobile-apps-security"
  target_key_id = aws_kms_key.security.key_id
}

# AWS Config for Compliance Monitoring
resource "aws_config_configuration_recorder" "main" {
  name     = "${var.environment}-mobile-apps-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }

  depends_on = [aws_config_delivery_channel.main]
}

resource "aws_config_delivery_channel" "main" {
  name           = "${var.environment}-mobile-apps-config-channel"
  s3_bucket_name = aws_s3_bucket.security_logs.bucket

  snapshot_delivery_properties {
    delivery_frequency = "Daily"
  }
}

# AWS Config Rules for Compliance
resource "aws_config_config_rule" "s3_bucket_public_access_prohibited" {
  name = "${var.environment}-s3-bucket-public-access-prohibited"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_ACCESS_PROHIBITED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "rds_encrypted_storage" {
  name = "${var.environment}-rds-storage-encrypted"

  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "eks_cluster_logging_enabled" {
  name = "${var.environment}-eks-cluster-logging-enabled"

  source {
    owner             = "AWS"
    source_identifier = "EKS_CLUSTER_LOGGING_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "root_access_key_check" {
  name = "${var.environment}-root-access-key-check"

  source {
    owner             = "AWS"
    source_identifier = "ROOT_ACCESS_KEY_CHECK"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# AWS CloudTrail for Audit Logging
resource "aws_cloudtrail" "main" {
  name           = "${var.environment}-mobile-apps-cloudtrail"
  s3_bucket_name = aws_s3_bucket.security_logs.bucket
  s3_key_prefix  = "cloudtrail-logs"

  event_selector {
    read_write_type                 = "All"
    include_management_events       = true
    exclude_management_event_sources = []

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.security_logs.arn}/*"]
    }

    data_resource {
      type   = "AWS::S3::Bucket"
      values = [aws_s3_bucket.security_logs.arn]
    }
  }

  insight_selector {
    insight_type = "ApiCallRateInsight"
  }

  kms_key_id = aws_kms_key.security.arn

  tags = merge(var.tags, {
    Name = "${var.environment}-mobile-apps-cloudtrail"
  })
}

# AWS Security Hub
resource "aws_securityhub_account" "main" {
  enable_default_standards = true
}

resource "aws_securityhub_standards_subscription" "aws_foundational" {
  standards_arn = "arn:aws:securityhub:::ruleset/finding-format/aws-foundational-security-standard/v/1.0.0"
  depends_on    = [aws_securityhub_account.main]
}

resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:::ruleset/finding-format/cis-aws-foundations-benchmark/v/1.2.0"
  depends_on    = [aws_securityhub_account.main]
}

resource "aws_securityhub_standards_subscription" "pci_dss" {
  standards_arn = "arn:aws:securityhub:::ruleset/finding-format/pci-dss/v/3.2.1"
  depends_on    = [aws_securityhub_account.main]
}

# GuardDuty for Threat Detection
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-mobile-apps-guardduty"
  })
}

# IAM Access Analyzer
resource "aws_accessanalyzer_analyzer" "main" {
  analyzer_name = "${var.environment}-mobile-apps-access-analyzer"
  type         = "ACCOUNT"

  tags = merge(var.tags, {
    Name = "${var.environment}-mobile-apps-access-analyzer"
  })
}

# IAM Role for AWS Config
resource "aws_iam_role" "config" {
  name = "${var.environment}-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-config-role"
  })
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/ConfigRole"
}

resource "aws_iam_role_policy" "config_s3" {
  name = "${var.environment}-config-s3-policy"
  role = aws_iam_role.config.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketAcl",
          "s3:GetBucketLocation",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.security_logs.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:GetObjectAcl"
        ]
        Resource = "${aws_s3_bucket.security_logs.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = aws_kms_key.security.arn
      }
    ]
  })
}

# WAF for Application Protection
resource "aws_wafv2_web_acl" "mobile_apps" {
  name  = "${var.environment}-mobile-apps-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 10000
        aggregate_key_type = "IP"

        scope_down_statement {
          geo_match_statement {
            country_codes = ["US", "CA", "GB", "AU", "FR", "DE", "NL", "SE", "NO", "DK"]
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Known Bad Inputs Rule Set
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # SQL Injection Rule Set
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-mobile-apps-waf"
  })

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.environment}MobileAppsWAF"
    sampled_requests_enabled   = true
  }
}

# CloudWatch Log Groups for Security Monitoring
resource "aws_cloudwatch_log_group" "security_logs" {
  name              = "/aws/mobile-apps/${var.environment}/security"
  retention_in_days = var.environment == "production" ? 90 : 30
  kms_key_id        = aws_kms_key.security.arn

  tags = merge(var.tags, {
    Name = "${var.environment}-security-logs"
  })
}

resource "aws_cloudwatch_log_group" "waf_logs" {
  name              = "/aws/wafv2/${var.environment}-mobile-apps"
  retention_in_days = var.environment == "production" ? 90 : 30
  kms_key_id        = aws_kms_key.security.arn

  tags = merge(var.tags, {
    Name = "${var.environment}-waf-logs"
  })
}

# CloudWatch Log Stream for WAF
resource "aws_wafv2_web_acl_logging_configuration" "mobile_apps" {
  resource_arn            = aws_wafv2_web_acl.mobile_apps.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs.arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}

# Compliance Report Generation
resource "aws_lambda_function" "compliance_report" {
  count = var.environment == "production" ? 1 : 0
  
  filename         = "compliance-report.zip"
  function_name    = "${var.environment}-compliance-report"
  role            = aws_iam_role.lambda_compliance[0].arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.compliance_report_zip[0].output_base64sha256
  runtime         = "python3.9"
  timeout         = 300

  environment {
    variables = {
      ENVIRONMENT = var.environment
      S3_BUCKET   = aws_s3_bucket.security_logs.bucket
      KMS_KEY_ID  = aws_kms_key.security.key_id
    }
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-compliance-report"
  })
}

# Lambda ZIP for compliance report
data "archive_file" "compliance_report_zip" {
  count       = var.environment == "production" ? 1 : 0
  type        = "zip"
  output_path = "compliance-report.zip"
  
  source {
    content = templatefile("${path.module}/compliance-report.py", {
      environment = var.environment
    })
    filename = "index.py"
  }
}

# IAM Role for Compliance Lambda
resource "aws_iam_role" "lambda_compliance" {
  count = var.environment == "production" ? 1 : 0
  name  = "${var.environment}-lambda-compliance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-lambda-compliance-role"
  })
}

resource "aws_iam_role_policy" "lambda_compliance" {
  count = var.environment == "production" ? 1 : 0
  name  = "${var.environment}-lambda-compliance-policy"
  role  = aws_iam_role.lambda_compliance[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "config:GetComplianceDetailsByConfigRule",
          "config:GetComplianceSummaryByConfigRule",
          "securityhub:GetFindings",
          "guardduty:GetFindings"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${aws_s3_bucket.security_logs.arn}/compliance-reports/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.security.arn
      }
    ]
  })
}

# EventBridge Rule for Compliance Report Generation
resource "aws_cloudwatch_event_rule" "compliance_report_schedule" {
  count               = var.environment == "production" ? 1 : 0
  name                = "${var.environment}-compliance-report-schedule"
  description         = "Generate compliance reports monthly"
  schedule_expression = "cron(0 8 1 * ? *)"  # First day of month at 8 AM UTC

  tags = merge(var.tags, {
    Name = "${var.environment}-compliance-report-schedule"
  })
}

resource "aws_cloudwatch_event_target" "compliance_report" {
  count     = var.environment == "production" ? 1 : 0
  rule      = aws_cloudwatch_event_rule.compliance_report_schedule[0].name
  target_id = "ComplianceReportTarget"
  arn       = aws_lambda_function.compliance_report[0].arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  count         = var.environment == "production" ? 1 : 0
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.compliance_report[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.compliance_report_schedule[0].arn
}