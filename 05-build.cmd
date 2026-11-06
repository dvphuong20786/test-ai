@echo off
setlocal
cd /d "%~dp0"

call "%~dp001-kiem-tra-moi-truong.cmd" || exit /b 1
echo [BUILD] Dang build desktop va server...
call pnpm build || exit /b 1
echo [THANH CONG] Build hoan tat.
exit /b 0
