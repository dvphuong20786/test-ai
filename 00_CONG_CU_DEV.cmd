@echo off
setlocal
cd /d "%~dp0"

:menu
cls
echo ============================================================
echo              VIETVOICE AI STUDIO - CONG CU DEV
echo ============================================================
echo [1] Buoc 01 - Kiem tra moi truong
echo [2] Buoc 02 - Cai dat dependency va database
echo [3] Buoc 03 - Chay development
echo [4] Buoc 04 - Chay toan bo test
echo [5] Buoc 05 - Build project
echo [6] Buoc 06 - Mo Prisma Studio
echo [9] Buoc 90 - Lam sach build va cache
echo [8] Hien thi cac dia chi local
echo [0] Thoat
echo ============================================================
set /p luaChon=Nhap lua chon: 

if "%luaChon%"=="1" call "%~dp001-kiem-tra-moi-truong.cmd"
if "%luaChon%"=="2" call "%~dp002-cai-dat.cmd"
if "%luaChon%"=="3" call "%~dp003-chay-dev.cmd"
if "%luaChon%"=="4" call "%~dp004-test.cmd"
if "%luaChon%"=="5" call "%~dp005-build.cmd"
if "%luaChon%"=="6" call "%~dp006-mo-database.cmd"
if "%luaChon%"=="9" call "%~dp090-lam-sach.cmd"
if "%luaChon%"=="8" call "%~dp0_NOI_BO_hien-thi-dia-chi.cmd"
if "%luaChon%"=="0" exit /b 0

echo.
pause
goto menu
