@echo off
REM ====================================================================
REM Omega Prime X - Windows setup (cmd.exe)
REM Prereqs: Node.js >= 20, npm. Docker Desktop optional.
REM ====================================================================
echo === Omega Prime X setup ===

where node >nul 2>nul
if errorlevel 1 (
  echo Missing required command: node
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo Missing required command: npm
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env from .env.example
)

echo Installing backend/core dependencies...
call npm install || exit /b 1

echo Installing frontend dependencies...
pushd frontend
call npm install || exit /b 1
popd

echo Running smoke test (intelligence cycle)...
call npm run seed || exit /b 1

echo.
echo === Setup complete ===
echo Run locally (two terminals):
echo   1) Backend API :  npm run dev               ^(http://localhost:8080^)
echo   2) Cockpit UI  :  cd frontend ^&^& npm run dev   ^(http://localhost:3000^)
echo.
echo Or full stack with Docker:  docker compose up --build
