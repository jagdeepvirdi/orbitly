@echo off
cd /d "%~dp0"
echo Starting Orbitly (API + UI)...
echo API  → http://localhost:3001/api/health
echo UI   → http://localhost:5177
echo.
npm run dev
