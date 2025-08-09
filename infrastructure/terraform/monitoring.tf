# Production Monitoring and Logging Infrastructure

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "dating_optimizer_backend" {
  name              = "/aws/containers/dating-optimizer/backend"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.logs.arn

  tags = merge(var.tags, {
    Name        = "dating-optimizer-backend-logs"
    Application = "dating-optimizer"
    Component   = "backend"
  })
}

resource "aws_cloudwatch_log_group" "linkedin_headshot_backend" {
  name              = "/aws/containers/linkedin-headshot/backend"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.logs.arn

  tags = merge(var.tags, {
    Name        = "linkedin-headshot-backend-logs"
    Application = "linkedin-headshot"
    Component   = "backend"
  })
}

resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${var.environment}-mobile-apps/cluster"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.logs.arn

  tags = merge(var.tags, {
    Name      = "eks-cluster-logs"
    Component = "kubernetes"
  })
}

# VPC Flow Logs for network monitoring and security
resource "aws_flow_log" "vpc_flow_logs" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = "${var.environment}-vpc-flow-logs"
  })
}

resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/${var.environment}-mobile-apps/flow-logs"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.logs.arn

  tags = merge(var.tags, {
    Name = "vpc-flow-logs"
  })
}

# IAM role for VPC Flow Logs
resource "aws_iam_role" "flow_logs" {
  name = "${var.environment}-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "flow_logs" {
  name = "${var.environment}-flow-logs-policy"
  role = aws_iam_role.flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Alarms for critical metrics
resource "aws_cloudwatch_metric_alarm" "high_cpu_utilization" {
  for_each = toset(["dating-optimizer", "linkedin-headshot"])

  alarm_name          = "${var.environment}-${each.key}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ${each.key} CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = each.key
    ClusterName = "${var.environment}-mobile-apps"
  }

  tags = merge(var.tags, {
    Name        = "${each.key}-high-cpu-alarm"
    Application = each.key
  })
}

resource "aws_cloudwatch_metric_alarm" "high_memory_utilization" {
  for_each = toset(["dating-optimizer", "linkedin-headshot"])

  alarm_name          = "${var.environment}-${each.key}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ${each.key} memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = each.key
    ClusterName = "${var.environment}-mobile-apps"
  }

  tags = merge(var.tags, {
    Name        = "${each.key}-high-memory-alarm"
    Application = each.key
  })
}

# Database performance alarms
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  for_each = aws_db_instance.main

  alarm_name          = "${var.environment}-rds-${each.key}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors RDS ${each.key} CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = each.value.id
  }

  tags = merge(var.tags, {
    Name        = "rds-${each.key}-high-cpu-alarm"
    Database    = each.key
  })
}

resource "aws_cloudwatch_metric_alarm" "rds_connection_count_high" {
  for_each = aws_db_instance.main

  alarm_name          = "${var.environment}-rds-${each.key}-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS ${each.key} connection count"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = each.value.id
  }

  tags = merge(var.tags, {
    Name        = "rds-${each.key}-high-connections-alarm"
    Database    = each.key
  })
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name              = "${var.environment}-mobile-apps-alerts"
  kms_master_key_id = aws_kms_key.sns.arn

  tags = merge(var.tags, {
    Name = "mobile-apps-alerts"
  })
}

# SNS Topic subscription (configure email endpoints)
resource "aws_sns_topic_subscription" "email_alerts" {
  count     = length(var.alert_email_endpoints)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_endpoints[count.index]
}

# Slack webhook subscription for alerts
resource "aws_sns_topic_subscription" "slack_alerts" {
  count     = var.slack_webhook_url != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}

# CloudWatch Dashboard for comprehensive monitoring
resource "aws_cloudwatch_dashboard" "mobile_apps" {
  dashboard_name = "${var.environment}-mobile-apps-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_ELB_5XX_Count", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Application Load Balancer Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main["dating_optimizer"].id],
            [".", "DatabaseConnections", ".", "."],
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main["linkedin_headshot"].id],
            [".", "DatabaseConnections", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Database Performance Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", aws_elasticache_replication_group.main.id],
            [".", "NetworkBytesIn", ".", "."],
            [".", "NetworkBytesOut", ".", "."],
            [".", "CurrConnections", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ElastiCache Redis Metrics"
          period  = 300
        }
      }
    ]
  })

  tags = var.tags
}

# Custom metrics for application-specific monitoring
resource "aws_cloudwatch_log_metric_filter" "api_errors" {
  for_each = toset(["dating-optimizer", "linkedin-headshot"])

  name           = "${each.key}-api-errors"
  log_group_name = "/aws/containers/${each.key}/backend"
  pattern        = "[timestamp, request_id, level=\"ERROR\", ...]"

  metric_transformation {
    name      = "APIErrors"
    namespace = "MobileApps/${title(each.key)}"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  for_each = toset(["dating-optimizer", "linkedin-headshot"])

  alarm_name          = "${var.environment}-${each.key}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "APIErrors"
  namespace           = "MobileApps/${title(each.key)}"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High API error rate for ${each.key}"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = merge(var.tags, {
    Name        = "${each.key}-high-error-rate-alarm"
    Application = each.key
  })
}