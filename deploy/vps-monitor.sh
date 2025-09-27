#!/bin/bash

# VPS System Monitoring Script
# Comprehensive monitoring for Pool Safe Inc Portal VPS deployment

set -euo pipefail

# Configuration
LOG_FILE="/var/log/vps-monitor.log"
ALERT_EMAIL="admin@poolsafeinc.com"
THRESHOLDS_FILE="/etc/vps-monitor.conf"
METRICS_DIR="/var/lib/vps-metrics"
WEB_DIR="/var/www/html/monitoring"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create directories
mkdir -p "$METRICS_DIR" "$WEB_DIR"

# Default thresholds
DEFAULT_CPU_THRESHOLD=80
DEFAULT_MEMORY_THRESHOLD=85
DEFAULT_DISK_THRESHOLD=90
DEFAULT_LOAD_THRESHOLD=5.0

# Load custom thresholds if they exist
if [[ -f "$THRESHOLDS_FILE" ]]; then
    source "$THRESHOLDS_FILE"
fi

CPU_THRESHOLD=${CPU_THRESHOLD:-$DEFAULT_CPU_THRESHOLD}
MEMORY_THRESHOLD=${MEMORY_THRESHOLD:-$DEFAULT_MEMORY_THRESHOLD}
DISK_THRESHOLD=${DISK_THRESHOLD:-$DEFAULT_DISK_THRESHOLD}
LOAD_THRESHOLD=${LOAD_THRESHOLD:-$DEFAULT_LOAD_THRESHOLD}

# Logging function
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Get system metrics
get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' | cut -d'%' -f1
}

get_memory_usage() {
    free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}'
}

get_disk_usage() {
    df -h / | awk 'NR==2 {print $5}' | sed 's/%//'
}

get_load_average() {
    uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//'
}

get_network_stats() {
    # Network interface statistics
    cat /proc/net/dev | grep -E "(eth0|ens|enp)" | head -n1 | awk '{print "RX:" $2 " TX:" $10}'
}

get_service_status() {
    local service=$1
    # Prefer systemd status if a unit exists; otherwise check PM2
    if systemctl list-unit-files | grep -q "^$service"; then
        if systemctl is-active --quiet "$service"; then
            echo "running"
            return
        fi
    fi
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 ls | grep -q "$service" | grep -q "online"; then
            echo "running"
            return
        fi
    fi
    echo "stopped"
}

# Check Pool Safe specific services
check_poolsafe_services() {
    local backend_status=$(get_service_status "poolsafe-backend")
    local nginx_status=$(get_service_status "nginx")
    local db_status="unknown"
    
    # Check database connection
    if curl -f -s http://localhost/api/health > /dev/null; then
        db_status="connected"
    else
        db_status="disconnected"
    fi
    
    echo "backend:$backend_status,nginx:$nginx_status,database:$db_status"
}

# Generate alerts
generate_alert() {
    local type=$1
    local message=$2
    local severity=$3
    
    log "ALERT [$severity] $type: $message"
    
    # Store alert in metrics
    echo "$(date '+%Y-%m-%d %H:%M:%S'),$type,$severity,$message" >> "$METRICS_DIR/alerts.csv"
    
    # Send email if configured
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "VPS Alert: $type" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Performance monitoring
monitor_performance() {
    local cpu_usage=$(get_cpu_usage)
    local memory_usage=$(get_memory_usage)
    local disk_usage=$(get_disk_usage)
    local load_avg=$(get_load_average)
    local services=$(check_poolsafe_services)
    local network=$(get_network_stats)
    
    # Store metrics
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "$timestamp,$cpu_usage,$memory_usage,$disk_usage,$load_avg,$network,$services" >> "$METRICS_DIR/system.csv"
    
    # Check thresholds and generate alerts
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        generate_alert "CPU" "CPU usage is ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)" "HIGH"
    fi
    
    if (( $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc -l) )); then
        generate_alert "MEMORY" "Memory usage is ${memory_usage}% (threshold: ${MEMORY_THRESHOLD}%)" "HIGH"
    fi
    
    if (( disk_usage > DISK_THRESHOLD )); then
        generate_alert "DISK" "Disk usage is ${disk_usage}% (threshold: ${DISK_THRESHOLD}%)" "CRITICAL"
    fi
    
    if (( $(echo "$load_avg > $LOAD_THRESHOLD" | bc -l) )); then
        generate_alert "LOAD" "Load average is ${load_avg} (threshold: ${LOAD_THRESHOLD})" "MEDIUM"
    fi
    
    # Check services
    if [[ "$services" == *"backend:stopped"* ]]; then
        generate_alert "SERVICE" "Pool Safe backend service is down" "CRITICAL"
    fi
    
    if [[ "$services" == *"nginx:stopped"* ]]; then
        generate_alert "SERVICE" "Nginx service is down" "CRITICAL"
    fi
    
    if [[ "$services" == *"database:disconnected"* ]]; then
        generate_alert "DATABASE" "Database connection failed" "CRITICAL"
    fi
    
    log "Metrics collected - CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Disk: ${disk_usage}%, Load: ${load_avg}"
}

# Generate HTML dashboard
generate_dashboard() {
    local html_file="$WEB_DIR/index.html"
    local timestamp=$(date)
    
    # Get current metrics
    local cpu_usage=$(get_cpu_usage)
    local memory_usage=$(get_memory_usage)
    local disk_usage=$(get_disk_usage)
    local load_avg=$(get_load_average)
    local uptime=$(uptime -p)
    local services=$(check_poolsafe_services)
    
    # Parse services
    local backend_status=$(echo "$services" | cut -d',' -f1 | cut -d':' -f2)
    local nginx_status=$(echo "$services" | cut -d',' -f2 | cut -d':' -f2)
    local db_status=$(echo "$services" | cut -d',' -f3 | cut -d':' -f2)
    
    cat > "$html_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pool Safe Inc - VPS Monitoring Dashboard</title>
    <meta http-equiv="refresh" content="60">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-left: 4px solid #667eea; }
        .card h3 { color: #667eea; margin-bottom: 15px; font-size: 1.3em; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; }
        .metric-label { font-weight: 500; }
        .metric-value { padding: 5px 12px; border-radius: 20px; font-weight: bold; }
        .status-running { background: #d4edda; color: #155724; }
        .status-stopped { background: #f8d7da; color: #721c24; }
        .status-connected { background: #d1ecf1; color: #0c5460; }
        .status-disconnected { background: #f8d7da; color: #721c24; }
        .usage-low { background: #d4edda; color: #155724; }
        .usage-medium { background: #fff3cd; color: #856404; }
        .usage-high { background: #f8d7da; color: #721c24; }
        .footer { text-align: center; margin-top: 30px; color: #666; }
        .last-updated { background: white; padding: 15px; border-radius: 10px; text-align: center; color: #666; margin-bottom: 20px; }
        .progress-bar { width: 100%; height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden; margin-top: 5px; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .progress-low { background: linear-gradient(90deg, #28a745, #20c997); }
        .progress-medium { background: linear-gradient(90deg, #ffc107, #fd7e14); }
        .progress-high { background: linear-gradient(90deg, #dc3545, #e83e8c); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏊‍♀️ Pool Safe Inc VPS Monitor</h1>
            <p>Real-time system monitoring and health dashboard</p>
        </div>
        
        <div class="last-updated">
            📅 Last Updated: $timestamp | 🔄 Auto-refresh every 60 seconds
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>🖥️ System Resources</h3>
                <div class="metric">
                    <span class="metric-label">CPU Usage:</span>
                    <span class="metric-value $(if (( $(echo "$cpu_usage > 80" | bc -l) )); then echo "usage-high"; elif (( $(echo "$cpu_usage > 60" | bc -l) )); then echo "usage-medium"; else echo "usage-low"; fi)">${cpu_usage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill $(if (( $(echo "$cpu_usage > 80" | bc -l) )); then echo "progress-high"; elif (( $(echo "$cpu_usage > 60" | bc -l) )); then echo "progress-medium"; else echo "progress-low"; fi)" style="width: ${cpu_usage}%"></div>
                </div>
                
                <div class="metric">
                    <span class="metric-label">Memory Usage:</span>
                    <span class="metric-value $(if (( $(echo "$memory_usage > 85" | bc -l) )); then echo "usage-high"; elif (( $(echo "$memory_usage > 70" | bc -l) )); then echo "usage-medium"; else echo "usage-low"; fi)">${memory_usage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill $(if (( $(echo "$memory_usage > 85" | bc -l) )); then echo "progress-high"; elif (( $(echo "$memory_usage > 70" | bc -l) )); then echo "progress-medium"; else echo "progress-low"; fi)" style="width: ${memory_usage}%"></div>
                </div>
                
                <div class="metric">
                    <span class="metric-label">Disk Usage:</span>
                    <span class="metric-value $(if (( disk_usage > 90 )); then echo "usage-high"; elif (( disk_usage > 75 )); then echo "usage-medium"; else echo "usage-low"; fi)">${disk_usage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill $(if (( disk_usage > 90 )); then echo "progress-high"; elif (( disk_usage > 75 )); then echo "progress-medium"; else echo "progress-low"; fi)" style="width: ${disk_usage}%"></div>
                </div>
                
                <div class="metric">
                    <span class="metric-label">Load Average:</span>
                    <span class="metric-value $(if (( $(echo "$load_avg > 5" | bc -l) )); then echo "usage-high"; elif (( $(echo "$load_avg > 2" | bc -l) )); then echo "usage-medium"; else echo "usage-low"; fi)">${load_avg}</span>
                </div>
            </div>
            
            <div class="card">
                <h3>🚀 Pool Safe Services</h3>
                <div class="metric">
                    <span class="metric-label">Backend Service:</span>
                    <span class="metric-value status-$backend_status">$(echo $backend_status | tr '[:lower:]' '[:upper:]')</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Nginx Web Server:</span>
                    <span class="metric-value status-$nginx_status">$(echo $nginx_status | tr '[:lower:]' '[:upper:]')</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Database Connection:</span>
                    <span class="metric-value status-$db_status">$(echo $db_status | tr '[:lower:]' '[:upper:]')</span>
                </div>
                <div class="metric">
                    <span class="metric-label">System Uptime:</span>
                    <span class="metric-value usage-low">$uptime</span>
                </div>
            </div>
            
            <div class="card">
                <h3>📊 Quick Actions</h3>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="/api/monitoring/health" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 5px;">🏥 Health Check</a>
                </div>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="/api/monitoring/dashboard" style="display: inline-block; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 5px;">📈 App Metrics</a>
                </div>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="/api/analytics/dashboard" style="display: inline-block; padding: 10px 20px; background: #ffc107; color: black; text-decoration: none; border-radius: 5px; margin: 5px;">📊 Analytics</a>
                </div>
            </div>
            
            <div class="card">
                <h3>🔔 Recent Alerts</h3>
                <div style="max-height: 200px; overflow-y: auto;">
EOF

    # Add recent alerts
    if [[ -f "$METRICS_DIR/alerts.csv" ]]; then
        tail -n 5 "$METRICS_DIR/alerts.csv" | while IFS=',' read -r timestamp type severity message; do
            local alert_class="usage-low"
            case $severity in
                "HIGH"|"CRITICAL") alert_class="usage-high" ;;
                "MEDIUM") alert_class="usage-medium" ;;
            esac
            echo "<div class=\"metric\"><span class=\"metric-label\">$timestamp</span><span class=\"metric-value $alert_class\">$type: $message</span></div>" >> "$html_file"
        done
    else
        echo "<div class=\"metric\"><span class=\"metric-label\">No recent alerts</span><span class=\"metric-value usage-low\">All systems normal</span></div>" >> "$html_file"
    fi

    cat >> "$html_file" << EOF
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>🏊‍♀️ Pool Safe Inc Portal Monitoring • Generated by VPS Monitor v2.0</p>
        </div>
    </div>
</body>
</html>
EOF

    log "Dashboard updated: $html_file"
}

# Auto-healing function
auto_heal() {
    local services=$(check_poolsafe_services)
    
    # Restart backend if stopped
    if [[ "$services" == *"backend:stopped"* ]]; then
        log "Auto-healing: Restarting Pool Safe backend service..."
        if command -v pm2 >/dev/null 2>&1; then
            pm2 restart poolsafe-backend || true
            sleep 2
            if pm2 ls | grep -q "poolsafe-backend" | grep -q "online"; then
                log "Auto-healing: Backend (PM2) restarted successfully"
            else
                generate_alert "AUTO_HEAL" "Failed to restart backend via PM2" "CRITICAL"
            fi
        else
            systemctl start poolsafe-backend || true
            if systemctl is-active --quiet poolsafe-backend; then
                log "Auto-healing: Backend (systemd) restarted successfully"
            else
                generate_alert "AUTO_HEAL" "Failed to restart backend service (systemd)" "CRITICAL"
            fi
        fi
    fi
    
    # Restart nginx if stopped
    if [[ "$services" == *"nginx:stopped"* ]]; then
        log "Auto-healing: Restarting Nginx service..."
        systemctl start nginx
        if [[ $? -eq 0 ]]; then
            log "Auto-healing: Nginx service restarted successfully"
        else
            generate_alert "AUTO_HEAL" "Failed to restart Nginx service" "CRITICAL"
        fi
    fi
}

# Cleanup old metrics
cleanup_metrics() {
    # Keep only last 30 days of metrics
    find "$METRICS_DIR" -name "*.csv" -mtime +30 -delete 2>/dev/null || true
    
    # Rotate log file if it gets too large (>100MB)
    if [[ -f "$LOG_FILE" ]] && [[ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt 104857600 ]]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        touch "$LOG_FILE"
    fi
}

# Main function
main() {
    case "${1:-monitor}" in
        "monitor")
            monitor_performance
            generate_dashboard
            auto_heal
            cleanup_metrics
            ;;
        "dashboard")
            generate_dashboard
            echo "Dashboard generated: $WEB_DIR/index.html"
            ;;
        "alerts")
            if [[ -f "$METRICS_DIR/alerts.csv" ]]; then
                echo "Recent alerts:"
                tail -n 10 "$METRICS_DIR/alerts.csv"
            else
                echo "No alerts found."
            fi
            ;;
        "status")
            echo "🖥️  System Status:"
            echo "CPU: $(get_cpu_usage)%"
            echo "Memory: $(get_memory_usage)%"
            echo "Disk: $(get_disk_usage)%"
            echo "Load: $(get_load_average)"
            echo "Services: $(check_poolsafe_services)"
            ;;
        "install")
            log "Installing VPS monitor service..."
            # Create systemd service
            cat > /etc/systemd/system/vps-monitor.service << 'EOFS'
[Unit]
Description=Pool Safe VPS Monitor
After=network.target

[Service]
Type=oneshot
ExecStart=/opt/vps-monitor.sh monitor
User=root

[Install]
WantedBy=multi-user.target
EOFS
            
            # Create timer for regular execution
            cat > /etc/systemd/system/vps-monitor.timer << 'EOFT'
[Unit]
Description=Run Pool Safe VPS Monitor every minute
Requires=vps-monitor.service

[Timer]
OnCalendar=*:*:00
Persistent=true

[Install]
WantedBy=timers.target
EOFT
            
            # Copy script to /opt/
            cp "$0" /opt/vps-monitor.sh
            chmod +x /opt/vps-monitor.sh
            
            # Enable and start timer
            systemctl daemon-reload
            systemctl enable vps-monitor.timer
            systemctl start vps-monitor.timer
            
            log "VPS monitor installed and started successfully!"
            ;;
        *)
            echo "Usage: $0 {monitor|dashboard|alerts|status|install}"
            echo "  monitor    - Run full monitoring cycle (default)"
            echo "  dashboard  - Generate HTML dashboard only"
            echo "  alerts     - Show recent alerts"
            echo "  status     - Show current system status"
            echo "  install    - Install as system service"
            ;;
    esac
}

# Install bc if not available
if ! command -v bc >/dev/null 2>&1; then
    apt-get update && apt-get install -y bc
fi

# Run main function
main "$@"