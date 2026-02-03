# SPIKE-EXPORT-A1: expo-print PDF Test

Test app for validating `expo-print` on Android emulator.

## Quick Start

```bash
# Install dependencies
npm install

# Run on Android emulator
npm run android
```

## What This Tests

1. **PDF Generation** - HTML to PDF conversion using `expo-print`
2. **File Verification** - Confirms PDF is created and has content
3. **Share/View** - Opens PDF in native viewer via `expo-sharing`

## Sample HTML

The test generates a DUPR Ladder Results PDF with:
- 3 pools (A, B, C) with 4 players each
- Color-coded ratings
- Bootstrap-inspired styling
- Print-friendly CSS

## Results

See `/spike/EXPORT_FINDINGS.md` for test results and recommendations.
