import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const SELF = 'scripts/check-backend-purity.mjs'
const runtimeRoots = ['src', '.github', 'scripts', 'e2e', 'docs']
const rootConfigs = [
  'package.json',
  'package-lock.json',
  '.env.example',
  '.gitignore',
  'CONTRIBUTING.md',
  'README.md',
  'vite.config.ts',
  'vitest.config.ts',
  'netlify.toml',
]

// These documents describe retained, restricted migration/audit data. Legacy
// UID field names are part of that immutable import contract, not runtime
// provider selection, and are intentionally outside the runtime text scan.
const migrationAuditDocuments = new Set([
  'docs/supabase/auth-identity-migration.md',
])
const operatorMigrationFiles = new Set([
  'docs/supabase/data-migration-runbook.md',
  'scripts/legacy-migration/export-cli.mjs',
  'scripts/legacy-migration/cli.mjs',
])
// These exact files define repository policy and necessarily contain the
// prohibited literals they detect or ignore. They are governance inputs, not
// application/runtime code. Keep this allowlist exact and mutation-tested.
const repositoryPolicyFiles = new Set([
  '.gitignore',
  'CONTRIBUTING.md',
  'README.md',
  'docs/architecture/adr/0002-supabase-only-backend.md',
  'docs/architecture/threat-model.md',
  'docs/development.md',
  'scripts/container-smoke-test.mjs',
  'scripts/release/archive-policy.mjs',
  'scripts/repository-hygiene.self-test.mjs',
])
const isOperatorMigrationFile = file => operatorMigrationFiles.has(file) || file.startsWith('scripts/legacy-migration/')
const isRepositoryPolicyFile = file => repositoryPolicyFiles.has(file)

const forbiddenRuntime = [
  { name: 'legacy backend SDK/tooling reference', pattern: /firebase(?:-admin|-functions|-tools)?|@firebase\/|firebase\/|firestore|firebasestorage/i },
  { name: 'legacy backend environment/config key', pattern: /VITE_FIREBASE_|FIREBASE_|GCLOUD_PROJECT|PROVIDER_VERSION|ROLLOUT_VERSION/i },
  { name: 'removed backend Functions path', pattern: /(?:^|[\s`'"(])functions\//i },
  { name: 'browser/server privileged Supabase credential path', pattern: /VITE_SUPABASE_(?:SERVICE_ROLE|SERVICE_KEY)|SUPABASE_SERVICE_ROLE_KEY|service[_-]role|DATABASE_URL|DB_PASSWORD/i },
]

const forbiddenArtifact = /(^|\/)(?:firebase\.json|firestore(?:-tests|\.|$)|storage\.rules|functions(?:\/|$)|emulator-data(?:\/|$))|firebase/i
const forbiddenOperatorModule = /^(?:firebase(?:\/|$)|@firebase\/|firebase-admin(?:\/|$)|firebase-functions(?:\/|$))/i
const forbiddenOperatorCommand = /(?:^|[\s`'"])(?:firebase|gcloud)\s+(?:auth:export|firestore:export|emulators:|projects:)|(?:^|[\s`'"])(?:firebase-admin|firebase-tools|@firebase\/)/i

const excludedRepositoryDirectories = new Set(['node_modules', 'dist', '.git', '.dacli'])

export function isExcludedRepositoryPath(file) {
  return file.replaceAll('\\', '/').split('/').some(segment => excludedRepositoryDirectories.has(segment))
}

export function filesUnder(...roots) {
  const files = []
  const visit = (relativePath) => {
    const normalized = relativePath.replace(/^\.\//, '').replaceAll('\\', '/')
    if (isExcludedRepositoryPath(normalized)) return
    const absolute = path.resolve(normalized || '.')
    if (!existsSync(absolute)) return
    const stat = lstatSync(absolute)
    // Preserve ripgrep's former no-follow behavior. A repository symlink must
    // never make this local scanner read outside the checkout or recurse into a
    // directory target.
    if (stat.isSymbolicLink()) return
    if (!stat.isDirectory()) {
      files.push(normalized)
      return
    }
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const child = normalized ? `${normalized}/${entry.name}` : entry.name
      visit(child)
    }
  }
  roots.forEach(visit)
  return [...new Set(files)].sort()
}

export function scanText(file, source) {
  return forbiddenRuntime.flatMap(({ name, pattern }) => source.split('\n').flatMap((line, index) =>
    pattern.test(line) ? [`${file}:${index + 1}: ${name}`] : [],
  ))
}

export function scanArtifactNames(files) {
  return files.filter(file => forbiddenArtifact.test(file)
    && !file.replaceAll('\\', '/').startsWith('supabase/functions/'))
}

export function scanOperatorDependencies(file, source) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const violations = []
  const stringValue = node => {
    if (ts.isStringLiteralLike(node)) return node.text
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = stringValue(node.left)
      const right = stringValue(node.right)
      return left === undefined || right === undefined ? undefined : left + right
    }
  }
  const record = (node, moduleName) => {
    if (moduleName && forbiddenOperatorModule.test(moduleName)) {
      const line = parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1
      violations.push(`${file}:${line}: legacy backend SDK/Admin/tool dependency`)
    }
  }
  const visit = node => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) record(node, node.moduleSpecifier && stringValue(node.moduleSpecifier))
    if (ts.isCallExpression(node) && node.arguments.length) {
      const directImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
      const directRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require'
      const requireResolve = ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'require'
        && node.expression.name.text === 'resolve'
      if (directImport || directRequire || requireResolve) record(node, stringValue(node.arguments[0]))
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  source.split('\n').forEach((line, index) => {
    if (forbiddenOperatorCommand.test(line)) violations.push(`${file}:${index + 1}: legacy backend SDK/Admin/tool dependency`)
  })
  return [...new Set(violations)]
}

function selfTest() {
  const unsafe = [
    "import { initializeApp } from 'firebase/app'",
    'VITE_FIREBASE_API_KEY=secret',
    'SUPABASE_SERVICE_ROLE_KEY=server-secret',
    'const selected = env.PROVIDER_VERSION',
    'functions/src/index.ts',
  ]
  for (const fixture of unsafe) {
    if (!scanText('fixture.ts', fixture).length) throw new Error(`purity scanner missed fixture: ${fixture}`)
  }
  if (scanText('safe.ts', "import { createClient } from '@supabase/supabase-js'").length) {
    throw new Error('purity scanner rejected the browser-safe Supabase client')
  }
  if (!scanArtifactNames(['functions/src/index.ts', 'firebase.json', 'firestore.rules']).length) {
    throw new Error('purity scanner missed a prohibited artifact name')
  }
  if (scanArtifactNames(['supabase/functions/published-images/index.ts']).length
    || !scanArtifactNames(['other/supabase/functions/published-images/index.ts']).length) {
    throw new Error('purity scanner Supabase Edge Function exception is not root-exact')
  }
  const unsafeOperatorImports = [
    "import admin from 'firebase-admin'",
    "import(\n 'firebase/app'\n)",
    "require(\n 'firebase/firestore'\n)",
    "require.resolve('fire' + 'base/app')",
  ]
  if (unsafeOperatorImports.some(source => !scanOperatorDependencies('operator.mjs', source).length)
    || scanOperatorDependencies('operator.mjs', "const row = { firebase_uid: sourceUid }").length) {
    throw new Error('operator migration dependency scanner is not exact')
  }
  const enumerated = filesUnder('.')
  if (!enumerated.includes('.gitignore') || enumerated.some(file => file === '.git' || file.startsWith('.git/'))) {
    throw new Error('purity scanner did not enumerate hidden/ignored workspace files safely')
  }
  for (const excluded of ['.git', '.git/config', 'node_modules/pkg/file.js', 'nested/dist/file.js', '.dacli/events.jsonl']) {
    if (!isExcludedRepositoryPath(excluded)) throw new Error(`purity scanner did not exclude ${excluded}`)
  }
  for (const allowed of ['.gitignore', 'src/distance.ts', 'docs/dacli-guide.md']) {
    if (isExcludedRepositoryPath(allowed)) throw new Error(`purity scanner over-excluded ${allowed}`)
  }

  const fixtureRoot = mkdtempSync(path.join(process.cwd(), '.purity-self-test-'))
  const fixtureRelative = path.relative(process.cwd(), fixtureRoot).replaceAll('\\', '/')
  try {
    writeFileSync(path.join(fixtureRoot, '.env.local'), 'ignored-but-enumerated=true')
    writeFileSync(path.join(fixtureRoot, 'outside.txt'), 'fixture')
    symlinkSync(path.join(fixtureRoot, 'outside.txt'), path.join(fixtureRoot, 'link.txt'))
    for (const directory of excludedRepositoryDirectories) {
      mkdirSync(path.join(fixtureRoot, directory), { recursive: true })
      writeFileSync(path.join(fixtureRoot, directory, 'hidden.txt'), 'fixture')
    }
    const fixtureFiles = filesUnder(fixtureRelative, `${fixtureRelative}/outside.txt`, fixtureRelative)
    if (!fixtureFiles.includes(`${fixtureRelative}/.env.local`)
      || fixtureFiles.includes(`${fixtureRelative}/link.txt`)
      || fixtureFiles.some(file => /\/(?:node_modules|dist|\.git|\.dacli)\//.test(file))
      || fixtureFiles.filter(file => file === `${fixtureRelative}/outside.txt`).length !== 1
      || fixtureFiles.join('\n') !== [...fixtureFiles].sort().join('\n')) {
      throw new Error('purity scanner traversal lost ignore, no-follow, exclusion, root, dedupe, or sort semantics')
    }
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
  if (!isRepositoryPolicyFile('.gitignore')
    || !isRepositoryPolicyFile('docs/development.md')
    || !isRepositoryPolicyFile('scripts/release/archive-policy.mjs')
    || !isRepositoryPolicyFile('scripts/container-smoke-test.mjs')
    || !isRepositoryPolicyFile('scripts/repository-hygiene.self-test.mjs')
    || isRepositoryPolicyFile('src/repository-hygiene.self-test.mjs')
    || isRepositoryPolicyFile('scripts/repository-hygiene-copy.self-test.mjs')) {
    throw new Error('repository policy allowlist is not exact')
  }
  if (!scanText('src/runtime.ts', "import 'firebase/app'").length
    || !scanText('src/runtime.ts', 'SUPABASE_SERVICE_ROLE_KEY=secret').length) {
    throw new Error('repository policy allowlist weakened runtime scanning')
  }
}

function main() {
  selfTest()
  const environmentFiles = filesUnder('.')
    .filter(file => !file.includes('/') && (file === '.env' || file.startsWith('.env.')))
  const runtimeFiles = [...new Set([...filesUnder(...runtimeRoots), ...rootConfigs, ...environmentFiles])]
    .filter(file => file !== SELF)
    .filter(file => !migrationAuditDocuments.has(file))
    .filter(file => !isOperatorMigrationFile(file))
    .filter(file => !isRepositoryPolicyFile(file))
  const textViolations = runtimeFiles.flatMap(file => scanText(file, readFileSync(file, 'utf8')))
  const operatorFiles = [...new Set(filesUnder('scripts/legacy-migration', 'docs/supabase/data-migration-runbook.md'))]
  const operatorViolations = operatorFiles.flatMap(file => scanOperatorDependencies(file, readFileSync(file, 'utf8')))
  const artifactViolations = scanArtifactNames(filesUnder('.'))
  const violations = [...textViolations, ...operatorViolations, ...artifactViolations.map(file => `${file}: prohibited artifact`)]
  if (violations.length) {
    console.error(violations.join('\n'))
    process.exitCode = 1
    return
  }
  console.log(`Backend purity check passed across ${runtimeFiles.length} runtime/config files, ${operatorFiles.length} restricted operator files, and all artifact names.`)
}

main()
