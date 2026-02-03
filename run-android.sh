#!/bin/bash
# Script to run the Android emulator and Expo dev server for the pickleball scheduler app

set -e

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Android SDK paths
export ANDROID_HOME="$PROJECT_ROOT/android-sdk-root"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

# Default AVD (can be overridden with -a flag)
AVD_NAME="pickleball_api35"

# Parse command line arguments
EXPO_ONLY=false
EMULATOR_ONLY=false
LIST_AVDS=false

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -a, --avd NAME     Use specific AVD (default: pickleball_api35)"
    echo "  -e, --emulator     Start emulator only (no Expo)"
    echo "  -x, --expo         Start Expo only (assumes emulator is running)"
    echo "  -l, --list         List available AVDs"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Available AVDs:"
    echo "  pickleball_api28   Android 9 (API 28)"
    echo "  pickleball_api35   Android 15 (API 35) [default]"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--avd)
            AVD_NAME="$2"
            shift 2
            ;;
        -e|--emulator)
            EMULATOR_ONLY=true
            shift
            ;;
        -x|--expo)
            EXPO_ONLY=true
            shift
            ;;
        -l|--list)
            LIST_AVDS=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# List AVDs and exit
if [ "$LIST_AVDS" = true ]; then
    echo "Available AVDs:"
    "$ANDROID_HOME/emulator/emulator" -list-avds
    exit 0
fi

# Check if emulator is already running
is_emulator_running() {
    "$ANDROID_HOME/platform-tools/adb" devices 2>/dev/null | grep -q "emulator"
}

# Start the emulator
start_emulator() {
    echo "Starting Android emulator: $AVD_NAME"
    echo "ANDROID_HOME: $ANDROID_HOME"

    # Check if AVD exists
    if ! "$ANDROID_HOME/emulator/emulator" -list-avds | grep -q "^$AVD_NAME$"; then
        echo "Error: AVD '$AVD_NAME' not found."
        echo "Available AVDs:"
        "$ANDROID_HOME/emulator/emulator" -list-avds
        exit 1
    fi

    # Start emulator in background (no extra flags to avoid SELinux issues)
    "$ANDROID_HOME/emulator/emulator" -avd "$AVD_NAME" &
    EMULATOR_PID=$!

    echo "Waiting for emulator to boot..."
    "$ANDROID_HOME/platform-tools/adb" wait-for-device

    # Wait for boot to complete
    while [ "$("$ANDROID_HOME/platform-tools/adb" shell getprop sys.boot_completed 2>/dev/null)" != "1" ]; do
        sleep 2
        echo -n "."
    done
    echo ""
    echo "Emulator is ready!"
}

# Start Expo dev server
start_expo() {
    echo "Starting Expo dev server..."
    cd "$PROJECT_ROOT/packages/mobile"
    npx expo start --android
}

# Main logic
if [ "$EXPO_ONLY" = true ]; then
    if ! is_emulator_running; then
        echo "Warning: No emulator detected. Start one with: $0 --emulator"
    fi
    start_expo
elif [ "$EMULATOR_ONLY" = true ]; then
    if is_emulator_running; then
        echo "Emulator is already running."
    else
        start_emulator
    fi
    echo "Emulator started. Run '$0 --expo' in another terminal to start Expo."
else
    # Default: start both
    if is_emulator_running; then
        echo "Emulator is already running."
    else
        start_emulator
    fi
    start_expo
fi
