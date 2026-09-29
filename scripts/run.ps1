<#
.SYNOPSIS
  Teacher-Student Platform — lokal ishga tushirish skripti.

.DESCRIPTION
  Bitta buyruq bilan hammasi avtomatik:
    1. Kerakli texnologiyalarni tekshiradi (Node.js, npm, PostgreSQL)
    2. Versiyalarini ko'rsatadi yoki ogohlantiriladi
    3. .env fayllarni nusxalaydi (agar mavjud bo'lmasa)
    4. npm install (backend + frontend)
    5. Prisma generate + migrate + seed
    6. Backend va Frontendni parallel ishga tushiradi
    7. Brauzer avtomatik ochiladi
    8. Hamma log ham terminalda, ham faylga yoziladi

.USAGE
  powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1
#>

# ─── Strict mode ────────────────────────────────────────────────────
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# ─── Paths ──────────────────────────────────────────────────────────
$ROOT       = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path) }
if (-not $ROOT -or -not (Test-Path (Join-Path $ROOT 'backend'))) {
    $ROOT = 'C:\teacher-student-platform'
}
$BACKEND    = Join-Path $ROOT 'backend'
$FRONTEND   = Join-Path $ROOT 'frontend'
$LOGS_DIR   = Join-Path $ROOT 'logs'
$TIMESTAMP  = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$LOG_FILE   = Join-Path $LOGS_DIR "start-local_$TIMESTAMP.log"

# ─── Ensure logs directory ──────────────────────────────────────────
if (-not (Test-Path $LOGS_DIR)) {
    New-Item -ItemType Directory -Path $LOGS_DIR -Force | Out-Null
}

# ─── Logging helper ─────────────────────────────────────────────────
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('INFO','WARN','ERROR','OK','STEP','BANNER')]
        [string]$Level = 'INFO'
    )
    $ts = Get-Date -Format 'HH:mm:ss'
    $logLine = "[$ts] [$Level] $Message"

    # Color map
    switch ($Level) {
        'INFO'   { $color = 'Cyan'    }
        'WARN'   { $color = 'Yellow'  }
        'ERROR'  { $color = 'Red'     }
        'OK'     { $color = 'Green'   }
        'STEP'   { $color = 'Magenta' }
        'BANNER' { $color = 'White'   }
        default  { $color = 'Gray'    }
    }

    Write-Host $logLine -ForegroundColor $color
    Add-Content -Path $LOG_FILE -Value $logLine -Encoding UTF8
}

function Write-Banner {
    param([string]$Text)
    $border = '=' * 60
    Write-Host ''
    Write-Host $border -ForegroundColor DarkCyan
    Write-Host "  $Text" -ForegroundColor White
    Write-Host $border -ForegroundColor DarkCyan
    Write-Host ''
    Add-Content -Path $LOG_FILE -Value "`n$border`n  $Text`n$border" -Encoding UTF8
}

function Write-SubBanner {
    param([string]$Text)
    $border = '-' * 50
    Write-Host ''
    Write-Host $border -ForegroundColor DarkGray
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host $border -ForegroundColor DarkGray
    Add-Content -Path $LOG_FILE -Value "`n$border`n  $Text`n$border" -Encoding UTF8
}

# ─── Cleanup: kill background jobs on exit ──────────────────────────
$backendJob  = $null
$frontendJob = $null
$tunnelProc  = $null

function Stop-AllJobs {
    Write-Log 'Barcha jarayonlar to`xtatilmoqda...' 'WARN'
    if ($script:backendJob  -and $script:backendJob.State  -eq 'Running') {
        Stop-Job $script:backendJob  -PassThru | Remove-Job -Force
        Write-Log 'Backend to`xtatildi.' 'INFO'
    }
    if ($script:frontendJob -and $script:frontendJob.State -eq 'Running') {
        Stop-Job $script:frontendJob -PassThru | Remove-Job -Force
        Write-Log 'Frontend to`xtatildi.' 'INFO'
    }
    if ($script:tunnelProc -and -not $script:tunnelProc.HasExited) {
        Stop-Process -Id $script:tunnelProc.Id -Force -ErrorAction SilentlyContinue
        Write-Log 'Cloudflare Tunnel to`xtatildi.' 'INFO'
    }
    Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Register cleanup for Ctrl+C
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-AllJobs }

# ════════════════════════════════════════════════════════════════════
#  1. BANNER
# ════════════════════════════════════════════════════════════════════
Write-Banner 'TEACHER-STUDENT PLATFORM - LOKAL ISHGA TUSHIRISH'
Write-Log "Loyiha papkasi : $ROOT" 'INFO'
Write-Log "Log fayl       : $LOG_FILE" 'INFO'
Write-Log "Sana/vaqt      : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 'INFO'

# ════════════════════════════════════════════════════════════════════
#  2. TEXNOLOGIYALARNI TEKSHIRISH
# ════════════════════════════════════════════════════════════════════
Write-SubBanner '1-QADAM: Texnologiyalarni tekshirish'

$allGood = $true

# --- Node.js ---
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVer = & node -v 2>$null
    Write-Log "Node.js    : $nodeVer   ($($nodeCmd.Source))" 'OK'
} else {
    Write-Log 'Node.js    : TOPILMADI!' 'ERROR'
    Write-Log '  -> O`rnatish: winget install OpenJS.NodeJS.LTS' 'WARN'
    Write-Log '  -> Yoki: https://nodejs.org dan yuklab oling' 'WARN'
    $allGood = $false
}

# --- npm ---
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd) {
    $npmVer = & npm -v 2>$null
    Write-Log "npm        : v$npmVer" 'OK'
} else {
    Write-Log 'npm        : TOPILMADI! (Node.js bilan birga o`rnatiladi)' 'ERROR'
    $allGood = $false
}

# --- Git ---
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
    $gitVer = & git --version 2>$null
    Write-Log "Git        : $gitVer" 'OK'
} else {
    Write-Log 'Git        : TOPILMADI!' 'WARN'
}

# --- PostgreSQL (psql or Docker) ---
$psqlCmd   = Get-Command psql -ErrorAction SilentlyContinue
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue

# If psql not on PATH, search common PostgreSQL install directories
if (-not $psqlCmd) {
    $pgRoots = @(
        "$env:ProgramFiles\PostgreSQL",
        "${env:ProgramFiles(x86)}\PostgreSQL"
    )
    foreach ($root in $pgRoots) {
        if (Test-Path $root) {
            # Find the highest version directory with psql.exe
            $versionDirs = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
            foreach ($vdir in $versionDirs) {
                $psqlExe = Join-Path $vdir.FullName 'bin\psql.exe'
                if (Test-Path $psqlExe) {
                    $pgBinDir = Join-Path $vdir.FullName 'bin'
                    $env:Path = "$pgBinDir;$env:Path"
                    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
                    Write-Log "  PostgreSQL topildi: $pgBinDir (PATH ga qo`shildi)" 'INFO'
                    break
                }
            }
            if ($psqlCmd) { break }
        }
    }
}

if ($psqlCmd) {
    $psqlVer = & psql --version 2>$null
    Write-Log "PostgreSQL : $psqlVer" 'OK'
    # Check if PostgreSQL service is running
    $pgService = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Running' } | Select-Object -First 1
    if ($pgService) {
        Write-Log "  Servis    : $($pgService.Name) (Running)" 'OK'
    } else {
        Write-Log '  OGOHLANTIRISH: PostgreSQL servisi ishlamayapti!' 'WARN'
        Write-Log '  -> services.msc dan postgresql servisini ishga tushiring' 'WARN'
    }
} elseif ($dockerCmd) {
    $dockerVer = & docker --version 2>$null
    Write-Log "Docker     : $dockerVer (PostgreSQL uchun ishlatiladi)" 'OK'
    Write-Log '  -> PostgreSQL Docker orqali ishga tushiriladi' 'INFO'
} else {
    Write-Log 'PostgreSQL : TOPILMADI!' 'ERROR'
    Write-Log '  -> Variant A: winget install PostgreSQL.PostgreSQL.16' 'WARN'
    Write-Log '  -> Variant B: Docker Desktop o`rnating, so`ng: docker compose up -d postgres' 'WARN'
    $allGood = $false
}

# --- Summary ---
if (-not $allGood) {
    Write-Host ''
    Write-Host '+======================================================+' -ForegroundColor Red
    Write-Host '|  OGOHLANTIRISH: Ba`zi texnologiyalar topilmadi!      |' -ForegroundColor Red
    Write-Host '|  Yuqoridagi ko`rsatmalar bo`yicha o`rnating,         |' -ForegroundColor Red
    Write-Host '|  so`ng bu skriptni qayta ishga tushiring.            |' -ForegroundColor Red
    Write-Host '+======================================================+' -ForegroundColor Red
    Write-Host ''
    Add-Content -Path $LOG_FILE -Value 'XATO: Kerakli texnologiyalar topilmadi. Skript to`xtatildi.' -Encoding UTF8
    Write-Log "To'liq log: $LOG_FILE" 'INFO'
    exit 1
}

Write-Log 'Barcha kerakli texnologiyalar mavjud!' 'OK'

# ════════════════════════════════════════════════════════════════════
#  3. .ENV FAYLLARNI NUSXALASH VA SOZLASH
# ════════════════════════════════════════════════════════════════════
Write-SubBanner '2-QADAM: .env fayllarni sozlash'

# --- Helper: random key generator (Windows PowerShell 5.1 compatible) ---
function New-RandomKey {
    param([int]$Length = 64)
    $bytes = New-Object byte[] $Length
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return [Convert]::ToBase64String($bytes).Substring(0, $Length)
}

# --- Backend .env ---
$backendEnv = Join-Path $BACKEND '.env'
$backendEnvExample = Join-Path $BACKEND '.env.example'
if (-not (Test-Path $backendEnv)) {
    if (Test-Path $backendEnvExample) {
        Copy-Item $backendEnvExample $backendEnv
        Write-Log "backend/.env nusxalandi (.env.example dan)" 'OK'
    } else {
        Write-Log "backend/.env.example topilmadi! Qo'lda yarating." 'ERROR'
        exit 1
    }
} else {
    Write-Log 'backend/.env allaqachon mavjud' 'INFO'
}

# --- Auto-generate JWT_SECRET and CREDENTIALS_ENCRYPTION_KEY ---
$envContent = Get-Content $backendEnv -Raw

$needsSave = $false

# JWT_SECRET
if ($envContent -match 'JWT_SECRET=(AUTO_GENERATE|replace-with-a-long-random-value-before-deploying)') {
    $jwtKey = New-RandomKey -Length 48
    $envContent = $envContent -replace 'JWT_SECRET=(AUTO_GENERATE|replace-with-a-long-random-value-before-deploying)', "JWT_SECRET=$jwtKey"
    Write-Log "JWT_SECRET avtomatik generatsiya qilindi" 'OK'
    $needsSave = $true
} else {
    Write-Log 'JWT_SECRET allaqachon sozlangan' 'INFO'
}

# CREDENTIALS_ENCRYPTION_KEY
if ($envContent -match 'CREDENTIALS_ENCRYPTION_KEY=(AUTO_GENERATE|replace-with-a-long-random-value-before-deploying)') {
    $encKey = New-RandomKey -Length 48
    $envContent = $envContent -replace 'CREDENTIALS_ENCRYPTION_KEY=(AUTO_GENERATE|replace-with-a-long-random-value-before-deploying)', "CREDENTIALS_ENCRYPTION_KEY=$encKey"
    Write-Log "CREDENTIALS_ENCRYPTION_KEY avtomatik generatsiya qilindi" 'OK'
    $needsSave = $true
} else {
    Write-Log 'CREDENTIALS_ENCRYPTION_KEY allaqachon sozlangan' 'INFO'
}

if ($needsSave) {
    Set-Content -Path $backendEnv -Value $envContent.TrimEnd() -Encoding UTF8 -NoNewline
    Write-Log 'backend/.env yangilandi (kalitlar generatsiya qilindi)' 'OK'
}

# Re-read env for later use
$envContent = Get-Content $backendEnv -Raw

# --- Frontend .env va nip.io sozlash ---
$frontendEnv = Join-Path $FRONTEND '.env'
# Bo'sh qoldiriladi - Vite proxy barcha API so'rovlarni avtomatik backend ga yo'naltiradi
Set-Content -Path $frontendEnv -Value 'VITE_API_URL=' -Encoding UTF8

# Lokal IP va nip.io domenini aniqlash (Wi-Fi tarmoq uchun)
$localIP = $null
try {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { 
        $_.InterfaceAlias -notmatch 'Loopback' -and 
        $_.IPAddress -notlike '169.254*' -and 
        $_.IPAddress -notlike '127.*' 
    } | Select-Object -First 1).IPAddress
} catch {}

if ($localIP) {
    $nipDomain = "$localIP.nip.io"
} else {
    $localIP = "127.0.0.1"
    $nipDomain = "localhost"
}

# ════════════════════════════════════════════════════════════════════
#  4. POSTGRESQL BAZANI TAYYORLASH
# ════════════════════════════════════════════════════════════════════
Write-SubBanner '3-QADAM: PostgreSQL bazani tayyorlash'

# Parse DB connection and PG superuser password from .env
$dbUser = 'app'; $dbPass = 'app'; $dbHost = 'localhost'; $dbPort = '5432'; $dbName = 'teacher_student'
if ($envContent -match 'DATABASE_URL=postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(\S+)') {
    $dbUser = $Matches[1]; $dbPass = $Matches[2]; $dbHost = $Matches[3]
    $dbPort = $Matches[4]; $dbName = $Matches[5].Trim()
}

# PG superuser password from .env (default: root)
$pgSuperPassword = 'root'
if ($envContent -match 'PG_SUPERUSER_PASSWORD=(\S+)') {
    $pgSuperPassword = $Matches[1]
}

if ($dockerCmd -and -not $psqlCmd) {
    Write-Log 'Docker Compose orqali PostgreSQL ishga tushirilmoqda...' 'STEP'
    Push-Location $BACKEND
    try {
        & docker compose up -d postgres 2>&1 | ForEach-Object {
            Write-Log "  docker: $_" 'INFO'
        }
        Write-Log 'PostgreSQL konteyner ishga tushdi' 'OK'
        Write-Log 'PostgreSQL tayyorligini kutmoqda (10 sekund)...' 'INFO'
        Start-Sleep -Seconds 10
    } catch {
        Write-Log "Docker Compose xatolik: $_" 'ERROR'
        Write-Log 'PostgreSQL qo`lda ishga tushiring va qayta urinib ko`ring.' 'WARN'
    } finally {
        Pop-Location
    }
} else {
    Write-Log 'Lokal PostgreSQL ishlatilmoqda' 'INFO'
    Write-Log "  DB ulanish: $dbUser@${dbHost}:${dbPort}/$dbName" 'INFO'

    # Set PGPASSWORD so psql never prompts
    $env:PGPASSWORD = $pgSuperPassword

    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    try {
        # Check if role exists
        $roleCheck = & psql -U postgres -h $dbHost -p $dbPort -tAc "SELECT 1 FROM pg_roles WHERE rolname='$dbUser'" 2>$null
        if ($roleCheck.Trim() -ne '1') {
            Write-Log "  '$dbUser' foydalanuvchisi yaratilmoqda..." 'STEP'
            & psql -U postgres -h $dbHost -p $dbPort -c "CREATE ROLE $dbUser WITH LOGIN CREATEDB PASSWORD '$dbPass'" 2>&1 | ForEach-Object { Write-Log "  psql: $_" 'INFO' }
            Write-Log "  '$dbUser' foydalanuvchisi yaratildi" 'OK'
        } else {
            Write-Log "  '$dbUser' foydalanuvchisi allaqachon mavjud" 'OK'
            # Prisma migrate dev shadow database yaratishi uchun CREATEDB ruxsati kerak
            & psql -U postgres -h $dbHost -p $dbPort -c "ALTER ROLE $dbUser CREATEDB" 2>&1 | Out-Null
        }

        # Check if database exists
        $dbCheck = & psql -U postgres -h $dbHost -p $dbPort -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName'" 2>$null
        if ($dbCheck.Trim() -ne '1') {
            Write-Log "  '$dbName' bazasi yaratilmoqda..." 'STEP'
            & psql -U postgres -h $dbHost -p $dbPort -c "CREATE DATABASE $dbName OWNER $dbUser" 2>&1 | ForEach-Object { Write-Log "  psql: $_" 'INFO' }
            Write-Log "  '$dbName' bazasi yaratildi" 'OK'
        } else {
            Write-Log "  '$dbName' bazasi allaqachon mavjud" 'OK'
        }
    } catch {
        Write-Log "  Baza yaratishda xatolik: $_" 'WARN'
        Write-Log "  PG_SUPERUSER_PASSWORD ni backend/.env da tekshiring (hozir: '$pgSuperPassword')" 'WARN'
    }

    $ErrorActionPreference = $prevEAP
    # Clear PGPASSWORD
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

# ════════════════════════════════════════════════════════════════════
#  5. BACKEND: NPM INSTALL + PRISMA + SEED
# ════════════════════════════════════════════════════════════════════
Write-SubBanner '4-QADAM: Backend sozlash (npm install + Prisma)'

Push-Location $BACKEND
try {
    # Temporarily allow stderr output (npm writes warnings to stderr)
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    # npm install (check for .bin to detect incomplete installs)
    $nmBin = Join-Path $BACKEND 'node_modules\.bin'
    if (-not (Test-Path $nmBin)) {
        Write-Log 'npm install (backend) - bog`liqliklar o`rnatilmoqda...' 'STEP'
        & npm install 2>&1 | ForEach-Object {
            $line = $_.ToString()
            if ($line -match 'error|ERR!') { Write-Log "  npm: $line" 'ERROR' }
            elseif ($line -match 'warn') { Write-Log "  npm: $line" 'WARN' }
            else { Write-Log "  npm: $line" 'INFO' }
        }
        if ($LASTEXITCODE -ne 0) { throw "npm install backend exit code: $LASTEXITCODE" }
        Write-Log 'Backend bog`liqliklari o`rnatildi!' 'OK'
    } else {
        Write-Log 'backend/node_modules allaqachon mavjud - o`tkazib yuborildi' 'INFO'
    }

    # Prisma binary
    $prismaBin = Join-Path $BACKEND 'node_modules\.bin\prisma.cmd'

    # Prisma generate
    $prismaClientDll = Join-Path $BACKEND 'node_modules\.prisma\client\query_engine-windows.dll.node'
    if (-not (Test-Path $prismaClientDll)) {
        Write-Log 'Prisma Client generatsiya qilinmoqda...' 'STEP'
        & $prismaBin generate 2>&1 | ForEach-Object { Write-Log "  prisma: $_" 'INFO' }
        if ($LASTEXITCODE -ne 0) { throw "prisma generate exit code: $LASTEXITCODE" }
    } else {
        Write-Log 'Prisma Client allaqachon mavjud - o`tkazib yuborildi' 'INFO'
    }

    # Prisma migrate
    Write-Log 'Prisma migratsiyalar qo`llanilmoqda...' 'STEP'
    & $prismaBin migrate deploy 2>&1 | ForEach-Object { Write-Log "  prisma: $_" 'INFO' }
    if ($LASTEXITCODE -ne 0) { throw "prisma migrate exit code: $LASTEXITCODE" }
    Write-Log 'Migratsiyalar muvaffaqiyatli!' 'OK'

    # Seed
    Write-Log 'Seed (boshlang`ich ma`lumotlar) ishga tushirilmoqda...' 'STEP'
    $tsNodeBin = Join-Path $BACKEND 'node_modules\.bin\ts-node.cmd'
    & $tsNodeBin prisma/seed.ts 2>&1 | ForEach-Object { Write-Log "  seed: $_" 'INFO' }
    if ($LASTEXITCODE -ne 0) { throw "prisma:seed exit code: $LASTEXITCODE" }
    Write-Log 'Seed muvaffaqiyatli!' 'OK'

    $ErrorActionPreference = $prevEAP

} catch {
    $ErrorActionPreference = $prevEAP
    Write-Log "Backend sozlash xatolik: $_" 'ERROR'
    Write-Log 'Xatolikni tuzating va qayta ishga tushiring.' 'WARN'
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# ════════════════════════════════════════════════════════════════════
#  6. FRONTEND: NPM INSTALL
# ════════════════════════════════════════════════════════════════════
Write-SubBanner '5-QADAM: Frontend sozlash (npm install)'

Push-Location $FRONTEND
try {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    if (-not (Test-Path (Join-Path $FRONTEND 'node_modules\.bin'))) {
        Write-Log 'npm install (frontend) - bog`liqliklar o`rnatilmoqda...' 'STEP'
        & npm install 2>&1 | ForEach-Object {
            $line = $_.ToString()
            if ($line -match 'error|ERR!') { Write-Log "  npm: $line" 'ERROR' }
            elseif ($line -match 'warn') { Write-Log "  npm: $line" 'WARN' }
            else { Write-Log "  npm: $line" 'INFO' }
        }
        if ($LASTEXITCODE -ne 0) { throw "npm install frontend exit code: $LASTEXITCODE" }
        Write-Log 'Frontend bog`liqliklari o`rnatildi!' 'OK'
    } else {
        Write-Log 'frontend/node_modules allaqachon mavjud - o`tkazib yuborildi' 'INFO'
    }

    $ErrorActionPreference = $prevEAP
} catch {
    $ErrorActionPreference = $prevEAP
    Write-Log "Frontend npm install xatolik: $_" 'ERROR'
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# ════════════════════════════════════════════════════════════════════
#  7. BACKEND VA FRONTEND NI PARALLEL ISHGA TUSHIRISH
# ════════════════════════════════════════════════════════════════════
Write-SubBanner '6-QADAM: Backend va Frontend ishga tushirilmoqda'

$BACKEND_PORT  = 3000
$FRONTEND_PORT = 5173

# --- Start Backend as background job ---
Write-Log "Backend ishga tushirilmoqda (port $BACKEND_PORT)..." 'STEP'

$backendJob = Start-Job -Name 'TSP_Backend' -ScriptBlock {
    param($dir)
    Set-Location $dir
    $env:NODE_ENV = 'development'
    & npm.cmd run start:dev 2>&1
} -ArgumentList $BACKEND

# --- Start Frontend as background job ---
Write-Log "Frontend ishga tushirilmoqda (port $FRONTEND_PORT)..." 'STEP'

$frontendJob = Start-Job -Name 'TSP_Frontend' -ScriptBlock {
    param($dir)
    Set-Location $dir
    & npm.cmd run dev 2>&1
} -ArgumentList $FRONTEND

# --- Start Cloudflare Tunnel (Internet orqali global kirish) ---
$cloudflaredExe = Join-Path $ROOT 'bin\cloudflared.exe'
if (-not (Test-Path $cloudflaredExe)) {
    $cloudflaredExe = 'C:\teacher-student-platform\bin\cloudflared.exe'
}
$tunnelProc = $null
$tunnelUrl  = $null
$tunnelLog  = Join-Path $LOGS_DIR "tunnel_$TIMESTAMP.log"

if (Test-Path $cloudflaredExe) {
    Write-Log 'Cloudflare Tunnel ishga tushirilmoqda (Global Internet uchun)...' 'STEP'
    $tunnelProc = Start-Process -FilePath $cloudflaredExe -ArgumentList 'tunnel --url http://localhost:5173' -NoNewWindow -PassThru -RedirectStandardError $tunnelLog
} else {
    Write-Log "Cloudflare topilmadi: $cloudflaredExe" 'WARN'
}

Write-Log 'Serverlar background da ishga tushdi!' 'OK'

# ════════════════════════════════════════════════════════════════════
#  8. SERVERLARNI KUTISH VA BRAUZER OCHISH
# ════════════════════════════════════════════════════════════════════
Write-SubBanner '7-QADAM: Serverlar tayyorligini kutish'

# Wait for backend
$backendReady = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/api/docs" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {
        # Still starting...
    }
    Write-Log "  Backend kutilmoqda... ($i/30)" 'INFO'
}

if ($backendReady) {
    Write-Log "Backend tayyor! -> http://localhost:$BACKEND_PORT" 'OK'
    Write-Log "Swagger API  -> http://localhost:$BACKEND_PORT/api/docs" 'OK'
} else {
    Write-Log 'Backend 60 sekund ichida javob bermadi!' 'WARN'
    Write-Log 'Loglarni tekshiring - server hali ishga tushayotgan bo`lishi mumkin.' 'WARN'
}

# Wait a moment for frontend (Vite is usually faster)
Start-Sleep -Seconds 3
Write-Log "Frontend tayyor! -> http://localhost:$FRONTEND_PORT" 'OK'

# Cloudflare Tunnel URL ni aniqlash
if ($tunnelProc) {
    Write-Log 'Global HTTPS havola olinmoqda (Cloudflare)...' 'STEP'
    for ($t = 1; $t -le 25; $t++) {
        Start-Sleep -Seconds 1
        if (Test-Path $tunnelLog) {
            $tContent = Get-Content $tunnelLog -Raw -ErrorAction SilentlyContinue
            if ($tContent -match 'https://(?!api\.)([a-zA-Z0-9-]+)\.trycloudflare\.com') {
                $tunnelUrl = $Matches[0]
                break
            }
        }
    }
    if ($tunnelUrl) {
        Write-Log "Global HTTPS havola olindi: $tunnelUrl" 'OK'
        Start-Sleep -Seconds 2
    } else {
        Write-Log 'Tunnel ulanishi kutilmoqda (orqa fonda ulanishi bilan brauzerda ochiladi)...' 'INFO'
    }
}

# --- Open browser ---
$openUrl = if ($tunnelUrl) { $tunnelUrl } else { "http://localhost:$FRONTEND_PORT" }
Write-Log "Brauzer ochilmoqda -> $openUrl" 'STEP'
Start-Process $openUrl

# ════════════════════════════════════════════════════════════════════
#  9. XULOSA
# ════════════════════════════════════════════════════════════════════
Write-Host ''
Write-Host '+========================================================================+' -ForegroundColor Green
Write-Host '|                                                                        |' -ForegroundColor Green
Write-Host '|   PLATFORMA MUVAFFAQIYATLI ISHGA TUSHDI!                              |' -ForegroundColor Green
Write-Host '|                                                                        |' -ForegroundColor Green
Write-Host "|   [1. Kompyuterda]:                                                    |" -ForegroundColor Green
Write-Host "|       Frontend : http://localhost:$FRONTEND_PORT                                 |" -ForegroundColor Green
Write-Host "|       Swagger  : http://localhost:$BACKEND_PORT/api/docs                         |" -ForegroundColor Green
Write-Host '|                                                                        |' -ForegroundColor Green
if ($tunnelUrl) {
    Write-Host "|   [2. HAR QANDAY TARMOQDAN / TELEFON / 4G / 5G / WI-FI SIZ]:           |" -ForegroundColor Yellow
    Write-Host "|       Global HTTPS : $tunnelUrl" -ForegroundColor Cyan
    Write-Host "|       (Dunyoning istalgan joyidan, hech qanday Wi-Fi siz ochiladi)           |" -ForegroundColor DarkGray
    Write-Host '|                                                                        |' -ForegroundColor Green
} else {
    Write-Host "|   [2. HAR QANDAY TARMOQDAN / TELEFON (Cloudflare Tunnel)]:             |" -ForegroundColor Yellow
    Write-Host "|       Tunnel ulanmoqda... Qisqa vaqtda pastda havola chiqadi           |" -ForegroundColor Cyan
    Write-Host '|                                                                        |' -ForegroundColor Green
}
Write-Host "|   [3. Bitta Wi-Fi tarmog'idan (Lokal / nip.io)]:                       |" -ForegroundColor Green
Write-Host "|       Lokal : http://${nipDomain}:$FRONTEND_PORT" -ForegroundColor Cyan
Write-Host '|                                                                        |' -ForegroundColor Green
Write-Host "|   Log fayl : logs/start-local_$TIMESTAMP.log             |" -ForegroundColor Green
Write-Host '|                                                                        |' -ForegroundColor Green
Write-Host '|   To`xtatish uchun: Ctrl+C                                            |' -ForegroundColor Green
Write-Host '|                                                                        |' -ForegroundColor Green
Write-Host '+========================================================================+' -ForegroundColor Green
Write-Host ''

Add-Content -Path $LOG_FILE -Value "`n=== Platforma ishga tushdi: $(Get-Date -Format 'HH:mm:ss') ===" -Encoding UTF8

# ════════════════════════════════════════════════════════════════════
#  10. JONLI LOG — Backend va Frontend loglarini realtime ko'rsatish
# ════════════════════════════════════════════════════════════════════
Write-Log 'Jonli loglar boshlanmoqda (Ctrl+C - to`xtatish)...' 'BANNER'
Write-Host ''

try {
    while ($true) {

        # Agar tunnel boshida ulgurmagan bo'lsa, endi chiqqan bo'lsa darhol ochish
        if (-not $tunnelUrl -and $tunnelProc -and (Test-Path $tunnelLog)) {
            $tContent = Get-Content $tunnelLog -Raw -ErrorAction SilentlyContinue
            if ($tContent -match 'https://(?!api\.)([a-zA-Z0-9-]+)\.trycloudflare\.com') {
                $tunnelUrl = $Matches[0]
                Write-Host ''
                Write-Host ">>> GLOBAL HTTPS HAVOLA TAYYOR: $tunnelUrl <<<" -ForegroundColor Green
                Write-Host ">>> Brauzerda ochilmoqda... <<<" -ForegroundColor Yellow
                Write-Host ''
                Start-Process $tunnelUrl
            }
        }

        # Backend logs
        if ($backendJob.HasMoreData) {
            Receive-Job $backendJob 2>&1 | ForEach-Object {
                $line = $_.ToString()
                $ts   = Get-Date -Format 'HH:mm:ss'
                $display = "[$ts] [BACKEND]  $line"

                if ($line -match 'error|Error|ERROR|exception|Exception') {
                    Write-Host $display -ForegroundColor Red
                } elseif ($line -match 'warn|Warn|WARN') {
                    Write-Host $display -ForegroundColor Yellow
                } else {
                    Write-Host $display -ForegroundColor DarkCyan
                }
                Add-Content -Path $LOG_FILE -Value $display
            }
        }

        # Frontend logs
        if ($frontendJob.HasMoreData) {
            Receive-Job $frontendJob 2>&1 | ForEach-Object {
                $line = $_.ToString()
                $ts   = Get-Date -Format 'HH:mm:ss'
                $display = "[$ts] [FRONTEND] $line"

                if ($line -match 'error|Error|ERROR') {
                    Write-Host $display -ForegroundColor Red
                } elseif ($line -match 'warn|Warn|WARN') {
                    Write-Host $display -ForegroundColor Yellow
                } else {
                    Write-Host $display -ForegroundColor Magenta
                }
                Add-Content -Path $LOG_FILE -Value $display
            }
        }

        # Check if jobs died
        if ($backendJob.State  -eq 'Failed') {
            Write-Log 'Backend jarayoni xato bilan tugadi!' 'ERROR'
            Receive-Job $backendJob 2>&1 | ForEach-Object { Write-Log "  $_" 'ERROR' }
        }
        if ($frontendJob.State -eq 'Failed') {
            Write-Log 'Frontend jarayoni xato bilan tugadi!' 'ERROR'
            Receive-Job $frontendJob 2>&1 | ForEach-Object { Write-Log "  $_" 'ERROR' }
        }
        if ($backendJob.State -ne 'Running' -and $frontendJob.State -ne 'Running') {
            Write-Log 'Ikkala server ham to`xtadi. Skript tugatilmoqda.' 'WARN'
            break
        }

        Start-Sleep -Milliseconds 500
    }
} finally {
    Stop-AllJobs
    Write-Log "Skript tugatildi. Log: $LOG_FILE" 'INFO'
}
