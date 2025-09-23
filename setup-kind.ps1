# Setup Kind for Pool Safe Inc Portal
# Run this script to set up a local Kubernetes cluster with Kind

Write-Host "Setting up Kind cluster for Pool Safe Inc Portal..." -ForegroundColor Green

# Check if Kind is installed
if (!(Get-Command kind -ErrorAction SilentlyContinue)) {
    Write-Host "Kind is not installed. Installing Kind..." -ForegroundColor Yellow
    
    # Download and install Kind
    $kindVersion = "v0.20.0"
    $kindUrl = "https://kind.sigs.k8s.io/dl/$kindVersion/kind-windows-amd64"
    $kindPath = "$env:USERPROFILE\AppData\Local\Microsoft\WindowsApps\kind.exe"
    
    Write-Host "Downloading Kind..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $kindUrl -OutFile $kindPath
    
    Write-Host "Kind installed successfully!" -ForegroundColor Green
}

# Create Kind cluster configuration
$kindConfig = @"
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: poolsafe-portal
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
- role: worker
- role: worker
"@

$kindConfig | Out-File -FilePath "kind-config.yaml" -Encoding UTF8

# Create the cluster
Write-Host "Creating Kind cluster..." -ForegroundColor Yellow
kind create cluster --config kind-config.yaml --name poolsafe-portal

# Install NGINX Ingress Controller
Write-Host "Installing NGINX Ingress Controller..." -ForegroundColor Yellow
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress controller to be ready
Write-Host "Waiting for ingress controller to be ready..." -ForegroundColor Yellow
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=90s

Write-Host "Kind cluster setup complete!" -ForegroundColor Green
Write-Host "Cluster name: poolsafe-portal" -ForegroundColor Cyan
Write-Host "You can now deploy your application using: kubectl apply -f k8s/" -ForegroundColor Cyan