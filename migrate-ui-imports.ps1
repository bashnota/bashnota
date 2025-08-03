# PowerShell script to migrate @/ui/ imports to @/components/ui/
# This script will update all remaining files that import from @/ui/

$rootPath = "c:\Users\tahab\Documents\github\bashnota\src"

# Define the mapping of old imports to new imports
$importMappings = @{
    "from '@/ui/button'" = "from '@/components/ui/button'"
    "from '@/ui/badge'" = "from '@/components/ui/badge'"
    "from '@/ui/card'" = "from '@/components/ui/card'"
    "from '@/ui/input'" = "from '@/components/ui/input'"
    "from '@/ui/textarea'" = "from '@/components/ui/textarea'"
    "from '@/ui/label'" = "from '@/components/ui/label'"
    "from '@/ui/alert'" = "from '@/components/ui/alert'"
    "from '@/ui/separator'" = "from '@/components/ui/separator'"
    "from '@/ui/scroll-area'" = "from '@/components/ui/scroll-area'"
    "from '@/ui/tabs'" = "from '@/components/ui/tabs'"
    "from '@/ui/dialog'" = "from '@/components/ui/dialog'"
    "from '@/ui/popover'" = "from '@/components/ui/popover'"
    "from '@/ui/select'" = "from '@/components/ui/select'"
    "from '@/ui/checkbox'" = "from '@/components/ui/checkbox'"
    "from '@/ui/collapsible'" = "from '@/components/ui/collapsible'"
    "from '@/ui/tooltip'" = "from '@/components/ui/tooltip'"
    "from '@/ui/dropdown-menu'" = "from '@/components/ui/dropdown-menu'"
    "from '@/ui/avatar'" = "from '@/components/ui/avatar'"
    "from '@/ui/command'" = "from '@/components/ui/command'"
    "from '@/ui/switch'" = "from '@/components/ui/switch'"
    "from '@/ui/progress'" = "from '@/components/ui/progress'"
    "from '@/ui/table'" = "from '@/components/ui/table'"
    "from '@/ui/slider'" = "from '@/components/ui/slider'"
}

# Get all Vue and TypeScript files
$files = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue", "*.ts" | Where-Object { $_.FullName -notlike "*node_modules*" }

$totalFiles = $files.Count
$processedFiles = 0
$modifiedFiles = 0

Write-Host "Starting migration of $totalFiles files..." -ForegroundColor Green

foreach ($file in $files) {
    $processedFiles++
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileModified = $false
    
    # Apply each mapping
    foreach ($oldImport in $importMappings.Keys) {
        $newImport = $importMappings[$oldImport]
        if ($content -match [regex]::Escape($oldImport)) {
            $content = $content -replace [regex]::Escape($oldImport), $newImport
            $fileModified = $true
        }
    }
    
    # Write back if modified
    if ($fileModified) {
        Set-Content $file.FullName $content -NoNewline
        $modifiedFiles++
        Write-Host "✓ Updated: $($file.Name)" -ForegroundColor Yellow
    }
    
    # Show progress
    if ($processedFiles % 10 -eq 0) {
        Write-Host "Progress: $processedFiles/$totalFiles files processed..." -ForegroundColor Cyan
    }
}

Write-Host "`nMigration complete!" -ForegroundColor Green
Write-Host "Total files processed: $totalFiles" -ForegroundColor White
Write-Host "Files modified: $modifiedFiles" -ForegroundColor Yellow

# Show remaining files that still have @/ui/ imports
Write-Host "`nChecking for remaining @/ui/ imports..." -ForegroundColor Cyan
$remainingFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue", "*.ts" | Where-Object { $_.FullName -notlike "*node_modules*" } | Where-Object { (Get-Content $_.FullName -Raw) -match "from '@/ui/" }

if ($remainingFiles) {
    Write-Host "`nFiles that still need manual review:" -ForegroundColor Red
    foreach ($file in $remainingFiles) {
        Write-Host "- $($file.FullName)" -ForegroundColor Red
        # Show the specific imports that need attention
        $content = Get-Content $file.FullName
        $uiImports = $content | Select-String "from '@/ui/"
        foreach ($import in $uiImports) {
            Write-Host "  Line $($import.LineNumber): $($import.Line.Trim())" -ForegroundColor DarkRed
        }
    }
} else {
    Write-Host "`nNo remaining @/ui/ imports found! Migration complete." -ForegroundColor Green
}
