# AWS Deployment Templates (ECS / ECR)

This directory contains starter templates to deploy the ChatBot-Pro services to AWS ECS/ECR.

## 1) CloudFormation (YAML)

- File: `cloudformation.yml`
- Creates:
  - ECR repositories for each service
  - ECS cluster + IAM roles
  - Example Fargate Task Definition + Service for the Gateway
  - Application Load Balancer to expose the gateway
  - Readiness-based target group health check (`/actuator/health/readiness`)

### To deploy
1. Package & deploy using AWS CLI:
   ```sh
   aws cloudformation deploy \
     --template-file deploy/aws/cloudformation.yml \
     --stack-name chatbot-pro \
     --capabilities CAPABILITY_NAMED_IAM \
     --parameter-overrides \
         VpcId=YOUR_VPC_ID \
         PublicSubnetIds="subnet-... subnet-..." \
         PrivateSubnetIds="subnet-... subnet-..."
   ```

## 2) Terraform

- Directory: `deploy/aws/terraform`
- Contains basic resources for:
  - ECR repositories for all services
  - ECS cluster + execution role + gateway task definition
  - ALB + target group + listener + ECS service wiring
  - Readiness-based target group health check (`/actuator/health/readiness`)

### To run
```sh
cd deploy/aws/terraform
terraform init
terraform apply
```

Required Terraform variables:
- `vpc_id`
- `public_subnet_ids`
- `private_subnet_ids`

## 3) CDK (TypeScript)

- Directory: `deploy/aws/cdk`
- Provides a minimal CDK app that creates ECR repos and an ECS cluster.
- Extend `lib/chatbot-pro-stack.ts` to add ECS services / ALB / networking.

### To run
```sh
cd deploy/aws/cdk
npm install
npm run build
npm run cdk synth
npm run cdk deploy
```

## 4) CI Pipeline (Build + Push To ECR)

- Workflow file: `.github/workflows/build-push-ecr.yml`
- Trigger: push to `main` (for service changes) or manual dispatch
- Builds and pushes images for:
  - auth-service
  - book-appointment
  - chat
  - gateway
  - eureka

Set this secret in GitHub Actions:
- `AWS_ROLE_TO_ASSUME` (OIDC role ARN with ECR push permissions)

Optional environment overrides in workflow:
- `AWS_REGION`
- `ECR_REPOSITORY_PREFIX`
