# 前端当前需求下的后端配合项（文本版）

1. **管理员/组长权限校验**
   - 接口：`GET /api/users`、`GET /api/users/me`
   - 需要：JWT 认证可获取自身信息；leader 角色可拉取绑定了微信的管理员账号（提供 `role`、`wechatOpenId` 等），若原接口权限过严可新增 `GET /api/wechat/bound-admins` 返回精简数据。

2. **微信绑定 / 解绑**
   - 接口：`PUT /api/users/me`
   - 需要：绑定时接收 `wechatCode`（可附 `wechatUserInfo`），后端用 code 换取 `wechatOpenId` 并回传 `wechatOpenId`、`wechatTemplateId`；解绑时接受 `wechatOpenId: null` 清空绑定。所有失败需返回明确错误描述。

3. **微信通知发送**
   - 接口：`POST /api/notifications/wechat`
   - 前端传 `targets[{ userId, wechatOpenId }]` 与 `data`（`teamName / shouldCheckinCount / actualCheckinCount / lateCount / anomalyCount / summary / uploadedAt / details[]`）。
   - 后端需：用 `wechatOpenId` 调订阅消息接口，写入 `sent`/`failed`，并把微信 `errcode/errmsg` 原样回传；依赖 `WECHAT_APPID`、`WECHAT_SECRET`、`WECHAT_TEMPLATE_ID`。

4. **每日报告缺勤数据落库**
   - 接口：`POST /api/attendance/history`
   - 每个缺勤成员都会发送：`leaderId / department / memberId / memberName / field: "daily_report" / oldValue: "缺勤" / newValue`（包含 `leaderName`、`department`、`reportDate`、`submittedAt`）。
   - 后端需按原样保存，允许 `field=daily_report`，并写入 `changedAt`（无则用服务器时间）。

5. **每日报告缺勤数据查询**
   - 接口：`GET /api/attendance/history`
   - 需要返回上述 `daily_report` 记录（含 JSON 字段），按时间倒序，可根据 `department / leaderId / memberName / start / end` 过滤；如有分页限制需同步参数。

6. **模板 ID 兜底**
   - 配置：环境变量 `WECHAT_TEMPLATE_ID` 与 `/api/users/me` 响应
   - 要求：环境与前端 `.env` 保持一致，绑定成功时把实际模板 ID 返回给前端缓存，防止订阅时 ID 不一致。

7. **失败原因透传**
   - 所有接口在失败时需包含可读的 `error` 描述（例：`"47003 模板字段不匹配"`、`"权限不足"`），前端会直接呈现给管理员，方便现场排查。

更多细节可参考 `docs/backend-wechat-bind.md`、`docs/backend-wechat-notification-requirements.md`、`docs/backend-daily-report-coop.md`。***

