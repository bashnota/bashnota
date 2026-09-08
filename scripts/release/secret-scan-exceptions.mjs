export function validatedSecretScanExceptions(document) {
  if (document?.schemaVersion !== 1 || !Array.isArray(document.exceptions)) {
    throw new Error('Secret scan exceptions must use schemaVersion 1 and an exceptions array.')
  }

  const exceptions = new Map()
  for (const exception of document.exceptions) {
    if (!/^[0-9a-f]{40}$/.test(exception.oid ?? '')) throw new Error('Secret scan exception has an invalid Git object ID.')
    if (!/^[0-9a-f]{64}$/.test(exception.sha256 ?? '')) throw new Error(`Secret scan exception ${exception.oid} has an invalid SHA-256 digest.`)
    if (typeof exception.path !== 'string' || !exception.path || exception.path.startsWith('/') || exception.path.includes('..')) {
      throw new Error(`Secret scan exception ${exception.oid} has an invalid repository path.`)
    }
    if (typeof exception.shape !== 'string' || !exception.shape || typeof exception.reason !== 'string' || !exception.reason) {
      throw new Error(`Secret scan exception ${exception.oid} must document its detected shape and review reason.`)
    }
    if (exceptions.has(exception.oid)) throw new Error(`Duplicate secret scan exception: ${exception.oid}`)
    exceptions.set(exception.oid, exception)
  }
  return exceptions
}
