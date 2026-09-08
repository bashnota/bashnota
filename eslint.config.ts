import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/functions/lib/**',
      '**/.dacli/**',
      '**/.temp/**',
      '**/.supabase/**',
      '**/components/ui/**',
      '**/.codex/**',
    ],
  },

  ...(pluginVue.configs['flat/essential'] as any),

  // Register the TypeScript parser for .ts/.tsx and <script lang="ts"> in .vue files.
  // Without this, every TS file fails ESLint with a "Parsing error".
  vueTsConfigs.recommended as any,

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },
  
  // @ts-ignore - Type compatibility issue
  skipFormatting as any,
  
  {
    rules: {
      // These pre-existing findings remain visible while they are reviewed in
      // small behavior-preserving changes. New code should not add warnings.
      '@typescript-eslint/no-unused-vars': 'warn',
      'prefer-const': 'warn',
      'vue/multi-word-component-names': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-implicit-any-catch': 'off',
      'vue/no-implicit-any': 'off',
    },
  },
])
