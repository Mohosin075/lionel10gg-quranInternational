import axios from 'axios'

const SPEAKERS: { name: string; handle: string }[] = [
  { name: 'Abu Alia', handle: '@abu_alia' },
  { name: 'Abul Baraa', handle: '@abulbaraatube1927' },
  { name: 'Pierre Vogel', handle: '@pierrevogeloffiziell' },
  { name: 'One Message Foundation', handle: '@onemessagefoundation' },
  { name: 'Alim Hamza', handle: '@alimhamza1' },
]

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
}

async function resolve(handle: string): Promise<string | null> {
  const res = await axios.get(`https://www.youtube.com/${handle}`, {
    timeout: 20000,
    headers,
  })
  const html = String(res.data)
  const m =
    html.match(/"channelId"\s*:\s*"(UC[^"]+)"/) ||
    html.match(/"externalId"\s*:\s*"(UC[^"]+)"/) ||
    html.match(/meta itemprop="channelId" content="(UC[^"]+)"/i)
  return m?.[1] || null
}

async function rssCount(channelId: string): Promise<{ count: number; title: string }> {
  const res = await axios.get(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    { timeout: 20000, headers },
  )
  const xml = String(res.data)
  const count = (xml.match(/<yt:videoId>/g) || []).length
  const title = xml.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    ?.replace(/<!\[CDATA\[|\]\]>/g, '')
    ?.trim() || ''
  return { count, title }
}

;(async () => {
  for (const s of SPEAKERS) {
    try {
      const id = await resolve(s.handle)
      console.log(`\n=== ${s.name} (${s.handle}) ===`)
      console.log('channelId:', id || 'NONE')
      if (id) {
        try {
          const { count, title } = await rssCount(id)
          console.log('channel title:', title)
          console.log('RSS videos:', count)
        } catch (e: any) {
          console.log('RSS ERR:', e.message)
        }
      }
    } catch (e: any) {
      console.log(`\n=== ${s.name} === RESOLVE ERR:`, e.message)
    }
  }
})()
