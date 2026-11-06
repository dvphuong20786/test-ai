@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo CAI DAT MOI TRUONG VIETDUB AI STUDIO
echo ============================================================
call "%~dp001-kiem-tra-moi-truong.cmd" || exit /b 1

echo.
echo [1/6] Cai dependency Node.js...
call pnpm install || exit /b 1

echo.
echo [2/6] Tao moi truong Python 3.12...
if not exist ".venv\Scripts\python.exe" py -3.12 -m venv .venv || exit /b 1

echo.
echo [3/6] Cap nhat pip...
call ".venv\Scripts\python.exe" -m pip install --upgrade pip || exit /b 1

echo.
echo [4/6] Cai dependency AI Worker...
call ".venv\Scripts\python.exe" -m pip install -r "apps\ai-worker\requirements.txt" || exit /b 1

echo.
echo [5/6] Tao cau hinh server neu chua co...
if not exist "apps\server\.env" copy /y "apps\server\.env.example" "apps\server\.env" >nul

echo.
echo [6/6] Tao Prisma Client va SQLite schema...
call pnpm db:generate || exit /b 1
call pnpm db:push || exit /b 1

echo.
echo [THANH CONG] Moi truong da san sang.
call "%~dp0_NOI_BO_hien-thi-dia-chi.cmd"
exit /b 0
