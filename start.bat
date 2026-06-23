@echo off
cd /d "%~dp0"
echo.
echo [Orbitly] Starting dev stack...
echo.

echo   Starting database...
docker compose up -d db >nul 2>&1
echo   Database ready   -^> postgres://localhost:5437/orbitly
echo.
echo   Starting API + UI (Ctrl+C to stop both)...
echo   API  -^> http://localhost:3003
echo   UI   -^> http://localhost:5177
echo.
npm run dev
