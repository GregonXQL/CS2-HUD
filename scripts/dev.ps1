param([switch]$Overlay)
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Processes = @()
try {
  $Processes += Start-Process -FilePath "$Root\backend\.venv\Scripts\python.exe" -ArgumentList '-m','uvicorn','app.main:app','--host','0.0.0.0','--port','8000' -WorkingDirectory "$Root\backend" -PassThru -NoNewWindow
  $Processes += Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev' -WorkingDirectory "$Root\frontend" -PassThru -NoNewWindow
  if ($Overlay) {
    $env:OVERLAY_URL = 'http://localhost:5173/hud?overlay=1'
    $Processes += Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev' -WorkingDirectory "$Root\overlay" -PassThru -NoNewWindow
  }
  Write-Host '控制台：http://localhost:5173/control；按 Ctrl+C 停止。'
  while ($true) { Start-Sleep -Seconds 1 }
} finally {
  foreach ($Process in $Processes) { if (!$Process.HasExited) { taskkill /PID $Process.Id /T /F | Out-Null } }
}
