# Cubic Android — rebuild candidate

This is a new source-based rebuild candidate created because the original Cubic Android project was not present in `Tomex777/automation-hub`; that repository contained release metadata and screenshots, while the old APK/signature assets were deliberately removed.

## Features implemented in this candidate

- Cubes and cuboids with independently selectable X/Y/Z sizes from 2 through 9.
- Isometric 3D puzzle rendering, swipe-to-orbit, and pinch-to-zoom.
- Selectable slice turns, including inner slices. Quarter turns are enabled when the selected slice plane is square; 180° turns are available for every cuboid slice.
- Scramble, undo, reset, and guided solving by reversing the move history generated inside this session.

## Build

The GitHub Actions workflow at `.github/workflows/build-cubic-android.yml` builds `app-debug.apk` and uploads it as a workflow artifact.

**Signing note:** this candidate is debug-signed by Android Gradle tooling and is intended for a fresh installation and evaluation. It is not signed with the previous production key and cannot update an installation signed with that key. Do not present this build as the original production-signed Cubic release.
