# DUPR Pickleball Scheduler - Windows Installation Script
# This script installs the application without requiring administrator rights

param(
    [string]$InstallPath = "$env:USERPROFILE\PickleballScheduler"
)

$ErrorActionPreference = "Continue"

# Enforce TLS 1.2 for web requests (required for GitHub)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Test-PythonInstalled {
    try {
        $pythonVersion = python --version 2>&1
        if ($pythonVersion -match "Python (\d+)\.(\d+)") {
            $major = [int]$Matches[1]
            $minor = [int]$Matches[2]
            # Accept Python 3.9+ or any Python 4+
            if ($major -gt 3 -or ($major -eq 3 -and $minor -ge 9)) {
                return $true
            }
        }
        return $false
    }
    catch {
        return $false
    }
}

function Test-GitInstalled {
    try {
        git --version 2>&1 | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Header
Write-ColorOutput "`n========================================" "Cyan"
Write-ColorOutput "  DUPR Pickleball Scheduler Installer" "Cyan"
Write-ColorOutput "========================================`n" "Cyan"

# Check Python
Write-ColorOutput "Checking Python installation..." "Yellow"
if (-not (Test-PythonInstalled)) {
    Write-ColorOutput "`nPython 3.9 or higher is required but not found." "Red"
    Write-ColorOutput "`nTo install Python WITHOUT admin rights:" "White"
    Write-ColorOutput "  1. Open Microsoft Store" "White"
    Write-ColorOutput "  2. Search for 'Python 3.12' (or latest 3.x)" "White"
    Write-ColorOutput "  3. Click 'Get' to install" "White"
    Write-ColorOutput "`nOR download from python.org:" "White"
    Write-ColorOutput "  1. Go to https://www.python.org/downloads/" "White"
    Write-ColorOutput "  2. Download Python 3.12 (or latest)" "White"
    Write-ColorOutput "  3. Run installer and check 'Add Python to PATH'" "White"
    Write-ColorOutput "  4. Select 'Install just for me' (no admin required)" "White"
    Write-ColorOutput "`nAfter installing Python, run this script again." "Yellow"
    Read-Host "`nPress Enter to exit"
    exit 1
}

$pythonVersion = python --version
Write-ColorOutput "  Found: $pythonVersion" "Green"

# Check for existing installation
Write-ColorOutput "`nSetting up installation directory..." "Yellow"
if (Test-Path $InstallPath) {
    Write-ColorOutput "  Directory exists: $InstallPath" "Yellow"
    $response = Read-Host "  Overwrite existing installation? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-ColorOutput "Installation cancelled." "Red"
        Read-Host "`nPress Enter to exit"
        exit 1
    }
    Remove-Item -Recurse -Force $InstallPath
}

# Download or clone repository
Write-ColorOutput "`nDownloading application..." "Yellow"

$cloneSuccess = $false

if (Test-GitInstalled) {
    Write-ColorOutput "  Using git to clone repository..." "White"
    # Git clone creates the directory itself - don't create it beforehand
    $gitOutput = git clone --quiet https://github.com/routaran/pickleball_scheduler.git $InstallPath 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  Repository cloned successfully" "Green"
        $cloneSuccess = $true
    } else {
        Write-ColorOutput "  Git clone failed: $gitOutput" "Yellow"
        Write-ColorOutput "  Falling back to ZIP download..." "Yellow"
    }
}

if (-not $cloneSuccess) {
    Write-ColorOutput "  Downloading ZIP archive..." "White"
    $zipUrl = "https://github.com/routaran/pickleball_scheduler/archive/refs/heads/master.zip"
    $zipPath = "$env:TEMP\pickleball_scheduler.zip"
    $extractPath = "$env:TEMP\pickleball_extract"

    try {
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

        # Extract
        if (Test-Path $extractPath) {
            Remove-Item -Recurse -Force $extractPath
        }
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

        # Move contents to install path
        $extractedFolder = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
        Move-Item -Path $extractedFolder.FullName -Destination $InstallPath

        # Cleanup
        Remove-Item -Path $zipPath -Force
        Remove-Item -Path $extractPath -Recurse -Force

        Write-ColorOutput "  Download and extraction complete" "Green"
    }
    catch {
        Write-ColorOutput "  Failed to download: $_" "Red"
        Read-Host "`nPress Enter to exit"
        exit 1
    }
}

# Create virtual environment
Write-ColorOutput "`nCreating Python virtual environment..." "Yellow"
$originalLocation = Get-Location
Set-Location $InstallPath

python -m venv .venv
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "  Failed to create virtual environment" "Red"
    Set-Location $originalLocation
    Read-Host "`nPress Enter to exit"
    exit 1
}
Write-ColorOutput "  Virtual environment created" "Green"

# Activate virtual environment
Write-ColorOutput "`nActivating virtual environment..." "Yellow"
& ".\.venv\Scripts\Activate.ps1"

# Verify activation worked
if (-not $env:VIRTUAL_ENV) {
    Write-ColorOutput "  Failed to activate virtual environment" "Red"
    Set-Location $originalLocation
    Read-Host "`nPress Enter to exit"
    exit 1
}
Write-ColorOutput "  Virtual environment activated" "Green"

# Install dependencies
Write-ColorOutput "`nInstalling dependencies (this may take a moment)..." "Yellow"
python -m pip install --upgrade pip setuptools wheel --quiet
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "  Warning: Could not upgrade pip" "Yellow"
}

pip install -e . --quiet
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "  Failed to install dependencies" "Red"
    Set-Location $originalLocation
    Read-Host "`nPress Enter to exit"
    exit 1
}
Write-ColorOutput "  Python packages installed" "Green"

# Install Playwright browsers
Write-ColorOutput "`nInstalling browser for authentication..." "Yellow"
Write-ColorOutput "  (This may take a few minutes on first install)" "White"
playwright install chromium
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "  Failed to install browser" "Red"
    Write-ColorOutput "  You may need Visual C++ Redistributable." "Yellow"
    Write-ColorOutput "  Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe" "Yellow"
    Set-Location $originalLocation
    Read-Host "`nPress Enter to exit"
    exit 1
}
Write-ColorOutput "  Browser installed" "Green"

# Create config directory
Write-ColorOutput "`nSetting up configuration..." "Yellow"
$configDir = "$InstallPath\config"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}
Write-ColorOutput "  Config directory ready" "Green"

# Create launcher batch file
Write-ColorOutput "`nCreating application launcher..." "Yellow"
$launcherContent = @"
@echo off
cd /d "$InstallPath"
call .venv\Scripts\activate.bat
python -m src.main %*
if errorlevel 1 pause
"@
$launcherPath = "$InstallPath\dupr-lookup.bat"
Set-Content -Path $launcherPath -Value $launcherContent
Write-ColorOutput "  Launcher created: dupr-lookup.bat" "Green"

# Create desktop shortcut
Write-ColorOutput "`nCreating desktop shortcut..." "Yellow"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\DUPR Pickleball Scheduler.lnk"

try {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "$InstallPath\dupr-lookup.bat"
    $shortcut.WorkingDirectory = $InstallPath
    $shortcut.Description = "DUPR Pickleball Scheduler - Look up player ratings"
    $shortcut.Save()
    Write-ColorOutput "  Desktop shortcut created" "Green"
}
catch {
    Write-ColorOutput "  Could not create desktop shortcut (non-critical)" "Yellow"
}

# Restore original location
Set-Location $originalLocation

# Done!
Write-ColorOutput "`n========================================" "Green"
Write-ColorOutput "  Installation Complete!" "Green"
Write-ColorOutput "========================================" "Green"

Write-ColorOutput "`nInstalled to: $InstallPath" "White"

Write-ColorOutput "`nHow to run:" "Cyan"
Write-ColorOutput "  - Double-click 'DUPR Pickleball Scheduler' on your Desktop" "White"
Write-ColorOutput "  - Or double-click 'dupr-lookup.bat' in the installation folder" "White"

Write-ColorOutput "`nFirst Run:" "Cyan"
Write-ColorOutput "  1. A browser window will open for DUPR login" "White"
Write-ColorOutput "  2. Log in with your DUPR account" "White"
Write-ColorOutput "  3. The window will close automatically" "White"
Write-ColorOutput "  4. Follow the prompts to look up player ratings" "White"

Write-ColorOutput "`nFor detailed usage instructions, see:" "Cyan"
Write-ColorOutput "  $InstallPath\How-To.md" "White"
Write-ColorOutput "  or https://github.com/routaran/pickleball_scheduler#how-to-use" "White"

Write-ColorOutput "`nTo uninstall:" "Cyan"
Write-ColorOutput "  1. Delete the folder: $InstallPath" "White"
Write-ColorOutput "  2. Delete the desktop shortcut" "White"

Read-Host "`nPress Enter to close"
