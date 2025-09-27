#!/bin/bash

# Pool Safe Inc Portal - Health Check Script
# Checks if all services are running correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏥 Pool Safe Inc Portal - Health Check${NC}"
echo "======================================="
echo ""

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local name=$2
    local expected_code=${3:-200}
    
    echo -n "Checking $name... "
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null); then
        if [ "$response" = "$expected_code" ]; then
            echo -e "${GREEN}✅ OK (HTTP $response)${NC}"
            return 0
        else
            echo -e "${RED}❌ FAILED (HTTP $response)${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ FAILED (No response)${NC}"
        return 1
    fi
}

# Function to check process
check_process() {
    local process_name=$1
    local display_name=$2
    
    echo -n "Checking $display_name... "
    
    if pgrep -f "$process_name" > /dev/null; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not running${NC}"
        return 1
    fi
}

# Function to check file
check_file() {
    local file_path=$1
    local display_name=$2
    
    echo -n "Checking $display_name... "
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅ Exists${NC}"
        return 0
    else
        echo -e "${RED}❌ Missing${NC}"
        return 1
    fi
}

# System checks
echo -e "${BLUE}�️  System Status${NC}"
echo "----------------"

# Check disk space
echo -n "Disk space... "
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "${GREEN}✅ OK (${DISK_USAGE}% used)${NC}"
else
    echo -e "${RED}❌ LOW (${DISK_USAGE}% used)${NC}"
fi

# Check memory
echo -n "Memory usage... "
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEM_USAGE" -lt 90 ]; then
    echo -e "${GREEN}✅ OK (${MEM_USAGE}% used)${NC}"
else
    echo -e "${RED}❌ HIGH (${MEM_USAGE}% used)${NC}"
fi

# Check load average
echo -n "Load average... "
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
if (( $(echo "$LOAD < 2.0" | bc -l) )); then
    echo -e "${GREEN}✅ OK ($LOAD)${NC}"
else
    echo -e "${YELLOW}⚠️  HIGH ($LOAD)${NC}"
fi

echo ""

# Service checks
echo -e "${BLUE}� Service Status${NC}"
echo "----------------"

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx: Running"
    nginx -t &>/dev/null && echo "   Configuration: Valid" || echo "   Configuration: Invalid"
else
    echo "❌ Nginx: Not running"
fi

# Check PostgreSQL (if using)
if systemctl list-unit-files | grep -q postgresql; then
    if systemctl is-active --quiet postgresql; then
        echo "✅ PostgreSQL: Running"
    else
        echo "❌ PostgreSQL: Not running"
    fi
fi

# Check firewall
if command -v ufw &> /dev/null; then
    ufw_status=$(ufw status | head -1)
    echo "🔒 Firewall: $ufw_status"
fi

echo ""

# Network & Ports
echo "🌐 NETWORK STATUS"
echo "----------------"

# Check if application port is listening (backend default 4000)
if netstat -tln | grep -q ":4000 "; then
    echo "✅ Application Port 4000: Listening"
else
    echo "❌ Application Port 4000: Not listening"
fi
# Verify health endpoints
check_endpoint "http://localhost/api/health" "Nginx -> Backend Health" 200 || true
check_endpoint "http://localhost/api/healthz" "Nginx -> Backend Liveness" 200 || true

# Check if Nginx is listening
if netstat -tln | grep -q ":80 "; then
    echo "✅ HTTP Port 80: Listening"
else
    echo "❌ HTTP Port 80: Not listening"
fi

if netstat -tln | grep -q ":443 "; then
    echo "✅ HTTPS Port 443: Listening"
else
    echo "⚠️  HTTPS Port 443: Not listening (SSL not configured)"
fi

echo ""

# SSL Certificate Status
echo "🔐 SSL CERTIFICATE"
echo "------------------"
if [ -f "/etc/letsencrypt/live/yourdomain.com/fullchain.pem" ]; then
    cert_expiry=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/yourdomain.com/fullchain.pem" | cut -d= -f2)
    echo "SSL Certificate expires: $cert_expiry"
    
    # Check if certificate expires in next 30 days
    exp_epoch=$(date -d "$cert_expiry" +%s)
    current_epoch=$(date +%s)
    days_until_expiry=$(( (exp_epoch - current_epoch) / 86400 ))
    
    if [ $days_until_expiry -lt 30 ]; then
        echo "⚠️  WARNING: SSL certificate expires in $days_until_expiry days!"
    else
        echo "✅ SSL certificate is valid ($days_until_expiry days remaining)"
    fi
else
    echo "❌ SSL certificate not found"
fi

echo ""

# Application Logs
echo "📝 RECENT LOGS"
echo "-------------"
echo "Last 5 application errors:"
if [ -f "/var/log/poolsafe/error.log" ]; then
    tail -5 /var/log/poolsafe/error.log | sed 's/^/  /'
else
    echo "  No error log found"
fi

echo ""
echo "Last 5 access entries:"
if [ -f "/var/log/poolsafe/access.log" ]; then
    tail -5 /var/log/poolsafe/access.log | sed 's/^/  /'
else
    echo "  No access log found"
fi

