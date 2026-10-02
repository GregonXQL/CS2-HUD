$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Python = Join-Path $Root 'backend/.venv/Scripts/python.exe'
$OriginalPath = $env:PATH
# Conda-backed virtualenvs keep dependent OpenSSL/libffi DLLs outside DLLs/.
$BasePrefix = & $Python -c 'import sys; print(sys.base_prefix)'
if (Test-Path "$BasePrefix/Library/bin") { $env:PATH = "$BasePrefix/Library/bin;$env:PATH" }
Push-Location "$Root/backend"
try {
  & $Python -m PyInstaller --noconfirm --clean --onedir --name CS2BroadcastBackend --collect-submodules uvicorn --collect-submodules websockets desktop.py
  if ($LASTEXITCODE -ne 0) { throw 'Backend packaging failed' }
} finally { Pop-Location; $env:PATH = $OriginalPath }
# Seed only the GSI token from the supplied cfg. Never bundle a private .env.
$Gsi = Get-Content -Raw "$Root/cfg/gamestate_integration_cs2broadcast.cfg"
$TokenMatch = [regex]::Match($Gsi, '"token"\s+"([^"\r\n]+)"')
if (!$TokenMatch.Success) { throw 'GSI cfg is missing auth.token' }
New-Item -ItemType Directory -Force "$Root/overlay/build" | Out-Null
[IO.File]::WriteAllText("$Root/overlay/build/backend.env", "GSI_TOKEN=" + $TokenMatch.Groups[1].Value + "`n", (New-Object Text.UTF8Encoding($false)))
