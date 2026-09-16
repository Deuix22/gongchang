/**
 * 临时基准：对比不同视觉模型识别同一张送货单的耗时
 * 用法：node scripts/bench-ocr-models.js
 */
import fs from 'fs';
import path from 'path';

const IMG =
  process.env.IMG ||
  '/home/devbox/.cursor/projects/home-devbox-project/assets/c__Users_Administrator_AppData_Roaming_Cursor_User_workspaceStorage_3e3c98953b01fa0f94857d3360a72a0c_images_image-c6b4a6dd-cad8-4d35-8c7f-92c77d22ef9f.png';

const API_KEY =
  process.env.OCR_API_KEY ||
  'sk-ws-H.EEMRHXP.zavI.MEQCIDkVbgzuShtKNzw5s9OuIgeatkPHeKce8ds995QRIjEyAiAIibCGd4dP9EhPiceaa2aU1t-n_vYnGXh_UcWAG-Vssg';

const BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

const MODELS = [
  'qwen-vl-plus',
  'qwen-vl-ocr-latest',
  'qwen2.5-vl-32b-instruct',
  'qwen3.7-plus'
];

const prompt =
  '从送货单图提取JSON: {"header":{"customerName":"","shippingDate":"YYYY-MM-DD"},"items":[{"customerOrderNo":"","salesModel":"","productCode":"","quantityPcs":0,"productionBatchNo":"","deliveryNoteNo":""}]} 只输出JSON';

async function bench (model, dataUrl) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ]
    })
  });
  const text = await res.text();
  const elapsed = Date.now() - t0;
  let snippet = text.slice(0, 240);
  try {
    const j = JSON.parse(text);
    snippet = j?.choices?.[0]?.message?.content?.slice(0, 240) || JSON.stringify(j.error || j).slice(0, 240);
  } catch {}
  return { model, status: res.status, elapsed, snippet };
}

const buf = fs.readFileSync(IMG);
const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
console.log('image bytes', buf.length, path.basename(IMG));

for (const model of MODELS) {
  try {
    const r = await bench(model, dataUrl);
    console.log(JSON.stringify(r));
  } catch (e) {
    console.log(JSON.stringify({ model, error: e.message }));
  }
}
