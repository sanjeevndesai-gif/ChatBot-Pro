resource "aws_ecs_cluster" "main" {
  name = "${local.prefix}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "service_logs" {
  for_each = toset(var.ecr_repositories)
  name = "/ecs/${var.repo_prefix}-${each.value}"
  retention_in_days = var.environment == "prod" ? 30 : 7
}
