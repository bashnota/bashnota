# PowerShell script to handle manual migrations for special cases
# This handles components that need special attention or don't have direct shadcn-vue equivalents

$rootPath = "c:\Users\tahab\Documents\github\bashnota\src"

Write-Host "Handling special migration cases..." -ForegroundColor Green

# 1. Handle toast imports - migrate to vue-sonner
Write-Host "`n1. Migrating toast imports to vue-sonner..." -ForegroundColor Cyan
$toastFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue", "*.ts" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    (Get-Content $_.FullName -Raw) -match "from '@/ui/toast"
}

foreach ($file in $toastFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace toast imports with vue-sonner
    $content = $content -replace "import { toast } from '@/ui/toast'", "import { toast } from 'vue-sonner'"
    $content = $content -replace "import { toast } from '@/ui/toast/use-toast'", "import { toast } from 'vue-sonner'"
    
    # Handle Toaster component (should be removed from App.vue since vue-sonner handles this)
    if ($file.Name -eq "App.vue") {
        $content = $content -replace "import Toaster from '@/ui/toast/Toaster\.vue'", ""
        $content = $content -replace "<Toaster\s*/?>", ""
    }
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "✓ Updated toast imports in: $($file.Name)" -ForegroundColor Yellow
}

# 2. Handle Popover component imports (these use individual component imports)
Write-Host "`n2. Fixing Popover component imports..." -ForegroundColor Cyan
$popoverFiles = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue", "*.ts" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    (Get-Content $_.FullName -Raw) -match "import.*from '@/ui/popover/"
}

foreach ($file in $popoverFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace individual popover imports with the new structure
    $content = $content -replace "import Popover from '@/ui/popover/Popover\.vue'", "import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'"
    $content = $content -replace "import PopoverContent from '@/ui/popover/PopoverContent\.vue'", ""
    $content = $content -replace "import PopoverTrigger from '@/ui/popover/PopoverTrigger\.vue'", ""
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "✓ Updated popover imports in: $($file.Name)" -ForegroundColor Yellow
}

# 3. Handle TagsInput component imports
Write-Host "`n3. Migrating TagsInput components..." -ForegroundColor Cyan
Write-Host "Note: TagsInput may need to be added via: npx shadcn-vue@latest add tags-input" -ForegroundColor Yellow

# 4. List components that need manual attention (custom components)
Write-Host "`n4. Components needing manual attention:" -ForegroundColor Red
$customComponents = @(
    "ButtonGroup",
    "CustomSelect", 
    "LoadingSpinner",
    "BaseSidebar",
    "KeyboardShortcut",
    "SidebarSection",
    "UploadZone",
    "SaveIndicator",
    "ShortcutsDialog",
    "Modal",
    "SearchableSelect",
    "MarkdownRenderer"
)

foreach ($component in $customComponents) {
    $files = Get-ChildItem -Path $rootPath -Recurse -Include "*.vue", "*.ts" | Where-Object { 
        $_.FullName -notlike "*node_modules*" -and 
        (Get-Content $_.FullName -Raw) -match "import.*$component.*from '@/ui/"
    }
    
    if ($files) {
        Write-Host "`n$component used in:" -ForegroundColor Red
        foreach ($file in $files) {
            Write-Host "  - $($file.FullName)" -ForegroundColor DarkRed
        }
    }
}

Write-Host "`nSpecial cases migration complete!" -ForegroundColor Green
Write-Host "Please review the custom components listed above and:" -ForegroundColor Yellow
Write-Host "1. Move them to @/components/ui/ or" -ForegroundColor Yellow
Write-Host "2. Create equivalent shadcn-vue components or" -ForegroundColor Yellow
Write-Host "3. Update their import paths manually" -ForegroundColor Yellow
