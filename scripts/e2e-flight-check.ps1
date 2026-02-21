# AegisGrid E2E Flight Check (API layer)
# Run with all four servers up. Validates Python, Gateway, and ZK proof endpoint.

$ErrorActionPreference = "Continue"
$Python = "http://localhost:8001"
$Gateway = "http://localhost:8000"

function Test-Endpoint {
    param([string]$Name, [scriptblock]$Check)
    Write-Host "`n--- $Name ---" -ForegroundColor Cyan
    try {
        & $Check
        Write-Host "  PASS" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  FAIL: $_" -ForegroundColor Red
        return $false
    }
}

$allOk = $true

# Test 1a: Python /tick returns full payload including nodes
$allOk = (Test-Endpoint "Test 1a: Python /tick (heartbeat)" {
    $r = Invoke-RestMethod -Uri "$Python/tick" -TimeoutSec 5
    if (-not $r.PSObject.Properties['gridLoad']) { throw "Missing gridLoad" }
    if (-not $r.PSObject.Properties['generation']) { throw "Missing generation" }
    if (-not $r.PSObject.Properties['swapFee']) { throw "Missing swapFee" }
    if (-not $r.PSObject.Properties['gridImbalance']) { throw "Missing gridImbalance" }
    if (-not $r.PSObject.Properties['nodes']) { throw "Missing nodes (Phase 5 3D)" }
    $n = @($r.nodes)
    if ($n.Count -lt 15) { throw "Expected at least 15 nodes, got $($n.Count)" }
    Write-Host "  gridLoad=$($r.gridLoad) generation=$($r.generation) swapFee=$($r.swapFee) nodes=$($n.Count)"
}) -and $allOk

# Test 1b: Gateway health
$allOk = (Test-Endpoint "Test 1b: Gateway /health" {
    $r = Invoke-RestMethod -Uri "$Gateway/health" -TimeoutSec 3
    if ($r.status -ne "ok") { throw "Gateway not ok" }
}) -and $allOk

# Test 2: Chaos injection + tick reaction
$allOk = (Test-Endpoint "Test 2: Chaos (cloud_cover) + tick" {
    $post = Invoke-RestMethod -Uri "$Python/chaos" -Method POST -Body '{"type":"cloud_cover"}' -ContentType "application/json" -TimeoutSec 3
    if ($post.injected -ne "cloud_cover") { throw "Chaos not injected" }
    Start-Sleep -Milliseconds 300
    $tick = Invoke-RestMethod -Uri "$Python/tick" -TimeoutSec 5
    Write-Host "  After chaos: generation=$($tick.generation) gridImbalance=$($tick.gridImbalance) swapFee=$($tick.swapFee)"
}) -and $allOk

# Test 3a: ZK proof generation (optional — requires circuit build)
Test-Endpoint "Test 3a: Gateway POST /api/generate-proof (optional)" {
    $body = '{"totalSolar":"8","totalLoad":"3"}'
    try {
        $r = Invoke-RestMethod -Uri "$Gateway/api/generate-proof" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 15
        if (-not $r.proof) { throw "No proof in response" }
        if (-not $r.publicSignals) { throw "No publicSignals" }
        Write-Host "  Proof + publicSignals received (amount_to_sell=5)"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 503) {
            Write-Host "  SKIP (503): Build circuit with: cd blockchain/circuits && ./build.sh" -ForegroundColor Yellow
        } else { throw $_ }
    }
} | Out-Null

Write-Host ""
if ($allOk) {
    Write-Host "E2E API checks: ALL PASSED" -ForegroundColor Green
    Write-Host "Next: Open http://localhost:5173 and run the manual UI checks in Docs/E2E_FLIGHT_CHECK.md" -ForegroundColor Yellow
} else {
    Write-Host "E2E API checks: SOME FAILED" -ForegroundColor Red
    Write-Host "Ensure Python (:8001), Gateway (:8000), and (for Test 3) blockchain/circuits build are done. See Docs/E2E_FLIGHT_CHECK.md" -ForegroundColor Yellow
}
