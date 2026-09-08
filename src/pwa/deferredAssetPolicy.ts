declare const self: { location: { origin: string } }

/**
 * Workbox serializes this callback into the generated service worker, so keep
 * it self-contained (no closed-over module constants).
 */
export function isSameOriginDeferredAssetRequest({ url }: { url: URL }): boolean {
  return url.origin === self.location.origin
    && /\/assets\/(?:webllm-|editor-|d3-chart-|katex-|vue-flow-|heavy-style-|EditorAppShell-|KaTeX_|[^/?]+\.css(?:\?|$))/.test(url.pathname)
}
