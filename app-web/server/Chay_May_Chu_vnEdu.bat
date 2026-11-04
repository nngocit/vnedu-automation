@echo off
title vnEdu Smart Sync - May chu Angular Fullstack
chcp 65001 >nul
color 0A
cls
echo ======================================================================
echo           vnEdu Smart Sync - Máy chủ Angular Fullstack (IP Việt Nam)
echo                     Giáo viên: Lê Thị Diệu Huyên
echo ======================================================================
echo.
echo [1/3] Đang khởi động máy chủ hỗ trợ kết nối vnEdu...
echo [2/3] Cổng hoạt động: http://localhost:3000
echo [3/3] Đang tự động mở giao diện Angular trên trình duyệt...
echo.
echo Máy chủ đang chạy ngầm để hỗ trợ kết nối nội địa tốc độ cao.
echo Cô có thể thu nhỏ cửa sổ này xuống thanh Taskbar (không tắt cửa sổ này nhé cô).
echo.
echo ======================================================================
start "" http://localhost:3000
node server.js
pause
