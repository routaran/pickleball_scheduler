@echo off
:: DUPR Pickleball Scheduler - Windows Installer
:: Double-click this file to install the application

echo.
echo ========================================
echo   DUPR Pickleball Scheduler Installer
echo ========================================
echo.

:: Check if PowerShell is available
where powershell >nul 2>nul
if errorlevel 1 (
    echo ERROR: PowerShell is required but not found.
    echo Please install PowerShell or use Windows 10/11.
    pause
    exit /b 1
)

:: Check if install.ps1 exists locally (running from cloned repo)
if exist "%~dp0install.ps1" (
    echo Running local installer...
    powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
) else (
    :: Download and run installer from GitHub
    echo Downloading installer from GitHub...
    powershell -ExecutionPolicy Bypass -Command ^
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ^
        $installScript = '%TEMP%\install_pickleball.ps1'; ^
        Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/routaran/pickleball_scheduler/master/install.ps1' -OutFile $installScript -UseBasicParsing; ^
        & $installScript"
)
