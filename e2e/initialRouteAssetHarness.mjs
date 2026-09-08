import { existsSync, statSync } from 'node:fs'
import { extname, isAbsolute, normalize, relative, resolve, sep } from 'node:path'

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function contentType(pathname) {
  return mimeTypes[extname(pathname).toLowerCase()] ?? 'application/octet-stream'
}

function notFound(pathname) {
  return {
    body: 'not found\n',
    contentType: contentType(pathname),
    filePath: null,
    isShell: false,
    status: 404,
  }
}

function methodNotAllowed(pathname) {
  return {
    body: 'method not allowed\n',
    contentType: contentType(pathname),
    filePath: null,
    isShell: false,
    status: 405,
  }
}

export function acceptsHtmlResponse(accept) {
  let selectedQuality = 0
  let selectedSpecificity = -1

  for (const range of String(accept).split(',')) {
    const [rawMediaType, ...rawParameters] = range.split(';')
    const mediaType = rawMediaType.trim().toLowerCase()
    const specificity = mediaType === 'text/html' ? 2 : mediaType === 'text/*' ? 1 : mediaType === '*/*' ? 0 : -1
    if (specificity < 0) continue

    const qualityParameter = rawParameters.find((parameter) => parameter.trim().toLowerCase().startsWith('q='))
    const parsedQuality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1
    const quality = Number.isFinite(parsedQuality) && parsedQuality >= 0 && parsedQuality <= 1 ? parsedQuality : 0
    if (specificity > selectedSpecificity) {
      selectedSpecificity = specificity
      selectedQuality = quality
    } else if (specificity === selectedSpecificity) {
      selectedQuality = Math.max(selectedQuality, quality)
    }
  }

  return selectedQuality > 0
}

export function resolveRouteAssetRequest({
  accept = '',
  appBase,
  distDirectory,
  method = 'GET',
  requestPath,
}) {
  const normalizedMethod = String(method).toUpperCase()
  if (normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD') return methodNotAllowed(requestPath)

  const basePrefix = appBase.endsWith('/') ? appBase : `${appBase}/`
  if (requestPath !== appBase && !requestPath.startsWith(basePrefix)) return notFound(requestPath)

  let relativePath
  try {
    relativePath = decodeURIComponent(requestPath.slice(appBase.length)).replace(/^\/+/, '')
  } catch {
    return notFound(requestPath)
  }

  const normalizedPath = normalize(relativePath || 'index.html')
  if (isAbsolute(normalizedPath) || normalizedPath === '..' || normalizedPath.startsWith(`..${sep}`)) {
    return notFound(requestPath)
  }

  const distRoot = resolve(distDirectory)
  const candidate = resolve(distRoot, normalizedPath)
  const insideDist = candidate === distRoot || candidate.startsWith(`${distRoot}${sep}`)
  if (insideDist && existsSync(candidate) && statSync(candidate).isFile()) {
    return {
      contentType: contentType(candidate),
      filePath: candidate,
      isShell: normalizedPath === 'index.html',
      status: 200,
    }
  }

  const looksLikeAsset = relativePath.startsWith('assets/') || extname(relativePath) !== ''
  if (acceptsHtmlResponse(accept) && !looksLikeAsset) {
    const shell = resolve(distRoot, 'index.html')
    if (existsSync(shell) && statSync(shell).isFile()) {
      return {
        contentType: contentType(shell),
        filePath: shell,
        isShell: true,
        status: 200,
      }
    }
  }

  return notFound(requestPath)
}

function regexMatches(pattern, value) {
  pattern.lastIndex = 0
  const matches = pattern.test(value)
  pattern.lastIndex = 0
  return matches
}

function isInsideDirectory(directory, filePath) {
  const relativePath = relative(resolve(directory), resolve(filePath))
  return relativePath !== '' && relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath)
}

export function findMissingRequiredRouteAssets({ assetDirectory, requestRecords, required, resourcePaths }) {
  return required.filter((expected) => {
    const loaded = resourcePaths.some((resourcePath) => regexMatches(expected, resourcePath))
    const served = requestRecords.some(({ path, status, filePath }) => (
      regexMatches(expected, path)
      && status === 200
      && typeof filePath === 'string'
      && isInsideDirectory(assetDirectory, filePath)
    ))
    return !loaded || !served
  })
}

export function prepareRouteHarnessShell(html, readinessProbe) {
  return html.replace('</body>', `${readinessProbe}</body>`)
}

export function buildRouteReadinessProbe({
  auditWindowMs = 1_200,
  readySelector,
  readyText = '',
  pollIntervalMs = 25,
  reportUrl = '',
  settlePasses = 2,
}) {
  const selector = JSON.stringify(readySelector)
  const text = JSON.stringify(readyText)
  const reportEndpoint = JSON.stringify(reportUrl)
  return `<script>(()=>{
    const auditWindowMs=${auditWindowMs};
    const readySelector=${selector};
    const readyText=${text};
    const pollIntervalMs=${pollIntervalMs};
    const reportUrl=${reportEndpoint};
    const settlePasses=${settlePasses};
    let renderedPasses=0;
    let auditStarted=false;
    let reported=false;
    const resourceEntries=()=>performance.getEntriesByType('resource');
    const resources=()=>resourceEntries().map((entry)=>new URL(entry.name).pathname);
    const subresourceUrls=()=>resourceEntries()
      .filter((entry)=>['css','font','img','image','link','script'].includes(entry.initiatorType))
      .map((entry)=>entry.name);
    const rendered=()=>{
      const element=document.querySelector(readySelector);
      return Boolean(element)&&(!readyText||element.textContent.includes(readyText));
    };
    const report=async(payload)=>{
      if(reported)return;
      reported=true;
      if(!reportUrl)return;
      try{
        const response=await fetch(reportUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
        if(!response.ok)throw new Error('route gate report failed with '+response.status);
      }catch(error){document.body.dataset.routeError=String(error?.message||error)}
    };
    const fail=(reason)=>{
      const error=String(reason||'unknown route error');
      document.body.dataset.routeError=error;
      void report({error,ready:false,resourcePaths:resources(),subresourceUrls:subresourceUrls()});
    };
    window.addEventListener('error',(event)=>fail(event.message||event.target?.src||event.target?.href));
    window.addEventListener('unhandledrejection',(event)=>fail(event.reason?.message||event.reason));
    const check=()=>{
      if(document.body.dataset.routeError)return;
      if(auditStarted)return;
      renderedPasses=rendered()?renderedPasses+1:0;
      if(renderedPasses>=settlePasses&&!auditStarted){
        auditStarted=true;
        window.setTimeout(()=>{
          if(document.body.dataset.routeError)return;
          const resourcePaths=resources();
          document.body.dataset.routeAssets=resourcePaths.join('|');
          document.body.dataset.routeReady='true';
          void report({ready:true,resourcePaths,subresourceUrls:subresourceUrls()});
        },auditWindowMs);
        return;
      }
      window.setTimeout(check,pollIntervalMs);
    };
    check();
  })()</script>`
}
