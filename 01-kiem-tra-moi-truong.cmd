@echo off
rem Buoc 01: kiem tra moi truong.
setlocal
cd /d "%~dp0.."

where node >nul 2>nul || (
  echo [LOI] Chua tim thay Node.js trong PATH.
  exit /b 1
)
where pnpm >nul 2>nul || (
  echo [LOI] Chua tim thay pnpm trong PATH. Cai bang: npm install -g pnpm@10.20.0
  exit /b 1
)
py -3.12 --version >nul 2>nul || (
  echo [LOI] Chua tim thay Python 3.12 qua Python Launcher.
  exit /b 1
)

echo [OK] Node.js:
node --version
echo [OK] pnpm:
call pnpm --version
echo [OK] Python:
py -3.12 --version

where ffmpeg >nul 2>nul && (echo [OK] Da tim thay FFmpeg.) || echo [CANH BAO] Chua tim thay FFmpeg trong PATH.
where ffprobe >nul 2>nul && (echo [OK] Da tim thay FFprobe.) || echo [CANH BAO] Chua tim thay FFprobe trong PATH.
exit /b 0
