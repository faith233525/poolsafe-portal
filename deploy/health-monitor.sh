#!/bin/bash
# Health Monitoring and Alerting System for Pool Safe Inc Portal

set -e

# Configuration
APP_NAME="pool-safe-portal"
BACKEND_PORT=4001
FRONTEND_PORT=3000
HEALTH_CHECK_INTERVAL=30 # seconds
MAX_RETRIES=3
ALERT_EMAIL="admin@poolsafe.com"
LOG_FILE="/var/log/poolsafe/health-monitor.log"
METRICS_FILE="/var/log/poolsafe/metrics.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Send alert
send_alert() {
    local subject="$1"
    local message="$2"
    local urgency="$3"
    
    # Log alert
    log "ALERT [$urgency]: $subject - $message"
    
    # Send email (requires mail command)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "[$urgency] Pool Safe Portal: $subject" "$ALERT_EMAIL"
    fi
    
    # Send to webhook if configured
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"[$urgency] Pool Safe Portal Alert: $subject\n$message\"}" \
            "$SLACK_WEBHOOK" &> /dev/null || true
    fi
}

# Check service health
check_service() {
    local service_name="$1"
    local port="$2"
    local endpoint="$3"
    local expected_response="$4"
    
    local retries=0
    while [[ $retries -lt $MAX_RETRIES ]]; do
        if curl -s --connect-timeout 5 --max-time 10 "http://localhost:$port$endpoint" | grep -q "$expected_response"; then
            return 0
        fi
        ((retries++))
        sleep 2
    done
    return 1
}

# Check system metrics
check_system_metrics() {
    local metrics=""
    
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    metrics="cpu_usage:${cpu_usage},"
    
    # Memory usage
    local mem_info=$(free -m)
    local mem_total=$(echo "$mem_info" | awk 'NR==2{printf "%d", $2}')
    local mem_used=$(echo "$mem_info" | awk 'NR==2{printf "%d", $3}')
    local mem_percent=$(( (mem_used * 100) / mem_total ))
    metrics="${metrics}memory_usage:${mem_percent}%,"
    
    # Disk usage
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    metrics="${metrics}disk_usage:${disk_usage}%,"
    
    # Load average
    local load_avg=$(uptime | awk -F'load average:' '{ print $2 }' | awk '{print $1}' | sed 's/,//')
    metrics="${metrics}load_average:${load_avg},"
    
    # Network connections
    local connections=$(ss -tuln | wc -l)
    metrics="${metrics}connections:${connections},"
    
    # Database connections (PostgreSQL)
    if command -v psql &> /dev/null; then
        local db_connections=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "0")
        metrics="${metrics}db_connections:${db_connections},"
    fi
    
    echo "$metrics" | sed 's/,$//'
}

# Check database health
check_database() {
    if command -v psql &> /dev/null; then
        if sudo -u postgres psql -c "SELECT 1;" &> /dev/null; then
            return 0
        fi
    fi
    return 1
}

# Check disk space
check_disk_space() {
    local usage=$(df / | awk 'NR==2 {print $(NF-1)}' | sed 's/%//')
    if [[ $usage -gt 90 ]]; then
        return 1
    fi
    return 0
}

# Check memory usage
check_memory() {
    local mem_usage=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
    if (( $(echo "$mem_usage > 90" | bc -l) )); then
        return 1
    fi
    return 0
}

# Check log files for errors
check_logs() {
    local error_count=0
    local log_files=(
        "/var/log/poolsafe/app.log"
        "/var/log/nginx/error.log"
        "/var/log/syslog"
    )
    
    for log_file in "${log_files[@]}"; do
        if [[ -f "$log_file" ]]; then
            # Check for errors in last 5 minutes
            local recent_errors=$(find "$log_file" -newermt "5 minutes ago" -exec grep -i "error\|fatal\|critical" {} \; 2>/dev/null | wc -l)
            error_count=$((error_count + recent_errors))
        fi
    done
    
    if [[ $error_count -gt 10 ]]; then
        return 1
    fi
    return 0
}

# Performance monitoring
check_response_times() {
    local endpoints=(
        "http://localhost:$BACKEND_PORT/api/health"
        "http://localhost:$FRONTEND_PORT"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$endpoint" 2>/dev/null || echo "999")
        local threshold=5.0 # 5 seconds
        
        if (( $(echo "$response_time > $threshold" | bc -l) )); then
            warning "Slow response from $endpoint: ${response_time}s"
            return 1
        fi
    done
    
    return 0
}

# Security checks
check_security() {
    local security_issues=0
    
    # Check for failed login attempts
    local failed_logins=$(journalctl --since "5 minutes ago" | grep -i "failed\|authentication failure" | wc -l)
    if [[ $failed_logins -gt 10 ]]; then
        warning "High number of failed login attempts: $failed_logins"
        ((security_issues++))
    fi
    
    # Check for suspicious network activity
    local connections=$(ss -tuln | wc -l)
    if [[ $connections -gt 1000 ]]; then
        warning "High number of network connections: $connections"
        ((security_issues++))
    fi
    
    # Check file permissions on critical files
    local critical_files=(
        "/etc/passwd"
        "/etc/shadow"
        "/etc/ssh/sshd_config"
    )
    
    for file in "${critical_files[@]}"; do
        if [[ -f "$file" ]]; then
            local perms=$(stat -c %a "$file")
            case "$file" in
                "/etc/passwd")
                    [[ "$perms" != "644" ]] && ((security_issues++))
                    ;;
                "/etc/shadow")
                    [[ "$perms" != "640" ]] && ((security_issues++))
                    ;;
                "/etc/ssh/sshd_config")
                    [[ "$perms" != "644" ]] && ((security_issues++))
                    ;;
            esac
        fi
    done
    
    if [[ $security_issues -gt 0 ]]; then
        return 1
    fi
    return 0
}

# Comprehensive health check
run_health_check() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    local status="HEALTHY"
    local issues=()
    
    log "Starting health check..."
    
    # Check backend
    if ! check_service "Backend" "$BACKEND_PORT" "/api/health" '"ok":true'; then
        status="CRITICAL"
        issues+=("Backend service not responding")
        send_alert "Backend Service Down" "The backend service is not responding on port $BACKEND_PORT" "CRITICAL"
    else
        success "Backend service is healthy"
    fi
    
    # Check frontend
    if ! check_service "Frontend" "$FRONTEND_PORT" "/" "html"; then
        status="CRITICAL"
        issues+=("Frontend service not responding")
        send_alert "Frontend Service Down" "The frontend service is not responding on port $FRONTEND_PORT" "CRITICAL"
    else
        success "Frontend service is healthy"
    fi
    
    # Check database
    if ! check_database; then
        status="CRITICAL"
        issues+=("Database not accessible")
        send_alert "Database Connection Failed" "Cannot connect to PostgreSQL database" "CRITICAL"
    else
        success "Database is healthy"
    fi
    
    # Check disk space
    if ! check_disk_space; then
        if [[ "$status" != "CRITICAL" ]]; then
            status="WARNING"
        fi
        issues+=("Low disk space")
        send_alert "Low Disk Space" "Disk usage is above 90%" "WARNING"
    else
        success "Disk space is adequate"
    fi
    
    # Check memory
    if ! check_memory; then
        if [[ "$status" != "CRITICAL" ]]; then
            status="WARNING"
        fi
        issues+=("High memory usage")
        send_alert "High Memory Usage" "Memory usage is above 90%" "WARNING"
    else
        success "Memory usage is normal"
    fi
    
    # Check logs for errors
    if ! check_logs; then
        if [[ "$status" != "CRITICAL" ]]; then
            status="WARNING"
        fi
        issues+=("High error rate in logs")
        send_alert "High Error Rate" "Detected high number of errors in application logs" "WARNING"
    else
        success "Log analysis shows normal operation"
    fi
    
    # Check response times
    if ! check_response_times; then
        if [[ "$status" != "CRITICAL" ]]; then
            status="WARNING"
        fi
        issues+=("Slow response times")
        send_alert "Performance Degradation" "Response times are above acceptable thresholds" "WARNING"
    else
        success "Response times are normal"
    fi
    
    # Check security
    if ! check_security; then
        if [[ "$status" != "CRITICAL" ]]; then
            status="WARNING"
        fi
        issues+=("Security issues detected")
        send_alert "Security Alert" "Potential security issues detected" "WARNING"
    else
        success "Security checks passed"
    fi
    
    # Collect and log metrics
    local metrics=$(check_system_metrics)
    echo "$timestamp,$status,$metrics" >> "$METRICS_FILE"
    
    # Summary
    log "Health check completed - Status: $status"
    if [[ ${#issues[@]} -gt 0 ]]; then
        log "Issues found: ${issues[*]}"
    fi
}

# Generate health report
generate_report() {
    local hours=${1:-24}
    local report_file="/tmp/poolsafe_health_report_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "Pool Safe Inc Portal Health Report" > "$report_file"
    echo "Generated: $(date)" >> "$report_file"
    echo "Period: Last $hours hours" >> "$report_file"
    echo "================================" >> "$report_file"
    echo >> "$report_file"
    
    # Service uptime
    echo "Service Status:" >> "$report_file"
    systemctl is-active poolsafe-backend &> /dev/null && echo "  ✓ Backend: Running" >> "$report_file" || echo "  ✗ Backend: Not Running" >> "$report_file"
    systemctl is-active poolsafe-frontend &> /dev/null && echo "  ✓ Frontend: Running" >> "$report_file" || echo "  ✗ Frontend: Not Running" >> "$report_file"
    systemctl is-active nginx &> /dev/null && echo "  ✓ Nginx: Running" >> "$report_file" || echo "  ✗ Nginx: Not Running" >> "$report_file"
    echo >> "$report_file"
    
    # Recent metrics from log
    echo "Recent Metrics (Last $hours hours):" >> "$report_file"
    if [[ -f "$METRICS_FILE" ]]; then
        tail -n 100 "$METRICS_FILE" | tail -n $((hours * 2)) >> "$report_file"
    fi
    echo >> "$report_file"
    
    # Recent alerts
    echo "Recent Alerts:" >> "$report_file"
    if [[ -f "$LOG_FILE" ]]; then
        grep "ALERT" "$LOG_FILE" | tail -n 20 >> "$report_file"
    fi
    echo >> "$report_file"
    
    # System information
    echo "System Information:" >> "$report_file"
    echo "  Hostname: $(hostname)" >> "$report_file"
    echo "  OS: $(lsb_release -d | cut -f2)" >> "$report_file"
    echo "  Kernel: $(uname -r)" >> "$report_file"
    echo "  Uptime: $(uptime -p)" >> "$report_file"
    echo "  Load: $(uptime | awk -F'load average:' '{ print $2 }')" >> "$report_file"
    
    echo "Report generated: $report_file"
    
    # Optionally email the report
    if [[ "${2:-}" == "email" ]] && command -v mail &> /dev/null; then
        mail -s "Pool Safe Portal Health Report" "$ALERT_EMAIL" < "$report_file"
        echo "Report emailed to $ALERT_EMAIL"
    fi
}

# Monitoring daemon
start_monitoring() {
    log "Starting health monitoring daemon..."
    
    while true; do
        run_health_check
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Auto-recovery attempts
auto_recovery() {
    log "Attempting auto-recovery..."
    
    # Restart failed services
    if ! check_service "Backend" "$BACKEND_PORT" "/api/health" '"ok":true'; then
        log "Attempting to restart backend service..."
        sudo systemctl restart poolsafe-backend
        sleep 10
        
        if check_service "Backend" "$BACKEND_PORT" "/api/health" '"ok":true'; then
            success "Backend service recovered"
            send_alert "Service Recovery" "Backend service has been automatically restarted and is now healthy" "INFO"
        else
            error "Failed to recover backend service"
        fi
    fi
    
    if ! check_service "Frontend" "$FRONTEND_PORT" "/" "html"; then
        log "Attempting to restart frontend service..."
        sudo systemctl restart poolsafe-frontend
        sleep 10
        
        if check_service "Frontend" "$FRONTEND_PORT" "/" "html"; then
            success "Frontend service recovered"
            send_alert "Service Recovery" "Frontend service has been automatically restarted and is now healthy" "INFO"
        else
            error "Failed to recover frontend service"
        fi
    fi
}

# Main function
main() {
    case "${1:-}" in
        "monitor")
            start_monitoring
            ;;
        "check")
            run_health_check
            ;;
        "report")
            generate_report "${2:-24}" "${3:-}"
            ;;
        "recover")
            auto_recovery
            ;;
        "install")
            # Install monitoring service
            sudo tee /etc/systemd/system/poolsafe-monitor.service > /dev/null << EOF
[Unit]
Description=Pool Safe Portal Health Monitor
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=$PWD/$(basename "$0") monitor
Restart=on-failure
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
            sudo systemctl daemon-reload
            sudo systemctl enable poolsafe-monitor
            sudo systemctl start poolsafe-monitor
            success "Health monitoring service installed and started"
            ;;
        *)
            echo "Usage: $0 {monitor|check|report [hours] [email]|recover|install}"
            echo "  monitor  - Start continuous monitoring daemon"
            echo "  check    - Run single health check"
            echo "  report   - Generate health report"
            echo "  recover  - Attempt auto-recovery"
            echo "  install  - Install as systemd service"
            exit 1
            ;;
    esac
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$METRICS_FILE")"

main "$@"