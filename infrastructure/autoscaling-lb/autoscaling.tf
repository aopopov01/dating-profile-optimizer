# Auto Scaling Configuration for Mobile Applications

# EKS Cluster Autoscaler Service Account
resource "aws_iam_role" "cluster_autoscaler" {
  name = "${var.environment}-cluster-autoscaler"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}"
      }
      Condition = {
        StringEquals = {
          "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:kube-system:cluster-autoscaler"
          "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
    Version = "2012-10-17"
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-cluster-autoscaler"
  })
}

resource "aws_iam_role_policy" "cluster_autoscaler" {
  name = "${var.environment}-cluster-autoscaler-policy"
  role = aws_iam_role.cluster_autoscaler.id

  policy = jsonencode({
    Statement = [
      {
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeTags",
          "ec2:DescribeLaunchTemplateVersions",
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
    Version = "2012-10-17"
  })
}

# Kubernetes Cluster Autoscaler Deployment
resource "kubernetes_service_account" "cluster_autoscaler" {
  metadata {
    name      = "cluster-autoscaler"
    namespace = "kube-system"
    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.cluster_autoscaler.arn
    }
    labels = {
      "app.kubernetes.io/name" = "cluster-autoscaler"
    }
  }
}

resource "kubernetes_cluster_role" "cluster_autoscaler" {
  metadata {
    name = "cluster-autoscaler"
    labels = {
      "app.kubernetes.io/name" = "cluster-autoscaler"
    }
  }

  rule {
    api_groups = [""]
    resources  = ["events", "endpoints"]
    verbs      = ["create", "patch"]
  }

  rule {
    api_groups = [""]
    resources  = ["pods/eviction"]
    verbs      = ["create"]
  }

  rule {
    api_groups = [""]
    resources  = ["pods/status"]
    verbs      = ["update"]
  }

  rule {
    api_groups     = [""]
    resources      = ["endpoints"]
    resource_names = ["cluster-autoscaler"]
    verbs          = ["get", "update"]
  }

  rule {
    api_groups = [""]
    resources  = ["nodes"]
    verbs      = ["watch", "list", "get", "update"]
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "services", "replicationcontrollers", "persistentvolumeclaims", "persistentvolumes"]
    verbs      = ["watch", "list", "get"]
  }

  rule {
    api_groups = ["extensions"]
    resources  = ["replicasets", "daemonsets"]
    verbs      = ["watch", "list", "get"]
  }

  rule {
    api_groups = ["policy"]
    resources  = ["poddisruptionbudgets"]
    verbs      = ["watch", "list"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["statefulsets", "replicasets", "daemonsets"]
    verbs      = ["watch", "list", "get"]
  }

  rule {
    api_groups = ["storage.k8s.io"]
    resources  = ["storageclasses", "csinodes"]
    verbs      = ["watch", "list", "get"]
  }

  rule {
    api_groups = ["batch", "extensions"]
    resources  = ["jobs"]
    verbs      = ["get", "list", "watch", "patch"]
  }

  rule {
    api_groups = ["coordination.k8s.io"]
    resources  = ["leases"]
    verbs      = ["create"]
  }

  rule {
    api_groups     = ["coordination.k8s.io"]
    resource_names = ["cluster-autoscaler"]
    resources      = ["leases"]
    verbs          = ["get", "update"]
  }
}

resource "kubernetes_cluster_role_binding" "cluster_autoscaler" {
  metadata {
    name = "cluster-autoscaler"
    labels = {
      "app.kubernetes.io/name" = "cluster-autoscaler"
    }
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "cluster-autoscaler"
  }

  subject {
    kind      = "ServiceAccount"
    name      = "cluster-autoscaler"
    namespace = "kube-system"
  }
}

# Metrics Server for HPA
resource "kubernetes_deployment" "metrics_server" {
  metadata {
    name      = "metrics-server"
    namespace = "kube-system"
    labels = {
      "app.kubernetes.io/name"    = "metrics-server"
      "app.kubernetes.io/version" = "v0.6.4"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        "app.kubernetes.io/name" = "metrics-server"
      }
    }

    template {
      metadata {
        labels = {
          "app.kubernetes.io/name" = "metrics-server"
        }
      }

      spec {
        service_account_name = "metrics-server"

        container {
          name  = "metrics-server"
          image = "k8s.gcr.io/metrics-server/metrics-server:v0.6.4"

          args = [
            "--cert-dir=/tmp",
            "--secure-port=4443",
            "--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname",
            "--kubelet-use-node-status-port",
            "--metric-resolution=15s"
          ]

          port {
            name           = "https"
            container_port = 4443
            protocol       = "TCP"
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "200Mi"
            }
            limits = {
              cpu    = "1000m"
              memory = "1Gi"
            }
          }

          liveness_probe {
            http_get {
              path   = "/livez"
              port   = "https"
              scheme = "HTTPS"
            }

            initial_delay_seconds = 30
            period_seconds        = 10
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path   = "/readyz"
              port   = "https"
              scheme = "HTTPS"
            }

            initial_delay_seconds = 20
            period_seconds        = 10
            failure_threshold     = 3
          }

          security_context {
            allow_privilege_escalation = false
            run_as_non_root           = true
            run_as_user               = 1000
            read_only_root_filesystem = true

            capabilities {
              drop = ["ALL"]
            }
          }

          volume_mount {
            name       = "tmp-dir"
            mount_path = "/tmp"
          }
        }

        volume {
          name = "tmp-dir"
          empty_dir {}
        }

        priority_class_name = "system-cluster-critical"

        toleration {
          key      = "CriticalAddonsOnly"
          operator = "Exists"
        }

        toleration {
          key      = "system"
          operator = "Exists"
        }

        node_selector = {
          "kubernetes.io/os" = "linux"
        }

        affinity {
          pod_anti_affinity {
            preferred_during_scheduling_ignored_during_execution {
              weight = 100
              pod_affinity_term {
                label_selector {
                  match_labels = {
                    "app.kubernetes.io/name" = "metrics-server"
                  }
                }
                topology_key = "kubernetes.io/hostname"
              }
            }
          }
        }
      }
    }
  }
}

# Vertical Pod Autoscaler (VPA) for LinkedIn Headshot Generator
resource "kubernetes_manifest" "linkedin_headshot_vpa" {
  manifest = {
    apiVersion = "autoscaling.k8s.io/v1"
    kind       = "VerticalPodAutoscaler"
    
    metadata = {
      name      = "linkedin-headshot-backend-vpa"
      namespace = "linkedin-headshot-${var.environment}"
    }

    spec = {
      targetRef = {
        apiVersion = "apps/v1"
        kind       = "Deployment"
        name       = "linkedin-headshot-backend"
      }

      updatePolicy = {
        updateMode = "Auto"
      }

      resourcePolicy = {
        containerPolicies = [{
          containerName = "linkedin-headshot-backend"
          maxAllowed = {
            cpu    = "2"
            memory = "4Gi"
          }
          minAllowed = {
            cpu    = "100m"
            memory = "128Mi"
          }
          controlledResources = ["cpu", "memory"]
        }]
      }
    }
  }
}

# Vertical Pod Autoscaler (VPA) for Dating Profile Optimizer
resource "kubernetes_manifest" "dating_optimizer_vpa" {
  manifest = {
    apiVersion = "autoscaling.k8s.io/v1"
    kind       = "VerticalPodAutoscaler"
    
    metadata = {
      name      = "dating-optimizer-backend-vpa"
      namespace = "dating-optimizer-${var.environment}"
    }

    spec = {
      targetRef = {
        apiVersion = "apps/v1"
        kind       = "Deployment"
        name       = "dating-optimizer-backend"
      }

      updatePolicy = {
        updateMode = "Auto"
      }

      resourcePolicy = {
        containerPolicies = [{
          containerName = "dating-optimizer-backend"
          maxAllowed = {
            cpu    = "4"
            memory = "8Gi"
          }
          minAllowed = {
            cpu    = "100m"
            memory = "128Mi"
          }
          controlledResources = ["cpu", "memory"]
        }]
      }
    }
  }
}

# Pod Disruption Budgets
resource "kubernetes_pod_disruption_budget_v1" "linkedin_headshot_backend" {
  metadata {
    name      = "linkedin-headshot-backend-pdb"
    namespace = "linkedin-headshot-${var.environment}"
  }

  spec {
    min_available = var.environment == "production" ? "50%" : 1

    selector {
      match_labels = {
        app       = "linkedin-headshot-backend"
        component = "backend"
      }
    }
  }
}

resource "kubernetes_pod_disruption_budget_v1" "dating_optimizer_backend" {
  metadata {
    name      = "dating-optimizer-backend-pdb"
    namespace = "dating-optimizer-${var.environment}"
  }

  spec {
    min_available = var.environment == "production" ? "50%" : 1

    selector {
      match_labels = {
        app       = "dating-optimizer-backend"
        component = "backend"
      }
    }
  }
}

# KEDA (Kubernetes Event-Driven Autoscaling) for Advanced Scaling
resource "helm_release" "keda" {
  count = var.environment == "production" ? 1 : 0

  name       = "keda"
  repository = "https://kedacore.github.io/charts"
  chart      = "keda"
  version    = "2.11.2"
  namespace  = "keda-system"
  
  create_namespace = true

  values = [
    yamlencode({
      image = {
        keda = {
          repository = "ghcr.io/kedacore/keda"
          tag        = "2.11.2"
        }
        metricsApiServer = {
          repository = "ghcr.io/kedacore/keda-metrics-apiserver"
          tag        = "2.11.2"
        }
        webhooks = {
          repository = "ghcr.io/kedacore/keda-admission-webhooks"
          tag        = "2.11.2"
        }
      }

      resources = {
        operator = {
          limits = {
            cpu    = "1"
            memory = "1000Mi"
          }
          requests = {
            cpu    = "100m"
            memory = "100Mi"
          }
        }
        metricServer = {
          limits = {
            cpu    = "1"
            memory = "1000Mi"
          }
          requests = {
            cpu    = "100m"
            memory = "100Mi"
          }
        }
        webhooks = {
          limits = {
            cpu    = "50m"
            memory = "100Mi"
          }
          requests = {
            cpu    = "10m"
            memory = "10Mi"
          }
        }
      }

      prometheus = {
        metricServer = {
          enabled = true
          port    = 9022
          path    = "/metrics"
        }
        operator = {
          enabled = true
          port    = 8080
          path    = "/metrics"
        }
        webhooks = {
          enabled = true
          port    = 8080
          path    = "/metrics"
        }
      }
    })
  ]
}

# KEDA ScaledObject for Redis-based scaling
resource "kubernetes_manifest" "dating_optimizer_redis_scaler" {
  count = var.environment == "production" ? 1 : 0

  manifest = {
    apiVersion = "keda.sh/v1alpha1"
    kind       = "ScaledObject"
    
    metadata = {
      name      = "dating-optimizer-redis-scaler"
      namespace = "dating-optimizer-production"
    }

    spec = {
      scaleTargetRef = {
        name = "dating-optimizer-backend"
      }

      minReplicaCount = 3
      maxReplicaCount = 20

      triggers = [{
        type = "redis"
        metadata = {
          address         = aws_elasticache_replication_group.main.primary_endpoint_address
          listName        = "job-queue"
          listLength      = "5"
          enableTLS       = "true"
          passwordFromEnv = "REDIS_PASSWORD"
        }
      }]
    }
  }
}

# Application Auto Scaling for RDS Read Replicas
resource "aws_appautoscaling_target" "rds_replica" {
  count = var.environment == "production" ? 1 : 0

  max_capacity       = 5
  min_capacity       = 1
  resource_id        = "cluster:${aws_rds_cluster.main[0].cluster_identifier}"
  scalable_dimension = "rds:cluster:ReadReplicaCount"
  service_namespace  = "rds"
}

resource "aws_appautoscaling_policy" "rds_replica_cpu" {
  count = var.environment == "production" ? 1 : 0

  name               = "${var.environment}-rds-replica-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.rds_replica[0].resource_id
  scalable_dimension = aws_appautoscaling_target.rds_replica[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.rds_replica[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# CloudWatch Alarms for Auto Scaling
resource "aws_cloudwatch_metric_alarm" "high_cpu_linkedin" {
  alarm_name          = "${var.environment}-linkedin-headshot-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EKS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors LinkedIn Headshot backend CPU utilization"

  dimensions = {
    ClusterName = aws_eks_cluster.main.name
    ServiceName = "linkedin-headshot-backend"
  }

  alarm_actions = [aws_sns_topic.scaling_alerts.arn]
  ok_actions    = [aws_sns_topic.scaling_alerts.arn]

  tags = merge(var.tags, {
    Name = "${var.environment}-linkedin-headshot-high-cpu"
  })
}

resource "aws_cloudwatch_metric_alarm" "high_cpu_dating" {
  alarm_name          = "${var.environment}-dating-optimizer-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EKS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Dating Profile Optimizer backend CPU utilization"

  dimensions = {
    ClusterName = aws_eks_cluster.main.name
    ServiceName = "dating-optimizer-backend"
  }

  alarm_actions = [aws_sns_topic.scaling_alerts.arn]
  ok_actions    = [aws_sns_topic.scaling_alerts.arn]

  tags = merge(var.tags, {
    Name = "${var.environment}-dating-optimizer-high-cpu"
  })
}

# SNS Topic for Scaling Alerts
resource "aws_sns_topic" "scaling_alerts" {
  name = "${var.environment}-scaling-alerts"

  tags = merge(var.tags, {
    Name = "${var.environment}-scaling-alerts"
  })
}

resource "aws_sns_topic_subscription" "scaling_email" {
  topic_arn = aws_sns_topic.scaling_alerts.arn
  protocol  = "email"
  endpoint  = var.ops_notification_email
}

# Variable for notification email
variable "ops_notification_email" {
  description = "Email for operations notifications"
  type        = string
  default     = "ops@company.com"
}