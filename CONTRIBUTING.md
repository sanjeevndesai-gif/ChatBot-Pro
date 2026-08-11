CONTRIBUTING — CI / Deployment notes
===================================

This project uses two focused GitHub Actions workflows for deployments:

- `.github/workflows/deploy-backend-images.yml` — Builds backend Docker images and pushes them to ECR. Optionally triggers an ECS service update when `ECS_CLUSTER_NAME` repo variable is set.
- `.github/workflows/deploy-frontend.yml` — Builds the Angular frontend and deploys the static site to S3 + CloudFront.

How workflows are triggered
- By default these run on pushes to `main` and `develop` for paths under `backend/` and `frontend/chat_bot/` respectively.
- Both workflows support `workflow_dispatch` for manual runs (with optional inputs).

Required GitHub Secrets and Repository Variables
Set these in the repository `Settings` → `Secrets and variables` → `Actions`.

Secrets:
- `AWS_ROLE_ARN` or `AWS_ROLE_TO_ASSUME` — the OIDC role ARN GitHub Actions should assume (required).
- `STATIC_SITE_DOMAIN` — frontend S3 bucket / domain name (for static deploy).
- `HOSTED_ZONE_ID` — Route53 hosted zone id (for CloudFormation static-site stack).
- `ACM_CERT_ARN` — ACM certificate ARN for CloudFront.
- `CLOUDFRONT_DISTRIBUTION_ID` — (optional) distribution id for invalidation.
- `VPC_ID`, `PUBLIC_SUBNET_IDS`, `PRIVATE_SUBNET_IDS` — used by backend CloudFormation (optional).

Repository variables:
- `ECS_CLUSTER_NAME` — (optional) when set the backend workflow will attempt `aws ecs update-service --force-new-deployment` for each service.

Notes & best practices
- Keep the IAM role used by CI to least-privilege. The policy in `backend/deploy/aws/ci-deploy-policy.json` is a starting point and should be hardened per account/resource.
- Use the backend-only workflow to build images and the frontend-only workflow to deploy static assets — this avoids duplication and gives fine-grained control.
- To trigger a single workflow manually: go to the Actions tab → select the workflow → Run workflow.

Questions or changes
- If you want this documentation included in `README.md` instead, tell me and I will move it.
