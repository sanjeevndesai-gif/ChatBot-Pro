provider "aws" {
  region = var.aws_region
}

terraform {
  # backend is configured in backend.tf or via CLI - see README for bootstrap steps
}
