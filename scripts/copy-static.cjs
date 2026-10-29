const { copyFileSync, mkdirSync } = require('node:fs')
const path = require('node:path')
const root = path.join(__dirname, '..')
mkdirSync(path.join(root, 'dist'), { recursive: true })
copyFileSync(
  path.join(root, 'src/privacy-policy.html'),
  path.join(root, 'dist/privacy-policy.html'),
)
