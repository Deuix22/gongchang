/**
 * 构建后移除误打入主包 vendor.js 的 xlsx 引用，降低主包体积。
 */
const fs = require('fs')
const path = require('path')

const vendorPath = path.join(__dirname, '../dist/build/mp-weixin/common/vendor.js')

if (!fs.existsSync(vendorPath)) {
  console.warn('[fix-mp-weixin-vendor] vendor.js 不存在，跳过')
  process.exit(0)
}

let content = fs.readFileSync(vendorPath, 'utf8')
const before = content.length

content = content.replace(
  /^"use strict";const e=require\("\.\.\/pages\/settings\/libs\/xlsx\.full\.min\.js"\);\r?\n?/,
  '"use strict";'
)
content = content.replace(
  /^"use strict";const e=require\("\.\.\/utils\/libs\/xlsx\.full\.min\.js"\);\r?\n?/,
  '"use strict";'
)

if (content.length !== before) {
  fs.writeFileSync(vendorPath, content)
  console.log('[fix-mp-weixin-vendor] 已从 vendor.js 移除 xlsx 主包引用')
} else {
  console.log('[fix-mp-weixin-vendor] vendor.js 无需修复')
}
