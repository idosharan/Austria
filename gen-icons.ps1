# Generates PNG icons (regular + maskable) from the icon.svg design using GDI+
Add-Type -AssemblyName System.Drawing

$navy   = [System.Drawing.ColorTranslator]::FromHtml('#14342b')
$gold   = [System.Drawing.ColorTranslator]::FromHtml('#d4af37')
$green1 = [System.Drawing.ColorTranslator]::FromHtml('#2d6a4f')
$green2 = [System.Drawing.ColorTranslator]::FromHtml('#3e8e68')
$cream  = [System.Drawing.ColorTranslator]::FromHtml('#f5f7f2')

# SVG shapes (512x512 viewBox)
$mountain1 = @(@(60,416),  @(210,170), @(360,416))
$snow1     = @(@(210,170), @(165,244), @(255,244))
$mountain2 = @(@(250,416), @(355,250), @(460,416))
$snow2     = @(@(355,250), @(325,298), @(385,298))

function Convert-Pts($pts, [double]$k, [double]$s) {
    $out = [System.Drawing.PointF[]]::new($pts.Count)
    for ($i = 0; $i -lt $pts.Count; $i++) {
        $x = (256.0 + ($pts[$i][0] - 256.0) * $k) * $s
        $y = (256.0 + ($pts[$i][1] - 256.0) * $k) * $s
        $out[$i] = [System.Drawing.PointF]::new($x, $y)
    }
    return ,$out
}

$targets = @(
    @{ Size = 192; Name = 'icon-192.png';          Mask = $false },
    @{ Size = 512; Name = 'icon-512.png';          Mask = $false },
    @{ Size = 192; Name = 'icon-192-maskable.png'; Mask = $true  },
    @{ Size = 512; Name = 'icon-512-maskable.png'; Mask = $true  }
)

foreach ($t in $targets) {
    $size = $t.Size
    $s = $size / 512.0
    $k = 1.0
    if ($t.Mask) { $k = 0.8 }  # shrink art into the maskable safe zone

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bNavy   = New-Object System.Drawing.SolidBrush($navy)
    $bGold   = New-Object System.Drawing.SolidBrush($gold)
    $bGreen1 = New-Object System.Drawing.SolidBrush($green1)
    $bGreen2 = New-Object System.Drawing.SolidBrush($green2)
    $bCream  = New-Object System.Drawing.SolidBrush($cream)

    if ($t.Mask) {
        $g.Clear($navy)   # full-bleed background
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
        $r = 100.0 * $s
        $w = [double]$size
        $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
        $gp.AddArc([single]0, [single]0, [single](2*$r), [single](2*$r), 180, 90)
        $gp.AddArc([single]($w - 2*$r), [single]0, [single](2*$r), [single](2*$r), 270, 90)
        $gp.AddArc([single]($w - 2*$r), [single]($w - 2*$r), [single](2*$r), [single](2*$r), 0, 90)
        $gp.AddArc([single]0, [single]($w - 2*$r), [single](2*$r), [single](2*$r), 90, 90)
        $gp.CloseFigure()
        $g.FillPath($bNavy, $gp)
        $gp.Dispose()
    }

    # sun
    $cx = (256.0 + (380.0 - 256.0) * $k) * $s
    $cy = (256.0 + (140.0 - 256.0) * $k) * $s
    $sr = 52.0 * $k * $s
    $g.FillEllipse($bGold, [single]($cx - $sr), [single]($cy - $sr), [single](2*$sr), [single](2*$sr))

    # mountains + snow caps
    $g.FillPolygon($bGreen1, (Convert-Pts $mountain1 $k $s))
    $g.FillPolygon($bCream,  (Convert-Pts $snow1     $k $s))
    $g.FillPolygon($bGreen2, (Convert-Pts $mountain2 $k $s))
    $g.FillPolygon($bCream,  (Convert-Pts $snow2     $k $s))

    # save via temp (GDI+ can fail saving directly to network drives)
    $tmp = Join-Path $env:TEMP $t.Name
    $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
    Copy-Item $tmp (Join-Path $PSScriptRoot $t.Name) -Force
    Remove-Item $tmp

    $bNavy.Dispose(); $bGold.Dispose(); $bGreen1.Dispose(); $bGreen2.Dispose(); $bCream.Dispose()
    $g.Dispose(); $bmp.Dispose()
    Write-Host "created $($t.Name) ($size x $size, maskable=$($t.Mask))"
}
