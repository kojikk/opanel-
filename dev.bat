@echo off
title OPanel Dev
cd /d "%~dp0"

echo [1/3] Starting PostgreSQL...
docker compose -f docker-compose.dev.yml up -d

echo [2/3] Waiting for database...
:wait_db
docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U opanel >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait_db
)
echo       Database ready.

echo [3/3] Running migrations ^& starting dev server...
cd frontend
call pnpm db:push 2>nul
call pnpm dev
