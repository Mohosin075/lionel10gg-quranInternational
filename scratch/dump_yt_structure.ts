import axios from 'axios'
import * as fs from 'fs'

;(async () => {
  const r = await axios.get('https://www.youtube.com/@alimhamza1/videos', {
    timeout: 25000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })
  const html = String(r.data)
  const idx = html.indexOf('"videoId":"')
  console.log('first videoId idx', idx)
  console.log('has ytInitialData', html.includes('ytInitialData'))
  console.log('has videoRenderer', html.includes('videoRenderer'))
  console.log('has richItemRenderer', html.includes('richItemRenderer'))
  console.log('has metadataSnippet', html.includes('metadataSnippet'))
  fs.writeFileSync('scratch/alim_snippet.txt', html.slice(Math.max(0, idx - 200), idx + 2500))

  // Try extract title from ytInitialData JSON path
  const marker = 'var ytInitialData = '
  const start = html.indexOf(marker)
  if (start >= 0) {
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
    if (end > 0) {
      const data = JSON.parse(html.slice(jsonStart, end))
      const vids: any[] = []
      const walk = (node: any) => {
        if (!node || typeof node !== 'object') return
        if (node.videoRenderer?.videoId) {
          const vr = node.videoRenderer
          vids.push({
            id: vr.videoId,
            title: vr.title?.runs?.[0]?.text || vr.title?.simpleText || '',
          })
        }
        if (node.gridVideoRenderer?.videoId) {
          const vr = node.gridVideoRenderer
          vids.push({
            id: vr.videoId,
            title: vr.title?.runs?.[0]?.text || vr.title?.simpleText || '',
          })
        }
        if (Array.isArray(node)) node.forEach(walk)
        else Object.values(node).forEach(walk)
      }
      walk(data)
      const uniq: any[] = []
      const seen = new Set<string>()
      for (const v of vids) {
        if (!seen.has(v.id)) {
          seen.add(v.id)
          uniq.push(v)
        }
      }
      console.log('parsed videos', uniq.length)
      console.log(uniq.slice(0, 5))
    }
  }
})()
