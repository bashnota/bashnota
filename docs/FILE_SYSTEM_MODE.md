# File System Mode Integration

This document describes the File System Mode integration in BashNota, which allows users to store and edit `.nota` files directly on their file system.

## Overview

BashNota now supports two storage modes:

1. **IndexedDB Mode** (default): Stores notes in the browser's IndexedDB
2. **File System Mode**: Stores notes as `.nota` files in a user-selected directory

## Features

### Storage Mode Selection
- Users can choose their preferred storage mode in Settings → Advanced → Storage Mode
- The selection persists across sessions
- Changes require a page reload to take effect

### File System Mode Benefits
- **Direct File Access**: Edit `.nota` files with any text editor
- **Real-Time Synchronization**: Changes to files are automatically detected and reflected in BashNota
- **Version Control**: Easy to track with git or other VCS tools
- **Backup**: Simple file-based backup and restore
- **Multi-Instance**: Works across multiple instances of BashNota pointing to the same directory

### Real-Time File Watching
- Automatically detects file changes, additions, and deletions
- Configurable polling interval (default: 2 seconds)
- Can be toggled on/off via the Auto-Watch setting
- Visual status indicator shows when file watcher is active

## Architecture

### Core Components

#### 1. FileSystemBackend (`src/services/fileSystemBackend.ts`)
- Implements the `IStorageBackend` interface
- Uses the File System Access API to read/write `.nota` files
- Supports both `.nota` and `.json` file extensions
- Handles file operations: read, write, delete, list
- Persists directory handle in IndexedDB for seamless re-initialization

#### 1.5. DirectoryHandleStorage (`src/services/directoryHandleStorage.ts`)
- Utility for persisting FileSystemDirectoryHandle in IndexedDB
- Allows directory access to persist across page reloads
- Verifies permissions before using cached handles
- Prevents security violations from automatic picker calls

#### 2. FileWatcherService (`src/services/fileWatcherService.ts`)
- Polling-based file change detection
- Monitors directory for changes every 2 seconds (configurable)
- Detects file modifications, additions, and deletions
- Provides callbacks for file change events

#### 3. useStorageMode Composable (`src/composables/useStorageMode.ts`)
- Vue composable for managing storage mode state
- Persists storage mode preference to localStorage
- Integrates with FileWatcherService
- Provides computed properties and actions for storage mode management

#### 4. StorageModeSettings Component (`src/features/settings/components/advanced/StorageModeSettings.vue`)
- UI component for storage mode configuration
- Allows switching between IndexedDB and File System modes
- Toggle for auto-watch functionality
- Shows file watcher status indicator
- Displays browser compatibility warnings

### Data Flow

```
User clicks to enable File System Mode in Settings
    ↓
User selects directory via showDirectoryPicker() (user gesture)
    ↓
Directory handle is saved to IndexedDB
    ↓
Page reloads
    ↓
StorageService initializes with FileSystemBackend
    ↓
FileSystemBackend retrieves persisted handle from IndexedDB
    ↓
Permission is verified for the handle
    ↓
FileSystemBackend reads/writes .nota files
    ↓
FileWatcherService monitors directory for changes
    ↓
Changes trigger callbacks to update UI
```

## .nota File Format

`.nota` files are JSON files with the following structure:

```json
{
  "version": "1.0",
  "exportedAt": "2025-12-11T20:32:06.307Z",
  "nota": {
    "id": "unique-nota-id",
    "title": "Nota Title",
    "parentId": null,
    "tags": [],
    "createdAt": "2025-12-11T20:08:36.240Z",
    "updatedAt": "2025-12-11T20:31:25.752Z",
    "blockStructure": {
      "notaId": "unique-nota-id",
      "blockOrder": [],
      "version": 1,
      "lastModified": "2025-12-11T20:08:36.240Z"
    },
    "config": {
      "kernelPreferences": {},
      "savedSessions": [],
      "sharedSessionMode": false
    },
    "citations": []
  }
}
```

## Browser Compatibility

File System Mode requires the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API), which is supported in:

- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Opera 72+
- ❌ Firefox (not yet supported)
- ❌ Safari (not yet supported)

The UI automatically detects browser support and disables File System Mode if not available.

## Usage

### Enabling File System Mode

1. Navigate to **Settings → Advanced → Storage Mode**
2. Select "File System (.nota files)" from the dropdown
3. A file picker will appear - select a directory where your `.nota` files will be stored
4. The directory handle is saved automatically
5. Click "Reload Now" when prompted
6. On next page load, the app will use the previously selected directory (no picker shown)

### Using Auto-Watch

1. Ensure File System Mode is enabled
2. Toggle "Auto-Watch Files" to ON
3. The file watcher will start monitoring the directory
4. Edit `.nota` files externally - changes will be reflected in BashNota automatically

### Switching Back to IndexedDB

1. Navigate to **Settings → Advanced → Storage Mode**
2. Select "IndexedDB (Browser Storage)" from the dropdown
3. Click "Reload Now" when prompted
4. Your data will be read from IndexedDB again

## Technical Details

### File Naming Convention
- File names are derived from nota IDs
- Special characters are replaced with underscores
- Extension: `.nota` (preferred) or `.json` (legacy)
- Example: `eKRtgW3Ws1Bnecy-2YYbg.nota`

### File Watching Implementation
Since the File System Access API doesn't provide native file watching, we use a polling-based approach:
- Poll directory every 2 seconds (configurable)
- Compare file metadata (last modified time, size)
- Trigger callbacks on changes
- Minimal performance impact

### Security Considerations
- Users must explicitly grant directory access via user gesture (e.g., clicking a button)
- Directory handle is persisted in IndexedDB for subsequent page loads
- Permission is verified on each initialization
- No automatic calls to `showDirectoryPicker()` during page load
- Files are only accessed in the granted directory
- Users can revoke access by clearing browser data or selecting a different directory

## Future Enhancements

- [ ] Migration tool to move data between storage modes
- [ ] Conflict resolution for simultaneous edits
- [ ] Support for subdirectories (nested notas)
- [ ] Custom file naming patterns
- [ ] Batch operations for multiple files
- [ ] Integration with cloud storage providers
- [ ] Native file watching (when browser APIs support it)

## Troubleshooting

### File System Mode not available
- Check browser compatibility
- Ensure you're using HTTPS (or localhost)
- Update browser to latest version

### Changes not detected
- Check that Auto-Watch is enabled
- Verify file watcher status indicator shows "active"
- Try toggling Auto-Watch off and on
- Check browser console for errors

### Permission denied
- Grant directory access when prompted during the initial setup
- If permission is lost, switch to File System mode again to re-select the directory
- Check that the directory is writable
- Try selecting a different directory
- Clear browser data and re-grant permission if issues persist

## API Reference

### useStorageMode()

```typescript
interface UseStorageMode {
  // State
  storageMode: Ref<'indexeddb' | 'filesystem'>
  autoWatch: Ref<boolean>
  
  // Computed
  isFilesystemSupported: ComputedRef<boolean>
  isFilesystemMode: ComputedRef<boolean>
  isIndexedDBMode: ComputedRef<boolean>
  isWatchingFiles: ComputedRef<boolean>
  getModeDescription: ComputedRef<string>
  
  // Actions
  switchToFilesystem(): Promise<void>
  switchToIndexedDB(): void
  setDirectoryHandle(handle: FileSystemDirectoryHandle | null): void
  getDirectoryHandle(): FileSystemDirectoryHandle | null
  initializeFileWatcher(backend: FileSystemBackend, callbacks?: FileWatcherCallbacks): FileWatcherService
  stopFileWatcher(): void
}
```

### FileWatcherService

```typescript
class FileWatcherService {
  constructor(options?: FileWatcherOptions)
  setBackend(backend: FileSystemBackend): void
  start(): Promise<void>
  stop(): void
  isActive(): boolean
  setPollInterval(interval: number): void
  getPollInterval(): number
}

interface FileWatcherOptions {
  pollInterval?: number
  onFileChanged?: (notaId: string, content: any) => void
  onFileAdded?: (notaId: string, content: any) => void
  onFileDeleted?: (notaId: string) => void
  onError?: (error: Error) => void
}
```

## Contributing

When contributing to File System Mode:

1. Test with both storage modes
2. Ensure backward compatibility with IndexedDB mode
3. Handle File System API errors gracefully
4. Update documentation for new features
5. Add appropriate logging for debugging

## License

This feature is part of BashNota and is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE.
