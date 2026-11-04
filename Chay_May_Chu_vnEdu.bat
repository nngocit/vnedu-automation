@echo off
title vnEdu Smart Sync - THCS An Lap
chcp 65001 >nul
color 0B
cls
echo ======================================================================
echo           vnEdu Smart Sync - Trường THCS An Lập
echo               Giáo viên: Lê Thị Diệu Huyên (051197003685)
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Kiểm tra môi trường Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Máy tính chưa cài đặt Node.js.
    echo [*] Vui lòng cài đặt Node.js từ https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Khởi chạy máy chủ 
echo [1/3] Đang khởi chạy máy chủ kết nối trực tiếp vnEdu...
echo [2/3] Cổng kết nối nội bộ: http://localhost:3000
echo [3/3] Tự động mở ứng dụng trên trình duyệt web...
echo.
echo ----------------------------------------------------------------------
echo  Cô có thể thu nhỏ cửa sổ này xuống Taskbar (không tắt cửa sổ này nhé cô).
echo ----------------------------------------------------------------------
echo.

start "" http://localhost:3000
node server.js
if %errorlevel% neq 0 (
    echo.
    echo [!] Máy chủ đã dừng. Nhấn phím bất kỳ để đóng.
    pause
)
