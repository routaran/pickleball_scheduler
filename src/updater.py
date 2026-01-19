"""
Two-stage update system for ZIP-installed users.

This module checks GitHub for updates and downloads them to a staging folder.
The actual file replacement is handled by the batch launcher after Python exits,
avoiding Windows file locking issues.

Exit codes:
    0  - No update available
    1  - Error during update check
    10 - Update downloaded to staging folder, ready to apply
"""

import os
import sys
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Optional

# Minimal imports to avoid locking files that might need updating
try:
    import urllib.request
    import json
except ImportError:
    print("Error: Required modules not available")
    sys.exit(1)

GITHUB_API_URL = "https://api.github.com/repos/routaran/pickleball_scheduler/commits/master"
GITHUB_ZIP_URL = "https://github.com/routaran/pickleball_scheduler/archive/refs/heads/master.zip"
STAGING_DIR = os.path.join(tempfile.gettempdir(), "dupr_update")


def get_install_path() -> Path:
    """Get the installation path (parent of src directory)."""
    return Path(__file__).parent.parent


def get_local_version() -> Optional[str]:
    """Read the local VERSION file."""
    version_file = get_install_path() / "VERSION"
    if version_file.exists():
        return version_file.read_text().strip()
    return None


def get_remote_version() -> Optional[str]:
    """Fetch the latest commit SHA from GitHub API."""
    try:
        req = urllib.request.Request(
            GITHUB_API_URL,
            headers={"User-Agent": "DUPR-Pickleball-Updater"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data.get("sha")
    except Exception as e:
        print(f"Error fetching remote version: {e}")
        return None


def download_and_stage_update(remote_sha: str) -> bool:
    """
    Download the latest ZIP and extract to staging folder.
    
    Returns True if successful, False otherwise.
    """
    try:
        # Clean up any existing staging directory
        if os.path.exists(STAGING_DIR):
            shutil.rmtree(STAGING_DIR)
        os.makedirs(STAGING_DIR)
        
        zip_path = os.path.join(STAGING_DIR, "update.zip")
        
        # Download ZIP
        print("Downloading update...")
        req = urllib.request.Request(
            GITHUB_ZIP_URL,
            headers={"User-Agent": "DUPR-Pickleball-Updater"}
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            with open(zip_path, "wb") as f:
                f.write(response.read())
        
        # Extract ZIP
        print("Extracting update...")
        extract_dir = os.path.join(STAGING_DIR, "extract")
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_dir)
        
        # Find the inner directory (e.g., pickleball_scheduler-master)
        inner_dirs = [d for d in os.listdir(extract_dir) 
                      if os.path.isdir(os.path.join(extract_dir, d))]
        if not inner_dirs:
            print("Error: No directory found in ZIP")
            return False
        
        inner_dir = os.path.join(extract_dir, inner_dirs[0])
        
        # Move contents to staging root (flatten the structure)
        final_staging = os.path.join(STAGING_DIR, "files")
        shutil.move(inner_dir, final_staging)
        
        # Write VERSION file to staged files
        version_file = os.path.join(final_staging, "VERSION")
        with open(version_file, "w") as f:
            f.write(remote_sha)
        
        # Clean up intermediate files
        os.remove(zip_path)
        shutil.rmtree(extract_dir)
        
        print(f"Update staged successfully (version: {remote_sha[:7]})")
        return True
        
    except Exception as e:
        print(f"Error downloading update: {e}")
        # Clean up on failure
        if os.path.exists(STAGING_DIR):
            shutil.rmtree(STAGING_DIR)
        return False


def main() -> int:
    """
    Main update check routine.
    
    Returns exit code indicating result.
    """
    print("Checking for updates...")
    
    local_version = get_local_version()
    if not local_version:
        print("No VERSION file found. Skipping update check.")
        return 0
    
    remote_version = get_remote_version()
    if not remote_version:
        print("Could not check for updates. Continuing with current version.")
        return 1
    
    if local_version == remote_version:
        print("Already up to date.")
        return 0
    
    print(f"Update available: {local_version[:7]} -> {remote_version[:7]}")
    
    if download_and_stage_update(remote_version):
        return 10  # Signal to batch file that update is ready
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())
