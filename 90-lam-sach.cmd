@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo BUOC 90 - LAM SACH FILE BUILD VA CACHE
echo Chi chay khi can build lai tu dau hoac xu ly loi cache.
echo KHONG PHAI buoc bat buoc trong moi lan phat trien.
echo ============================================================
set /p xacNhan=Nhap XOA de tiep tuc, nhap gia tri khac de huy: 
if /i not "%xacNhan%"=="XOA" (
  echo [DA HUY] Khong co file nao bi xoa.
  exit /b 0
)

echo [CLEAN] Chi xoa file build va cache co the tao lai.
for %%D in (
  "apps\desktop\dist"
  "apps\desktop\dist-electron"
  "apps\server\dist"
  ".vite"
  ".pytest_cache"
  "apps\ai-worker\.pytest_cache"
) do (
  if exist "%%~D" (
    echo Dang xoa %%~D
    rmdir /s /q "%%~D"
  )
)

if exist "apps\desktop\tsconfig.app.tsbuildinfo" (
  echo Dang xoa apps\desktop\tsconfig.app.tsbuildinfo
  del /f /q "apps\desktop\tsconfig.app.tsbuildinfo"
)
if exist "apps\desktop\electron\tsconfig.tsbuildinfo" (
  echo Dang xoa apps\desktop\electron\tsconfig.tsbuildinfo
  del /f /q "apps\desktop\electron\tsconfig.tsbuildinfo"
)

for /d /r "apps\ai-worker" %%D in (__pycache__) do (
  if exist "%%D" rmdir /s /q "%%D"
)

echo [THANH CONG] Da lam sach file build va cache.
echo node_modules, .venv, .env va SQLite database duoc giu nguyen.
exit /b 0
