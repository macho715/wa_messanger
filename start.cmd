@echo off
if "%~1"=="" (
  powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1"
) else (
  powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1" -Port %~1
)
