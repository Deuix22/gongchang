const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../dist/build/mp-weixin')
const subRoots = ['pages/settings', 'pages/query', 'pages/performance', 'pages/warehouse', 'pages/deli']

let mainSize = 0
let subSize = 0

const walk = (dir, isSub) => {
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const rel = full.slice(root.length + 1).replace(/\\/g, '/')
    if (fs.statSync(full).isDirectory()) {
      walk(full, isSub || subRoots.some((s) => rel === s || rel.startsWith(`${s}/`)))
      continue
    }
    const size = fs.statSync(full).size
    if (isSub || subRoots.some((s) => rel === s || rel.startsWith(`${s}/`))) subSize += size
    else mainSize += size
  }
}

walk(root, false)
console.log(`Main package: ${(mainSize / 1024).toFixed(1)} KB`)
console.log(`Sub packages: ${(subSize / 1024).toFixed(1)} KB`)
console.log(`Total: ${((mainSize + subSize) / 1024).toFixed(1)} KB`)
