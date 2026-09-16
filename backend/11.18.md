# 最新功能联调清单（后端协作）

> 更新时间：2025-11-18  
> 范围：异常检测 → 微信订阅消息通知 → 管理员绑定微信

## 1. 接口与字段

| 主题 | 说明 |
| --- | --- |
| 绑定接口 | `PUT /api/users/me`，前端上传 `wechatCode`（`uni.login` 获取）和 `wechatUserInfo`（可空）。返回体须包含 `wechatOpenId` 以确认绑定状态。 |
| 管理员列表 | `GET /api/users` 返回所有用户，字段需包含 `role`（`admin`/`manager`/`管理员`）和 `wechatOpenId`，前端会过滤绑定用户用于通知。 |
| 发送通知 | `POST /api/notifications/wechat`，字段示例：<br>`targets`: `[{"userId":"admin_567nex","wechatOpenId":"okPNR19..."}]`<br>`data`: `{teamName, shouldCheckinCount, actualCheckinCount, lateCount, anomalyCount, summary, uploadedAt, details}`。`details` 最多 20 条。 |
| 响应体 | `{ success: true/false, sent: number, failed: [{userId, wechatOpenId, error}] }`。当调用微信接口出现 `errcode` 时，把错误信息写入 `failed[].error`，前端会直接弹窗提示管理员。 |

## 2. 微信订阅消息配置

1. `.env` 必备：
   ```env
   WECHAT_APPID=<小程序AppID>
   WECHAT_SECRET=<小程序AppSecret>
   WECHAT_TEMPLATE_ID=5s9PrgECb5TwoylWDaXv_ErXF5egPEJqAEsczgawtBY
   ```
   修改后需重启服务。
2. 模板字段建议：
   - `thing1`: `异常数据检测 - ${teamName}`（最长 20 个汉字）
   - `number2`: `anomalyCount`（或 `shouldCheckinCount`）
   - `thing3`: `summary`
   - `time4`: `uploadedAt`
3. 微信接口：`POST https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=<token>`。若微信返回 `errcode != 0`，请记录 `errcode/errmsg` 并放入 `failed`。

## 3. Server 端逻辑建议

```pseudo
if (!WECHAT_TEMPLATE_ID) return {sent:0, failed:[... '未配置模板ID']}
token = getWechatAccessToken()
for target in targets:
  if !target.wechatOpenId -> failed: '缺少wechatOpenId'
  payload = {
    touser: target.wechatOpenId,
    template_id: WECHAT_TEMPLATE_ID,
    page: 'pages/settings/index',
    data: {...按模板字段填充...}
  }
  resp = call wechat
  if resp.errcode === 0 -> sent++
  else failed.push({ userId, error: `${errcode}: ${errmsg}` })
return { success: true, sent, failed }
```

- `getWechatAccessToken` 建议缓存 7200s，提前 5 分钟刷新。
- `data.summary`/`details` 如超过字段长度，请在后端截断，避免 47003。

## 4. 前端协同说明

- **按钮触发流程**：在“检测异常”按钮点击后立即调用 `wx.requestSubscribeMessage`（模板 ID 使用前端 `.env` 兜底值），确保订阅在用户 TAP 手势内。
- **数据字段**：前端已将 `teamName / shouldCheckinCount / actualCheckinCount / lateCount / uploadedAt / details` 传入 `data`。请优先使用这些字段填充模板，缺失时再降级为默认值或摘要。
- **失败提示**：前端会把 `failed[].error` 弹窗给管理员。例如：`admin_567nex: 微信API错误: 参数错误 (47003)`。请保持错误信息清晰，便于现场指导用户重新订阅或排查模板。

## 5. 排查指引（常见 errcode）

| errcode | 说明 | 排查 |
| --- | --- | --- |
| `47003` | 模板参数错误 | 检查字段名/类型/长度、模板 ID 是否正确。 |
| `43101` | 用户未订阅 | 提醒管理员在前端重新订阅；前端会提示。 |
| `40037` | 模板 ID 无效 | 确认 `WECHAT_TEMPLATE_ID` 与公众号后台一致。 |
| `40001`/`42001` | access_token 无效或过期 | 重新获取 token，检查缓存逻辑。 |
| `43104` | 用户未关注 | 需确保用户使用最新版小程序并允许通知。 |

## 6. 交付要求

1. 确认后端已部署上述接口及模板配置，并提供测试账号。
2. 返回的 `failed` 对象需包含 `error` 详情，便于前端实时提示。
3. 若仍有疑问，请参考 `docs/backend-wechat-notification-troubleshoot.md` 的详细排查步骤或反馈完整微信响应日志。

