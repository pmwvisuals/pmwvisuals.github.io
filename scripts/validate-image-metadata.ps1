param(
    [string]$SiteRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$licenseUrl = 'https://pmwvisuals.com/license.html'
$scriptPattern = [regex]::new('<script\s+type=["'']application/ld\+json["''][^>]*>(.*?)</script>', 'IgnoreCase,Singleline')
$requiredFields = @('creditText', 'copyrightNotice', 'acquireLicensePage', 'license')
$imageObjects = [Collections.Generic.List[object]]::new()
$errors = [Collections.Generic.List[string]]::new()
$jsonLdBlocks = 0

function Find-ImageObjects([object]$Node) {
    if ($null -eq $Node) { return }

    if ($Node -is [Array]) {
        foreach ($item in $Node) { Find-ImageObjects $item }
        return
    }

    if ($Node -isnot [PSCustomObject]) { return }
    if (@($Node.'@type') -contains 'ImageObject') {
        $script:imageObjects.Add($Node)
    }

    foreach ($property in $Node.PSObject.Properties) {
        if ($property.Value -is [PSCustomObject] -or $property.Value -is [Array]) {
            Find-ImageObjects $property.Value
        }
    }
}

Get-ChildItem $SiteRoot -Recurse -Filter '*.html' -File | ForEach-Object {
    $html = [IO.File]::ReadAllText($_.FullName)
    foreach ($match in $scriptPattern.Matches($html)) {
        $jsonLdBlocks += 1
        try {
            $json = $match.Groups[1].Value | ConvertFrom-Json
            Find-ImageObjects $json
        } catch {
            $errors.Add("Invalid JSON-LD in $($_.FullName): $($_.Exception.Message)")
        }
    }
}

foreach ($imageObject in $imageObjects) {
    if ($imageObject.'@context' -ne 'https://schema.org') {
        $errors.Add("ImageObject has an invalid or missing Schema.org context: $($imageObject.name)")
    }

    foreach ($field in $requiredFields) {
        $property = $imageObject.PSObject.Properties[$field]
        if (-not $property -or [string]::IsNullOrWhiteSpace([string]$property.Value)) {
            $errors.Add("ImageObject is missing ${field}: $($imageObject.name)")
        }
    }

    foreach ($urlField in @('contentUrl', 'thumbnailUrl', 'url', 'acquireLicensePage', 'license')) {
        $value = [string]$imageObject.$urlField
        $uri = $null
        if (-not [Uri]::TryCreate($value, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -ne 'https') {
            $errors.Add("ImageObject has an invalid ${urlField} URL: $($imageObject.name)")
        }
    }

    if ($imageObject.acquireLicensePage -ne $licenseUrl -or $imageObject.license -ne $licenseUrl) {
        $errors.Add("ImageObject points to an unexpected license URL: $($imageObject.name)")
    }
}

$licensePath = Join-Path $SiteRoot 'license.html'
if (-not (Test-Path $licensePath)) {
    $errors.Add('license.html is missing.')
}

$sitemap = [IO.File]::ReadAllText((Join-Path $SiteRoot 'sitemap.xml'))
if ($sitemap -notmatch [regex]::Escape($licenseUrl)) {
    $errors.Add('license.html is missing from sitemap.xml.')
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ }
    throw "Image metadata validation failed with $($errors.Count) error(s)."
}

Write-Output "Validated $($imageObjects.Count) ImageObject entries across $jsonLdBlocks JSON-LD blocks."
