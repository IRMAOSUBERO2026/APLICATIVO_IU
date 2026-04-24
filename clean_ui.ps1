$files = Get-ChildItem -Path "c:\Users\luisu\APLICATIVO\irm-os-ubero\src\" -Recurse -Filter "*.tsx"
foreach ($f in $files) {
    if ($f.Name -match "layout|shared|ui") { continue }
    
    $content = Get-Content $f.FullName -Raw
    $modified = $false
    
    $pattern = 'import\s*\{([^}]+)\}\s*from\s*["'']@/components/ui/[^"']+["'']'
    $matchesColl = [regex]::Matches($content, $pattern)
    foreach ($m in $matchesColl) {
        $importString = $m.Groups[1].Value
        $imports = $importString -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
        $validImports = @()
        
        foreach ($imp in $imports) {
            $count = ([regex]::Matches($content, "\b$imp\b")).Count
            if ($count -gt 1) {
                $validImports += $imp
            } else {
                Write-Host "Removing unused UI $imp from $($f.Name)"
                $modified = $true
            }
        }
        
        if ($validImports.Count -lt $imports.Count) {
            $originalMatch = $m.Value
            if ($validImports.Count -eq 0) {
                $content = $content.Replace($originalMatch, "")
            } else {
                $newImports = $validImports -join ", "
                $newMatch = $originalMatch -replace '\{[^}]+\}', "{ $newImports }"
                $content = $content.Replace($originalMatch, $newMatch)
            }
        }
    }
    
    if ($modified) {
        Set-Content -Path $f.FullName -Value $content -NoNewline
    }
}
