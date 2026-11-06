@echo off
setlocal
cd /d "%~dp0"

echo Prisma Studio: http://localhost:5555
echo Nhan Ctrl+C de dung Prisma Studio.
call pnpm db:studio
exit /b %errorlevel%
