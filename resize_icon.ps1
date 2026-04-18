Add-Type -AssemblyName System.Drawing
$sourcePathIcon = "c:\Users\user\.gemini\antigravity\scratch\absensi_app\AIVOLA_ICON_EXACT_512.png"
$outputPathIcon = "c:\Users\user\.gemini\antigravity\scratch\absensi_app\AIVOLA_ICON_512_FINAL.png"
$sourcePathBanner = "c:\Users\user\.gemini\antigravity\scratch\absensi_app\AIVOLA_BANNER_1024.png"
$outputPathBanner = "c:\Users\user\.gemini\antigravity\scratch\absensi_app\AIVOLA_BANNER_1024_FINAL.png"

function Resize-Image {
    param($src, $dest, $w, $h)
    if (Test-Path $src) {
        $img = [System.Drawing.Image]::FromFile($src)
        $newImg = New-Object System.Drawing.Bitmap($w, $h)
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($img, 0, 0, $w, $h)
        $newImg.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
        $graphics.Dispose(); $newImg.Dispose(); $img.Dispose()
        Write-Output "Resizing successful: $dest ($w x $h)"
    }
}

Resize-Image $sourcePathIcon $outputPathIcon 512 512

# Save banner as JPEG to avoid transparency issues in Play Console
function Resize-Banner-JPG {
    param($src, $dest, $w, $h)
    if (Test-Path $src) {
        $img = [System.Drawing.Image]::FromFile($src)
        $newImg = New-Object System.Drawing.Bitmap($w, $h)
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        $graphics.Clear([System.Drawing.Color]::Black) # Force solid black background
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($img, 0, 0, $w, $h)
        $newImg.Save($dest, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $graphics.Dispose(); $newImg.Dispose(); $img.Dispose()
        Write-Output "Resizing successful: $dest ($w x $h) as JPEG"
    }
}

Resize-Image $sourcePathIcon $outputPathIcon 512 512
Resize-Banner-JPG $sourcePathBanner "c:\Users\user\.gemini\antigravity\scratch\absensi_app\AIVOLA_BANNER_1024_FINAL.jpg" 1024 500

# Screenshot Resizer (1080x1920)
function Resize-Screenshot {
    param($src, $dest)
    if (Test-Path $src) {
        $img = [System.Drawing.Image]::FromFile($src)
        $newImg = New-Object System.Drawing.Bitmap(1080, 1920)
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        $graphics.Clear([System.Drawing.Color]::Black)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($img, 0, 0, 1080, 1920)
        $newImg.Save($dest, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $graphics.Dispose(); $newImg.Dispose(); $img.Dispose()
        Write-Output "Resizing successful: $dest (1080 x 1920)"
    }
}

Resize-Screenshot "c:\Users\user\.gemini\antigravity\scratch\absensi_app\SS1_RAW.png" "c:\Users\user\.gemini\antigravity\scratch\absensi_app\AIVOLA_SS1_FINAL.jpg"
Resize-Screenshot "c:\Users\user\.gemini\antigravity\scratch\absensi_app\SS2_RAW.png" "c:\Users\user\.gemini\antigravity\scratch\absensi_app\AIVOLA_SS2_FINAL.jpg"
Resize-Screenshot "c:\Users\user\.gemini\antigravity\scratch\absensi_app\SS3_RAW.png" "c:\Users\user\.gemini\antigravity\scratch\absensi_app\AIVOLA_SS3_FINAL.jpg"
Resize-Screenshot "c:\Users\user\.gemini\antigravity\scratch\absensi_app\SS4_RAW.png" "c:\Users\user\.gemini\antigravity\scratch\absensi_app\AIVOLA_SS4_FINAL.jpg"
