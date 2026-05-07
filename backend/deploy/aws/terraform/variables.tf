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
