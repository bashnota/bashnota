# Final migration script for custom components
# This script handles the remaining custom components

$rootPath = "c:\Users\tahab\Documents\github\bashnota\src"

Write-Host "Starting final migration of custom components..." -ForegroundColor Green

# 1. Update TagsInput components that were added
Write-Host "1. Updating TagsInput imports..." -ForegroundColor Cyan

$tagsInputMappings = @{
    "from '@/ui/tags-input'" = "from '@/components/ui/tags-input'"
    "from '@/ui/tags-input/TagsInputInput.vue'" = "from '@/components/ui/tags-input/TagsInputInput.vue'"
    "from '@/ui/tags-input/TagsInputItem.vue'" = "from '@/components/ui/tags-input/TagsInputItem.vue'"
    "from '@/ui/tags-input/TagsInputItemText.vue'" = "from '@/components/ui/tags-input/TagsInputItemText.vue'"
    "from '@/ui/tags-input/TagsInputItemDelete.vue'" = "from '@/components/ui/tags-input/TagsInputItemDelete.vue'"
}

$files = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue", "*.ts" | Where-Object { $_.FullName -notlike "*node_modules*" }
$modifiedFiles = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileModified = $false
    
    foreach ($oldImport in $tagsInputMappings.Keys) {
        $newImport = $tagsInputMappings[$oldImport]
        if ($content -match [regex]::Escape($oldImport)) {
            $content = $content -replace [regex]::Escape($oldImport), $newImport
            $fileModified = $true
        }
    }
    
    if ($fileModified) {
        Set-Content $file.FullName $content -NoNewline
        $modifiedFiles++
        Write-Host "✓ Updated TagsInput in: $($file.Name)" -ForegroundColor Yellow
    }
}

# 2. Update Calendar import
Write-Host "`n2. Updating Calendar imports..." -ForegroundColor Cyan
$calendarFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    (Get-Content $_.FullName -Raw) -match "from '@/ui/calendar\.vue'"
}

foreach ($file in $calendarFiles) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace "from '@/ui/calendar\.vue'", "from '@/components/ui/calendar'"
    Set-Content $file.FullName $content -NoNewline
    Write-Host "✓ Updated Calendar in: $($file.Name)" -ForegroundColor Yellow
    $modifiedFiles++
}

# 3. Handle toggle variants (these are internal references within @/ui/)
Write-Host "`n3. Updating toggle variants..." -ForegroundColor Cyan
$toggleFiles = Get-ChildItem -Path "$rootPath\ui\toggle-group" -Include "*.vue" -ErrorAction SilentlyContinue

foreach ($file in $toggleFiles) {
    if (Test-Path $file.FullName) {
        $content = Get-Content $file.FullName -Raw
        $content = $content -replace "from '@/ui/toggle'", "from '@/components/ui/toggle'"
        Set-Content $file.FullName $content -NoNewline
        Write-Host "✓ Updated toggle variants in: $($file.Name)" -ForegroundColor Yellow
        $modifiedFiles++
    }
}

Write-Host "`nFinal migration complete!" -ForegroundColor Green
Write-Host "Files modified in this pass: $modifiedFiles" -ForegroundColor Yellow

# 4. Final check for remaining @/ui/ imports
Write-Host "`n4. Final check for remaining @/ui/ imports..." -ForegroundColor Cyan
$remainingFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue", "*.ts" | 
    Where-Object { $_.FullName -notlike "*node_modules*" } | 
    Where-Object { (Get-Content $_.FullName -Raw) -match "from '@/ui/" }

if ($remainingFiles) {
    Write-Host "`nRemaining files with @/ui/ imports:" -ForegroundColor Red
    
    # Group by component type for easier handling
    $customComponents = @{}
    
    foreach ($file in $remainingFiles) {
        $content = Get-Content $file.FullName
        $uiImports = $content | Select-String "from '@/ui/"
        foreach ($import in $uiImports) {
            $componentMatch = $import.Line -match "from '@/ui/([^']+)'"
            if ($componentMatch) {
                $component = $matches[1]
                if (-not $customComponents.ContainsKey($component)) {
                    $customComponents[$component] = @()
                }
                $customComponents[$component] += "$($file.Name):$($import.LineNumber)"
            }
        }
    }
    
    Write-Host "`nCustom components summary:" -ForegroundColor Yellow
    foreach ($component in $customComponents.Keys | Sort-Object) {
        Write-Host "`n📁 $component" -ForegroundColor Cyan
        foreach ($usage in $customComponents[$component]) {
            Write-Host "   - $usage" -ForegroundColor White
        }
    }
    
    Write-Host "`nNext steps for remaining components:" -ForegroundColor Green
    Write-Host "1. ButtonGroup: Create a custom component or use Button array" -ForegroundColor White
    Write-Host "2. LoadingSpinner: Move to @/components/ui/ or use existing spinner" -ForegroundColor White
    Write-Host "3. BaseSidebar, KeyboardShortcut, SidebarSection: Move to @/components/ui/" -ForegroundColor White
    Write-Host "4. CustomSelect: Replace with shadcn-vue Select or move to @/components/ui/" -ForegroundColor White
    Write-Host "5. UploadZone, SaveIndicator, ShortcutsDialog, Modal: Move to @/components/ui/" -ForegroundColor White
    Write-Host "6. SearchableSelect, MarkdownRenderer: Move to @/components/ui/" -ForegroundColor White
    
} else {
    Write-Host "`n🎉 No remaining @/ui/ imports found! Migration complete!" -ForegroundColor Green
}

Write-Host "`n📊 Migration Summary:" -ForegroundColor Green
Write-Host "✅ Standard shadcn-vue components: Migrated" -ForegroundColor Green
Write-Host "✅ Toast system: Migrated to vue-sonner" -ForegroundColor Green
Write-Host "✅ TagsInput: Migrated" -ForegroundColor Green
Write-Host "✅ Calendar: Migrated" -ForegroundColor Green
Write-Host "⚠️  Custom components: Need manual review" -ForegroundColor Yellow
