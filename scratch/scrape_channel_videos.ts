import axios from 'axios'
import * as fs from 'fs'

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
}

const channels = [
  { name: 'Abu Alia', handle: '@abu_alia', id: 'UCY4bNa8fwU9WRzsJh84FA5A' },
  { name: 'Abul Baraa', handle: '@abulbaraatube1927', id: 'UCRsfPhTdW-GBdqHjj-29tvQ' },
  { name: 'Alim Hamza', handle: '@alimhamza1', id: 'UC477ugR0xa6V_ivtjGu0y6g' },
  { name: 'One Message Foundation', handle: '@onemessagefoundation', id: 'UCvJyEIx_it2jFYP5M1OzGng' },
]

function extractVideoIds(html: string): { id: string; title: string }[] {
  const out: { id: string; title: string }[] = []
  const seen = new Set<string>()

  // videoRenderer blocks
  const rendererRegex =
    /"videoRenderer":\{"videoId":"([^"]+)"[\s\S]*?"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"\}/g
  let m
  while ((m = rendererRegex.exec(html)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1])
      out.push({ id: m[1], title: m[2].replace(/\\"/g, '"').replace(/\\u0026/g, '&') })
    }
  }

  // gridVideoRenderer
  const gridRegex =
    /"gridVideoRenderer":\{"videoId":"([^"]+)"[\s\S]*?"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"\}/g
  while ((m = gridRegex.exec(html)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1])
      out.push({ id: m[1], title: m[2].replace(/\\"/g, '"').replace(/\\u0026/g, '&') })
    }
  }

  // compact fallback: videoId near titles
  if (out.length === 0) {
    const ids = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((x) => x[1])
    for (const id of uniq(ids).slice(0, 30)) {
      out.push({ id, title: `Video ${id}` })
    }
  }

  return out
}

const uniq = <T>(arr: T[]) => [...new Set(arr)]

async function main() {
  for (const c of channels) {
    const urls = [
      `https://www.youtube.com/${c.handle}/videos`,
      `https://www.youtube.com/channel/${c.id}/videos`,
      `https://www.youtube.com/${c.handle}`,
    ]
    console.log(`\n=== ${c.name} ===`)
    for (const url of urls) {
      try {
        const r = await axios.get(url, {
          timeout: 25000,
          headers,
          validateStatus: () => true,
        })
        const html = String(r.data)
        const videos = extractVideoIds(html)
        console.log(url, 'status', r.status, 'videos', videos.length)
        if (videos.length) {
          console.log(' first:', videos.slice(0, 3).map((v) => `${v.id} | ${v.title.slice(0, 40)}`))
          fs.writeFileSync(
            `scratch/${c.name.replace(/\s+/g, '_')}_sample.json`,
            JSON.stringify(videos.slice(0, 15), null, 2),
          )
          break
        }
      } catch (e: any) {
        console.log(url, 'ERR', e.message)
      }
    }
  }
}

main()
