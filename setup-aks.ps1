# Setup AKS for Pool Safe Inc Portal
# Run this script to connect to an existing AKS cluster

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$ClusterName,
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId
)

Write-Host "Setting up AKS connection for Pool Safe Inc Portal..." -ForegroundColor Green

# Login to Azure (if not already logged in)
try {
    az account show | Out-Null
    Write-Host "Already logged in to Azure" -ForegroundColor Green
} catch {
    Write-Host "Logging in to Azure..." -ForegroundColor Yellow
    az login
}

# Set subscription if provided
if ($SubscriptionId) {
    Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Yellow
    az account set --subscription $SubscriptionId
}

# Get AKS credentials
Write-Host "Getting AKS credentials..." -ForegroundColor Yellow
az aks get-credentials --resource-group $ResourceGroupName --name $ClusterName --overwrite-existing

# Verify connection
Write-Host "Verifying connection..." -ForegroundColor Yellow
kubectl cluster-info

Write-Host "AKS setup complete!" -ForegroundColor Green
Write-Host "You can now deploy your application using: kubectl apply -f k8s/" -ForegroundColor Cyan

# Example usage:
Write-Host ""
Write-Host "Example usage:" -ForegroundColor Cyan
Write-Host ".\setup-aks.ps1 -ResourceGroupName 'poolsafe-rg' -ClusterName 'poolsafe-aks' -SubscriptionId 'your-subscription-id'" -ForegroundColor Gray