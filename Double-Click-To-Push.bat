@echo off
title GitHub Portal Sync
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Push-To-GitHub.ps1"
pause
