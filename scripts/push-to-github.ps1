# Push AI Customer Support Agent to GitHub
# Prerequisites: gh auth login (one-time)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Checking GitHub authentication..."
gh auth status
if ($LASTEXITCODE -ne 0) {
    Write-Host "Run: gh auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host "Creating repository and pushing to GitHub..."
gh repo create ai-customer-support-agent `
    --public `
    --source=. `
    --remote=origin `
    --description "AI Customer Support Agent for Samsung D2C e-commerce with RAG, OMS, Courier, and Docker" `
    --push

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success! Repository URL:" -ForegroundColor Green
    gh repo view --web 2>$null
    git remote get-url origin
}
