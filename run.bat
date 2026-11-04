@echo off
chcp 65001 >nul
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
node start.js
pause
