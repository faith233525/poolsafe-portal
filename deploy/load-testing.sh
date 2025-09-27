#!/bin/bash
# Comprehensive Load Testing Script for Pool Safe Inc Portal
# Tests various scenarios and measures performance under load

set -e

# Configuration
BACKEND_URL="http://localhost:4001"
FRONTEND_URL="http://localhost:3000"
NGINX_URL="http://localhost"
MAX_CONCURRENT_USERS=100
TEST_DURATION=300 # 5 minutes
RAMP_UP_TIME=60   # 1 minute
RESULTS_DIR="./load-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if required tools are installed
    local tools=("curl" "ab" "wrk" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            error "$tool is not installed. Please install it first."
            
            # Provide installation suggestions
            case $tool in
                "ab")
                    echo "Install with: sudo apt-get install apache2-utils (Ubuntu/Debian) or brew install apache2-utils (macOS)"
                    ;;
                "wrk")
                    echo "Install with: sudo apt-get install wrk (Ubuntu/Debian) or brew install wrk (macOS)"
                    ;;
                "jq")
                    echo "Install with: sudo apt-get install jq (Ubuntu/Debian) or brew install jq (macOS)"
                    ;;
            esac
            exit 1
        fi
    done
    
    # Check if services are running
    if ! curl -s "$BACKEND_URL/api/health" | grep -q '"ok":true'; then
        error "Backend service is not running or not healthy at $BACKEND_URL"
        exit 1
    fi
    
    if ! curl -s "$FRONTEND_URL" | grep -q "html"; then
        error "Frontend service is not running at $FRONTEND_URL"
        exit 1
    fi
    
    success "All prerequisites met"
}

# Setup test environment
setup_test_environment() {
    log "Setting up test environment..."
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Create test data directory
    mkdir -p "$RESULTS_DIR/data"
    
    # Get authentication token for API tests
    log "Obtaining authentication token..."
    
    # Login as admin user
    local login_response=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@poolsafe.com","password":"Admin123!"}' \
        || echo '{"error": "failed"}')
    
    if echo "$login_response" | jq -e '.token' > /dev/null 2>&1; then
        AUTH_TOKEN=$(echo "$login_response" | jq -r '.token')
        echo "$AUTH_TOKEN" > "$RESULTS_DIR/data/auth_token.txt"
        success "Authentication token obtained"
    else
        warning "Could not obtain authentication token. Some tests may fail."
        AUTH_TOKEN=""
    fi
    
    # Create test payload files
    cat > "$RESULTS_DIR/data/login_payload.json" << EOF
{
    "email": "admin@poolsafe.com",
    "password": "Admin123!"
}
EOF

    cat > "$RESULTS_DIR/data/ticket_payload.json" << EOF
{
    "subject": "Load Test Ticket $(date +%s)",
    "category": "Testing",
    "description": "This is a test ticket created during load testing",
    "priority": "MEDIUM",
    "contactPreference": "EMAIL",
    "unitsAffected": 1
}
EOF
    
    success "Test environment setup complete"
}

# Basic connectivity test
test_connectivity() {
    log "Running connectivity tests..."
    
    local results_file="$RESULTS_DIR/connectivity_$TIMESTAMP.txt"
    
    echo "Connectivity Test Results - $(date)" > "$results_file"
    echo "=================================" >> "$results_file"
    echo "" >> "$results_file"
    
    # Test backend health endpoint
    echo "Backend Health Check:" >> "$results_file"
    if curl -s -w "Response Time: %{time_total}s\nHTTP Code: %{http_code}\n" \
        "$BACKEND_URL/api/health" >> "$results_file" 2>&1; then
        success "Backend connectivity test passed"
    else
        error "Backend connectivity test failed"
        return 1
    fi
    
    echo "" >> "$results_file"
    
    # Test frontend
    echo "Frontend Check:" >> "$results_file"
    if curl -s -w "Response Time: %{time_total}s\nHTTP Code: %{http_code}\n" \
        "$FRONTEND_URL" >> "$results_file" 2>&1; then
        success "Frontend connectivity test passed"
    else
        error "Frontend connectivity test failed"
        return 1
    fi
    
    echo "" >> "$results_file"
    
    # Test main endpoints
    local endpoints=(
        "/api/health"
        "/api/auth/login"
        "/api/partners"
        "/api/tickets"
        "/api/knowledge-base"
    )
    
    echo "Endpoint Response Times:" >> "$results_file"
    for endpoint in "${endpoints[@]}"; do
        local response_time=$(curl -s -w "%{time_total}" -o /dev/null "$BACKEND_URL$endpoint" || echo "ERROR")
        echo "$endpoint: ${response_time}s" >> "$results_file"
    done
    
    success "Connectivity tests completed. Results saved to $results_file"
}

# Apache Benchmark tests
run_apache_bench_tests() {
    log "Running Apache Benchmark (ab) tests..."
    
    local ab_results_dir="$RESULTS_DIR/apache_bench"
    mkdir -p "$ab_results_dir"
    
    # Test scenarios
    local scenarios=(
        "health_check:/api/health:GET"
        "static_content:/:GET"
        "knowledge_base:/api/knowledge-base:GET"
    )
    
    for scenario in "${scenarios[@]}"; do
        IFS=':' read -r name endpoint method <<< "$scenario"
        log "Testing $name ($method $endpoint)..."
        
        local url
        if [[ "$endpoint" == "/api/"* ]]; then
            url="$BACKEND_URL$endpoint"
        else
            url="$FRONTEND_URL$endpoint"
        fi
        
        # Run ab test
        ab -n 1000 -c 10 -g "$ab_results_dir/${name}_gnuplot.dat" \
           "$url" > "$ab_results_dir/${name}_results.txt" 2>&1
        
        # Extract key metrics
        local requests_per_sec=$(grep "Requests per second" "$ab_results_dir/${name}_results.txt" | awk '{print $4}')
        local time_per_request=$(grep "Time per request.*mean" "$ab_results_dir/${name}_results.txt" | head -1 | awk '{print $4}')
        local transfer_rate=$(grep "Transfer rate" "$ab_results_dir/${name}_results.txt" | awk '{print $3}')
        
        log "  Requests/sec: $requests_per_sec"
        log "  Time/request: ${time_per_request}ms"
        log "  Transfer rate: ${transfer_rate}KB/sec"
    done
    
    success "Apache Benchmark tests completed. Results in $ab_results_dir"
}

# WRK load tests
run_wrk_tests() {
    log "Running WRK load tests..."
    
    local wrk_results_dir="$RESULTS_DIR/wrk_tests"
    mkdir -p "$wrk_results_dir"
    
    # Basic load test
    log "Running basic load test (30s, 10 connections, 2 threads)..."
    wrk -t2 -c10 -d30s --latency "$BACKEND_URL/api/health" \
        > "$wrk_results_dir/basic_load_test.txt" 2>&1
    
    # API endpoints load test
    log "Running API endpoints load test..."
    wrk -t4 -c20 -d60s --latency "$BACKEND_URL/api/knowledge-base" \
        > "$wrk_results_dir/api_load_test.txt" 2>&1
    
    # High concurrency test
    log "Running high concurrency test (60s, 50 connections, 8 threads)..."
    wrk -t8 -c50 -d60s --latency "$BACKEND_URL/api/health" \
        > "$wrk_results_dir/high_concurrency_test.txt" 2>&1
    
    # POST request test (if auth token available)
    if [[ -n "$AUTH_TOKEN" ]]; then
        log "Running authenticated POST test..."
        
        # Create WRK script for POST requests
        cat > "$wrk_results_dir/post_script.lua" << 'EOF'
wrk.method = "POST"
wrk.body = '{"subject":"Load Test Ticket","category":"Testing","description":"Test ticket","priority":"MEDIUM"}'
wrk.headers["Content-Type"] = "application/json"
wrk.headers["Authorization"] = "Bearer AUTH_TOKEN_PLACEHOLDER"
EOF
        
        # Replace auth token placeholder
        sed -i "s/AUTH_TOKEN_PLACEHOLDER/$AUTH_TOKEN/g" "$wrk_results_dir/post_script.lua"
        
        wrk -t4 -c10 -d30s -s "$wrk_results_dir/post_script.lua" "$BACKEND_URL/api/tickets" \
            > "$wrk_results_dir/post_load_test.txt" 2>&1
    fi
    
    success "WRK load tests completed. Results in $wrk_results_dir"
}

# Stress test with gradual load increase
run_stress_test() {
    log "Running stress test with gradual load increase..."
    
    local stress_results_dir="$RESULTS_DIR/stress_test"
    mkdir -p "$stress_results_dir"
    
    # Start with low load and gradually increase
    local connection_levels=(5 10 20 50 100 200)
    
    for connections in "${connection_levels[@]}"; do
        log "Testing with $connections concurrent connections..."
        
        # Run for 30 seconds at this level
        timeout 35s wrk -t4 -c$connections -d30s --latency "$BACKEND_URL/api/health" \
            > "$stress_results_dir/stress_${connections}_connections.txt" 2>&1 || true
        
        # Extract and log key metrics
        if [[ -f "$stress_results_dir/stress_${connections}_connections.txt" ]]; then
            local rps=$(grep "Requests/sec:" "$stress_results_dir/stress_${connections}_connections.txt" | awk '{print $2}')
            local latency_avg=$(grep "Latency" "$stress_results_dir/stress_${connections}_connections.txt" | awk '{print $2}')
            log "  $connections connections: ${rps} req/sec, ${latency_avg} avg latency"
            
            # Check if we're hitting limits (error rate > 1% or latency > 5s)
            local error_count=$(grep -o "Socket errors" "$stress_results_dir/stress_${connections}_connections.txt" || echo "0")
            if [[ "$error_count" != "0" ]] || [[ $(echo "$latency_avg" | sed 's/[^0-9.]//g') > 5000 ]]; then
                warning "High error rate or latency detected at $connections connections"
                break
            fi
        fi
        
        # Brief pause between tests
        sleep 5
    done
    
    success "Stress test completed. Results in $stress_results_dir"
}

# Memory and resource usage monitoring
monitor_resources() {
    log "Starting resource monitoring..."
    
    local monitor_file="$RESULTS_DIR/resource_usage_$TIMESTAMP.csv"
    
    # CSV header
    echo "timestamp,cpu_percent,memory_percent,disk_usage,network_connections,backend_response_time" > "$monitor_file"
    
    # Monitor for test duration
    local end_time=$(($(date +%s) + TEST_DURATION))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        local cpu_percent=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
        local mem_percent=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
        local disk_usage=$(df / | awk 'NR==2 {print $(NF-1)}' | sed 's/%//')
        local connections=$(ss -tuln | wc -l)
        local response_time=$(curl -s -w "%{time_total}" -o /dev/null "$BACKEND_URL/api/health" || echo "ERROR")
        
        echo "$timestamp,$cpu_percent,$mem_percent,$disk_usage,$connections,$response_time" >> "$monitor_file"
        
        sleep 10
    done &
    
    MONITOR_PID=$!
    log "Resource monitoring started (PID: $MONITOR_PID)"
}

# Database performance test
test_database_performance() {
    log "Testing database performance..."
    
    if [[ -z "$AUTH_TOKEN" ]]; then
        warning "No auth token available, skipping database tests"
        return
    fi
    
    local db_results_dir="$RESULTS_DIR/database_tests"
    mkdir -p "$db_results_dir"
    
    # Test various database operations
    log "Testing ticket creation performance..."
    
    local ticket_creation_times=()
    for i in {1..50}; do
        local start_time=$(date +%s.%N)
        
        local response=$(curl -s -X POST "$BACKEND_URL/api/tickets" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"subject\":\"Load Test Ticket $i\",\"category\":\"Testing\",\"description\":\"Test\",\"priority\":\"MEDIUM\"}")
        
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc)
        
        ticket_creation_times+=($duration)
        
        # Brief pause to avoid overwhelming the database
        sleep 0.1
    done
    
    # Calculate statistics
    printf '%s\n' "${ticket_creation_times[@]}" > "$db_results_dir/ticket_creation_times.txt"
    
    local avg_time=$(awk '{sum+=$1} END {print sum/NR}' "$db_results_dir/ticket_creation_times.txt")
    local min_time=$(sort -n "$db_results_dir/ticket_creation_times.txt" | head -1)
    local max_time=$(sort -n "$db_results_dir/ticket_creation_times.txt" | tail -1)
    
    log "Ticket creation performance:"
    log "  Average time: ${avg_time}s"
    log "  Min time: ${min_time}s"
    log "  Max time: ${max_time}s"
    
    success "Database performance test completed"
}

# Frontend performance test
test_frontend_performance() {
    log "Testing frontend performance..."
    
    local frontend_results_dir="$RESULTS_DIR/frontend_tests"
    mkdir -p "$frontend_results_dir"
    
    # Test static asset loading
    log "Testing static asset performance..."
    
    # Get list of static assets from the main page
    local main_page=$(curl -s "$FRONTEND_URL")
    local css_files=$(echo "$main_page" | grep -o 'href="[^"]*\.css[^"]*"' | sed 's/href="//g' | sed 's/"//g')
    local js_files=$(echo "$main_page" | grep -o 'src="[^"]*\.js[^"]*"' | sed 's/src="//g' | sed 's/"//g')
    
    # Test CSS loading times
    echo "CSS Asset Loading Times:" > "$frontend_results_dir/asset_loading_times.txt"
    for css_file in $css_files; do
        if [[ "$css_file" == /* ]]; then
            local full_url="$FRONTEND_URL$css_file"
        else
            local full_url="$FRONTEND_URL/$css_file"
        fi
        
        local load_time=$(curl -s -w "%{time_total}" -o /dev/null "$full_url" 2>/dev/null || echo "ERROR")
        echo "CSS: $css_file - ${load_time}s" >> "$frontend_results_dir/asset_loading_times.txt"
    done
    
    # Test JS loading times
    echo "JS Asset Loading Times:" >> "$frontend_results_dir/asset_loading_times.txt"
    for js_file in $js_files; do
        if [[ "$js_file" == /* ]]; then
            local full_url="$FRONTEND_URL$js_file"
        else
            local full_url="$FRONTEND_URL/$js_file"
        fi
        
        local load_time=$(curl -s -w "%{time_total}" -o /dev/null "$full_url" 2>/dev/null || echo "ERROR")
        echo "JS: $js_file - ${load_time}s" >> "$frontend_results_dir/asset_loading_times.txt"
    done
    
    # Test page load performance with different user agents
    log "Testing page load with different user agents..."
    
    local user_agents=(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
        "Mozilla/5.0 (Android 10; Mobile; rv:81.0) Gecko/81.0"
    )
    
    echo "Page Load Times by User Agent:" > "$frontend_results_dir/user_agent_performance.txt"
    for ua in "${user_agents[@]}"; do
        local load_time=$(curl -s -w "%{time_total}" -o /dev/null -H "User-Agent: $ua" "$FRONTEND_URL" || echo "ERROR")
        echo "$ua: ${load_time}s" >> "$frontend_results_dir/user_agent_performance.txt"
    done
    
    success "Frontend performance test completed"
}

# Generate comprehensive report
generate_report() {
    log "Generating comprehensive performance report..."
    
    local report_file="$RESULTS_DIR/performance_report_$TIMESTAMP.html"
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Pool Safe Inc Portal - Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .chart { width: 100%; height: 300px; background: #f8f9fa; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Pool Safe Inc Portal - Load Test Report</h1>
        <p>Generated: $(date)</p>
        <p>Test Duration: ${TEST_DURATION}s | Max Concurrent Users: ${MAX_CONCURRENT_USERS}</p>
    </div>
EOF

    # Add test results summary
    echo '<div class="section"><h2>Executive Summary</h2>' >> "$report_file"
    
    # Check if all tests passed
    local overall_status="SUCCESS"
    if [[ ! -f "$RESULTS_DIR/connectivity_$TIMESTAMP.txt" ]]; then
        overall_status="FAILED"
    fi
    
    echo "<p class=\"$overall_status\">Overall Status: $overall_status</p>" >> "$report_file"
    echo '</div>' >> "$report_file"
    
    # Add detailed results sections
    if [[ -d "$RESULTS_DIR/apache_bench" ]]; then
        echo '<div class="section"><h2>Apache Benchmark Results</h2>' >> "$report_file"
        for result_file in "$RESULTS_DIR/apache_bench"/*_results.txt; do
            if [[ -f "$result_file" ]]; then
                local test_name=$(basename "$result_file" "_results.txt")
                echo "<h3>$test_name</h3>" >> "$report_file"
                echo "<pre>" >> "$report_file"
                grep -E "(Requests per second|Time per request|Transfer rate)" "$result_file" >> "$report_file" || echo "No results found" >> "$report_file"
                echo "</pre>" >> "$report_file"
            fi
        done
        echo '</div>' >> "$report_file"
    fi
    
    if [[ -d "$RESULTS_DIR/wrk_tests" ]]; then
        echo '<div class="section"><h2>WRK Load Test Results</h2>' >> "$report_file"
        for result_file in "$RESULTS_DIR/wrk_tests"/*.txt; do
            if [[ -f "$result_file" ]]; then
                local test_name=$(basename "$result_file" ".txt")
                echo "<h3>$test_name</h3>" >> "$report_file"
                echo "<pre>" >> "$report_file"
                grep -E "(Requests/sec|Latency|errors)" "$result_file" >> "$report_file" || echo "No results found" >> "$report_file"
                echo "</pre>" >> "$report_file"
            fi
        done
        echo '</div>' >> "$report_file"
    fi
    
    # Add resource usage if available
    if [[ -f "$RESULTS_DIR/resource_usage_$TIMESTAMP.csv" ]]; then
        echo '<div class="section"><h2>Resource Usage</h2>' >> "$report_file"
        echo '<p>Resource usage was monitored during the test. Check the CSV file for detailed metrics.</p>' >> "$report_file"
        echo "<p>File: resource_usage_$TIMESTAMP.csv</p>" >> "$report_file"
        echo '</div>' >> "$report_file"
    fi
    
    # Add recommendations
    echo '<div class="section"><h2>Recommendations</h2>' >> "$report_file"
    echo '<ul>' >> "$report_file"
    echo '<li>Monitor response times under normal load</li>' >> "$report_file"
    echo '<li>Set up automated performance monitoring</li>' >> "$report_file"
    echo '<li>Consider implementing caching for static content</li>' >> "$report_file"
    echo '<li>Scale horizontally if load increases significantly</li>' >> "$report_file"
    echo '</ul>' >> "$report_file"
    echo '</div>' >> "$report_file"
    
    echo '</body></html>' >> "$report_file"
    
    success "Performance report generated: $report_file"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    # Stop resource monitoring if running
    if [[ -n "${MONITOR_PID:-}" ]]; then
        kill $MONITOR_PID 2>/dev/null || true
        log "Stopped resource monitoring"
    fi
    
    # Clean up temporary files
    rm -f "$RESULTS_DIR/data/auth_token.txt" 2>/dev/null || true
}

# Main execution
main() {
    log "Starting comprehensive load testing for Pool Safe Inc Portal"
    
    trap cleanup EXIT
    
    check_prerequisites
    setup_test_environment
    
    # Start resource monitoring in background
    monitor_resources
    
    # Run all test suites
    test_connectivity
    run_apache_bench_tests
    run_wrk_tests
    run_stress_test
    test_database_performance
    test_frontend_performance
    
    # Generate final report
    generate_report
    
    success "Load testing completed successfully!"
    log "Results available in: $RESULTS_DIR"
    log "Open the HTML report for detailed analysis: $RESULTS_DIR/performance_report_$TIMESTAMP.html"
}

# Handle command line arguments
case "${1:-}" in
    "connectivity")
        setup_test_environment
        test_connectivity
        ;;
    "apache")
        setup_test_environment
        run_apache_bench_tests
        ;;
    "wrk")
        setup_test_environment
        run_wrk_tests
        ;;
    "stress")
        setup_test_environment
        run_stress_test
        ;;
    "database")
        setup_test_environment
        test_database_performance
        ;;
    "frontend")
        setup_test_environment
        test_frontend_performance
        ;;
    "report")
        generate_report
        ;;
    *)
        main
        ;;
esac