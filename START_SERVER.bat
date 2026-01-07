@echo off
echo ========================================
echo    STARTING BACKEND SERVER
echo ========================================
echo.

cd server

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Check if .env exists
if not exist .env (
    echo ERROR: server\.env file not found!
    echo.
    echo Please create server\.env with your database credentials.
    echo See SETUP_INSTRUCTIONS.md for details.
    echo.
    pause
    exit /b 1
)

REM Generate Prisma client if needed
echo Generating Prisma client...
call npx prisma generate
echo.

echo Starting server on port 5000...
echo Server will be available at: http://192.168.1.74:5000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
