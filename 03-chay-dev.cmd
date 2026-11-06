@echo off
setlocal
cd /d "%~dp0"

call "%~dp001-kiem-tra-moi-truong.cmd" || exit /b 1
if not exist "node_modules" (
  echo [LOI] Chua cai dependency Node.js. Hay chay 02-cai-dat.cmd truoc.
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo [LOI] Chua co Python virtual environment. Hay chay 02-cai-dat.cmd truoc.
  exit /b 1
)

call "%~dp0_NOI_BO_hien-thi-dia-chi.cmd"
echo.
echo Dang khoi dong server, AI Worker va Electron...
echo Nhan Ctrl+C de dung toan bo moi truong development.
echo.
call pnpm dev
exit /b %errorlevel%
