@echo off
title vnEdu Smart Sync - Trường THCS An Lập
chcp 65001 >nul
color 0B
cls
echo ======================================================================
echo           vnEdu Smart Sync Pro - Trường THCS An Lập
echo               Giáo viên: Cô Lê Thị Diệu Huyên (051197003685)
echo ======================================================================
echo.

:: 1. Kiểm tra môi trường Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Máy tính chưa cài đặt Node.js.
    echo [*] Đang mở trang tải Node.js chính thức... Vui lòng tải bản LTS và cài đặt.
    start https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Tự động cài thư viện cần thiết nếu lần đầu chạy trên máy mới
if not exist node_modules (
    echo [*] Phát hiện lần đầu khởi chạy trên máy mới.
    echo [*] Đang tự động cài đặt thư viện nhẹ (Express, XLSX)...
    call npm install --omit=dev
    echo [V] Cài đặt hoàn tất!
    echo.
)

:: 3. Tự động mở trình duyệt sau khi máy chủ chạy
echo [1/3] Đang khởi chạy máy chủ kết nối trực tiếp vnEdu...
echo [2/3] Cổng kết nối cục bộ: http://localhost:3000
echo [3/3] Đang tự động mở ứng dụng trên trình duyệt web...
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
