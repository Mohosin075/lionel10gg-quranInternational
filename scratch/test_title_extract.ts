import axios from 'axios'

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
}

function decodeJsonString(s: string): string {
  try {
    return JSON.parse(`"${s}"`)
  } catch {
    return s
      .replace(/\\"/g, '"')
      .replace(/\\u0026/g, '&')
      .replace(/\\n/g, ' ')
  }
}

function extractFromHtml(html: string): { id: string; title: string }[] {
  const out: { id: string; title: string }[] = []
  const seen = new Set<string>()

  // Prefer rich title blocks that appear after videoId
  const patterns = [
    /"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,800}?"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"\}/g,
    /"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,800}?"title":\{"accessibility":\{"accessibilityData":\{"label":"((?:\\.|[^"\\])*)"\}/g,
    /"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,400}?"text":"((?:\\.|[^"\\])*)"/g,
  ]

  for (const re of patterns) {
    let m
    while ((m = re.exec(html)) !== null) {
      if (seen.has(m[1])) continue
      const title = decodeJsonString(m[2]).trim()
      if (!title || title.length < 3) continue
      // skip UI chrome
      if (/^(Home|Shorts|Subscriptions|Library|Videos|About|Play all)$/i.test(title)) continue
      seen.add(m[1])
      out.push({ id: m[1], title: title.replace(/\s+\d+(\.\d+)?[KMB]? views.*$/i, '').trim() })
      if (out.length >= 30) return out
    }
    if (out.length >= 10) return out
  }

  return out
}

;(async () => {
  const url = 'https://www.youtube.com/@alimhamza1/videos'
  const r = await axios.get(url, { headers, timeout: 25000 })
  const videos = extractFromHtml(String(r.data))
  console.log('count', videos.length)
  console.log(videos.slice(0, 5))
})()
