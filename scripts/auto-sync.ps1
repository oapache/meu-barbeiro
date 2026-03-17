param(
    [int]$IntervalSeconds = 10
)

$ErrorActionPreference = "Stop"

function Test-ManifestChanged {
    param(
        [string[]]$Files
    )

    foreach ($file in $Files) {
        if ($file -match "(^|/)package\.json$" -or
            $file -match "(^|/)package-lock\.json$" -or
            $file -match "(^|/)pnpm-lock\.yaml$" -or
            $file -match "(^|/)yarn\.lock$") {
            return $true
        }
    }

    return $false
}

function Install-IfNeeded {
    param(
        [string]$AppPath
    )

    if (-not (Test-Path -LiteralPath $AppPath)) {
        return
    }

    if (-not (Test-Path -LiteralPath (Join-Path $AppPath "package.json"))) {
        return
    }

    Write-Host "[$(Get-Date -Format HH:mm:ss)] Instalando dependencias em $AppPath..." -ForegroundColor Cyan
    Push-Location $AppPath
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install falhou em $AppPath"
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host "Auto-sync iniciado. Intervalo: $IntervalSeconds s" -ForegroundColor Green
Write-Host "Pressione Ctrl+C para parar." -ForegroundColor Yellow

while ($true) {
    try {
        Push-Location $PSScriptRoot\..

        git fetch origin | Out-Null
        $behind = git rev-list --count HEAD..origin/main

        if ([int]$behind -gt 0) {
            Write-Host "[$(Get-Date -Format HH:mm:ss)] Encontradas $behind atualizacao(oes). Aplicando..." -ForegroundColor Green

            $changedFiles = git diff --name-only HEAD..origin/main

            git pull --rebase origin main
            if ($LASTEXITCODE -ne 0) {
                throw "git pull --rebase falhou"
            }

            if (Test-ManifestChanged -Files $changedFiles) {
                Install-IfNeeded -AppPath "backend"
                Install-IfNeeded -AppPath "frontend"
            }

            Write-Host "[$(Get-Date -Format HH:mm:ss)] Sync concluido." -ForegroundColor Green
        }
        else {
            Write-Host "[$(Get-Date -Format HH:mm:ss)] Sem novas atualizacoes." -ForegroundColor DarkGray
        }
    }
    catch {
        Write-Host "[$(Get-Date -Format HH:mm:ss)] Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
    finally {
        Pop-Location -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds $IntervalSeconds
}
