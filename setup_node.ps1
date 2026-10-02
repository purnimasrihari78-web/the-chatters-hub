$dest = "C:\Users\THINKPAD\nodejs"
if (!(Test-Path $dest)) {
    Write-Host "Downloading portable Node.js..."
    $zipPath = "$env:TEMP\node.zip"
    $extractPath = "$env:TEMP\node_extract"
    curl.exe -L -o $zipPath https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip
    Write-Host "Extracting Node.js..."
    if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force }
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
    Move-Item "$extractPath\node-v20.18.0-win-x64" $dest
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Extraction complete!"
}
$nodeExe = "$dest\node.exe"
& $nodeExe -v
# Add to user PATH if not present
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$dest*") {
    [Environment]::SetEnvironmentVariable("Path", "$dest;$userPath", "User")
    Write-Host "Added $dest to User PATH"
}
