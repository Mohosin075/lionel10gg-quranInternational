import axios from 'axios'

function walkVideos(node: any, out: { id: string; title: string }[], seen: Set<string>) {
  if (!node || typeof node !== 'object') return

  // New YouTube lockup UI
  const lockup = node.lockupViewModel
  if (lockup) {
    const id =
      lockup.contentId ||
      lockup.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId ||
      lockup.onTap?.innertubeCommand?.watchEndpoint?.videoId
    const title = lockup.metadata?.lockupMetadataViewModel?.title?.content
    if (id && title && !seen.has(id)) {
      seen.add(id)
      out.push({ id, title: String(title).trim() })
    }
  }

  // Classic renderers (fallback)
  for (const key of ['videoRenderer', 'gridVideoRenderer', 'compactVideoRenderer']) {
    const vr = node[key]
    if (vr?.videoId) {
      const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || ''
      if (title && !seen.has(vr.videoId)) {
        seen.add(vr.videoId)
        out.push({ id: vr.videoId, title: String(title).trim() })
      }
    }
  }

  if (Array.isArray(node)) node.forEach((n) => walkVideos(n, out, seen))
  else Object.values(node).forEach((n) => walkVideos(n, out, seen))
}

function parseYtInitialData(html: string): { id: string; title: string }[] {
  const marker = 'var ytInitialData = '
  const start = html.indexOf(marker)
  if (start < 0) return []
  const jsonStart = start + marker.length
  let depth = 0
  let end = -1
  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  if (end < 0) return []
  const data = JSON.parse(html.slice(jsonStart, end))
  const out: { id: string; title: string }[] = []
  walkVideos(data, out, new Set())
  return out
}

;(async () => {
  for (const handle of ['@alimhamza1', '@abu_alia', '@abulbaraatube1927', '@onemessagefoundation']) {
    const r = await axios.get(`https://www.youtube.com/${handle}/videos`, {
      timeout: 25000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
    })
    const videos = parseYtInitialData(String(r.data))
    console.log(handle, videos.length, videos.slice(0, 2))
  }
})()
