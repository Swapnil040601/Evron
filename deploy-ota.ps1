# Evron OTA Deploy Script
# Usage: .\deploy-ota.ps1 -Version "1.0.1"
# Run this from the evron-build directory after making changes.
# Employees will receive the update silently on next app launch.

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$GCP_HOST = "EvronNetworks@35.244.3.148"
$REMOTE_UPDATES = "/home/EvronNetworks/evron-app/files/updates"
$BUNDLE_NAME = "bundle-$Version.zip"

Write-Host ""
Write-Host "=== Evron OTA Deploy v$Version ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build web assets
Write-Host "[1/4] Building web assets..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed." -ForegroundColor Red; exit 1 }
Write-Host "  Build complete." -ForegroundColor Green

# Step 2: Zip the dist folder
Write-Host "[2/4] Zipping bundle..." -ForegroundColor Yellow
if (Test-Path $BUNDLE_NAME) { Remove-Item $BUNDLE_NAME }
Compress-Archive -Path "dist\*" -DestinationPath $BUNDLE_NAME
Write-Host "  Bundle: $BUNDLE_NAME" -ForegroundColor Green

# Step 3: Upload to GCP
Write-Host "[3/4] Uploading to GCP server..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no $BUNDLE_NAME "${GCP_HOST}:${REMOTE_UPDATES}/"
if ($LASTEXITCODE -ne 0) { Write-Host "Upload failed." -ForegroundColor Red; exit 1 }
Write-Host "  Uploaded." -ForegroundColor Green

# Step 4: Update version file on server (this activates the update)
Write-Host "[4/4] Activating version $Version on server..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $GCP_HOST "echo '$Version' > ${REMOTE_UPDATES}/version.txt"
Write-Host "  Version $Version is now live." -ForegroundColor Green

# Cleanup local zip
Remove-Item $BUNDLE_NAME

Write-Host ""
Write-Host "Done! Employees will receive v$Version on next app launch." -ForegroundColor Cyan
Write-Host ""
