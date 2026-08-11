param(
  [string]$Prefix = "chatbot-app",
  [string]$Region = "ap-south-1",
  [string]$Profile = "admin",
  [switch]$UseKms,
  [string]$KmsKeyId = ""
)

Write-Host "This is a template. It WILL NOT execute any aws commands."
Write-Host "Fill values locally and run the printed commands yourself (or paste into your secure runner)."

$parameters = @(
  @{ Name = "/$Prefix/jwt-secret";       Desc = "JWT signing secret"; Placeholder = "<JWT_SECRET>" },
  @{ Name = "/$Prefix/oauth2-client-id";  Desc = "OAuth2 client id";  Placeholder = "<OAUTH2_CLIENT_ID>" },
  @{ Name = "/$Prefix/oauth2-client-secret"; Desc = "OAuth2 client secret"; Placeholder = "<OAUTH2_CLIENT_SECRET>" },
  @{ Name = "/$Prefix/mongodb-auth";      Desc = "MongoDB URI for auth DB"; Placeholder = "<MONGODB_AUTH_URI>" },
  @{ Name = "/$Prefix/mongodb-book";      Desc = "MongoDB URI for book DB"; Placeholder = "<MONGODB_BOOK_URI>" },
  @{ Name = "/$Prefix/mongodb-chat";      Desc = "MongoDB URI for chat DB"; Placeholder = "<MONGODB_CHAT_URI>" },
  @{ Name = "/$Prefix/mongodb-i18n";      Desc = "MongoDB URI for i18n DB"; Placeholder = "<MONGODB_I18N_URI>" },
  @{ Name = "/$Prefix/whatsapp-token";    Desc = "WhatsApp token"; Placeholder = "<WHATSAPP_TOKEN>" },
  @{ Name = "/$Prefix/whatsapp-phone-id"; Desc = "WhatsApp phone id"; Placeholder = "<WHATSAPP_PHONE_ID>" },
  @{ Name = "/$Prefix/openai-api-key";    Desc = "OpenAI API key"; Placeholder = "<OPENAI_API_KEY>" }
)

foreach ($p in $parameters) {
  $cmd = "aws ssm put-parameter --name '$($p.Name)' --type SecureString --value 'REPLACE_ME' --overwrite --region $Region"
  if ($Profile -ne "") { $cmd += " --profile $Profile" }
  if ($UseKms -and $KmsKeyId -ne "") { $cmd += " --key-id $KmsKeyId" }

  Write-Host "# $($p.Desc) -> $($p.Name)"
  Write-Host $cmd
  Write-Host ""
}

Write-Host "# To execute: copy a printed command, replace 'REPLACE_ME' with the secret value, and run it locally." 
Write-Host "# Example (PowerShell):"
Write-Host "# Read-Host -AsSecureString | ConvertFrom-SecureString | Out-File secret.txt  # never store this in repo"
Write-Host "# aws ssm put-parameter --name '/$Prefix/jwt-secret' --type SecureString --value '<your-secret>' --overwrite --region $Region --profile $Profile"

Write-Host "Done. This template avoids storing secrets in source control."
