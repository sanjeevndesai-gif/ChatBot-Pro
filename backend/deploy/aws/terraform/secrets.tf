/* Secrets manager entries should be created outside of Terraform or using import. We provide metadata outputs for operators. */
variable "secrets_list" {
  type = list(string)
  default = ["JWT_SECRET","MONGO_URI","WHATSAPP_TOKEN","OPENAI_API_KEY","REDIS_PASSWORD"]
}

output "secrets_expected" {
  value = var.secrets_list
}
