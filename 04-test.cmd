@echo off
setlocal
cd /d "%~dp0"

call "%~dp001-kiem-tra-moi-truong.cmd" || exit /b 1
if not exist ".venv\Scripts\python.exe" (
  echo [LOI] Chua co .venv. Hay chay 02-cai-dat.cmd truoc.
  exit /b 1
)
echo [TEST] Dang chay Vitest va Python unittest...
call pnpm test || exit /b 1
echo [THANH CONG] Toan bo test da dat.
exit /b 0
