@echo off
echo Clearing Metro Bundler Cache...

REM Clear Metro cache folders
if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache

REM Clear temporary Metro files
del /f /q %TEMP%\metro-* 2>nul
del /f /q %TEMP%\haste-map-* 2>nul
del /f /q %TEMP%\react-* 2>nul

REM Clear watchman cache if exists
where watchman >nul 2>&1
if %errorlevel% equ 0 (
    echo Clearing Watchman cache...
    watchman watch-del-all
)

echo.
echo Cache cleared successfully!
echo.
echo Now run: npm start -- --clear
pause
