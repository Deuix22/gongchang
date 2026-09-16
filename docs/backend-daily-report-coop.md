# 每日报告功能后端配合清单

> 适用范围：出勤统计页“每日报告”按钮（组长专用）  
> 更新时间：2025-11-19

## 1. 现有接口复用情况

| 功能 | 接口 | 说明 |
| --- | --- | --- |
| 管理员列表 | `GET /api/users` | 需返回全部用户，字段包含 `role`（admin/manager/管理员 等）与 `wechatOpenId`（或 `openId`）。前端调用 `getWechatBoundAdmins()` 时，会过滤具有管理员角色且已绑定微信的用户。 |
| 订阅消息发送 | `POST /api/notifications/wechat` | 已用于异常提醒，此处复用同一接口。新的“每日报告”也会传 `targets` 数组（管理员列表）与 `data` 对象（统计字段）。 |

若上述接口尚未实现，请参照 `docs/backend-wechat-notification-requirements.md` 与 `docs/backend-latest-coop.md` 完成。

## 2. 数据字段要求

前端会将以下字段传给 `POST /api/notifications/wechat`：

```json
{
  "targets": [
    { "userId": "admin_567nex", "wechatOpenId": "okPNR19..." }
  ],
  "data": {
    "teamName": "张三（组长名字）",
    "shouldCheckinCount": 21,
    "actualCheckinCount": 19,
    "lateCount": 2,
    "anomalyCount": 2,          // 缺勤人数
    "summary": "缺勤 2 人：李四、王五",
    "uploadedAt": "2025-11-19 14:33",
    "details": [
      { "name": "李四", "reason": "今日未登记出勤", "startTime": "" }
    ]
  }
}
```

后端需保证：

1. `teamName` 用于模板里的“团队/项目名称”，直接显示组长姓名或其别名。
2. `summary` 与 `details` 可能包含中文逗号与顿号，若模板字段长度不足，请在调用微信接口前自行截断并注明省略（防止 `errcode 47003`）。
3. `details` 最多 20 条，如超出请只取前 20 条（前端已裁剪）。

## 3. 微信模板与配置

- `.env` 必配：`WECHAT_APPID`、`WECHAT_SECRET`、`WECHAT_TEMPLATE_ID`。模板与异常通知共用，字段映射建议与 `docs/backend-latest-coop.md` 一致。
- 发送请求依旧是 `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=...`，并把微信原始 `errcode/errmsg` 写入响应 `failed[].error`，例如：`47003: invalid template data`.

## 4. 逻辑流程建议

1. 接收前端请求后，依次遍历 `targets`。
2. 若缺少 `wechatOpenId`，直接在 `failed` 中返回 `缺少wechatOpenId`。
3. 组装模板数据：  
   - `thing1` → `teamName`  
   - `number2` → `shouldCheckinCount`（或 `actualCheckinCount` / `anomalyCount`，按模板配置）  
   - `thing3` → `summary`  
   - `time4` → `uploadedAt`
4. 可将 `details` 追加到模板备注字段或通知页内联日志（可选）。
5. 全部调用完成后返回 `{ success: true, sent, failed }`。

## 5. 排查 & 回执

- 确保日志记录包含：请求 payload、微信响应、失败用户列表。
- 当前端收到 `failed` 信息时会直接弹窗提示管理员，因此 `failed[].error` 需要直观明了（例：`admin_567nex: 47003 模板字段不匹配`）。
- 若后台限制日调用次数，可在响应中加入自定义字段（如 `rateLimited: true`），用于提示前端稍后再试。

## 6. 交付验证

1. 管理后台准备至少一名绑定微信的管理员账号（含有效 `wechatOpenId`）。
2. 组长在小程序点击“每日报告”后，管理员应收到如下格式的订阅消息：  
   - 标题：考勤统计通知  
   - 团队名称：组长姓名  
   - 应打卡人数 / 实打卡人数 / 迟到人数 / 日期等字段正确显示  
3. 若管理员未收到消息，请提供完整日志（含请求数据、微信响应）。这部分可以直接参考 `docs/backend-wechat-notification-troubleshoot.md`。

