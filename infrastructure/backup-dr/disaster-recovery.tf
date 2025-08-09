# Disaster Recovery Configuration for Mobile Applications

# Cross-Region Provider for DR
provider "aws" {
  alias  = "backup_region"
  region = var.backup_region
}

variable "backup_region" {
  description = "AWS region for disaster recovery backups"
  type        = string
  default     = "us-west-2"
}

# RDS Cross-Region Read Replica for DR
resource "aws_db_instance" "replica_dr" {
  count = var.environment == "production" ? 1 : 0
  
  identifier = "${var.environment}-postgres-dr-replica"
  
  # Replica configuration
  replicate_source_db = aws_db_instance.main.identifier
  instance_class      = var.db_instance_class
  
  # Cross-region configuration
  provider = aws.backup_region
  
  # Storage configuration
  storage_encrypted = true
  kms_key_id       = aws_kms_key.backup_cross_region.arn
  
  # Network configuration
  publicly_accessible = false
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring_dr[0].arn
  
  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id      = aws_kms_key.backup_cross_region.arn
  
  # Backup configuration
  backup_retention_period = var.backup_retention_days
  backup_window          = "05:00-06:00"  # Different from primary
  maintenance_window     = "sun:06:00-sun:07:00"
  
  # Deletion protection
  deletion_protection       = true
  skip_final_snapshot      = false
  final_snapshot_identifier = "${var.environment}-postgres-dr-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  tags = merge(var.tags, {
    Name = "${var.environment}-postgres-dr-replica"
    Purpose = "disaster-recovery"
    Region = var.backup_region
  })
}

# RDS Monitoring Role for DR region
resource "aws_iam_role" "rds_monitoring_dr" {
  count    = var.environment == "production" ? 1 : 0
  provider = aws.backup_region
  name     = "${var.environment}-rds-monitoring-dr-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      },
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-rds-monitoring-dr-role"
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring_dr" {
  count      = var.environment == "production" ? 1 : 0
  provider   = aws.backup_region
  role       = aws_iam_role.rds_monitoring_dr[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# EKS Cluster for DR (Production only)
resource "aws_eks_cluster" "dr" {
  count    = var.environment == "production" ? 1 : 0
  provider = aws.backup_region
  
  name     = "${var.cluster_name}-dr"
  role_arn = aws_iam_role.eks_cluster_dr[0].arn
  version  = "1.27"

  vpc_config {
    subnet_ids              = aws_subnet.private_dr[*].id
    security_group_ids      = [aws_security_group.eks_cluster_dr[0].id]
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy_dr,
  ]

  tags = merge(var.tags, {
    Name = "${var.environment}-${var.cluster_name}-dr"
    Purpose = "disaster-recovery"
  })
}

# EKS Cluster Service Role for DR
resource "aws_iam_role" "eks_cluster_dr" {
  count    = var.environment == "production" ? 1 : 0
  provider = aws.backup_region
  name     = "${var.environment}-eks-cluster-dr-role"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-eks-cluster-dr-role"
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy_dr" {
  count      = var.environment == "production" ? 1 : 0
  provider   = aws.backup_region
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_dr[0].name
}

# VPC for DR region
resource "aws_vpc" "dr" {
  count                = var.environment == "production" ? 1 : 0
  provider             = aws.backup_region
  cidr_block           = "10.1.0.0/16"  # Different CIDR to avoid conflicts
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.environment}-mobile-apps-vpc-dr"
    Purpose = "disaster-recovery"
  })
}

# Subnets for DR region
resource "aws_subnet" "private_dr" {
  count             = var.environment == "production" ? length(var.private_subnet_cidrs) : 0
  provider          = aws.backup_region
  vpc_id            = aws_vpc.dr[0].id
  cidr_block        = "10.1.${count.index + 4}.0/24"
  availability_zone = data.aws_availability_zones.dr[0].names[count.index]

  tags = merge(var.tags, {
    Name = "${var.environment}-private-subnet-dr-${count.index + 1}"
    Type = "private"
    Purpose = "disaster-recovery"
    "kubernetes.io/role/internal-elb" = "1"
  })
}

data "aws_availability_zones" "dr" {
  count    = var.environment == "production" ? 1 : 0
  provider = aws.backup_region
  state    = "available"
}

# Security Group for EKS Cluster in DR
resource "aws_security_group" "eks_cluster_dr" {
  count       = var.environment == "production" ? 1 : 0
  provider    = aws.backup_region
  name        = "${var.environment}-eks-cluster-dr-sg"
  description = "Security group for EKS cluster in DR region"
  vpc_id      = aws_vpc.dr[0].id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.1.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-eks-cluster-dr-sg"
    Purpose = "disaster-recovery"
  })
}

# Route 53 Health Checks for Primary Region
resource "aws_route53_health_check" "primary_api" {
  count                           = var.environment == "production" ? 1 : 0
  fqdn                           = "${var.environment == "production" ? "api" : "staging-api"}.${var.domain_name}"
  port                           = 443
  type                           = "HTTPS"
  resource_path                  = "/health"
  failure_threshold              = "3"
  request_interval               = "30"
  cloudwatch_logs_region         = var.aws_region
  cloudwatch_alarm_region        = var.aws_region
  insufficient_data_health_status = "Failure"

  tags = merge(var.tags, {
    Name = "${var.environment}-primary-api-health-check"
    Purpose = "disaster-recovery"
  })
}

# Route 53 Failover Records
resource "aws_route53_record" "api_primary" {
  count           = var.environment == "production" ? 1 : 0
  zone_id         = var.hosted_zone_id
  name            = "api"
  type            = "CNAME"
  ttl             = "60"
  records         = [var.primary_api_endpoint]
  set_identifier  = "primary"
  
  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.primary_api[0].id
}

resource "aws_route53_record" "api_secondary" {
  count          = var.environment == "production" ? 1 : 0
  zone_id        = var.hosted_zone_id
  name           = "api"
  type           = "CNAME"
  ttl            = "60"
  records        = [var.secondary_api_endpoint]
  set_identifier = "secondary"
  
  failover_routing_policy {
    type = "SECONDARY"
  }
}

# CloudWatch Alarms for DR Monitoring
resource "aws_cloudwatch_metric_alarm" "rds_replica_lag" {
  count               = var.environment == "production" ? 1 : 0
  alarm_name          = "${var.environment}-rds-replica-lag-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "300"  # 5 minutes
  alarm_description   = "RDS replica lag is too high"
  alarm_actions       = [aws_sns_topic.dr_alerts[0].arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.replica_dr[0].id
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-rds-replica-lag-alarm"
    Purpose = "disaster-recovery"
  })
}

# SNS Topic for DR Alerts
resource "aws_sns_topic" "dr_alerts" {
  count = var.environment == "production" ? 1 : 0
  name  = "${var.environment}-dr-alerts"

  tags = merge(var.tags, {
    Name = "${var.environment}-dr-alerts"
    Purpose = "disaster-recovery"
  })
}

resource "aws_sns_topic_subscription" "dr_email" {
  count     = var.environment == "production" ? 1 : 0
  topic_arn = aws_sns_topic.dr_alerts[0].arn
  protocol  = "email"
  endpoint  = var.dr_notification_email
}

# Lambda Function for Automated DR Procedures
resource "aws_lambda_function" "dr_automation" {
  count            = var.environment == "production" ? 1 : 0
  filename         = "dr-automation.zip"
  function_name    = "${var.environment}-dr-automation"
  role            = aws_iam_role.lambda_dr[0].arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.dr_automation_zip[0].output_base64sha256
  runtime         = "python3.9"
  timeout         = 900  # 15 minutes

  environment {
    variables = {
      ENVIRONMENT = var.environment
      PRIMARY_REGION = var.aws_region
      DR_REGION = var.backup_region
      CLUSTER_NAME = var.cluster_name
      DB_IDENTIFIER = aws_db_instance.main.id
      SNS_TOPIC_ARN = aws_sns_topic.dr_alerts[0].arn
    }
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-dr-automation"
    Purpose = "disaster-recovery"
  })
}

# Lambda ZIP file for DR automation
data "archive_file" "dr_automation_zip" {
  count       = var.environment == "production" ? 1 : 0
  type        = "zip"
  output_path = "dr-automation.zip"
  
  source {
    content = templatefile("${path.module}/dr-automation.py", {
      environment = var.environment
    })
    filename = "index.py"
  }
}

# IAM Role for DR Lambda
resource "aws_iam_role" "lambda_dr" {
  count = var.environment == "production" ? 1 : 0
  name  = "${var.environment}-lambda-dr-role"

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
    Name = "${var.environment}-lambda-dr-role"
  })
}

resource "aws_iam_role_policy" "lambda_dr" {
  count = var.environment == "production" ? 1 : 0
  name  = "${var.environment}-lambda-dr-policy"
  role  = aws_iam_role.lambda_dr[0].id

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
          "rds:DescribeDBInstances",
          "rds:PromoteReadReplica",
          "rds:ModifyDBInstance"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets",
          "route53:GetChange"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.dr_alerts[0].arn
      }
    ]
  })
}

# Additional variables needed
variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID"
  type        = string
  default     = ""
}

variable "primary_api_endpoint" {
  description = "Primary API endpoint"
  type        = string
  default     = ""
}

variable "secondary_api_endpoint" {
  description = "Secondary API endpoint"
  type        = string
  default     = ""
}

variable "dr_notification_email" {
  description = "Email for DR notifications"
  type        = string
  default     = ""
}