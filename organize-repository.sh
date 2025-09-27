#!/bin/bash
# Repository Organization Script
# This script cleans up duplicate files and organizes the repository structure

echo "🧹 Pool Safe Inc Portal - Repository Organization"
echo "================================================"

# Create docs organization
mkdir -p docs/deployment
mkdir -p docs/testing
mkdir -p docs/production
mkdir -p scripts/deployment
mkdir -p scripts/testing

# Move deployment guides to proper location
echo "📁 Organizing deployment documentation..."
mv DEPLOYMENT-READY.md docs/deployment/
mv DEPLOYMENT-SUMMARY.md docs/deployment/
mv DEPLOYMENT.md docs/deployment/
mv DEPLOYMENT_CHECKLIST.md docs/deployment/
mv VPS-DEPLOYMENT-GUIDE.md docs/deployment/
mv PRODUCTION-DEPLOYMENT-GUIDE.md docs/deployment/
mv PRODUCTION-DEPLOYMENT-READY.md docs/deployment/
mv HOSTPAPA-DEPLOYMENT-GUIDE.md docs/deployment/
mv LIVE-DEPLOYMENT-GUIDE.md docs/deployment/

# Move testing files
echo "🧪 Organizing testing files..."
mv test-complete-system.html docs/testing/
mv test-integration.html docs/testing/
mv test-system.html docs/testing/
mv test-report.html docs/testing/
mv TESTING-GUIDE.md docs/testing/

# Move scripts to proper location
echo "🔧 Organizing scripts..."
mv deploy-to-vps.sh scripts/deployment/
mv setup-vps.sh scripts/deployment/
mv setup-aks.ps1 scripts/deployment/
mv setup-dev.bat scripts/deployment/
mv setup-dev.sh scripts/deployment/
mv setup-kind.ps1 scripts/deployment/
mv production-health-check.sh scripts/deployment/

mv test-system.ps1 scripts/testing/
mv simple-test.ps1 scripts/testing/
mv test-backend-health.ps1 scripts/testing/
mv integration-test.js scripts/testing/
mv test-api.js scripts/testing/

# Remove duplicate/outdated files
echo "🗑️ Removing duplicate files..."
rm -f COMPLETION-SUMMARY.md
rm -f DEPLOYMENT-RUNBOOK.md
rm -f FIXES_SUMMARY.md
rm -f FINAL-DEPLOYMENT-READY.txt
rm -f FINAL-DEPLOYMENT-REPORT.md
rm -f FINAL-HOSTPAPA-DEPLOYMENT.md
rm -f FINAL-VALIDATION-REPORT.md
rm -f HOSTPAPA-READY.md
rm -f PRODUCTION-LIVE-SUMMARY.md
rm -f STANDARDS-COMPLIANCE-REPORT.md
rm -f start-backend.bat
rm -f vps-package.json

# Keep only main README and one comprehensive deployment guide
echo "📋 Creating final documentation structure..."

echo "✅ Repository organization complete!"
echo ""
echo "📁 Final Structure:"
echo "   docs/deployment/    - All deployment guides and checklists"
echo "   docs/testing/       - Testing documentation and tools"  
echo "   scripts/deployment/ - Production deployment scripts"
echo "   scripts/testing/    - Testing and validation scripts"
echo "   backend/           - Backend application code"
echo "   frontend/          - Frontend application code"
echo "   k8s/               - Kubernetes configurations"
echo "   deploy/            - Docker and container deployment"
echo "   cypress/           - End-to-end testing"
echo ""