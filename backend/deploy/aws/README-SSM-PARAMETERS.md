# SSM Parameter Store — Creating SecureString parameters

This directory previously contained `ssm-put-parameters.ps1` which had hard-coded secrets. That file was removed.

Use the template `ssm-put-parameters.template.ps1` to generate `aws ssm put-parameter` commands with placeholders. The template does NOT execute any AWS commands or store secret values in the repository.

Recommended workflow
- Run the template to print commands locally:
  ```powershell
  pwsh backend/deploy/aws/ssm-put-parameters.template.ps1 -Prefix chatbot-app -Region ap-south-1 -Profile admin
  ```
- For each printed command, replace `REPLACE_ME` with the secret in your local shell or CI runner that has secure secret access. Do not paste secrets into source files.
- To use a customer-managed CMK (recommended for stricter access), add `--key-id <CMK-ARN>` when running the command.

Security notes
- Rotate any credentials that were previously committed to git (Mongo URIs, JWT secret, OAuth secrets, OpenAI key).
- Remove secrets from git history if they were pushed (use `git filter-repo` or the BFG Repo-Cleaner).
- Ensure ECS task execution role and task role have `ssm:GetParameter` and (if using CMK) `kms:Decrypt` for the specific parameter ARNs and CMK.

Automation
- For automated bootstrap in CI, store secret values in GitHub Actions secrets or use your secret manager, and run the `aws ssm put-parameter` commands from a secure workflow job (no secret values in repo).

If you want, I can add an example GitHub Actions job that writes SSM parameters from repository secrets.
