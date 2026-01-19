# DUPR Pickleball Scheduler - Windows Installation Script
# This script installs the application without requiring administrator rights
# Supports automatic Python installation via winget or embedded Python fallback

param(
    [string]$InstallPath = "$env:USERPROFILE\PickleballScheduler"
)

$ErrorActionPreference = "Continue"

# Enforce TLS 1.2 for web requests (required for GitHub)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Global variable to track which Python to use
$script:PythonExecutable = "python"
$script:UsingEmbeddedPython = $false

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Test-PythonInstalled {
    param([string]$PythonPath = "python")
    try {
        $pythonVersion = & $PythonPath --version 2>&1
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

function Test-WingetInstalled {
    try {
        $wingetVersion = winget --version 2>&1
        if ($wingetVersion -match "v\d+") {
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

function Install-PythonViaWinget {
    Write-ColorOutput "  Attempting to install Python via winget (user-scope)..." "White"

    # Try to install Python 3.12 via winget with user scope (no admin required)
    # --silent prevents GUI wizards from popping up
    $wingetOutput = winget install -e --id Python.Python.3.12 --scope user --silent --accept-source-agreements --accept-package-agreements 2>&1

    if ($LASTEXITCODE -eq 0 -or $wingetOutput -match "successfully installed") {
        Write-ColorOutput "  Python installed via winget" "Green"

        # Refresh environment variables to pick up the new Python installation
        Write-ColorOutput "  Refreshing environment variables..." "White"
        $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
        $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
        $env:Path = "$userPath;$machinePath"

        # Also add common Python installation paths explicitly
        $pythonUserPaths = @(
            "$env:LOCALAPPDATA\Programs\Python\Python312",
            "$env:LOCALAPPDATA\Programs\Python\Python312\Scripts",
            "$env:LOCALAPPDATA\Microsoft\WindowsApps"
        )
        foreach ($p in $pythonUserPaths) {
            if ((Test-Path $p) -and ($env:Path -notlike "*$p*")) {
                $env:Path = "$p;$env:Path"
            }
        }

        # Give Windows a moment to register the installation
        Start-Sleep -Seconds 2

        return $true
    }
    else {
        Write-ColorOutput "  Winget installation failed or was cancelled" "Yellow"
        return $false
    }
}

function Install-EmbeddedPython {
    param([string]$TargetPath)

    # Use bin\python for cleaner directory structure and future extensibility
    $embeddedPythonPath = "$TargetPath\bin\python"
    $pythonVersion = "3.12.4"
    $pythonZipUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-embed-amd64.zip"
    $getPipUrl = "https://bootstrap.pypa.io/get-pip.py"

    Write-ColorOutput "  Downloading embedded Python $pythonVersion..." "White"

    try {
        # Create directories
        $binPath = "$TargetPath\bin"
        if (-not (Test-Path $binPath)) {
            New-Item -ItemType Directory -Path $binPath -Force | Out-Null
        }

        # Download Python embeddable package
        $pythonZipPath = "$env:TEMP\python-embedded.zip"
        Invoke-WebRequest -Uri $pythonZipUrl -OutFile $pythonZipPath -UseBasicParsing

        # Extract Python
        Write-ColorOutput "  Extracting Python..." "White"
        if (Test-Path $embeddedPythonPath) {
            Remove-Item -Recurse -Force $embeddedPythonPath
        }
        Expand-Archive -Path $pythonZipPath -DestinationPath $embeddedPythonPath -Force
        Remove-Item -Path $pythonZipPath -Force

        # Enable pip by modifying python312._pth file
        # The ._pth file restricts imports - we need to uncomment 'import site'
        $pthFile = Get-ChildItem -Path $embeddedPythonPath -Filter "python*._pth" | Select-Object -First 1
        if ($pthFile) {
            $pthContent = Get-Content $pthFile.FullName
            $pthContent = $pthContent -replace "^#import site", "import site"
            Set-Content -Path $pthFile.FullName -Value $pthContent
        }

        # Download and run get-pip.py
        Write-ColorOutput "  Installing pip..." "White"
        $getPipPath = "$embeddedPythonPath\get-pip.py"
        Invoke-WebRequest -Uri $getPipUrl -OutFile $getPipPath -UseBasicParsing

        $pythonExe = "$embeddedPythonPath\python.exe"
        & $pythonExe $getPipPath --no-warn-script-location 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "  Failed to install pip" "Red"
            return $null
        }

        # Clean up get-pip.py
        Remove-Item -Path $getPipPath -Force -ErrorAction SilentlyContinue

        Write-ColorOutput "  Embedded Python installed successfully" "Green"
        return $pythonExe
    }
    catch {
        Write-ColorOutput "  Failed to install embedded Python: $_" "Red"
        return $null
    }
}

# Header
Write-ColorOutput "`n========================================" "Cyan"
Write-ColorOutput "  DUPR Pickleball Scheduler Installer" "Cyan"
Write-ColorOutput "========================================`n" "Cyan"

# Check Python - Hybrid installation approach
Write-ColorOutput "Checking Python installation..." "Yellow"
if (-not (Test-PythonInstalled)) {
    Write-ColorOutput "`nPython 3.9 or higher is required but not found." "Yellow"
    Write-ColorOutput "  Attempting automatic installation..." "White"

    $pythonInstalled = $false

    # Step 1: Try winget (Windows Package Manager)
    if (Test-WingetInstalled) {
        Write-ColorOutput "`nMethod 1: Windows Package Manager (winget)" "Cyan"
        if (Install-PythonViaWinget) {
            # Verify Python is now available
            if (Test-PythonInstalled) {
                $pythonInstalled = $true
                $script:PythonExecutable = "python"
            }
            else {
                Write-ColorOutput "  Python installed but not yet in PATH" "Yellow"
                Write-ColorOutput "  Trying to locate Python installation..." "White"

                # Try to find Python in common user installation locations
                $possiblePaths = @(
                    "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
                    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
                    "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
                    "$env:APPDATA\Python\Python312\python.exe"
                )
                foreach ($pyPath in $possiblePaths) {
                    if (Test-Path $pyPath) {
                        if (Test-PythonInstalled -PythonPath $pyPath) {
                            $script:PythonExecutable = $pyPath
                            $pythonInstalled = $true
                            Write-ColorOutput "  Found Python at: $pyPath" "Green"
                            break
                        }
                    }
                }
            }
        }
    }
    else {
        Write-ColorOutput "`nWindows Package Manager (winget) not available" "Yellow"
    }

    # Step 2: Fallback to embedded Python if winget failed
    if (-not $pythonInstalled) {
        Write-ColorOutput "`nMethod 2: Embedded Python (portable, self-contained)" "Cyan"

        # We need to create the install directory first for embedded Python
        if (-not (Test-Path $InstallPath)) {
            New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
        }

        $embeddedPython = Install-EmbeddedPython -TargetPath $InstallPath
        if ($embeddedPython) {
            $script:PythonExecutable = $embeddedPython
            $script:UsingEmbeddedPython = $true
            $pythonInstalled = $true
        }
    }

    # If all methods failed, provide manual instructions
    if (-not $pythonInstalled) {
        Write-ColorOutput "`nAutomatic Python installation failed." "Red"
        Write-ColorOutput "`nPlease install Python manually:" "White"
        Write-ColorOutput "`nOption 1 - Microsoft Store (easiest, no admin):" "Cyan"
        Write-ColorOutput "  1. Open Microsoft Store" "White"
        Write-ColorOutput "  2. Search for 'Python 3.12'" "White"
        Write-ColorOutput "  3. Click 'Get' to install" "White"
        Write-ColorOutput "`nOption 2 - python.org (no admin):" "Cyan"
        Write-ColorOutput "  1. Go to https://www.python.org/downloads/" "White"
        Write-ColorOutput "  2. Download Python 3.12" "White"
        Write-ColorOutput "  3. Run installer, check 'Add Python to PATH'" "White"
        Write-ColorOutput "  4. Select 'Install just for me'" "White"
        Write-ColorOutput "`nAfter installing Python, run this script again." "Yellow"
        Read-Host "`nPress Enter to exit"
        exit 1
    }
}

# Display which Python we're using
$pythonVersion = & $script:PythonExecutable --version
if ($script:UsingEmbeddedPython) {
    Write-ColorOutput "  Using embedded Python: $pythonVersion" "Green"
}
else {
    Write-ColorOutput "  Found: $pythonVersion" "Green"
}

# Check for existing installation
Write-ColorOutput "`nSetting up installation directory..." "Yellow"

# Track if we already have embedded Python in the install path (don't delete it)
$preserveEmbeddedPython = $script:UsingEmbeddedPython -and (Test-Path "$InstallPath\bin\python")

if (Test-Path $InstallPath) {
    # Check if this is just our bin directory with embedded Python (which is fine)
    $existingItems = Get-ChildItem -Path $InstallPath -Force
    $onlyBinDir = ($existingItems.Count -eq 1) -and ($existingItems[0].Name -eq "bin")

    if (-not $onlyBinDir) {
        Write-ColorOutput "  Directory exists: $InstallPath" "Yellow"
        $response = Read-Host "  Overwrite existing installation? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-ColorOutput "Installation cancelled." "Red"
            Read-Host "`nPress Enter to exit"
            exit 1
        }
        # Preserve embedded Python if we're using it
        if ($preserveEmbeddedPython) {
            $tempBinPath = "$env:TEMP\bin-backup"
            if (Test-Path $tempBinPath) { Remove-Item -Recurse -Force $tempBinPath }
            Move-Item -Path "$InstallPath\bin" -Destination $tempBinPath
            Remove-Item -Recurse -Force $InstallPath
            New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
            Move-Item -Path $tempBinPath -Destination "$InstallPath\bin"
            # Update the python executable path
            $script:PythonExecutable = "$InstallPath\bin\python\python.exe"
        }
        else {
            Remove-Item -Recurse -Force $InstallPath
        }
    }
}

# Download or clone repository
Write-ColorOutput "`nDownloading application..." "Yellow"

$cloneSuccess = $false

if (Test-GitInstalled) {
    Write-ColorOutput "  Using git to clone repository..." "White"

    # If directory already exists (e.g., has embedded Python), clone to temp and copy
    if (Test-Path $InstallPath) {
        $tempClonePath = "$env:TEMP\pickleball_clone_temp"
        if (Test-Path $tempClonePath) { Remove-Item -Recurse -Force $tempClonePath }

        $gitOutput = git clone --quiet https://github.com/routaran/pickleball_scheduler.git $tempClonePath 2>&1
        if ($LASTEXITCODE -eq 0) {
            # Copy all files except .git to the install path
            Get-ChildItem -Path $tempClonePath -Force | ForEach-Object {
                $destPath = Join-Path $InstallPath $_.Name
                if (-not (Test-Path $destPath)) {
                    Copy-Item -Path $_.FullName -Destination $destPath -Recurse -Force
                }
            }
            Remove-Item -Recurse -Force $tempClonePath
            Write-ColorOutput "  Repository cloned successfully" "Green"
            $cloneSuccess = $true
        } else {
            Write-ColorOutput "  Git clone failed: $gitOutput" "Yellow"
            Write-ColorOutput "  Falling back to ZIP download..." "Yellow"
        }
    }
    else {
        # Standard clone when directory doesn't exist
        $gitOutput = git clone --quiet https://github.com/routaran/pickleball_scheduler.git $InstallPath 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  Repository cloned successfully" "Green"
            $cloneSuccess = $true
        } else {
            Write-ColorOutput "  Git clone failed: $gitOutput" "Yellow"
            Write-ColorOutput "  Falling back to ZIP download..." "Yellow"
        }
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

        # Get the extracted folder
        $extractedFolder = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1

        # If install path exists (e.g., has embedded Python), copy contents into it
        if (Test-Path $InstallPath) {
            Get-ChildItem -Path $extractedFolder.FullName -Force | ForEach-Object {
                $destPath = Join-Path $InstallPath $_.Name
                if (-not (Test-Path $destPath)) {
                    Copy-Item -Path $_.FullName -Destination $destPath -Recurse -Force
                }
            }
        }
        else {
            Move-Item -Path $extractedFolder.FullName -Destination $InstallPath
        }

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

# Setup Python environment and install dependencies
$originalLocation = Get-Location
Set-Location $InstallPath

if ($script:UsingEmbeddedPython) {
    # EMBEDDED PYTHON: Install packages directly (no venv needed)
    # This keeps the installation portable - user can move the folder anywhere
    Write-ColorOutput "`nInstalling dependencies into embedded Python..." "Yellow"

    # Upgrade pip first
    & $script:PythonExecutable -m pip install --upgrade pip setuptools wheel --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "  Warning: Could not upgrade pip" "Yellow"
    }

    # Install the application and its dependencies directly
    & $script:PythonExecutable -m pip install -e . --quiet
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

    # Use module invocation - works regardless of PATH configuration
    & $script:PythonExecutable -m playwright install chromium

    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "  Failed to install browser" "Red"
        Write-ColorOutput "  You may need Visual C++ Redistributable." "Yellow"
        Write-ColorOutput "  Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe" "Yellow"
        Set-Location $originalLocation
        Read-Host "`nPress Enter to exit"
        exit 1
    }
    Write-ColorOutput "  Browser installed" "Green"
}
else {
    # SYSTEM/WINGET PYTHON: Create virtual environment for isolation
    Write-ColorOutput "`nCreating Python virtual environment..." "Yellow"

    & $script:PythonExecutable -m venv .venv
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
}

# Create config directory
Write-ColorOutput "`nSetting up configuration..." "Yellow"
$configDir = "$InstallPath\config"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}
Write-ColorOutput "  Config directory ready" "Green"

# Create launcher batch file (dynamic based on install method)
Write-ColorOutput "`nCreating application launcher..." "Yellow"

if ($script:UsingEmbeddedPython) {
    # Embedded Python: Use relative path to embedded executable (portable)
    # %~dp0 expands to the directory containing the batch file
    $launcherContent = @"
@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

:: Check for updates if git is available and this is a git repo
where git >nul 2>nul
if !errorlevel!==0 (
    if exist ".git" (
        echo Checking for updates...
        git fetch origin master >nul 2>nul
        for /f %%i in ('git rev-list HEAD..origin/master --count 2^>nul') do set UPDATES=%%i
        if defined UPDATES (
            if !UPDATES! gtr 0 (
                echo Found !UPDATES! update^(s^). Updating...
                git pull origin master
                echo Update complete.
                echo.
            )
        )
    )
)

"%~dp0bin\python\python.exe" -m src.main %*
if errorlevel 1 pause
"@
}
else {
    # System/Winget Python: Activate venv first
    $launcherContent = @"
@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

:: Check for updates if git is available and this is a git repo
where git >nul 2>nul
if !errorlevel!==0 (
    if exist ".git" (
        echo Checking for updates...
        git fetch origin master >nul 2>nul
        for /f %%i in ('git rev-list HEAD..origin/master --count 2^>nul') do set UPDATES=%%i
        if defined UPDATES (
            if !UPDATES! gtr 0 (
                echo Found !UPDATES! update^(s^). Updating...
                git pull origin master
                echo Update complete.
                echo.
            )
        )
    )
)

call .venv\Scripts\activate.bat
python -m src.main %*
if errorlevel 1 pause
"@
}

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
if ($script:UsingEmbeddedPython) {
    Write-ColorOutput "Python: Self-contained (embedded in installation folder)" "White"
}
else {
    Write-ColorOutput "Python: Using system installation" "White"
}

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
if ($script:UsingEmbeddedPython) {
    Write-ColorOutput "  (Installation is fully self-contained - no system changes to undo)" "White"
}

Read-Host "`nPress Enter to close"
