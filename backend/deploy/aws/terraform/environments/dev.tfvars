aws_region = "ap-south-1"
environment = "dev"
repo_prefix = "chatbot-pro"
create_vpc = true
enable_nat_gateway = false
assign_public_ip = true
frontend_bucket_name = "chatbot-pro-frontend-dev-REPLACE"
redis_enabled = false
env_desired_counts = {
  gateway = 1
  auth-service = 0
  chat = 0
  book-appointment = 0
  i18n-service = 0
}
