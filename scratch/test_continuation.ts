import axios from 'axios'

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
}

function extractContinuation(node: any, found: { token?: string }) {
  if (!node || typeof node !== 'object' || found.token) return
  if (typeof node.token === 'string' && node.token.length > 50 && node.clickTrackingParams) {
    // continuationCommand style
  }
  if (node.continuationCommand?.token) {
    found.token = node.continuationCommand.token
    return
  }
  if (node.nextContinuationData?.continuation) {
    found.token = node.nextContinuationData.continuation
    return
  }
  if (node.continuation && typeof node.continuation === 'string' && node.continuation.length > 80) {
    found.token = node.continuation
    return
  }
  if (Array.isArray(node)) node.forEach((n) => extractContinuation(n, found))
  else Object.values(node).forEach((n) => extractContinuation(n, found))
}

function walkVideos(node: any, out: any[], seen: Set<string>) {
  if (!node || typeof node !== 'object') return
  const lockup = node.lockupViewModel
  if (lockup) {
    const id =
      lockup.contentId ||
      lockup.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId
    const title = lockup.metadata?.lockupMetadataViewModel?.title?.content
    if (id && title && !seen.has(id)) {
      seen.add(id)
      out.push({ id, title })
    }
  }
  if (Array.isArray(node)) node.forEach((n) => walkVideos(n, out, seen))
  else Object.values(node).forEach((n) => walkVideos(n, out, seen))
}

function parseInitial(html: string) {
  const marker = 'var ytInitialData = '
  const start = html.indexOf(marker)
  if (start < 0) return { videos: [] as any[], token: null as string | null }
  const jsonStart = start + marker.length
  let depth = 0
  let end = -1
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === '{') depth++
    else if (html[i] === '}') {
      depth--
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  const data = JSON.parse(html.slice(jsonStart, end))
  const videos: any[] = []
  walkVideos(data, videos, new Set())
  const found: { token?: string } = {}
  extractContinuation(data, found)
  return { videos, token: found.token || null }
}

;(async () => {
  const handle = '@alimhamza1'
  const r = await axios.get(`https://www.youtube.com/${handle}/videos`, { headers, timeout: 25000 })
  const first = parseInitial(String(r.data))
  console.log('page1', first.videos.length, 'token?', !!first.token, first.token?.slice(0, 40))

  if (!first.token) {
    console.log('NO TOKEN')
    return
  }

  const body = {
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240815.00.00',
        hl: 'de',
        gl: 'DE',
      },
    },
    continuation: first.token,
  }

  const cont = await axios.post(
    'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false',
    body,
    {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Youtube-Client-Name': '1',
        'X-Youtube-Client-Version': '2.20240815.00.00',
      },
      timeout: 25000,
      validateStatus: () => true,
    },
  )
  console.log('cont status', cont.status)
  const videos2: any[] = []
  walkVideos(cont.data, videos2, new Set(first.videos.map((v: any) => v.id)))
  const found2: { token?: string } = {}
  extractContinuation(cont.data, found2)
  console.log('page2', videos2.length, 'next?', !!found2.token)
  console.log(videos2.slice(0, 3))
})()
