export const IFRAME_OUTPUT_SANDBOX = 'allow-scripts'
export const IFRAME_OUTPUT_RESIZE_TYPE = 'bashnota:iframe-output:resize'
export const MIN_IFRAME_OUTPUT_HEIGHT = 100
export const MAX_IFRAME_OUTPUT_HEIGHT = 600

const OUTPUT_DOCUMENT_STYLES = `
  body {
    margin: 0;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #374151;
    background: white;
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0;
  }

  table th,
  table td {
    border: 1px solid #e5e7eb;
    padding: 8px 12px;
    text-align: left;
  }

  table th {
    background-color: #f9fafb;
    font-weight: 600;
  }

  table tr:nth-child(even) {
    background-color: #f9fafb;
  }

  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }

  .plotly-graph-div {
    width: 100% !important;
    height: auto !important;
  }

  .widget-container {
    width: 100%;
    overflow-x: auto;
  }

  @media (max-width: 768px) {
    body {
      padding: 8px;
      font-size: 12px;
    }

    table th,
    table td {
      padding: 4px 8px;
    }
  }
`

/**
 * The channel does not grant authority; event.source is the security boundary.
 * It distinguishes messages from a previous srcdoc document after content reloads.
 */
export const createIframeOutputChannel = (): string => {
  return `bashnota-output-${globalThis.crypto.randomUUID()}`
}

/**
 * Build the complete document before assigning it to srcdoc. The trusted bridge is
 * installed in the head, before untrusted output can alter the parser state. The
 * iframe sandbox gives this document an opaque origin even when output scripts run.
 */
export const createIframeOutputDocument = (content: string, channel: string): string => {
  // Keep the embedded bridge compact: its whitespace ships verbatim inside the
  // JavaScript string, unlike normal application source processed by minifiers.
  const bridge = `(()=>{
'use strict';
const channel=${JSON.stringify(channel)};
const messageType=${JSON.stringify(IFRAME_OUTPUT_RESIZE_TYPE)};
const minHeight=${MIN_IFRAME_OUTPUT_HEIGHT};
const maxHeight=${MAX_IFRAME_OUTPUT_HEIGHT};
const resizeIframe=()=>{
const measuredHeight=Math.ceil(Math.max(
document.body?.scrollHeight||0,
document.body?.offsetHeight||0,
document.documentElement?.clientHeight||0,
document.documentElement?.scrollHeight||0,
document.documentElement?.offsetHeight||0
))+20;
const height=Math.min(maxHeight,Math.max(minHeight,measuredHeight));
window.parent.postMessage({type:messageType,channel,height},'*');
};
const observeContent=()=>{
resizeIframe();
if(document.body)new MutationObserver(resizeIframe).observe(document.body,{childList:true,subtree:true,attributes:true});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeContent,{once:true});
else observeContent();
window.addEventListener('load',resizeIframe);
window.addEventListener('resize',resizeIframe);
})();`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Output</title>
  <style>${OUTPUT_DOCUMENT_STYLES}</style>
  <script>${bridge}</scr${'ipt'}>
</head>
<body>${content}</body>
</html>`
}

type ResizeMessage = {
  type: typeof IFRAME_OUTPUT_RESIZE_TYPE
  channel: string
  height: number
}

const hasExactResizeShape = (data: unknown): data is ResizeMessage => {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return false

  if (Object.keys(data).sort().join() !== 'channel,height,type') {
    return false
  }

  const candidate = data as Partial<ResizeMessage>
  return candidate.type === IFRAME_OUTPUT_RESIZE_TYPE
    && typeof candidate.channel === 'string'
    && typeof candidate.height === 'number'
}

export const getTrustedIframeOutputHeight = (
  event: MessageEvent<unknown>,
  expectedSource: Window | null,
  expectedChannel: string,
): number | null => {
  if (!expectedSource || event.source !== expectedSource || !hasExactResizeShape(event.data)) {
    return null
  }

  const { channel, height } = event.data
  if (channel !== expectedChannel
    || !Number.isFinite(height)
    || height < MIN_IFRAME_OUTPUT_HEIGHT
    || height > MAX_IFRAME_OUTPUT_HEIGHT) {
    return null
  }

  return height
}
