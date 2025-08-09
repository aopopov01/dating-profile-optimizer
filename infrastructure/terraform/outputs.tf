# Terraform Outputs

# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = aws_subnet.database[*].id
}

# EKS Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.main.id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.main.arn
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_security_group_id" {
  description = "Security group ids attached to the cluster control plane"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_version" {
  description = "EKS cluster version"
  value       = aws_eks_cluster.main.version
}

# RDS Outputs
output "db_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "db_instance_name" {
  description = "RDS instance name"
  value       = aws_db_instance.main.db_name
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "db_instance_username" {
  description = "RDS instance username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

# ElastiCache Outputs
output "redis_endpoint" {
  description = "Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

# ECR Outputs
output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value = {
    linkedin_headshot_backend  = aws_ecr_repository.linkedin_headshot_backend.repository_url
    linkedin_headshot_frontend = aws_ecr_repository.linkedin_headshot_frontend.repository_url
    dating_optimizer_backend   = aws_ecr_repository.dating_optimizer_backend.repository_url
    dating_optimizer_frontend  = aws_ecr_repository.dating_optimizer_frontend.repository_url
  }
}

# Security Group Outputs
output "security_groups" {
  description = "Security group IDs"
  value = {
    alb        = aws_security_group.alb.id
    eks_cluster = aws_security_group.eks_cluster.id
    eks_nodes  = aws_security_group.eks_nodes.id
    rds        = aws_security_group.rds.id
    redis      = aws_security_group.redis.id
  }
}

# Secrets Manager Outputs
output "secrets" {
  description = "Secrets Manager secret ARNs"
  value = {
    database_password = aws_secretsmanager_secret.db_password.arn
    redis_auth       = aws_secretsmanager_secret.redis_auth.arn
  }
  sensitive = true
}

# Region and Account Info
output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}