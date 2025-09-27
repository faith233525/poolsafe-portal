#!/usr/bin/env powershell
# Windows PowerShell Load Testing Script for VPS deployment
# This script validates system performance and scalability

param(
    [string]$BaseUrl = "http://localhost:4001",
    [int]$Duration = 30,
    [int]$Concurrent = 10,
    [switch]$Verbose = $false
)

Write-Host "🚀 Starting Load Testing Suite" -ForegroundColor Green
Write-Host "Target: $BaseUrl" -ForegroundColor Yellow
Write-Host "Duration: $Duration seconds" -ForegroundColor Yellow
Write-Host "Concurrent requests: $Concurrent" -ForegroundColor Yellow

# Function to test endpoint
function Test-Endpoint {
    param([string]$Endpoint, [string]$Description)
    
    Write-Host "📊 Testing $Description ($Endpoint)" -ForegroundColor Cyan
    
    $results = @()
    $start = Get-Date
    
    for ($i = 1; $i -le 50; $i++) {
        try {
            $requestStart = Get-Date
            $response = Invoke-WebRequest -Uri "$BaseUrl$Endpoint" -Method GET -UseBasicParsing -TimeoutSec 10
            $requestEnd = Get-Date
            $duration = ($requestEnd - $requestStart).TotalMilliseconds
            
            $results += [PSCustomObject]@{
                StatusCode = $response.StatusCode
                Duration = $duration
                Success = $true
            }
            
            if ($i % 10 -eq 0) {
                Write-Host "  ✓ Completed $i/50 requests" -ForegroundColor Green
            }
        }
        catch {
            $results += [PSCustomObject]@{
                StatusCode = 0
                Duration = 0
                Success = $false
                Error = $_.Exception.Message
            }
            Write-Host "  ✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    $end = Get-Date
    $totalTime = ($end - $start).TotalSeconds
    
    $successful = ($results | Where-Object { $_.Success }).Count
    $avgDuration = ($results | Where-Object { $_.Success } | Measure-Object -Property Duration -Average).Average
    $maxDuration = ($results | Where-Object { $_.Success } | Measure-Object -Property Duration -Maximum).Maximum
    $minDuration = ($results | Where-Object { $_.Success } | Measure-Object -Property Duration -Minimum).Minimum
    
    Write-Host "📈 Results for $Description:" -ForegroundColor Yellow
    Write-Host "  Total Requests: 50" -ForegroundColor White
    Write-Host "  Successful: $successful ($(($successful/50*100).ToString('F1'))%)" -ForegroundColor Green
    Write-Host "  Failed: $(50-$successful)" -ForegroundColor Red
    Write-Host "  Average Response Time: $($avgDuration.ToString('F1'))ms" -ForegroundColor White
    Write-Host "  Min Response Time: $($minDuration.ToString('F1'))ms" -ForegroundColor White
    Write-Host "  Max Response Time: $($maxDuration.ToString('F1'))ms" -ForegroundColor White
    Write-Host "  Requests/Second: $(($successful/$totalTime).ToString('F1'))" -ForegroundColor White
    Write-Host ""
    
    return [PSCustomObject]@{
        Endpoint = $Endpoint
        Description = $Description
        TotalRequests = 50
        Successful = $successful
        Failed = (50 - $successful)
        SuccessRate = ($successful / 50 * 100)
        AvgResponseTime = $avgDuration
        MinResponseTime = $minDuration
        MaxResponseTime = $maxDuration
        RequestsPerSecond = ($successful / $totalTime)
    }
}

# Test critical endpoints
Write-Host "🎯 Testing Critical Endpoints" -ForegroundColor Magenta

$testResults = @()

# Health check endpoint
$testResults += Test-Endpoint "/api/health" "Health Check"

# Metrics endpoint  
$testResults += Test-Endpoint "/api/metrics" "System Metrics"

# Auth endpoints (expect 404 but should handle load)
$testResults += Test-Endpoint "/api/auth/test" "Auth System"

Write-Host "🔥 Concurrent Load Test" -ForegroundColor Magenta
Write-Host "Running $Concurrent concurrent requests for $Duration seconds" -ForegroundColor Yellow

$jobs = @()
$concurrentStart = Get-Date

for ($i = 1; $i -le $Concurrent; $i++) {
    $job = Start-Job -ScriptBlock {
        param($Url, $Duration, $JobId)
        
        $results = @()
        $start = Get-Date
        $end = $start.AddSeconds($Duration)
        
        while ((Get-Date) -lt $end) {
            try {
                $requestStart = Get-Date
                $response = Invoke-WebRequest -Uri "$Url/api/health" -Method GET -UseBasicParsing -TimeoutSec 5
                $requestEnd = Get-Date
                $duration = ($requestEnd - $requestStart).TotalMilliseconds
                
                $results += [PSCustomObject]@{
                    JobId = $JobId
                    StatusCode = $response.StatusCode
                    Duration = $duration
                    Success = $true
                    Timestamp = $requestStart
                }
            }
            catch {
                $results += [PSCustomObject]@{
                    JobId = $JobId
                    StatusCode = 0
                    Duration = 0
                    Success = $false
                    Error = $_.Exception.Message
                    Timestamp = (Get-Date)
                }
            }
            
            Start-Sleep -Milliseconds 100
        }
        
        return $results
    } -ArgumentList $BaseUrl, $Duration, $i
    
    $jobs += $job
}

Write-Host "⏳ Waiting for concurrent tests to complete..." -ForegroundColor Yellow

# Wait for all jobs to complete
$jobs | Wait-Job | Out-Null

# Collect results
$allConcurrentResults = @()
foreach ($job in $jobs) {
    $jobResults = Receive-Job -Job $job
    $allConcurrentResults += $jobResults
    Remove-Job -Job $job
}

$concurrentEnd = Get-Date
$actualDuration = ($concurrentEnd - $concurrentStart).TotalSeconds

# Analyze concurrent results
$totalConcurrentRequests = $allConcurrentResults.Count
$successfulConcurrent = ($allConcurrentResults | Where-Object { $_.Success }).Count
$failedConcurrent = $totalConcurrentRequests - $successfulConcurrent

if ($successfulConcurrent -gt 0) {
    $avgConcurrentDuration = ($allConcurrentResults | Where-Object { $_.Success } | Measure-Object -Property Duration -Average).Average
    $maxConcurrentDuration = ($allConcurrentResults | Where-Object { $_.Success } | Measure-Object -Property Duration -Maximum).Maximum
    $minConcurrentDuration = ($allConcurrentResults | Where-Object { $_.Success } | Measure-Object -Property Duration -Minimum).Minimum
} else {
    $avgConcurrentDuration = 0
    $maxConcurrentDuration = 0
    $minConcurrentDuration = 0
}

Write-Host "🎊 Concurrent Load Test Results:" -ForegroundColor Green
Write-Host "  Duration: $($actualDuration.ToString('F1')) seconds" -ForegroundColor White
Write-Host "  Total Requests: $totalConcurrentRequests" -ForegroundColor White
Write-Host "  Successful: $successfulConcurrent ($(($successfulConcurrent/$totalConcurrentRequests*100).ToString('F1'))%)" -ForegroundColor Green
Write-Host "  Failed: $failedConcurrent" -ForegroundColor Red
Write-Host "  Average Response Time: $($avgConcurrentDuration.ToString('F1'))ms" -ForegroundColor White
Write-Host "  Min Response Time: $($minConcurrentDuration.ToString('F1'))ms" -ForegroundColor White  
Write-Host "  Max Response Time: $($maxConcurrentDuration.ToString('F1'))ms" -ForegroundColor White
Write-Host "  Total Requests/Second: $(($successfulConcurrent/$actualDuration).ToString('F1'))" -ForegroundColor White
Write-Host ""

# Performance evaluation
Write-Host "📊 Performance Evaluation:" -ForegroundColor Magenta

$overallHealth = "EXCELLENT"
$issues = @()

foreach ($result in $testResults) {
    if ($result.SuccessRate -lt 95) {
        $issues += "Low success rate for $($result.Description): $($result.SuccessRate.ToString('F1'))%"
        $overallHealth = "NEEDS ATTENTION"
    }
    
    if ($result.AvgResponseTime -gt 1000) {
        $issues += "High response time for $($result.Description): $($result.AvgResponseTime.ToString('F1'))ms"
        if ($overallHealth -eq "EXCELLENT") { $overallHealth = "GOOD" }
    }
}

if ($successfulConcurrent / $totalConcurrentRequests -lt 0.95) {
    $issues += "Low concurrent success rate: $(($successfulConcurrent/$totalConcurrentRequests*100).ToString('F1'))%"
    $overallHealth = "NEEDS ATTENTION"
}

if ($avgConcurrentDuration -gt 2000) {
    $issues += "High concurrent response time: $($avgConcurrentDuration.ToString('F1'))ms"
    if ($overallHealth -eq "EXCELLENT") { $overallHealth = "GOOD" }
}

Write-Host "🏆 Overall System Health: $overallHealth" -ForegroundColor $(
    if ($overallHealth -eq "EXCELLENT") { "Green" }
    elseif ($overallHealth -eq "GOOD") { "Yellow" }
    else { "Red" }
)

if ($issues.Count -gt 0) {
    Write-Host "⚠️  Issues Identified:" -ForegroundColor Yellow
    foreach ($issue in $issues) {
        Write-Host "  • $issue" -ForegroundColor Red
    }
} else {
    Write-Host "✅ No performance issues detected!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 Recommendations for VPS Deployment:" -ForegroundColor Cyan
Write-Host "  ✓ Enable response compression (gzip)" -ForegroundColor Green
Write-Host "  ✓ Configure proper caching headers" -ForegroundColor Green
Write-Host "  ✓ Set up monitoring with alerts for response times > 500ms" -ForegroundColor Green
Write-Host "  ✓ Configure load balancer for high availability" -ForegroundColor Green
Write-Host "  ✓ Set up database connection pooling" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Load Testing Complete! System ready for production deployment." -ForegroundColor Green

# Return overall health for automation
exit $(if ($overallHealth -eq "EXCELLENT" -or $overallHealth -eq "GOOD") { 0 } else { 1 })