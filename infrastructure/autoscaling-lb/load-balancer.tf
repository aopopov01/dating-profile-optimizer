# Load Balancer Configuration for Mobile Applications

# Application Load Balancer for LinkedIn Headshot Generator
resource "aws_lb" "linkedin_headshot_alb" {
  name               = "${var.environment}-linkedin-headshot-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production" ? true : false
  enable_http2              = true
  drop_invalid_header_fields = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "linkedin-headshot-${var.environment}"
    enabled = true
  }

  tags = merge(var.tags, {
    Name        = "${var.environment}-linkedin-headshot-alb"
    Application = "linkedin-headshot-generator"
  })
}

# Application Load Balancer for Dating Profile Optimizer
resource "aws_lb" "dating_optimizer_alb" {
  name               = "${var.environment}-dating-optimizer-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production" ? true : false
  enable_http2              = true
  drop_invalid_header_fields = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "dating-optimizer-${var.environment}"
    enabled = true
  }

  tags = merge(var.tags, {
    Name        = "${var.environment}-dating-optimizer-alb"
    Application = "dating-profile-optimizer"
  })
}

# S3 Bucket for ALB Access Logs
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "${var.environment}-mobile-apps-alb-logs-${data.aws_caller_identity.current.account_id}"
  force_destroy = var.environment != "production"

  tags = merge(var.tags, {
    Name    = "${var.environment}-alb-logs"
    Purpose = "load-balancer-logs"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "alb_logs_lifecycle"
    status = "Enabled"

    expiration {
      days = var.environment == "production" ? 90 : 30
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ALB Bucket Policy for Access Logs
resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_elb_service_account.main.id}:root"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.alb_logs.arn
      }
    ]
  })
}

data "aws_elb_service_account" "main" {}

# Target Groups for LinkedIn Headshot Generator
resource "aws_lb_target_group" "linkedin_headshot_backend" {
  name     = "${var.environment}-linkedin-headshot-be"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path                = "/health"
    matcher             = "200"
    protocol            = "HTTP"
    port                = "traffic-port"
  }

  deregistration_delay = 300

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = false
  }

  tags = merge(var.tags, {
    Name        = "${var.environment}-linkedin-headshot-backend-tg"
    Application = "linkedin-headshot-generator"
  })
}

# Target Groups for Dating Profile Optimizer
resource "aws_lb_target_group" "dating_optimizer_backend" {
  name     = "${var.environment}-dating-optimizer-be"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 15
    interval            = 30
    path                = "/api/v1/health"
    matcher             = "200"
    protocol            = "HTTP"
    port                = "traffic-port"
  }

  deregistration_delay = 300

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = merge(var.tags, {
    Name        = "${var.environment}-dating-optimizer-backend-tg"
    Application = "dating-profile-optimizer"
  })
}

# ALB Listeners for LinkedIn Headshot Generator
resource "aws_lb_listener" "linkedin_headshot_http" {
  load_balancer_arn = aws_lb.linkedin_headshot_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-linkedin-headshot-http-listener"
  })
}

resource "aws_lb_listener" "linkedin_headshot_https" {
  load_balancer_arn = aws_lb.linkedin_headshot_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.linkedin_headshot_backend.arn
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-linkedin-headshot-https-listener"
  })
}

# ALB Listeners for Dating Profile Optimizer
resource "aws_lb_listener" "dating_optimizer_http" {
  load_balancer_arn = aws_lb.dating_optimizer_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-dating-optimizer-http-listener"
  })
}

resource "aws_lb_listener" "dating_optimizer_https" {
  load_balancer_arn = aws_lb.dating_optimizer_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dating_optimizer_backend.arn
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-dating-optimizer-https-listener"
  })
}

# Listener Rules for Advanced Routing
resource "aws_lb_listener_rule" "dating_optimizer_api" {
  listener_arn = aws_lb_listener.dating_optimizer_https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dating_optimizer_backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  condition {
    host_header {
      values = ["api.${var.domain_name}", "${var.environment}-api.${var.domain_name}"]
    }
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-dating-optimizer-api-rule"
  })
}

# WAF Association
resource "aws_wafv2_web_acl_association" "linkedin_headshot_alb" {
  resource_arn = aws_lb.linkedin_headshot_alb.arn
  web_acl_arn  = aws_wafv2_web_acl.mobile_apps.arn
}

resource "aws_wafv2_web_acl_association" "dating_optimizer_alb" {
  resource_arn = aws_lb.dating_optimizer_alb.arn
  web_acl_arn  = aws_wafv2_web_acl.mobile_apps.arn
}

# CloudFront Distribution for Global Content Delivery
resource "aws_cloudfront_distribution" "linkedin_headshot" {
  origin {
    domain_name = aws_lb.linkedin_headshot_alb.dns_name
    origin_id   = "linkedin-headshot-alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"

  aliases = var.environment == "production" ? ["linkedin-headshot.${var.domain_name}"] : ["staging-linkedin-headshot.${var.domain_name}"]

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "linkedin-headshot-alb"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Host", "Authorization", "CloudFront-Forwarded-Proto"]

      cookies {
        forward = "all"
      }
    }

    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "linkedin-headshot-alb"
    compress         = true

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "linkedin-headshot-alb"
    compress         = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400
    default_ttl            = 2592000  # 30 days
    max_ttl                = 31536000  # 1 year
  }

  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations       = ["US", "CA", "GB", "AU", "FR", "DE", "NL", "SE", "NO", "DK", "JP", "SG"]
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  web_acl_id = aws_wafv2_web_acl.mobile_apps.arn

  tags = merge(var.tags, {
    Name        = "${var.environment}-linkedin-headshot-cloudfront"
    Application = "linkedin-headshot-generator"
  })
}

resource "aws_cloudfront_distribution" "dating_optimizer" {
  origin {
    domain_name = aws_lb.dating_optimizer_alb.dns_name
    origin_id   = "dating-optimizer-alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"

  aliases = var.environment == "production" ? ["dating-optimizer.${var.domain_name}"] : ["staging-dating-optimizer.${var.domain_name}"]

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "dating-optimizer-alb"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Host", "Authorization", "CloudFront-Forwarded-Proto"]

      cookies {
        forward = "all"
      }
    }

    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "dating-optimizer-alb"
    compress         = true

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations       = ["US", "CA", "GB", "AU", "FR", "DE", "NL", "SE", "NO", "DK", "JP", "SG"]
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  web_acl_id = aws_wafv2_web_acl.mobile_apps.arn

  tags = merge(var.tags, {
    Name        = "${var.environment}-dating-optimizer-cloudfront"
    Application = "dating-profile-optimizer"
  })
}