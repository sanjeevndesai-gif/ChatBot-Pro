/*
  Backend configuration for Terraform state. This file includes an example S3 backend
  but is commented out by default. Bootstrap the S3 bucket and DynamoDB table manually
  (instructions in README) then uncomment and fill the values below or pass via -backend-config.
*/

/*
terraform {
  backend "s3" {
    bucket         = "chatbot-pro-terraform-state-REPLACE"
    key            = "deploy/aws/terraform.tfstate"
    region         = var.aws_region
    dynamodb_table = "chatbot-pro-terraform-locks-REPLACE"
    encrypt        = true
  }
}
*/
