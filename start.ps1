param(
  [int]$Port = 3006
)

$ErrorActionPreference = "Stop"
$EnvFile = Join-Path $PSScriptRoot ".env.local"

if (Test-Path -LiteralPath $EnvFile) {
  Get-Content -LiteralPath $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $parts = $line -split '=', 2
    if ($parts.Length -ne 2) { return }
    [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
  }
}

$env:PORT = [string]$Port
node server.js
