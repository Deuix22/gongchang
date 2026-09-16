## 后端接口规格说明

这是一个基于nodejs的后端项目，我的数据库的连接方式是：mongodb://root:6n2825zx@test-db-mongodb.ns-o9xuidp4.svc:27017

> 说明：以下接口以 `https://api.example.com` 作为示例域名，实际部署时请替换为真实地址。所有需要登录的接口均需在请求头中携带 `Authorization: Bearer <token>`。

### 1. 鉴权

#### 1.1 平台管理员账号密码登录
- **URL**：`POST /api/auth/login-admin`
- **说明**
  - 仅允许平台管理员通过账号密码登录。
  - 固定账号：`admin`，固定密码：`030426`（后端应加密存储，对比时使用哈希）。
  - 登录成功后返回 `admin` 角色 Token。
- **请求体**
```json
{
  "username": "admin",
  "password": "030426"
}
```
- **响应**
```json
{
  "token": "jwt-token-string",
  "user": {
    "userId": "admin",
    "nickName": "超级管理员",
    "role": "admin"
  }
}
```

#### 1.2 微信认证登录（组长/管理员）
- **URL**：`POST /api/auth/login-wechat`
- **说明**
  - 除平台管理员外，其余用户统一使用微信认证登录。
  - 首次登录的微信用户若无角色，后端需自动创建用户并赋予 `leader` 角色。
  - 微信登录完成后返回对应角色信息（可能是 `leader` 或被提升为 `manager`）。
- **请求体**
```json
{
  "code": "wx-login-code",
  "userInfo": {
    "nickName": "张三",
    "avatarUrl": "https://..."
  }
}
```
- **响应**
```json
{
  "token": "jwt-token-string",
  "user": {
    "userId": "leader_001",
    "nickName": "张三",
    "role": "leader",
    "department": "SMT",
    "wechatOpenId": "wx_openid_001"
  }
}
```

#### 1.3 刷新 Token（可选）
- **URL**：`POST /api/auth/refresh`
- **说明**：当 Token 将过期时刷新。
- **请求体**
```json
{
  "refreshToken": "string"
}
```
- **响应**
```json
{
  "token": "new-jwt-token-string",
  "refreshToken": "new-refresh-token"
}
```

#### 1.4 登出
- **URL**：`POST /api/auth/logout`
- **说明**：前端调用后端销毁刷新令牌。
- **请求头**：`Authorization`
- **响应**
```json
{
  "success": true
}
```

---

### 2. 用户与部门

#### 2.1 查询当前用户信息
- **URL**：`GET /api/users/me`
- **说明**：返回登录用户信息（用于前端本地缓存）。
- **响应**
```json
{
  "userId": "leader_001",
  "nickName": "张三",
  "role": "leader",
  "department": "SMT",
  "wechatOpenId": "xxx"
}
```

#### 2.2 绑定/修改组长所属部门
- **URL**：`PUT /api/leaders/{leaderId}/department`
- **权限**：`leader`
- **请求体**
```json
{
  "department": "SMT"
}
```
- **响应**
```json
{
  "leaderId": "leader_001",
  "department": "SMT"
}
```

#### 2.3 取消绑定部门
- **URL**：`DELETE /api/leaders/{leaderId}/department`
- **权限**：`leader`
- **响应**
```json
{
  "success": true
}
```

#### 2.4 获取全部组长与部门映射
- **URL**：`GET /api/leaders`
- **权限**：`admin`, `manager`
- **查询参数**
  - `includeMembers`（可选，`true/false`）
- **响应**
```json
[
  {
    "leaderId": "leader_001",
    "nickName": "张三",
    "department": "SMT",
    "groupIndex": 1,
    "members": [
      {
        "memberId": "member_001",
        "name": "白班组员1",
        "shiftType": "day"
      }
    ]
  }
]
```
- **说明**：后端需根据同一部门的组长数量自动计算 `groupIndex`（1组/2组…）。

---

### 3. 组员管理

#### 3.1 获取组员列表
- **URL**：`GET /api/leaders/{leaderId}/members`
- **权限**：`leader`
- **响应**
```json
[
  {
    "memberId": "member_001",
    "name": "白班组员1",
    "shiftType": "day",
    "createdAt": "2024-01-01T08:00:00Z"
  }
]
```

#### 3.2 新增组员
- **URL**：`POST /api/leaders/{leaderId}/members`
- **权限**：`leader`
- **请求体**
```json
{
  "name": "白班组员1",
  "shiftType": "day"
}
```
- **响应**
```json
{
  "memberId": "member_001",
  "leaderId": "leader_001",
  "name": "白班组员1",
  "shiftType": "day",
  "createdAt": "2024-01-01T08:00:00Z"
}
```

#### 3.3 修改组员信息
- **URL**：`PUT /api/leaders/{leaderId}/members/{memberId}`
- **权限**：`leader`
- **请求体**
```json
{
  "name": "白班组员1",
  "shiftType": "night"
}
```
- **响应**
```json
{
  "memberId": "member_001",
  "name": "白班组员1",
  "shiftType": "night",
  "updatedAt": "2024-01-02T08:00:00Z"
}
```

#### 3.4 删除组员
- **URL**：`DELETE /api/leaders/{leaderId}/members/{memberId}`
- **权限**：`leader`
- **响应**
```json
{
  "success": true
}
```

---

### 4. 出勤统计（组长端）

#### 4.1 获取组长当前出勤记录
- **URL**：`GET /api/leaders/{leaderId}/attendance`
- **权限**：`leader`
- **响应**
```json
{
  "records": [
    {
      "recordId": "att_001",
      "memberId": "member_001",
      "name": "白班组员1",
      "department": "SMT",
      "shiftType": "day",
      "startTime": "2024-01-01 08:00",
      "endTime": "2024-01-01 17:00",
      "duration": 540,   // 单位：分钟
      "lastUpdatedBy": "leader_001",
      "updatedAt": "2024-01-01T17:00:00Z"
    }
  ]
}
```

#### 4.2 提交/更新出勤记录
- **URL**：`POST /api/leaders/{leaderId}/attendance`
- **权限**：`leader`
- **说明**：一次性提交整组数据，后端需以成员为唯一键覆盖旧数据。
- **请求体**
```json
{
  "records": [
    {
      "memberId": "member_001",
      "startTime": "2024-01-01 08:00",
      "endTime": "2024-01-01 17:00",
      "duration": 540,
      "shiftType": "day"
    }
  ],
  "submittedAt": "2024-01-01T17:10:00Z"
}
```
- **响应**
```json
{
  "success": true,
  "updatedCount": 3
}
```

#### 4.3 删除单条出勤记录
- **URL**：`DELETE /api/leaders/{leaderId}/attendance/{recordId}`
- **权限**：`leader`
- **响应**
```json
{
  "success": true
}
```

---

### 5. 出勤历史记录

#### 5.1 新增历史记录
- **URL**：`POST /api/attendance/history`
- **权限**：`leader`
- **说明**：每次修改（旧值存在时）由前端调用新增一条历史记录。
- **请求体**
```json
{
  "leaderId": "leader_001",
  "department": "SMT",
  "memberId": "member_001",
  "memberName": "白班组员1",
  "field": "startTime",
  "oldValue": "07:00",
  "newValue": "08:00",
  "changedBy": "leader_001",
  "changedAt": "2024-01-02T01:00:00Z"
}
```
- **响应**
```json
{
  "historyId": "hist_001",
  "saved": true
}
```

#### 5.2 查询历史记录
- **URL**：`GET /api/attendance/history`
- **权限**：`admin`
- **查询参数**
  - `department`（可选）
  - `leaderId`（可选）
  - `memberName`（可选）
  - `start` / `end`（可选，ISO 时间字符串）
- **响应**
```json
[
  {
    "historyId": "hist_001",
    "department": "SMT",
    "groupName": "SMT-1组",
    "memberName": "白班组员1",
    "field": "startTime",
    "oldValue": "07:00",
    "newValue": "08:00",
    "changedBy": "leader_001",
    "changedByName": "张三",
    "changedAt": "2024-01-02T01:00:00Z"
  }
]
```

---

### 6. 设置页（管理员端）

#### 6.1 获取分组与出勤概览
- **URL**：`GET /api/admin/attendance/groups`
- **权限**：`admin`
- **响应**
```json
[
  {
    "department": "SMT",
    "groupName": "SMT-1组",
    "leaderId": "leader_001",
    "leaderName": "张三",
    "members": [
      {
        "memberId": "member_001",
        "name": "白班组员1",
        "shiftType": "day",
        "latestRecord": {
          "recordId": "att_001",
          "startTime": "2024-01-01 08:00",
          "endTime": "2024-01-01 17:00",
          "duration": 540,
          "updatedAt": "2024-01-01T17:00:00Z"
        }
      }
    ]
  }
]
```

#### 6.2 导出某组数据
- **URL**：`POST /api/admin/attendance/export`
- **权限**：`admin`
- **说明**：生成 Excel 文件，返回导出任务 ID。
- **请求体**
```json
{
  "department": "SMT",
  "groupName": "SMT-1组",
  "leaderId": "leader_001",
  "startDate": "2024-01-01",
  "endDate": "2024-01-07",
  "includeHistory": false
}
```
- **响应**
```json
{
  "taskId": "export_task_001",
  "status": "processing"
}
```

#### 6.3 导出全部数据
- **URL**：`POST /api/admin/attendance/export/all`
- **权限**：`admin`
- **请求体**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-07"
}
```
- **响应**
```json
{
  "taskId": "export_task_002",
  "status": "processing"
}
```

#### 6.4 查询导出进度
- **URL**：`GET /api/admin/attendance/export/{taskId}`
- **权限**：`admin`
- **响应**
```json
{
  "taskId": "export_task_001",
  "status": "finished",
  "progress": 100,
  "downloadUrl": "https://api.example.com/files/export_task_001.xlsx",
  "expiredAt": "2024-01-02T00:00:00Z"
}
```

---

### 7. 打卡数据上传与异常检测

#### 7.1 上传打卡机数据
- **URL**：`POST /api/admin/attendance/upload`
- **权限**：`admin`
- **请求**：`multipart/form-data`
  - `file`：Excel 文件（列名包含“姓名”“出勤时间”等）
  - `startDate` / `endDate`（可选，用于过滤）
- **响应**
```json
{
  "uploadId": "upload_001",
  "parsedRows": 25,
  "anomalies": [
    {
      "memberId": "member_002",
      "name": "白班组员2",
      "reason": "上班时间晚于8:00",
      "manualStartTime": "2024-01-01 09:00",
      "manualDuration": 540,
      "uploadedDuration": 480
    }
  ],
  "anomalyReportUrl": "https://api.example.com/files/upload_001_anomalies.xlsx"
}
```
- **后台逻辑**
  - 自动比对手工录入数据
  - 检查：
    - 白班：上班时间 ≥ 08:00 视为异常
    - 白/夜班：手工时长与上传时长差值 ≥ 60 分钟视为异常
  - 生成异常报告 Excel（供下载）

#### 7.2 下载上传异常报告
- **URL**：`GET /api/admin/attendance/upload/{uploadId}/report`
- **权限**：`admin`
- **响应**：`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

### 8. 通知

#### 8.1 发送微信通知（异常提醒）
- **URL**：`POST /api/notifications/wechat`
- **权限**：`admin`（后台在检测到异常后调用）
- **请求体**
```json
{
  "targets": [
    {
      "userId": "admin_001",
      "wechatOpenId": "wx_openid_001"
    }
  ],
  "templateId": "wechat-template-id",
  "data": {
    "department": "SMT",
    "groupName": "SMT-1组",
    "memberName": "白班组员2",
    "issue": "上班时间晚于8:00",
    "uploadedAt": "2024-01-01 10:00"
  }
}
```
- **响应**
```json
{
  "success": true,
  "sent": 2,
  "failed": []
}
```

---

### 9. 通用数据结构

#### 9.1 班次类型
- `day`：白班（需要检查上班 ≥ 08:00）
- `night`：夜班（不检查上班 ≥ 08:00）

#### 9.2 出勤时长单位
- 统一使用分钟（`duration: number`），前端表现为“X小时Y分钟”。

#### 9.3 错误响应格式
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "参数不合法",
    "details": {}
  }
}
```

---

### 10. 角色与权限摘要

系统包含三种角色：组长(`leader`)、管理员(`manager`)、平台管理员(`admin`)。

#### 10.1 角色说明

- **组长 leader**：默认角色，负责录入所在小组的出勤数据、维护组员、绑定部门。
- **管理员 manager**：由 `admin` 提升产生，负责全局设置、导出上传、查看所有历史记录和异常信息。
- **平台管理员 admin**：最高权限，除拥有管理员全部能力外，还可管理用户身份（将组长升级/降级为管理员）、初始化系统配置。

#### 10.2 权限矩阵

| 功能模块 | 组长 leader | 管理员 manager | 平台管理员 admin |
| --- | --- | --- | --- |
| 登录/鉴权 | ✅ | ✅ | ✅ |
| 查询自身信息 | ✅ | ✅ | ✅ |
| 管理自身部门 | ✅ | 只读 | ✅ |
| 管理组员 | ✅ | 只读 | ✅ |
| 提交出勤 | ✅ | 只读 | ✅ |
| 查看全部出勤/分组 | ❌ | ✅ | ✅ |
| 导出/上传 | ❌ | ✅ | ✅ |
| 历史记录（全量） | 仅自身 | ✅ | ✅ |
| 发送通知 | ❌ | ✅ | ✅ |
| 用户角色管理 | ❌ | ❌ | ✅ |

#### 10.3 用户角色管理接口（新增）

##### 10.3.1 获取所有用户
- **URL**：`GET /api/users`
- **权限**：`admin`
- **响应**
```json
[
  {
    "userId": "leader_001",
    "nickName": "张三",
    "role": "leader",
    "department": "SMT",
    "wechatOpenId": "wx_001",
    "createdAt": "2024-01-01T08:00:00Z",
    "lastLoginAt": "2024-01-05T09:00:00Z"
  }
]
```

##### 10.3.2 提升组长为管理员
- **URL**：`POST /api/users/{userId}/promote`
- **权限**：`admin`
- **说明**：将指定组长晋升为管理员。
- **响应**
```json
{
  "userId": "leader_001",
  "oldRole": "leader",
  "newRole": "manager",
  "updatedAt": "2024-01-05T10:00:00Z"
}
```

##### 10.3.3 撤销管理员为组长
- **URL**：`POST /api/users/{userId}/demote`
- **权限**：`admin`
- **说明**：将指定管理员降级为组长。
- **响应**
```json
{
  "userId": "leader_001",
  "oldRole": "manager",
  "newRole": "leader",
  "updatedAt": "2024-01-05T10:30:00Z"
}
```

##### 10.3.4 新用户默认角色
- 所有新创建/首次登录的用户默认赋予 `leader` 角色。后台需要在 `/api/auth/login` 或用户创建逻辑中确保无角色用户自动设为 `leader`。

---

### 11. 额外说明
1. **任务/进度管理**：导出和上传如涉及异步处理，可通过消息队列或后台任务实现，前端通过 taskId 轮询进度。
2. **时间格式**：推荐使用 ISO 8601（UTC）格式，前端可根据时区转换。
3. **数据校验**：后端需确保同一成员在同一日仅保留最新一次提交。
4. **异常记录**：可在后台保存一份异常日志，便于历史查询与追踪。
5. **测试环境支持**：可提供 `/api/test/bootstrap` 等接口帮助前端快速生成测试数据（仅在开发环境开放）。

---

如需进一步拆分接口或调整字段，请告知以便同步更新该文档。


