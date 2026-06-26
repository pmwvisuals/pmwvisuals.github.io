param(
    [string]$SiteRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$licenseUrl = 'https://pmwvisuals.com/license.html'
$scriptPattern = [regex]::new('(<script\s+type=["'']application/ld\+json["''][^>]*>)(.*?)(</script>)', 'IgnoreCase,Singleline')
$pagesUpdated = 0
$objectsUpdated = 0

function Update-ImageObject([object]$Node, [ref]$Changed) {
    if ($null -eq $Node) { return }

    if ($Node -is [Array]) {
        foreach ($item in $Node) {
            Update-ImageObject $item $Changed
        }
        return
    }

    if ($Node -isnot [PSCustomObject]) { return }

    $types = @($Node.'@type')
    if ($types -contains 'ImageObject') {
        $requiredFields = [ordered]@{
            creditText = 'PMW Visuals'
            copyrightNotice = 'Copyright PMW Visuals'
            acquireLicensePage = $licenseUrl
            license = $licenseUrl
        }

        foreach ($entry in $requiredFields.GetEnumerator()) {
            if (-not $Node.PSObject.Properties[$entry.Key]) {
                $Node | Add-Member -NotePropertyName $entry.Key -NotePropertyValue $entry.Value
                $Changed.Value = $true
            }
        }
    }

    foreach ($property in $Node.PSObject.Properties) {
        if ($property.Value -is [PSCustomObject] -or $property.Value -is [Array]) {
            Update-ImageObject $property.Value $Changed
        }
    }
}

Get-ChildItem $SiteRoot -Recurse -Filter '*.html' -File | ForEach-Object {
    $html = [IO.File]::ReadAllText($_.FullName)
    $matches = $scriptPattern.Matches($html)
    $pageChanged = $false

    for ($index = $matches.Count - 1; $index -ge 0; $index -= 1) {
        $match = $matches[$index]
        try {
            $json = $match.Groups[2].Value | ConvertFrom-Json
        } catch {
            throw "Invalid JSON-LD in $($_.FullName): $($_.Exception.Message)"
        }

        $changed = $false
        Update-ImageObject $json ([ref]$changed)
        if (-not $changed) { continue }

        $imageObjectCount = @($json) | Where-Object { @($_.'@type') -contains 'ImageObject' } | Measure-Object
        $objectsUpdated += $imageObjectCount.Count
        $serialized = $json | ConvertTo-Json -Depth 100 -Compress
        $replacement = $match.Groups[1].Value + $serialized + $match.Groups[3].Value
        $html = $html.Remove($match.Index, $match.Length).Insert($match.Index, $replacement)
        $pageChanged = $true
    }

    if ($pageChanged) {
        [IO.File]::WriteAllText($_.FullName, $html, [Text.UTF8Encoding]::new($false))
        $pagesUpdated += 1
    }
}

Write-Output "Updated $objectsUpdated ImageObject entries across $pagesUpdated HTML pages."
