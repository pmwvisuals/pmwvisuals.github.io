param(
    [string]$SiteRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$iconTag = '<link rel="icon" type="image/png" href="/favicon.png">'
$shortcutTag = '<link rel="shortcut icon" href="/favicon.png">'
$faviconPattern = '<link\s+rel=["''](?:icon|shortcut icon)["''][^>]*href=["'']/favicon\.png["''][^>]*>\s*'
$updated = 0

Get-ChildItem $SiteRoot -Recurse -Filter '*.html' -File | ForEach-Object {
    $html = [IO.File]::ReadAllText($_.FullName)
    $headMatch = [regex]::Match($html, '<head(?:\s[^>]*)?>', 'IgnoreCase')
    if (-not $headMatch.Success) {
        throw "Missing <head> element in $($_.FullName)"
    }

    $withoutFavicons = [regex]::Replace($html, $faviconPattern, '', 'IgnoreCase')
    $declarations = "`n    $iconTag`n    $shortcutTag`n    "
    $result = $withoutFavicons.Insert($headMatch.Index + $headMatch.Length, $declarations)
    $afterShortcut = [regex]::new('(<link rel="shortcut icon" href="/favicon\.png">)\s*', 'IgnoreCase')
    $result = $afterShortcut.Replace($result, "`$1`n    ", 1)

    [IO.File]::WriteAllText($_.FullName, $result, [Text.UTF8Encoding]::new($false))
    $updated += 1
}

Write-Output "Updated favicon declarations in $updated HTML files."
