import { defineConfig, mergeConfig } from 'vitest/config'

import vitestConfig from './vitest.config'

// This is the initial, explicitly named critical-logic coverage set. Keeping
// the list visible prevents a broad repository average from hiding an
// untested storage, migration, publishing, or editor state boundary.
const criticalLogic = [
  'src/services/cachedStorageService.ts',
  'src/services/codeExecutionService.ts',
  'src/services/consolidatedSettingsService.ts',
  'src/services/databaseAdapter.ts',
  'src/services/directoryHandleStorage.ts',
  'src/services/fileSystemBackend.ts',
  'src/services/migrationService.ts',
  'src/services/settingsAdapter.ts',
  'src/services/storageService.ts',
  'src/services/cloud/supabaseAuth.ts',
  'src/services/cloud/supabaseBrowser.ts',
  'src/services/cloud/supabaseCommunity.ts',
  'src/services/cloud/supabaseImageStorage.ts',
  'src/services/cloud/supabasePublishing.ts',
  'src/features/auth/stores/auth.ts',
  'src/features/editor/services/citationService.ts',
  'src/features/editor/services/exportService.ts',
  'src/features/editor/services/export/exportImageAsset.ts',
  'src/features/editor/services/export/sanitizeExportHtml.ts',
  'src/features/editor/stores/aiActionsStore.ts',
  'src/features/jupyter/services/jupyterSecurity.ts',
  'src/features/jupyter/services/jupyterService.ts',
  'src/features/jupyter/stores/jupyterStore.ts',
  'src/features/nota/services/backupArchiveService.ts',
  'src/features/nota/services/publishNotaUtilities.ts',
  'src/features/nota/services/versionHistoryPersistence.ts',
  'src/features/nota/stores/blockStore.ts',
  'src/features/nota/stores/nota.ts',
  'src/stores/settingsStore.ts',
  'src/stores/simplifiedNavigationStore.ts',
]

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: criticalLogic,
        reporter: ['text-summary', 'json-summary', 'lcov'],
        thresholds: {
          lines: 60,
          branches: 60,
          functions: 60,
          statements: 60,
        },
      },
    },
  }),
)
