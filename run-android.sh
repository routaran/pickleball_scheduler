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

# Default GPU mode (can be overridden with -g flag)
GPU_MODE="auto"

# Parse command line arguments
EXPO_ONLY=false
EMULATOR_ONLY=false
LIST_AVDS=false
STOP_EMULATOR=false

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -a, --avd NAME     Use specific AVD (default: pickleball_api35)"
    echo "  -g, --gpu MODE     GPU mode: auto, host, swiftshader_indirect, off (default: auto)"
    echo "  -e, --emulator     Start emulator only (no Expo)"
    echo "  -x, --expo         Start Expo only (assumes emulator is running)"
    echo "  -s, --stop         Stop all running emulators"
    echo "  -l, --list         List available AVDs"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Available AVDs:"
    echo "  pickleball_api28   Android 9 (API 28)"
    echo "  pickleball_api35   Android 15 (API 35) [default]"
    echo ""
    echo "GPU Modes (try if keyboard input doesn't work):"
    echo "  auto               Auto-detect best mode (default)"
    echo "  host               Use host GPU (best performance)"
    echo "  swiftshader_indirect  Software rendering (most compatible)"
    echo "  off                No GPU acceleration"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--avd)
            AVD_NAME="$2"
            shift 2
            ;;
        -g|--gpu)
            GPU_MODE="$2"
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
        -s|--stop)
            STOP_EMULATOR=true
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

# Stop all emulators
stop_emulator() {
    echo "Stopping Android emulator(s)..."
    # Try multiple methods to kill emulator
    "$ANDROID_HOME/platform-tools/adb" -s emulator-5554 emu kill 2>/dev/null
    "$ANDROID_HOME/platform-tools/adb" emu kill 2>/dev/null
    pkill -f "emulator.*avd" 2>/dev/null

    # Wait a moment and check if still running
    sleep 1
    if is_emulator_running; then
        echo "Warning: Emulator may still be running. Try 'pkill -9 emulator' if needed."
    else
        echo "Emulator stopped successfully."
    fi
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

    # Start emulator in background
    # Using -gpu and -no-snapshot-load to avoid input issues
    echo "GPU Mode: $GPU_MODE"
    "$ANDROID_HOME/emulator/emulator" -avd "$AVD_NAME" -gpu "$GPU_MODE" -no-snapshot-load &
    EMULATOR_PID=$!

    # Cleanup trap - kill emulator when script exits (only in default mode, not --emulator mode)
    if [ "$EMULATOR_ONLY" = false ]; then
        trap "echo 'Stopping emulator...'; kill $EMULATOR_PID 2>/dev/null; wait $EMULATOR_PID 2>/dev/null" EXIT INT TERM
    fi

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
if [ "$STOP_EMULATOR" = true ]; then
    stop_emulator
    exit 0
elif [ "$EXPO_ONLY" = true ]; then
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
    echo "Emulator started. Run '$0 --expo' in another terminal to start Expo, or '$0 --stop' to stop the emulator."
else
    # Default: start both
    if is_emulator_running; then
        echo "Emulator is already running."
    else
        start_emulator
    fi
    start_expo
fi
