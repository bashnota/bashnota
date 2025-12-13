# Filesystem Mode - Home View Enhancement

## Overview

This feature enhances the home view to provide better support for filesystem mode by:
1. Displaying notas from both the database and the filesystem directory
2. Allowing users to select/change the directory directly from the home view
3. Providing visual distinction between filesystem and database notas
4. Enabling direct opening of filesystem notas without importing them first

## Architecture

### Components Modified

#### 1. `useFilesystemNotas` Composable
**Location:** `src/features/bashhub/composables/useFilesystemNotas.ts`

**Purpose:** Manages filesystem notas separately from database notas.

**Key Functions:**
- `loadFilesystemNotas()`: Loads all .nota files from the selected directory
- `selectDirectory()`: Prompts user to select a directory and persists the choice
- `checkDirectoryAccess()`: Verifies if we have access to a previously selected directory
- `getFilesystemOnlyNotas(dbNotas)`: Returns notas that exist only in filesystem
- `getSharedNotas(dbNotas)`: Returns notas that exist in both filesystem and database

**State:**
- `filesystemNotas`: Array of notas loaded from filesystem
- `isLoadingFilesystem`: Loading state for filesystem operations
- `hasDirectoryAccess`: Whether we have access to a directory
- `directoryName`: Name of the currently selected directory

#### 2. HomeView Component
**Location:** `src/features/bashhub/views/HomeView.vue`

**Changes:**
- Integrates `useFilesystemNotas` composable
- Combines database and filesystem notas in `allNotas` computed property
- Loads filesystem notas on mount when in filesystem mode
- Passes filesystem-related props to child components

**New Props Passed Down:**
- `filesystemNotas`: List of notas from filesystem
- `isFilesystemMode`: Whether filesystem mode is enabled
- `hasDirectoryAccess`: Whether directory is selected
- `directoryName`: Name of selected directory

#### 3. HomeHeader Component
**Location:** `src/features/bashhub/components/HomeHeader.vue`

**Changes:**
- Added directory picker button (only visible in filesystem mode)
- Button shows directory name when selected, "Select Directory" otherwise
- Uses `FolderOpen` icon from lucide-vue-next

**New Props:**
- `isFilesystemMode`: Boolean to show/hide directory picker
- `hasDirectoryAccess`: Whether a directory is selected
- `directoryName`: Name of the selected directory

**New Emits:**
- `select-directory`: Emitted when directory picker button is clicked

#### 4. HomeNotaList Component
**Location:** `src/features/bashhub/components/HomeNotaList.vue`

**Changes:**
- Accepts filesystem-related props
- Implements `isFilesystemNota(notaId)` function to identify filesystem-only notas
- Passes the checker function to NotaTable component

**New Props:**
- `filesystemNotas`: Array of notas from filesystem
- `isFilesystemMode`: Boolean indicating filesystem mode
- `hasDirectoryAccess`: Boolean indicating directory access

#### 5. NotaTable Component
**Location:** `src/features/nota/components/NotaTable.vue`

**Changes:**
- Added optional `isFilesystemNota` prop (function)
- Displays "Filesystem" badge next to nota title for filesystem-only notas
- Badge styling: Blue color with outline variant

**New Prop:**
- `isFilesystemNota?: (id: string) => boolean`: Function to check if nota is from filesystem

## User Flow

### Initial Setup (IndexedDB Mode)
1. User opens the app
2. Home view shows notas from IndexedDB
3. No directory picker button is visible

### Switching to Filesystem Mode
1. User navigates to Settings > Advanced > Storage Mode
2. User selects "File System (.nota files)"
3. Browser prompts user to select a directory
4. User selects a directory (e.g., "My Notes")
5. App reloads to apply changes

### Using Filesystem Mode
1. User sees the home view with directory picker button showing "My Notes"
2. Home view displays:
   - All notas from IndexedDB
   - All notas from the filesystem directory
   - Notas with "Filesystem" badge are only in the filesystem
3. User can:
   - Click any nota to open and edit it
   - Click the directory picker to select a different directory
   - Import notas (adds to database)
   - Create new notas (saved to both filesystem and database if mode allows)

### Opening Filesystem Notas
1. User clicks on a nota with "Filesystem" badge
2. Nota opens in the editor
3. If filesystem mode is active, changes save directly to the .nota file
4. No import step required

## Technical Details

### Nota Source Detection

The system identifies nota sources as follows:

- **Database-only nota**: Exists in `store.items` but not in `filesystemNotas`
- **Filesystem-only nota**: Exists in `filesystemNotas` but not in `store.items` (shows badge)
- **Shared nota**: Exists in both (no badge, treated as database nota)

### Directory Handle Persistence

The selected directory handle is persisted using IndexedDB via `directoryHandleStorage.ts`. This allows the app to remember the directory across sessions without requiring user interaction each time.

### File System Access API

The implementation uses the File System Access API:
- `window.showDirectoryPicker()`: Prompts user to select a directory
- Directory handle is stored in IndexedDB
- Permission is verified before accessing files

### Error Handling

The implementation gracefully handles:
- User canceling directory selection
- Permission denied errors
- Directory handle no longer available
- File system not supported in browser

## Browser Support

Filesystem mode requires browsers that support the File System Access API:
- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Opera 72+
- ❌ Firefox (not yet supported)
- ❌ Safari (not yet supported)

When filesystem mode is not supported, the app falls back to IndexedDB mode.

## Security Considerations

1. **User Consent**: User must explicitly select a directory via browser prompt
2. **Permission Verification**: Permissions are verified before file access
3. **Sandboxed Access**: App only accesses the selected directory, not the entire filesystem
4. **Handle Persistence**: Directory handles are stored securely in IndexedDB

## Future Enhancements

Potential improvements for future iterations:

1. **Bulk Operations**: Allow importing all filesystem notas to database at once
2. **Sync Status**: Show sync status between filesystem and database
3. **Conflict Resolution**: Handle cases where filesystem and database versions differ
4. **Directory Watching**: Real-time updates when files change in the filesystem
5. **Multi-directory Support**: Allow selecting multiple directories
6. **Export to Filesystem**: Export database notas to filesystem in bulk

## Testing

### Manual Testing Checklist

- [ ] Directory picker appears only in filesystem mode
- [ ] Directory selection works and persists across reloads
- [ ] Filesystem notas show with blue badge
- [ ] Clicking filesystem nota opens it directly
- [ ] Both database and filesystem notas appear in list
- [ ] No duplicate notas in the list
- [ ] Directory name is displayed correctly
- [ ] Works in supported browsers (Chrome, Edge)
- [ ] Gracefully degrades in unsupported browsers

### Edge Cases

- [ ] Empty filesystem directory
- [ ] Directory with no .nota files
- [ ] Directory with invalid .nota files
- [ ] Permission revoked after initial access
- [ ] Network drive or slow filesystem
- [ ] Very large number of files (100+ notas)

## Troubleshooting

### "No directory handle available" Error
**Solution**: Click the directory picker button to select a directory again.

### Notas not showing from filesystem
**Possible causes:**
1. Directory permissions revoked - reselect directory
2. Files not in .nota format - ensure files have .nota extension
3. Invalid JSON in .nota files - check file format

### Directory picker not appearing
**Possible causes:**
1. Filesystem mode not enabled - check Settings > Advanced > Storage Mode
2. Browser doesn't support File System Access API - use Chrome/Edge
3. Page needs reload after enabling filesystem mode

## Related Files

- `src/composables/useStorageMode.ts`: Manages storage mode configuration
- `src/services/fileSystemBackend.ts`: Filesystem backend implementation
- `src/services/directoryHandleStorage.ts`: Directory handle persistence
- `src/services/storageService.ts`: Unified storage abstraction

## API Reference

### useFilesystemNotas()

```typescript
interface UseFilesystemNotasReturn {
  // State
  filesystemNotas: Ref<Nota[]>
  isLoadingFilesystem: Ref<boolean>
  hasDirectoryAccess: Ref<boolean>
  directoryName: Ref<string | null>
  
  // Computed
  isFilesystemMode: ComputedRef<boolean>
  
  // Methods
  checkDirectoryAccess(): Promise<void>
  loadFilesystemNotas(): Promise<void>
  selectDirectory(): Promise<boolean>
  getFilesystemOnlyNotas(dbNotas: Nota[]): Nota[]
  getSharedNotas(dbNotas: Nota[]): Nota[]
}
```

## Change Log

### Version 1.0 (Current)
- Initial implementation of filesystem home view enhancement
- Directory picker in HomeHeader
- Filesystem badge in NotaTable
- Combined nota list from both sources
- Direct opening of filesystem notas
