$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
function Invoke-Checked([scriptblock]$Command) { & $Command; if ($LASTEXITCODE -ne 0) { throw "命令失败，退出码 $LASTEXITCODE" } }
Invoke-Checked { & "$Root/backend/.venv/Scripts/python.exe" -m pip install -e "$Root/backend[dev,build]" }
Invoke-Checked { & "$Root/backend/.venv/Scripts/python.exe" -m pytest "$Root/backend/tests" -q }
Push-Location "$Root\frontend"
try { Invoke-Checked { npm ci }; Invoke-Checked { npm test }; Invoke-Checked { npm run build } } finally { Pop-Location }
Push-Location "$Root\overlay"
try { Invoke-Checked { npm ci }; Invoke-Checked { npm run dist } } finally { Pop-Location }
