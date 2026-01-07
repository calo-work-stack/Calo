@echo off
echo ========================================
echo    FIXING ALL ERRORS - WINDOWS
echo ========================================
echo.

REM Check if server is running
echo [1/3] Checking if server is running...
curl -s http://192.168.1.74:5000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Server is NOT running at http://192.168.1.74:5000
    echo.
    echo You need to start the server first!
    echo Open a new terminal and run:
    echo   cd server
    echo   npm run dev
    echo.
    pause
    exit /b 1
)
echo Server is running! ✓
echo.

REM Clear Metro cache
echo [2/3] Clearing Metro cache...
cd client
if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache
del /f /q %TEMP%\metro-* 2>nul
del /f /q %TEMP%\haste-map-* 2>nul
del /f /q %TEMP%\react-* 2>nul
echo Metro cache cleared! ✓
echo.

REM Check if watchman is installed
where watchman >nul 2>&1
if %errorlevel% equ 0 (
    echo Clearing Watchman cache...
    watchman watch-del-all
)

echo [3/3] All fixes applied!
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo In this terminal, run:
echo   npm start -- --clear
echo.
echo If errors persist:
echo   1. Close Expo completely
echo   2. Run clear-metro-cache.bat
echo   3. Start fresh with: npm start -- --clear
echo.
pause
