import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

// Pin the timezone for the whole test run so that date-based tests are
// deterministic regardless of the host machine's local timezone. Several
// suites build dates from UTC literals (e.g. new Date('2024-01-15')) and then
// assert against implementations that use local-time methods (getHours,
// getFullYear, getDay). Without a fixed TZ those assertions pass in UTC-ish
// zones but fail in negative-offset zones. Set it here (main + worker
// processes both inherit process.env.TZ) rather than loosening the assertions.
process.env.TZ = 'UTC'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // '.dacli/**' holds agent worktrees — full checkouts of this repo living
      // inside it. Without this exclude, vitest globs into every worktree and
      // runs each suite once per checkout, against whatever half-finished state
      // an agent happens to have on disk. That looks like a phantom regression
      // in the main tree and is extremely confusing to debug.
      exclude: [...configDefaults.exclude, 'e2e/**', '.dacli/**', '.codex/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      // Ensure the pinned timezone reaches the test worker processes too.
      env: {
        TZ: 'UTC',
      },
    },
  }),
)
