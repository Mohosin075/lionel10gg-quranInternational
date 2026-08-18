import axios from 'axios'

const SPEAKERS = [
  { name: 'Abu Alia', handle: '@abu_alia', id: 'UCY4bNa8fwU9WRzsJh84FA5A' },
  { name: 'Abul Baraa', handle: '@abulbaraatube1927', id: 'UCRsfPhTdW-GBdqHjj-29tvQ' },
  { name: 'Pierre Vogel', handle: '@pierrevogeloffiziell', id: 'UCRkFMKQApHodjgV0IVuAXHQ' },
  { name: 'One Message Foundation', handle: '@onemessagefoundation', id: 'UCvJyEIx_it2jFYP5M1OzGng' },
  { name: 'Alim Hamza', handle: '@alimhamza1', id: 'UC477ugR0xa6V_ivtjGu0y6g' },
]

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
}

async function rss(id: string) {
  const r = await axios.get(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`,
    { timeout: 12000, headers, validateStatus: () => true },
  )
  const xml = String(r.data)
  return { status: r.status, count: (xml.match(/yt:videoId/g) || []).length }
}

function walk(node: any, out: any[], seen: Set<string>) {
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
  if (Array.isArray(node)) node.forEach((n) => walk(n, out, seen))
  else Object.values(node).forEach((n) => walk(n, out, seen))
}

async function scrape(handle: string) {
  const r = await axios.get(`https://www.youtube.com/${handle}/videos`, {
    timeout: 20000,
    headers,
  })
  const html = String(r.data)
  const marker = 'var ytInitialData = '
  const start = html.indexOf(marker)
  if (start < 0) return []
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
  const out: any[] = []
  walk(data, out, new Set())
  return out
}

;(async () => {
  for (const s of SPEAKERS) {
    const r = await rss(s.id)
    let source = `RSS(${r.count})`
    let sample = ''
    if (r.count === 0) {
      const videos = await scrape(s.handle)
      source = `SCRAPE(${videos.length})`
      sample = videos[0] ? videos[0].title.slice(0, 50) : ''
    } else {
      sample = `rss ok`
    }
    console.log(`${s.name.padEnd(24)} ${s.handle.padEnd(24)} ${s.id} -> ${source} ${sample}`)
  }
})()
