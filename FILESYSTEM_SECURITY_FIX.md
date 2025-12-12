# File System Access API Security Fix

## Issue
When BashNota loads with filesystem storage mode enabled, it attempted to call `window.showDirectoryPicker()` automatically during page initialization. This violated browser security requirements that mandate the file picker must only be called from a user gesture (e.g., button click).

**Error Message:**
```
SecurityError: Failed to execute 'showDirectoryPicker' on 'Window': Must be handling a user gesture to show a file picker.
```

## Root Cause
The original `FileSystemBackend.initialize()` method called `showDirectoryPicker()` directly during initialization, which occurred automatically on page load without any user interaction.

## Solution
We implemented a directory handle persistence mechanism using IndexedDB:

### 1. Directory Handle Storage (`src/services/directoryHandleStorage.ts`)
- Created utility functions to save/retrieve FileSystemDirectoryHandle in IndexedDB
- Handles are persisted across page reloads
- Permission verification before using cached handles
- Proper TypeScript types for permission methods

### 2. Modified FileSystemBackend (`src/services/fileSystemBackend.ts`)
- `initialize()` now retrieves persisted handle from IndexedDB
- Never calls `showDirectoryPicker()` automatically
- Added `setDirectoryHandle()` method for user-initiated handle storage
- Falls back to IndexedDB storage if handle unavailable

### 3. Updated Settings UI (`src/features/settings/components/advanced/StorageModeSettings.vue`)
- Prompts for directory selection only when user clicks to enable filesystem mode
- Persists selected handle immediately
- Clear user feedback about the process

### 4. Enhanced Error Handling (`src/main.ts`, `src/services/storageService.ts`)
- Graceful fallback to IndexedDB if filesystem initialization fails
- Informative logging when fallback occurs
- User guidance to re-select directory if needed

## How It Works Now

### First Time Setup
1. User navigates to Settings → Advanced → Storage Mode
2. User selects "File System (.nota files)" from dropdown
3. **User gesture triggers** `showDirectoryPicker()` 
4. User selects a directory
5. Directory handle is saved to IndexedDB
6. Page reload required

### Subsequent Page Loads
1. App initializes with filesystem mode preference
2. FileSystemBackend retrieves persisted handle from IndexedDB
3. Permission is verified (no user prompt needed if still granted)
4. App starts using the previously selected directory
5. No security error!

## Benefits
- ✅ Complies with browser security requirements
- ✅ Better user experience (no repeated directory prompts)
- ✅ Seamless re-initialization across sessions
- ✅ Proper permission management
- ✅ Graceful fallback when permissions are revoked

## Testing
- All existing tests updated and passing
- New tests for directory handle storage
- Manual testing verified no security errors
- CodeQL security scan passed with 0 alerts

## Browser Compatibility
This fix maintains compatibility with:
- Chrome 86+
- Edge 86+
- Opera 72+

Browsers without File System Access API automatically use IndexedDB mode.

## Migration Notes
For users already using filesystem mode:
- On first page load after update, they'll need to re-select their directory
- This is expected behavior as handles weren't previously persisted
- After re-selection, experience will be seamless

## Related Documentation
- See `docs/FILE_SYSTEM_MODE.md` for complete feature documentation
- File System Access API: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
