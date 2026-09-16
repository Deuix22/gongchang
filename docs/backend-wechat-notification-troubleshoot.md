# 微信订阅通知-后端排查指引

> 更新时间：2025-11-18  
> 需求来源：前端检测异常数据时，发送通知接口返回 `success: true, sent: 0, failed: [...]`，管理员未收到消息。

## 1. 当前前端行为概览

- 接口：`POST /api/notifications/wechat`
- Headers：`Authorization: Bearer <JWT>`，`Content-Type: application/json`
- 请求体示例：
  ```json
  {
    "targets": [
      {
        "userId": "admin_567nex",
        "wechatOpenId": "okPNR197J1N55X1dOWL8BXfHf7Ig"
      }
    ],
    "data": {
      "teamName": "装配一组",
      "shouldCheckinCount": 12,
      "actualCheckinCount": 11,
      "lateCount": 2,
      "anomalyCount": 7,
      "summary": "出勤时长差异超过1小时: 5条；上班时间晚于8:00: 2条",
      "uploadedAt": "2025-11-18 18:14",
      "details": [
        { "name": "h", "reason": "出勤时长差异超过1小时", "startTime": "2025-11-18T00:00:00.000Z" },
        { "name": "k", "reason": "出勤时长差异超过1小时", "startTime": "2025-11-18T00:00:00.000Z" },
        { "name": "b", "reason": "上班时间晚于8:00", "startTime": "2025-11-18T01:00:00.000Z" },
        { "name": "b", "reason": "出勤时长差异超过1小时", "startTime": "2025-11-18T01:00:00.000Z" },
        { "name": "f", "reason": "上班时间晚于8:00", "startTime": "2025-11-18T01:30:00.000Z" }
      ]
    }
  }
  ```
- 返回示例：
  ```json
  {
    "success": true,
    "sent": 0,
    "failed": [
      {
        "userId": "admin_567nex",
        "wechatOpenId": "okPNR197J1N55X1dOWL8BXfHf7Ig",
        "error": "<后端返回的错误信息>"
      }
    ]
  }
  ```

> 说明：前端已经确认管理员完成了绑定流程、也在按钮点击时完成了订阅授权。问题集中在后端调用微信订阅消息接口阶段。前端同时尽量提供 `teamName / shouldCheckinCount / actualCheckinCount / lateCount / uploadedAt / details`，便于模板填充；若缺失，后端仍需兜底逻辑。

## 2. 后端需要确认的配置

1. `.env` 中必须同时存在：
   - `WECHAT_APPID=<小程序AppID>`
   - `WECHAT_SECRET=<小程序AppSecret>`
   - `WECHAT_TEMPLATE_ID=5s9PrgECb5TwoylWDaXv_ErXF5egPEJqAEsczgawtBY`
2. 修改 `.env` 后需重启后端服务。
3. `routes/notifications.js`（或等效逻辑）在读取模板 ID 时请使用 `process.env.WECHAT_TEMPLATE_ID`，不要硬编码其他值。

## 3. 模板字段要求

根据前端提供的数据结构，推荐模板字段如下（需与公众号后台配置一致）：

| 模板字段 | 类型   | 建议填值                                     |
|----------|--------|----------------------------------------------|
| `thing1` | thing  | 固定填“异常数据检测”或 `data.teamName` 的组合 |
| `number2`| number | `data.anomalyCount` 或 `data.shouldCheckinCount` |
| `thing3` | thing  | `data.summary`（异常摘要）                     |
| `time4`  | time   | `data.uploadedAt`                             |

如果后端使用其他字段名，请同步告知前端或在后端自行映射。

## 4. 建议的发送流程（示例伪代码）

```js
router.post('/notifications/wechat', authenticate, requireAdmin, async (req, res) => {
  const { targets, data } = req.body
  if (!process.env.WECHAT_TEMPLATE_ID) {
    return res.json({ success: true, sent: 0, failed: targets.map(t => ({ ...t, error: '未配置WECHAT_TEMPLATE_ID' })) })
  }

  const accessToken = await getWechatAccessToken()

  const result = { success: true, sent: 0, failed: [] }
  for (const target of targets) {
    if (!target.wechatOpenId) {
      result.failed.push({ ...target, error: '缺少wechatOpenId' })
      continue
    }

    const payload = {
      touser: target.wechatOpenId,
      template_id: process.env.WECHAT_TEMPLATE_ID,
      page: 'pages/settings/index',
      data: {
        thing1: { value: `${data.teamName || '异常数据检测'}`.slice(0, 20) },
        number2: { value: String(data.anomalyCount ?? data.shouldCheckinCount ?? 0) },
        thing3: { value: (data.summary || '').slice(0, 20) }, // 注意字段长度
        time4:  { value: data.uploadedAt }
      }
    }

    const wechatResp = await axios.post(
      'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
      payload,
      { params: { access_token: accessToken } }
    )

    if (wechatResp.data.errcode === 0) {
      result.sent += 1
    } else {
      result.failed.push({
        ...target,
        error: `${wechatResp.data.errcode}: ${wechatResp.data.errmsg}`
      })
    }
  }

  res.json(result)
})
```

## 5. 必做排查项

1. **查看 `failed` 内的 `error` 字段**  
   - 如果是 `未配置微信模板ID`：确认第 2 节的环境变量。
   - 如果是 `43101`：说明用户没有完成订阅，需要用户重新授权（前端会提示）。
   - 如果是 `40037`：模板 ID 有误。
   - 如果是 `47003` 等：检查模板字段是否与微信规则一致。

2. **确认 access_token 逻辑**  
   - 是否缓存并按时刷新？  
   - 微信接口返回 `40001`/`42001` 时需要重新获取。

3. **检查模板字段长度限制**  
   - `thing` 字段最多 20 个汉字，超出需截断或更换字段类型。

4. **后台日志记录**  
   - 建议在 `failed.push` 时把 `errcode` / `errmsg` 记录到日志，便于定位问题。

## 6. 交付物

- 本文档链接给后端同学，作为排查指南。
- 若后端确认所有配置无误但仍失败，请提供：
  - 完整的微信接口响应（errcode/errmsg）
  - 发送时使用的 payload
  - 当前小程序 AppID

以便进一步定位问题。

## 7. 前端协同要点

- **订阅有效性**：按钮点击后前端立即调用 `wx.requestSubscribeMessage`，模板 ID 兜底值为 `5s9PrgECb5TwoylWDaXv_ErXF5egPEJqAEsczgawtBY`。若用户拒绝，后续发送会被微信返回 `43101`，该错误会直接通过 `failed[].error` 告知管理员。
- **业务字段**：前端在检测异常后，会附带 `teamName / shouldCheckinCount / actualCheckinCount / lateCount / uploadedAt / details`。后端请优先使用这些字段填充模板；如缺失再使用 summary 或默认值。
- **失败提示**：若响应 `failed` 非空，前端会把 `error/errcode` 弹窗展示给管理员，方便现场提醒重新订阅或检查模板。

