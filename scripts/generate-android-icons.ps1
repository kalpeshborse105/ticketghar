Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Admin\.gemini\antigravity-ide\brain\0ea5fe5e-4e7b-4ae2-bc03-dd9fff0c8405\app_icon_ticketghar_1792442990349.jpg"
$baseRes = "d:\ticketghar\mobile\android\app\src\main\res"

$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)

foreach ($folder in $sizes.Keys) {
    $dim = $sizes[$folder]
    $targetDir = Join-Path $baseRes $folder
    if (!(Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    $destBmp = New-Object System.Drawing.Bitmap($dim, $dim)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $destRect = New-Object System.Drawing.Rectangle(0, 0, $dim, $dim)
    $graphics.DrawImage($srcImage, $destRect, 0, 0, $srcImage.Width, $srcImage.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    $launcherPath = Join-Path $targetDir "ic_launcher.png"
    $roundPath = Join-Path $targetDir "ic_launcher_round.png"

    $destBmp.Save($launcherPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()

    Write-Host "Generated $folder ($dim x $dim)"
}

$srcImage.Dispose()
Write-Host "All Android app icons generated successfully!"
