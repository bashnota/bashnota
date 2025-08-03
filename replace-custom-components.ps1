# Final custom components replacement script
# This script replaces remaining custom components with shadcn-vue equivalents

$rootPath = "c:\Users\tahab\Documents\github\bashnota\src"

Write-Host "Starting replacement of custom components with shadcn-vue equivalents..." -ForegroundColor Green

# 1. Replace LoadingSpinner with Skeleton
Write-Host "`n1. Replacing LoadingSpinner with Skeleton..." -ForegroundColor Cyan

$spinnerFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    (Get-Content $_.FullName -Raw) -match "LoadingSpinner"
}

foreach ($file in $spinnerFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace import
    $content = $content -replace "import LoadingSpinner from '@/ui/LoadingSpinner\.vue'", "import { Skeleton } from '@/components/ui/skeleton'"
    
    # Replace basic LoadingSpinner usage with appropriate skeleton
    $content = $content -replace '<LoadingSpinner />', '<div class="flex flex-col space-y-3"><Skeleton class="h-4 w-full" /><Skeleton class="h-4 w-4/5" /><Skeleton class="h-4 w-3/5" /></div>'
    $content = $content -replace '<LoadingSpinner/>', '<div class="flex flex-col space-y-3"><Skeleton class="h-4 w-full" /><Skeleton class="h-4 w-4/5" /><Skeleton class="h-4 w-3/5" /></div>'
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "✓ Updated LoadingSpinner in: $($file.Name)" -ForegroundColor Yellow
}

# 2. Replace UploadZone with Input file
Write-Host "`n2. Replacing UploadZone with Input file..." -ForegroundColor Cyan

$uploadFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    (Get-Content $_.FullName -Raw) -match "UploadZone"
}

foreach ($file in $uploadFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace import
    $content = $content -replace "import UploadZone from '@/ui/UploadZone\.vue'", "import { Input } from '@/components/ui/input'`nimport { Label } from '@/components/ui/label'"
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "✓ Updated UploadZone imports in: $($file.Name)" -ForegroundColor Yellow
    Write-Host "  ⚠️  Manual template update needed for UploadZone -> Input[type=file]" -ForegroundColor Red
}

# 3. Replace Modal with Dialog
Write-Host "`n3. Replacing Modal with Dialog..." -ForegroundColor Cyan

$modalFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    (Get-Content $_.FullName -Raw) -match "from '@/ui/Modal\.vue'"
}

foreach ($file in $modalFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace import
    $content = $content -replace "import Modal from '@/ui/Modal\.vue'", "import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'"
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "✓ Updated Modal imports in: $($file.Name)" -ForegroundColor Yellow
    Write-Host "  ⚠️  Manual template update needed for Modal -> Dialog components" -ForegroundColor Red
}

# 4. Replace SearchableSelect with Select
Write-Host "`n4. Replacing SearchableSelect with Select..." -ForegroundColor Cyan

$searchableSelectFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    (Get-Content $_.FullName -Raw) -match "SearchableSelect"
}

foreach ($file in $searchableSelectFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace import
    $content = $content -replace "import SearchableSelect from '@/ui/searchable-select\.vue'", "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'"
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "✓ Updated SearchableSelect imports in: $($file.Name)" -ForegroundColor Yellow
    Write-Host "  ⚠️  Manual template update needed for SearchableSelect -> Select components" -ForegroundColor Red
}

# 5. Replace CustomSelect with Select
Write-Host "`n5. Replacing CustomSelect with Select..." -ForegroundColor Cyan

$customSelectFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    (Get-Content $_.FullName -Raw) -match "CustomSelect"
}

foreach ($file in $customSelectFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace import
    $content = $content -replace "import CustomSelect from '@/ui/CustomSelect\.vue'", "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'"
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "✓ Updated CustomSelect imports in: $($file.Name)" -ForegroundColor Yellow
    Write-Host "  ⚠️  Manual template update needed for CustomSelect -> Select components" -ForegroundColor Red
}

# 6. Replace ButtonGroup (this needs manual review as it's more complex)
Write-Host "`n6. ButtonGroup components found:" -ForegroundColor Cyan

$buttonGroupFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    (Get-Content $_.FullName -Raw) -match "ButtonGroup"
}

foreach ($file in $buttonGroupFiles) {
    Write-Host "  ⚠️  Manual review needed: $($file.Name)" -ForegroundColor Red
    Write-Host "     Replace ButtonGroup with array of Button components" -ForegroundColor White
}

Write-Host "`n🎯 Summary:" -ForegroundColor Green
Write-Host "✅ LoadingSpinner -> Skeleton (automated)" -ForegroundColor Green
Write-Host "⚠️  UploadZone -> Input[type=file] (imports updated, templates need manual review)" -ForegroundColor Yellow
Write-Host "⚠️  Modal -> Dialog (imports updated, templates need manual review)" -ForegroundColor Yellow
Write-Host "⚠️  SearchableSelect -> Select (imports updated, templates need manual review)" -ForegroundColor Yellow
Write-Host "⚠️  CustomSelect -> Select (imports updated, templates need manual review)" -ForegroundColor Yellow
Write-Host "⚠️  ButtonGroup (needs manual replacement with Button array)" -ForegroundColor Yellow

Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Review template changes for components marked with ⚠️" -ForegroundColor White
Write-Host "2. Update UploadZone templates to use Input with type='file'" -ForegroundColor White
Write-Host "3. Update Modal templates to use Dialog, DialogContent, etc." -ForegroundColor White
Write-Host "4. Update SearchableSelect/CustomSelect templates to use Select components" -ForegroundColor White
Write-Host "5. Replace ButtonGroup with styled Button arrays" -ForegroundColor White

# Final check
Write-Host "`n🔍 Final check for remaining @/ui/ imports..." -ForegroundColor Cyan
$remainingFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue", "*.ts" | 
    Where-Object { $_.FullName -notlike "*node_modules*" } | 
    Where-Object { (Get-Content $_.FullName -Raw) -match "from '@/ui/" }

if ($remainingFiles.Count -gt 0) {
    Write-Host "Remaining files with @/ui/ imports: $($remainingFiles.Count)" -ForegroundColor Yellow
} else {
    Write-Host "🎉 No more @/ui/ imports found!" -ForegroundColor Green
}
