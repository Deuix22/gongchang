/**

 * 导入产能基础数据（机型 + 制程段参数）

 * 数据源：src/data/capacity-meta-default.json

 * 用法: node scripts/import-capacity-meta.mjs

 */



import { readFileSync } from 'node:fs'

import { fileURLToPath } from 'node:url'

import { dirname, join } from 'node:path'



const __dirname = dirname(fileURLToPath(import.meta.url))

const CONFIG_PATH = join(__dirname, '../src/data/capacity-meta-default.json')



const API_BASE = 'https://hvoqpnuvbtfp.sealosbja.site/api'

const ADMIN_USER = 'admin'

const ADMIN_PASS = '030426'



const seed = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))

const lines = Array.isArray(seed.lines) && seed.lines.length > 0
  ? seed.lines
  : Array.from({ length: 21 }, (_, i) => `DIP${i + 1}线`)

const PROCESSES = Array.isArray(seed.processes) && seed.processes.length > 0
  ? seed.processes
  : ['插件段', '包装段', '组装', '预加工', '成型']

const modelConfigs = seed.modelConfigs && typeof seed.modelConfigs === 'object' ? seed.modelConfigs : {}

const models = Array.isArray(seed.models) && seed.models.length > 0
  ? seed.models
  : Object.keys(modelConfigs)



async function request(path, { method = 'GET', token, body } = {}) {

  const res = await fetch(`${API_BASE}${path}`, {

    method,

    headers: {

      'Content-Type': 'application/json',

      ...(token ? { Authorization: `Bearer ${token}` } : {})

    },

    body: body != null ? JSON.stringify(body) : undefined

  })

  const text = await res.text()

  let data

  try {

    data = text ? JSON.parse(text) : null

  } catch {

    data = text

  }

  if (!res.ok) {

    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`)

  }

  return data

}



async function main() {

  console.log(`读取本地配置: ${CONFIG_PATH}`)

  console.log(`线体 ${lines.length} 条，制程段 ${PROCESSES.length} 个，机型 ${models.length} 个`)



  console.log('登录 admin...')

  const login = await request('/auth/login-admin', {

    method: 'POST',

    body: { username: ADMIN_USER, password: ADMIN_PASS }

  })

  const token = login.token

  if (!token) throw new Error('登录失败，未返回 token')



  const payload = {

    lines,

    processes: PROCESSES,

    models,

    modelConfigs

  }



  console.log(`写入 ${lines.length} 条线体、${PROCESSES.length} 个制程段、${models.length} 个机型...`)

  const saved = await request('/performance/capacity/meta', {

    method: 'PUT',

    token,

    body: payload

  })



  console.log('保存成功')

  console.log(JSON.stringify({

    lines: saved.lines?.length ?? lines.length,

    processes: saved.processes ?? PROCESSES,

    models: saved.models?.length ?? models.length,

    modelConfigModels: Object.keys(saved.modelConfigs || modelConfigs).length

  }, null, 2))

}



main().catch((err) => {

  console.error(err.message || err)

  process.exit(1)

})


