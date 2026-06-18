@echo off
echo.
echo ========================================
echo    SMART CANTEEN APP - STARTUP
echo ========================================
echo.

echo [1/3] Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js
    pause
    exit /b 1
)

echo.
echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
)

echo.
echo [3/3] Starting server...
echo.
echo ========================================
call npm run dev

pause
