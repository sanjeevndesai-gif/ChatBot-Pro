locals {
  prefix = "${var.repo_prefix}-${var.environment}"
  ecr_map = { for name in var.ecr_repositories : name => "${var.repo_prefix}-${name}" }
}
