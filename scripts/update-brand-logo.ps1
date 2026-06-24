$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$wallpaperRoot = Join-Path $repoRoot 'wallpapers'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$updated = 0

Get-ChildItem -LiteralPath $wallpaperRoot -Recurse -Filter '*.html' -File | ForEach-Object {
    $path = $_.FullName
    $html = [System.IO.File]::ReadAllText($path)

    if ($html -notmatch '<a class="brand"') {
        return
    }

    $next = $html
    if ($next -notmatch 'class="brand-logo"') {
        $next = $next.Replace(
            '<a class="brand" href="../../../index.html">PMW Visuals</a>',
            '<a class="brand" href="../../../index.html"><img class="brand-logo" src="../../../pmw-logo.png" alt="">PMW Visuals</a>'
        )

    $brandRule = @'
.brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
'@
        $next = [regex]::Replace($next, '\.brand \{\r?\n', "$brandRule`r`n", 1)

    $logoRule = @'
        .brand-logo {
            width: 38px;
            height: 38px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid rgba(220, 173, 63, 0.35);
        }
'@
        $next = $next.Replace('        .nav-links {', "$logoRule`r`n        .nav-links {")
    }

    $next = $next.Replace('gap: 10px;            font-family:', "gap: 10px;`r`n            font-family:")
    $next = $next.Replace('        }        .nav-links {', "        }`r`n        .nav-links {")
    $next = $next.Replace('class="brand-logo" src="/pmw-logo.png"', 'class="brand-logo" src="../../../pmw-logo.png"')

    if ($next -ne $html) {
        [System.IO.File]::WriteAllText($path, $next, $utf8)
        $updated++
    }
}

Write-Host "Updated brand logo on $updated wallpaper pages."
