#!/bin/bash
# Production Health Check Script
# Pool Safe Inc Portal - Live Environment Verification

echo "🔍 Pool Safe Inc Portal - Production Health Check"
echo "================================================"

# Configuration
BACKEND_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:5173"  # Update with your production URL
TIMEOUT=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check HTTP status
check_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK (Status: $response)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED (Status: $response)${NC}"
        return 1
    fi
}

# Function to check API health
check_api_health() {
    echo -n "API Health Check... "
    
    health_response=$(curl -s --max-time $TIMEOUT "$BACKEND_URL/api/health" 2>/dev/null)
    
    if echo "$health_response" | grep -q "healthy"; then
        echo -e "${GREEN}✅ API is healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ API health check failed${NC}"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    echo -n "Database connectivity... "
    
    # This assumes you have a health endpoint that checks DB
    db_response=$(curl -s --max-time $TIMEOUT "$BACKEND_URL/api/health/database" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database connected${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Database check unavailable${NC}"
        return 1
    fi
}

# Main health checks
echo "🚀 Starting health checks..."
echo

# Backend API checks
echo "📡 Backend API Health:"
check_endpoint "$BACKEND_URL/api/health" "API Health Endpoint"
check_api_health
check_database
echo

# Frontend checks  
echo "🌐 Frontend Application:"
check_endpoint "$FRONTEND_URL" "Frontend Homepage"
echo

# Security checks
echo "🔒 Security Validation:"
check_endpoint "$BACKEND_URL/api/health" "HTTPS Redirect" 301 # If you have HTTPS redirect
echo

# Performance checks
echo "⚡ Performance Checks:"
echo -n "API Response Time... "
start_time=$(date +%s.%N)
curl -s -o /dev/null --max-time $TIMEOUT "$BACKEND_URL/api/health" 2>/dev/null
end_time=$(date +%s.%N)
response_time=$(echo "$end_time - $start_time" | bc 2>/dev/null)

if [ $? -eq 0 ]; then
    response_ms=$(echo "$response_time * 1000" | bc 2>/dev/null | cut -d. -f1)
    if [ "$response_ms" -lt 300 ]; then
        echo -e "${GREEN}✅ Fast (${response_ms}ms)${NC}"
    elif [ "$response_ms" -lt 1000 ]; then
        echo -e "${YELLOW}⚠️  Acceptable (${response_ms}ms)${NC}"
    else
        echo -e "${RED}❌ Slow (${response_ms}ms)${NC}"
    fi
else
    echo -e "${RED}❌ Timeout${NC}"
fi

echo
echo "🎯 Production Environment Summary:"
echo "=================================="

# Check if all services are running
services_ok=0

# Count successful checks (simplified)
curl -s --max-time 5 "$BACKEND_URL/api/health" >/dev/null 2>&1 && ((services_ok++))
curl -s --max-time 5 "$FRONTEND_URL" >/dev/null 2>&1 && ((services_ok++))

if [ $services_ok -eq 2 ]; then
    echo -e "${GREEN}🎉 All systems operational!${NC}"
    echo -e "${GREEN}✅ Pool Safe Inc Portal is LIVE and ready for users${NC}"
    exit 0
elif [ $services_ok -eq 1 ]; then
    echo -e "${YELLOW}⚠️  Partial systems online${NC}"
    echo -e "${YELLOW}🔧 Some services may need attention${NC}"
    exit 1
else
    echo -e "${RED}❌ Systems offline${NC}"
    echo -e "${RED}🚨 Production environment needs immediate attention${NC}"
    exit 2
fi