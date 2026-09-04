$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$version = (Get-Content "$root\manifest.json" -Raw | ConvertFrom-Json).version
$out = "$root\dist"
New-Item -ItemType Directory -Force $out | Out-Null
$xpi = "$out\notifilter-$version.xpi"
if (Test-Path $xpi) { Remove-Item $xpi }
$files = "manifest.json", "background.js", "options.html", "options.js", "icon.png" | ForEach-Object { "$root\$_" }
Compress-Archive -Path $files -DestinationPath "$xpi.zip"
Move-Item "$xpi.zip" $xpi
Write-Host "-> $xpi"
