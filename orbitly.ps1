# Usage: .\orbitly.ps1 {dev|prod} {start|stop|restart}
param(
    [ValidateSet('dev','prod')]                        [string]$Mode   = 'dev',
    [ValidateSet('start','stop','restart','status')]   [string]$Action = 'start'
)

Set-Location $PSScriptRoot

$DevPort     = 5177
$ProdPort    = 4177
$ApiPort     = 3003
$DevPidFile  = '.orbitly-dev.pid'
$ProdPidFile = '.orbitly-prod.pid'
$ApiPidFile  = '.orbitly-api.pid'
$LogDir      = '.orbitly-logs'

function Get-RunningProcess([string]$PidFile) {
    if (-not (Test-Path $PidFile)) { return $null }
    $id = [int](Get-Content $PidFile)
    return Get-Process -Id $id -ErrorAction SilentlyContinue
}

# Kill a process and all its descendants so child node/vite processes don't linger
function Stop-ProcessTree([int]$Id) {
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $Id" -ErrorAction SilentlyContinue
    foreach ($child in $children) { Stop-ProcessTree $child.ProcessId }
    Stop-Process -Id $Id -Force -ErrorAction SilentlyContinue
}

# Free a TCP port by killing whichever process owns it
function Clear-Port([int]$Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $conn | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
    }
}

# ── Ollama ───────────────────────────────────────────────────────────────────

function Show-OllamaStatus {
    # Read overrides from .env if present; fall back to server defaults
    $ollamaUrl   = 'http://localhost:11434'
    $ollamaModel = 'gemma3:4b'
    if (Test-Path '.env') {
        Get-Content '.env' -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_ -match '^OLLAMA_URL\s*=\s*(.+)$')          { $ollamaUrl   = $Matches[1].Trim() }
            if ($_ -match '^OLLAMA_VISION_MODEL\s*=\s*(.+)$') { $ollamaModel = $Matches[1].Trim() }
        }
    }

    try {
        $resp   = Invoke-RestMethod -Uri "$ollamaUrl/api/tags" -TimeoutSec 3 -ErrorAction Stop
        $models = @($resp.models | ForEach-Object { $_.name })
        $prefix = $ollamaModel.Split(':')[0]
        $match  = $models | Where-Object { $_ -like "$prefix*" } | Select-Object -First 1

        if ($match) {
            Write-Host "  ✓ Ollama running     -> model: $match  (AI extraction: local/private)"
        } else {
            Write-Host "  ⚠ Ollama running but '$ollamaModel' not loaded — AI will fall back to Gemini"
            Write-Host "    Fix: ollama pull $ollamaModel"
            if ($models.Count -gt 0) {
                Write-Host "    Loaded models: $($models -join ', ')"
            }
        }
    } catch {
        Write-Host "  ✗ Ollama not running  -> AI extraction will use Gemini (watch your quota)"
        Write-Host "    Start: ollama serve   then load: ollama pull $ollamaModel"
    }
}

# ── Docker ───────────────────────────────────────────────────────────────────

function Start-Database {
    $status = docker compose ps db --format json 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($status -and $status.State -eq 'running') {
        Write-Host "  DB already running -> postgres://localhost:5437/orbitly"
        return
    }
    Write-Host "  Starting database..."
    docker compose up -d db | Out-Null
    # Wait for healthy
    $tries = 0
    do {
        Start-Sleep 2
        $health = (docker inspect --format '{{.State.Health.Status}}' orbitly-postgres 2>$null)
        $tries++
    } while ($health -ne 'healthy' -and $tries -lt 15)
    if ($health -eq 'healthy') {
        Write-Host "  ✓ Database healthy   -> postgres://localhost:5437/orbitly"
    } else {
        Write-Warning "  Database did not become healthy in time — check: docker logs orbitly-postgres"
    }
}

function Stop-Database {
    $status = docker compose ps db --format json 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
    if (-not $status -or $status.State -ne 'running') {
        Write-Host "  Database is not running"
        return
    }
    docker compose stop db | Out-Null
    Write-Host "  ✓ Database stopped"
}

# ── Dev ───────────────────────────────────────────────────────────────────────

function Start-DevServer {
    $proc = Get-RunningProcess $DevPidFile
    if ($proc) {
        Write-Host "  Dev server already running  (PID $($proc.Id)) -> http://localhost:$DevPort"
        return
    }
    if (Test-Path $DevPidFile) { Remove-Item $DevPidFile }
    if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

    $proc = Start-Process "npm.cmd" `
        -ArgumentList 'run','dev' `
        -RedirectStandardOutput "$LogDir\dev.log" `
        -RedirectStandardError  "$LogDir\dev.err" `
        -PassThru -WindowStyle Hidden
    $proc.Id | Set-Content $DevPidFile
    Start-Sleep 2
    Write-Host "  ✓ Dev server started  (PID $($proc.Id)) -> http://localhost:$DevPort"
    Write-Host "    Logs: $LogDir\dev.log"
}

function Stop-DevServer {
    if (-not (Test-Path $DevPidFile)) {
        Write-Host "  Dev server is not running (no PID file)"
        # Still clear the ports in case child processes outlived a previous stop
        Clear-Port $DevPort
        Clear-Port $ApiPort
        return
    }
    $proc = Get-RunningProcess $DevPidFile
    if ($proc) {
        Stop-ProcessTree $proc.Id
        Write-Host "  ✓ Dev server stopped  (PID $($proc.Id) + children)"
    } else {
        $id = Get-Content $DevPidFile
        Write-Host "  Dev server was not running (stale PID $id — cleaning up)"
    }
    # Belt-and-suspenders: free ports in case any child survived
    Clear-Port $DevPort
    Clear-Port $ApiPort
    Remove-Item $DevPidFile
}

# ── Prod ──────────────────────────────────────────────────────────────────────

function Start-ProdServer {
    $proc = Get-RunningProcess $ProdPidFile
    if ($proc) {
        Write-Host "  Production server already running  (PID $($proc.Id)) -> http://localhost:$ProdPort"
        return
    }
    if (Test-Path $ProdPidFile) { Remove-Item $ProdPidFile }
    if (Test-Path $ApiPidFile)  { Remove-Item $ApiPidFile  }

    Write-Host "  Building for production..."
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Error "Build failed — aborting"; exit 1 }

    if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

    $api = Start-Process node `
        -ArgumentList 'server/index.js' `
        -RedirectStandardOutput "$LogDir\api.log" `
        -RedirectStandardError  "$LogDir\api.err" `
        -PassThru -WindowStyle Hidden
    $api.Id | Set-Content $ApiPidFile

    $proc = Start-Process "npm.cmd" `
        -ArgumentList 'run','preview' `
        -RedirectStandardOutput "$LogDir\prod.log" `
        -RedirectStandardError  "$LogDir\prod.err" `
        -PassThru -WindowStyle Hidden
    $proc.Id | Set-Content $ProdPidFile

    Start-Sleep 2
    Write-Host "  ✓ API server started     (PID $($api.Id))  -> http://localhost:$ApiPort"
    Write-Host "  ✓ Production UI started  (PID $($proc.Id)) -> http://localhost:$ProdPort"
    Write-Host "    Logs: $LogDir\api.log  |  $LogDir\prod.log"
}

function Stop-ProdServer {
    $anyRunning = $false

    if (Test-Path $ProdPidFile) {
        $proc = Get-RunningProcess $ProdPidFile
        if ($proc) {
            Stop-ProcessTree $proc.Id
            Write-Host "  ✓ Production UI stopped  (PID $($proc.Id) + children)"
        } else {
            $id = Get-Content $ProdPidFile
            Write-Host "  Production UI was not running (stale PID $id — cleaned up)"
        }
        Clear-Port $ProdPort
        Remove-Item $ProdPidFile
        $anyRunning = $true
    }

    if (Test-Path $ApiPidFile) {
        $api = Get-RunningProcess $ApiPidFile
        if ($api) {
            Stop-ProcessTree $api.Id
            Write-Host "  ✓ API server stopped     (PID $($api.Id) + children)"
        } else {
            $id = Get-Content $ApiPidFile
            Write-Host "  API server was not running (stale PID $id — cleaned up)"
        }
        Clear-Port $ApiPort
        Remove-Item $ApiPidFile
        $anyRunning = $true
    }

    if (-not $anyRunning) {
        Write-Host "  Production server is not running (no PID files)"
    }
}

# ── Status ───────────────────────────────────────────────────────────────────

# Fast TCP port check — tries both IPv4 and IPv6 loopback (1 s timeout, no console noise)
function Test-Port([int]$Port) {
    foreach ($addr in @('127.0.0.1', '::1')) {
        try {
            $tcp  = New-Object System.Net.Sockets.TcpClient
            $conn = $tcp.BeginConnect($addr, $Port, $null, $null)
            $ok   = $conn.AsyncWaitHandle.WaitOne(1000, $false)
            try { $tcp.EndConnect($conn) } catch {}
            $tcp.Close()
            if ($ok) { return $true }
        } catch {}
    }
    return $false
}

# Read a single key from .env (returns $null if not found)
function Get-EnvValue([string]$Key) {
    if (-not (Test-Path '.env')) { return $null }
    $line = Get-Content '.env' -ErrorAction SilentlyContinue |
            Where-Object { $_ -match "^$Key\s*=\s*(.+)$" } |
            Select-Object -First 1
    if ($line -match "^$Key\s*=\s*(.+)$") { return $Matches[1].Trim() }
    return $null
}

function Write-Ok  ([string]$msg) { Write-Host "  $([char]0x2713) $msg" -ForegroundColor Green  }
function Write-Warn([string]$msg) { Write-Host "  $([char]0x26A0) $msg" -ForegroundColor Yellow }
function Write-Fail([string]$msg) { Write-Host "  $([char]0x2717) $msg" -ForegroundColor Red    }
function Write-Hint([string]$msg) { Write-Host "    $msg"               -ForegroundColor DarkGray }

function Show-Status([string]$Mode) {
    Write-Host "`n[Orbitly] $($Mode.ToUpper()) stack status`n"

    # ── Database ──────────────────────────────────────────────────────────────
    Write-Host "  Database" -ForegroundColor Cyan
    try {
        $state  = (docker inspect --format '{{.State.Status}}'        orbitly-postgres 2>$null)
        $health = (docker inspect --format '{{.State.Health.Status}}' orbitly-postgres 2>$null)
        if ($state -eq 'running' -and $health -eq 'healthy') {
            Write-Ok   "PostgreSQL    healthy  -> postgres://localhost:5437/orbitly"
        } elseif ($state -eq 'running') {
            Write-Warn "PostgreSQL    running but not healthy yet (health: $health)"
        } else {
            Write-Fail "PostgreSQL    not running (state: $state)"
            Write-Hint "Fix: .\orbitly.ps1 $Mode start"
        }
    } catch {
        Write-Fail "PostgreSQL    Docker not reachable — is Docker Desktop running?"
    }

    # ── App servers ───────────────────────────────────────────────────────────
    Write-Host ""
    Write-Host "  App servers" -ForegroundColor Cyan

    if ($Mode -eq 'dev') {
        $proc = Get-RunningProcess $DevPidFile
        if ($proc) {
            Write-Ok   "Dev process   running   (PID $($proc.Id))"
        } else {
            Write-Fail "Dev process   not running"
            Write-Hint "Fix: .\orbitly.ps1 dev start"
        }
    } else {
        $apiProc = Get-RunningProcess $ApiPidFile
        $uiProc  = Get-RunningProcess $ProdPidFile
        if ($apiProc) { Write-Ok   "API process   running   (PID $($apiProc.Id))" }
        else          { Write-Fail "API process   not running" ; Write-Hint "Fix: .\orbitly.ps1 prod start" }
        if ($uiProc)  { Write-Ok   "UI  process   running   (PID $($uiProc.Id))" }
        else          { Write-Fail "UI  process   not running" ; Write-Hint "Fix: .\orbitly.ps1 prod start" }
    }

    # Port + HTTP checks
    $uiPort = if ($Mode -eq 'dev') { $DevPort } else { $ProdPort }

    if (Test-Port $ApiPort) {
        try {
            $r = Invoke-WebRequest "http://localhost:$ApiPort/api/plans" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            Write-Ok "API           http://localhost:$ApiPort  [HTTP $($r.StatusCode) OK]"
        } catch {
            Write-Warn "API           port $ApiPort open but not responding to HTTP"
        }
    } else {
        Write-Fail "API           port $ApiPort not listening"
    }

    if (Test-Port $uiPort) {
        Write-Ok   "UI            http://localhost:$uiPort  [port open]"
    } else {
        Write-Fail "UI            port $uiPort not listening"
    }

    # ── AI backends ───────────────────────────────────────────────────────────
    Write-Host ""
    Write-Host "  AI backends" -ForegroundColor Cyan

    $ollamaUrl   = (Get-EnvValue 'OLLAMA_URL')          ?? 'http://localhost:11434'
    $ollamaModel = (Get-EnvValue 'OLLAMA_VISION_MODEL') ?? 'gemma3:4b'

    try {
        $resp   = Invoke-RestMethod "$ollamaUrl/api/tags" -TimeoutSec 3 -ErrorAction Stop
        $models = @($resp.models | ForEach-Object { $_.name })
        $prefix = $ollamaModel.Split(':')[0]
        $match  = $models | Where-Object { $_ -like "$prefix*" } | Select-Object -First 1
        if ($match) {
            Write-Ok   "Ollama        running   -> $match  (primary — local/private)"
        } else {
            Write-Warn "Ollama        running but '$ollamaModel' not loaded  (AI falls back to Gemini)"
            Write-Hint "Fix: ollama pull $ollamaModel"
            if ($models.Count -gt 0) { Write-Hint "Loaded models: $($models -join ', ')" }
        }
    } catch {
        Write-Fail "Ollama        not running  (AI will use Gemini only)"
        Write-Hint "Start: ollama serve   |   Load model: ollama pull $ollamaModel"
    }

    $geminiKey = Get-EnvValue 'GEMINI_API_KEY'
    if ($geminiKey) {
        $masked = $geminiKey.Substring(0, [Math]::Min(8, $geminiKey.Length)) + '…'
        Write-Ok   "Gemini        key configured  ($masked)  (fallback)"
    } else {
        Write-Warn "Gemini        GEMINI_API_KEY not set in .env  (no cloud fallback)"
        Write-Hint "Add to .env: GEMINI_API_KEY=your_key_here"
    }

    Write-Host ""
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

switch ("$Mode-$Action") {
    'dev-status'  { Show-Status 'dev'  }
    'prod-status' { Show-Status 'prod' }
    'dev-start' {
        Write-Host "`n[Orbitly] Starting dev stack..."
        Start-Database
        Start-DevServer
        Show-OllamaStatus
        Write-Host ""
    }
    'dev-stop' {
        Write-Host "`n[Orbitly] Stopping dev stack..."
        Stop-DevServer
        Stop-Database
        Write-Host ""
    }
    'dev-restart' {
        Write-Host "`n[Orbitly] Restarting dev stack..."
        Stop-DevServer
        Start-DevServer
        Show-OllamaStatus
        Write-Host ""
    }
    'prod-start' {
        Write-Host "`n[Orbitly] Starting production stack..."
        Start-Database
        Start-ProdServer
        Show-OllamaStatus
        Write-Host ""
    }
    'prod-stop' {
        Write-Host "`n[Orbitly] Stopping production stack..."
        Stop-ProdServer
        Stop-Database
        Write-Host ""
    }
    'prod-restart' {
        Write-Host "`n[Orbitly] Restarting production stack (stop → build → start)..."
        Stop-ProdServer
        Start-Database
        Start-ProdServer
        Show-OllamaStatus
        Write-Host ""
    }
}
