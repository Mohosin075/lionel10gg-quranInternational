import axios from 'axios'

const handles = [
  '@abu_alia',
  '@abulbaraatube1927',
  '@pierrevogeloffiziell',
  '@onemessagefoundation',
  '@alimhamza1',
  '@AlimHamza',
]

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
}

const uniq = <T>(arr: T[]) => [...new Set(arr)]

async function main() {
  for (const handle of handles) {
    try {
      const r = await axios.get(`https://www.youtube.com/${handle}`, {
        timeout: 20000,
        headers,
        validateStatus: () => true,
        maxRedirects: 5,
      })
      const html = String(r.data)
      const externalId = uniq(
        [...html.matchAll(/"externalId"\s*:\s*"(UC[^"]+)"/g)].map((m) => m[1]),
      )
      const browseId = uniq(
        [...html.matchAll(/"browseId"\s*:\s*"(UC[^"]+)"/g)].map((m) => m[1]),
      )
      const channelId = uniq(
        [...html.matchAll(/"channelId"\s*:\s*"(UC[^"]+)"/g)].map((m) => m[1]),
      )
      const canonical =
        html.match(/rel="canonical" href="([^"]+)"/i)?.[1] ||
        html.match(/property="og:url" content="([^"]+)"/i)?.[1]

      console.log(`\n=== ${handle} status=${r.status} ===`)
      console.log('canonical:', canonical)
      console.log('externalId:', externalId.slice(0, 5))
      console.log('browseId:', browseId.slice(0, 5))
      console.log('channelId sample:', channelId.slice(0, 8))

      const candidates = uniq([...externalId, ...browseId, ...channelId]).slice(0, 8)
      for (const id of candidates) {
        const rr = await axios.get(
          `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`,
          { timeout: 12000, headers, validateStatus: () => true },
        )
        const xml = String(rr.data)
        const count = (xml.match(/yt:videoId/g) || []).length
        const title = xml
          .match(/<title>([\s\S]*?)<\/title>/)?.[1]
          ?.replace(/<!\[CDATA\[|\]\]>/g, '')
          ?.slice(0, 50)
        console.log(` RSS ${id} -> ${rr.status} videos=${count} title=${title}`)
      }
    } catch (e: any) {
      console.log(handle, 'ERR', e.message)
    }
  }
}

main()
