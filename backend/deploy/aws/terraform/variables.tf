variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "repo_prefix" {
  type    = string
  default = "chatbot-pro"
}

variable "create_vpc" {
  type    = bool
  default = true
  description = "If true Terraform will create a VPC, else provide vpc_id and subnet ids."
}

variable "vpc_id" {
  type    = string
  default = ""
}

variable "public_subnet_ids" {
  type    = list(string)
  default = []
}

variable "private_subnet_ids" {
  type    = list(string)
  default = []
}

variable "enable_nat_gateway" {
  type    = bool
  default = false
}

variable "single_nat_gateway" {
  type    = bool
  default = true
}

variable "assign_public_ip" {
  type    = bool
  default = false
}

variable "ingress_cidr" {
  type    = string
  default = "0.0.0.0/0"
}

variable "acm_certificate_arn" {
  type    = string
  default = ""
  description = "ACM certificate ARN for api.tridlio.com (required for prod HTTPS listener)."
}

variable "ecr_repositories" {
  type = list(string)
  default = ["gateway","auth-service","chat","book-appointment","i18n-service"]
}

variable "github_repo" {
  type = string
  default = "arnan/ChatBot-Pro"
  description = "GitHub repo in 'owner/repo' format used in OIDC role 'sub' claim. Replace with your repo path."
}

variable "cloudfront_enabled" {
  type    = bool
  default = true
}

variable "frontend_bucket_name" {
  type    = string
  default = "chatbot-pro-frontend-REPLACE"
}

variable "redis_enabled" {
  type    = bool
  default = false
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "env_desired_counts" {
  type = map(number)
  default = {
    gateway = 1
    auth-service = 0
    chat = 0
    book-appointment = 0
    i18n-service = 0
  }
}
variable "aws_region" {
  type    = string
  default = "us-east-1"
  description = "AWS region to deploy into."
}

variable "repo_prefix" {
  type    = string
  default = "chatbot-pro"
  description = "Prefix for ECR repository names and ECS resources."
}

variable "vpc_id" {
  type        = string
  description = "VPC ID for ALB and ECS resources."
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnet IDs for the internet-facing ALB."
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for ECS tasks."
}

variable "assign_public_ip" {
  type        = bool
  default     = false
  description = "Whether to assign public IPs to ECS tasks."
}

variable "ingress_cidr" {
  type        = string
  default     = "0.0.0.0/0"
  description = "CIDR allowed to access the gateway ALB."
}
