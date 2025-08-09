# Environment Variables Configuration for Mobile Applications

# Additional variables for secrets management
variable "replicate_api_token" {
  description = "Replicate API token for AI processing"
  type        = string
  sensitive   = true
  default     = ""
}

variable "openai_api_key" {
  description = "OpenAI API key for AI processing"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudinary_cloud_name" {
  description = "Cloudinary cloud name for image storage"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudinary_api_key" {
  description = "Cloudinary API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudinary_api_secret" {
  description = "Cloudinary API secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudinary_url" {
  description = "Cloudinary URL for Dating Profile Optimizer"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret key for payments"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook secret for LinkedIn Headshot"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret_dating" {
  description = "Stripe webhook secret for Dating Profile Optimizer"
  type        = string
  sensitive   = true
  default     = ""
}

variable "sentry_dsn_linkedin" {
  description = "Sentry DSN for LinkedIn Headshot monitoring"
  type        = string
  sensitive   = true
  default     = ""
}

variable "sentry_dsn_dating" {
  description = "Sentry DSN for Dating Profile Optimizer monitoring"
  type        = string
  sensitive   = true
  default     = ""
}

variable "segment_write_key" {
  description = "Segment write key for analytics"
  type        = string
  sensitive   = true
  default     = ""
}

# Environment-specific values
locals {
  environment_configs = {
    production = {
      # LinkedIn Headshot Generator
      linkedin_headshot_config = {
        replicas_min = 3
        replicas_max = 15
        cpu_request  = "500m"
        cpu_limit    = "1000m"
        memory_request = "1Gi"
        memory_limit   = "2Gi"
        db_instance_class = "db.t3.large"
        redis_node_type   = "cache.t3.medium"
      }
      
      # Dating Profile Optimizer
      dating_optimizer_config = {
        replicas_min = 3
        replicas_max = 20
        cpu_request  = "500m"
        cpu_limit    = "1500m"
        memory_request = "1Gi"
        memory_limit   = "3Gi"
        db_instance_class = "db.t3.large"
        redis_node_type   = "cache.t3.medium"
      }
      
      # Infrastructure
      node_instance_types = ["m5.large", "m5.xlarge", "c5.large", "c5.xlarge"]
      min_nodes = 3
      max_nodes = 20
      desired_nodes = 5
      
      # Monitoring
      monitoring_retention_days = 30
      log_retention_days = 90
      backup_retention_days = 30
    }
    
    staging = {
      # LinkedIn Headshot Generator
      linkedin_headshot_config = {
        replicas_min = 1
        replicas_max = 5
        cpu_request  = "250m"
        cpu_limit    = "500m"
        memory_request = "512Mi"
        memory_limit   = "1Gi"
        db_instance_class = "db.t3.micro"
        redis_node_type   = "cache.t3.micro"
      }
      
      # Dating Profile Optimizer
      dating_optimizer_config = {
        replicas_min = 1
        replicas_max = 5
        cpu_request  = "250m"
        cpu_limit    = "500m"
        memory_request = "512Mi"
        memory_limit   = "1Gi"
        db_instance_class = "db.t3.micro"
        redis_node_type   = "cache.t3.micro"
      }
      
      # Infrastructure
      node_instance_types = ["t3.medium", "t3.large"]
      min_nodes = 2
      max_nodes = 5
      desired_nodes = 2
      
      # Monitoring
      monitoring_retention_days = 7
      log_retention_days = 30
      backup_retention_days = 7
    }
    
    development = {
      # LinkedIn Headshot Generator
      linkedin_headshot_config = {
        replicas_min = 1
        replicas_max = 2
        cpu_request  = "100m"
        cpu_limit    = "250m"
        memory_request = "256Mi"
        memory_limit   = "512Mi"
        db_instance_class = "db.t3.micro"
        redis_node_type   = "cache.t3.micro"
      }
      
      # Dating Profile Optimizer
      dating_optimizer_config = {
        replicas_min = 1
        replicas_max = 2
        cpu_request  = "100m"
        cpu_limit    = "250m"
        memory_request = "256Mi"
        memory_limit   = "512Mi"
        db_instance_class = "db.t3.micro"
        redis_node_type   = "cache.t3.micro"
      }
      
      # Infrastructure
      node_instance_types = ["t3.small", "t3.medium"]
      min_nodes = 1
      max_nodes = 3
      desired_nodes = 1
      
      # Monitoring
      monitoring_retention_days = 3
      log_retention_days = 7
      backup_retention_days = 3
    }
  }
  
  # Select configuration based on environment
  config = local.environment_configs[var.environment]
}

# Output environment-specific configurations
output "environment_config" {
  description = "Environment-specific configurations"
  value       = local.config
  sensitive   = false
}

# Feature flags configuration
locals {
  feature_flags = {
    production = {
      # LinkedIn Headshot Generator
      linkedin_headshot_features = {
        ai_processing_enabled = true
        batch_processing = true
        auto_scaling = true
        cdn_enabled = true
        analytics_enabled = true
        ab_testing_enabled = true
        rate_limiting_strict = true
        image_optimization = true
        webhook_notifications = true
      }
      
      # Dating Profile Optimizer
      dating_optimizer_features = {
        ai_analysis_enabled = true
        bio_generation = true
        photo_scoring = true
        recommendations = true
        premium_features = true
        analytics_enabled = true
        ab_testing_enabled = true
        social_media_integration = false # To be enabled later
        video_analysis = false # Future feature
      }
    }
    
    staging = {
      # LinkedIn Headshot Generator
      linkedin_headshot_features = {
        ai_processing_enabled = true
        batch_processing = false
        auto_scaling = false
        cdn_enabled = false
        analytics_enabled = true
        ab_testing_enabled = true
        rate_limiting_strict = false
        image_optimization = true
        webhook_notifications = false
      }
      
      # Dating Profile Optimizer
      dating_optimizer_features = {
        ai_analysis_enabled = true
        bio_generation = true
        photo_scoring = true
        recommendations = false
        premium_features = false
        analytics_enabled = true
        ab_testing_enabled = true
        social_media_integration = false
        video_analysis = false
      }
    }
    
    development = {
      # LinkedIn Headshot Generator
      linkedin_headshot_features = {
        ai_processing_enabled = false # Use mock responses
        batch_processing = false
        auto_scaling = false
        cdn_enabled = false
        analytics_enabled = false
        ab_testing_enabled = false
        rate_limiting_strict = false
        image_optimization = false
        webhook_notifications = false
      }
      
      # Dating Profile Optimizer
      dating_optimizer_features = {
        ai_analysis_enabled = false # Use mock responses
        bio_generation = false
        photo_scoring = false
        recommendations = false
        premium_features = false
        analytics_enabled = false
        ab_testing_enabled = false
        social_media_integration = false
        video_analysis = false
      }
    }
  }
}

output "feature_flags" {
  description = "Feature flags for each environment"
  value       = local.feature_flags[var.environment]
  sensitive   = false
}