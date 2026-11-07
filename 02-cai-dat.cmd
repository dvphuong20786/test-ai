@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo CAI DAT MOI TRUONG VIETVOICE AI STUDIO
echo ============================================================
call "%~dp001-kiem-tra-moi-truong.cmd" || exit /b 1

echo.
echo [1/8] Cai dependency Node.js...
call pnpm install || exit /b 1

echo.
echo [2/8] Tao moi truong Python 3.12...
if not exist ".venv\Scripts\python.exe" py -3.12 -m venv .venv || exit /b 1

echo.
echo [3/8] Cap nhat pip...
call ".venv\Scripts\python.exe" -m pip install --upgrade pip || exit /b 1

echo.
echo [4/8] Cai dependency AI Worker...
call ".venv\Scripts\python.exe" -m pip install -r "apps\ai-worker\requirements.txt" || exit /b 1

echo.
echo [5/8] Tao cau hinh server neu chua co...
if not exist "apps\server\.env" copy /y "apps\server\.env.example" "apps\server\.env" >nul

echo.
echo [6/8] Tao Prisma Client va SQLite schema...
call pnpm db:generate || exit /b 1
call pnpm db:push || exit /b 1

echo.
echo [7/8] Tai model giong Viet Piper...
call ".venv\Scripts\python.exe" "scripts\download-piper-voice.py" || exit /b 1

echo.
echo [8/8] Cai goi dich Argos Trung-Anh-Viet...
call ".venv\Scripts\argospm.exe" install translate-zh_en || exit /b 1
call ".venv\Scripts\argospm.exe" install translate-en_vi || exit /b 1

echo.
echo [THANH CONG] Moi truong da san sang.
call "%~dp0_NOI_BO_hien-thi-dia-chi.cmd"
exit /b 0
