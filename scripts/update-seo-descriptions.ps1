param(
    [string]$SiteRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

function Get-PlainText([string]$Value) {
    $withoutTags = [regex]::Replace($Value, '<[^>]+>', '')
    return [Net.WebUtility]::HtmlDecode($withoutTags).Trim()
}

function New-SeoDescription([string]$Title) {
    $candidates = @(
        "Download high-quality $Title wallpaper for mobile and desktop. Free HD wallpaper from PMW Visuals.",
        "Download high-quality $Title wallpaper. Free HD background from PMW Visuals.",
        "Download $Title wallpaper in HD for mobile and desktop. Free from PMW Visuals.",
        "$Title wallpaper - free HD download from PMW Visuals."
    )

    $description = $candidates | Where-Object { $_.Length -le 160 } | Select-Object -First 1
    if (-not $description) {
        throw "The title is too long for a 160-character SEO description: $Title"
    }

    foreach ($suffix in @(' Free to download and enjoy.', ' Download it free.', ' Explore more free wallpapers.')) {
        if ($description.Length -ge 120) { break }
        if (($description.Length + $suffix.Length) -le 160) {
            $description += $suffix
        }
    }

    if ($description.Length -lt 120 -or $description.Length -gt 160) {
        throw "SEO description length is invalid ($($description.Length)) for: $Title"
    }

    return $description
}

$wallpaperRoot = Join-Path $SiteRoot 'wallpapers'
$files = Get-ChildItem $wallpaperRoot -Recurse -Filter '*.html' -File
$updated = 0

foreach ($file in $files) {
    $html = [IO.File]::ReadAllText($file.FullName)
    $headingMatch = [regex]::Match($html, '<h1(?:\s[^>]*)?>(.*?)</h1>', 'IgnoreCase,Singleline')
    $titleMatch = [regex]::Match($html, '<title>(.*?)</title>', 'IgnoreCase,Singleline')

    if ($headingMatch.Success) {
        $pageTitle = Get-PlainText $headingMatch.Groups[1].Value
    } elseif ($titleMatch.Success) {
        $pageTitle = Get-PlainText $titleMatch.Groups[1].Value
    } else {
        throw "No page title found in $($file.FullName)"
    }

    $description = New-SeoDescription $pageTitle
    $encodedDescription = [Net.WebUtility]::HtmlEncode($description)
    $metaTag = "<meta name=`"description`" content=`"$encodedDescription`">"
    $descriptionPattern = '<meta\s+name=["'']description["''][^>]*>'
    $matches = [regex]::Matches($html, $descriptionPattern, 'IgnoreCase')

    if ($matches.Count -gt 1) {
        throw "Duplicate meta descriptions found in $($file.FullName)"
    }

    if ($matches.Count -eq 1) {
        $html = [regex]::Replace($html, $descriptionPattern, $metaTag, 'IgnoreCase')
    } elseif ($titleMatch.Success) {
        $html = $html.Insert($titleMatch.Index + $titleMatch.Length, "`r`n    $metaTag")
    } else {
        throw "Cannot place meta description in $($file.FullName)"
    }

    [IO.File]::WriteAllText($file.FullName, $html, [Text.UTF8Encoding]::new($false))
    $updated += 1
}

Write-Output "Updated $updated wallpaper HTML files."
