aws_region = "ap-south-1"
environment = "prod"
repo_prefix = "chatbot-pro"
create_vpc = true
enable_nat_gateway = true
assign_public_ip = false
frontend_bucket_name = "chatbot-pro-frontend-prod-REPLACE"
redis_enabled = true
redis_node_type = "cache.t4g.small"
env_desired_counts = {
  gateway = 2
  auth-service = 1
  chat = 1
  book-appointment = 1
  i18n-service = 1
}
