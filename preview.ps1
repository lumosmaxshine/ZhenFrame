# Local static preview: http://127.0.0.1:5173/
$py = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"
if (-not (Test-Path $py)) {
  $cmd = Get-Command python -ErrorAction SilentlyContinue
  if ($cmd) { $py = $cmd.Source }
}
if (-not (Test-Path $py)) {
  Write-Error "Python not found. Install Python 3.12 first."
  exit 1
}

Set-Location $PSScriptRoot
Write-Host "ZhenFrame preview -> http://127.0.0.1:5173/"
Write-Host "Ctrl+C to stop"
& $py -m http.server 5173 --bind 127.0.0.1
