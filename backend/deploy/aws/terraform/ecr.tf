/* ECR repositories created using for_each */
resource "aws_ecr_repository" "repos" {
  for_each = toset(var.ecr_repositories)
  name = "${var.repo_prefix}-${each.value}"
  image_scanning_configuration { scan_on_push = true }
  lifecycle_policy {
    policy = jsonencode({ rules = [{ rulePriority = 1, description = "Keep last 20", selection = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 20 }, action = { type = "expire" } }] })
  }
  tags = { Name = "${local.prefix}-ecr-${each.value}" }
}

output "ecr_repository_urls" {
  value = { for k, r in aws_ecr_repository.repos : k => r.repository_url }
}
