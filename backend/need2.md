# 后端接口文档

## 基础信息

- **基础URL**: 
  - 开发环境: `http://localhost:3000`
  - 生产环境: `https://hvoqpnuvbtfp.sealosbja.site`
- **API前缀**: `/api`
- **完整API地址**: `https://hvoqpnuvbtfp.sealosbja.site/api`
- **认证方式**: 需要在请求头中携带 `Authorization: Bearer <token>`
- **Content-Type**: `application/json` (除文件上传接口外)

## 错误响应格式

所有接口的错误响应统一格式：

```json
{
  "error": {
    "code": "错误码",
    "message": "错误描述",
    "details": {}
  }
}
```

### 常见错误码

- `INVALID_PARAMS` (400): 参数不合法
- `UNAUTHORIZED` (401): 未授权或认证失败
- `FORBIDDEN` (403): 权限不足
- `NOT_FOUND` (404): 资源不存在
- `INTERNAL_ERROR` (500): 服务器内部错误

---

## 1. 鉴权接口

### 1.1 平台管理员账号密码登录

**接口**: `POST /api/auth/login-admin`

**说明**: 仅允许平台管理员通过账号密码登录

**请求头**: 无需认证

**请求体**:
```json
{
  "username": "admin",
  "password": "030426"
}
```

**成功响应** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_string_here",
  "user": {
    "userId": "admin",
    "nickName": "超级管理员",
    "role": "admin",
    "department": null,
    "wechatOpenId": null
  }
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "用户名与密码必填",
    "details": {}
  }
}
```

**失败响应** (401):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "账号或密码不正确",
    "details": {}
  }
}
```

---

### 1.2 微信认证登录

**接口**: `POST /api/auth/login-wechat`

**说明**: 除平台管理员外，其余用户统一使用微信认证登录。首次登录的微信用户若无角色，后端需自动创建用户并赋予 `leader` 角色。

**请求头**: 无需认证

**请求体**:
```json
{
  "code": "wx-login-code",
  "userInfo": {
    "nickName": "张三",
    "avatarUrl": "https://..."
  }
}
```

**成功响应** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_string_here",
  "user": {
    "userId": "leader_001",
    "nickName": "张三",
    "role": "leader",
    "department": "SMT",
    "wechatOpenId": "wx_openid_001"
  }
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "code 与 userInfo.nickName 必填",
    "details": {}
  }
}
```

---

### 1.3 刷新 Token

**接口**: `POST /api/auth/refresh`

**说明**: 当 Token 将过期时刷新

**请求头**: 无需认证

**请求体**:
```json
{
  "refreshToken": "refresh_token_string_here"
}
```

**成功响应** (200):
```json
{
  "token": "new-jwt-token-string",
  "refreshToken": "new-refresh-token"
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "refreshToken 必填",
    "details": {}
  }
}
```

**失败响应** (401):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "刷新令牌无效",
    "details": {}
  }
}
```

---

### 1.4 登出

**接口**: `POST /api/auth/logout`

**说明**: 前端调用后端销毁刷新令牌

**请求头**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "refreshToken": "refresh_token_string_here"
}
```

**成功响应** (200):
```json
{
  "success": true
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "refreshToken 必填",
    "details": {}
  }
}
```

---

## 2. 用户与部门接口

### 2.1 查询当前用户信息

**接口**: `GET /api/users/me`

**说明**: 返回登录用户信息（用于前端本地缓存）

**请求头**: `Authorization: Bearer <token>`

**成功响应** (200):
```json
{
  "userId": "leader_001",
  "nickName": "张三",
  "role": "leader",
  "department": "SMT",
  "wechatOpenId": "wx_openid_001"
}
```

**失败响应** (401):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供有效的 Authorization 头",
    "details": {}
  }
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "用户不存在",
    "details": {}
  }
}
```

---

### 2.2 更新当前用户信息

**接口**: `PUT /api/users/me`

**说明**: 允许用户更新自己的信息（如昵称等）

**权限**: 所有已登录用户

**请求头**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "nickName": "张三"
}
```

**成功响应** (200):
```json
{
  "userId": "leader_001",
  "nickName": "张三",
  "role": "leader",
  "department": "SMT",
  "wechatOpenId": "wx_openid_001",
  "updatedAt": "2024-01-05T10:00:00.000Z"
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "参数不合法",
    "details": {}
  }
}
```

**失败响应** (401):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供有效的 Authorization 头",
    "details": {}
  }
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "用户不存在",
    "details": {}
  }
}
```

---

### 2.3 获取所有用户

**接口**: `GET /api/users`

**权限**: `admin`

**请求头**: `Authorization: Bearer <token>`

**成功响应** (200):
```json
[
  {
    "userId": "leader_001",
    "nickName": "张三",
    "role": "leader",
    "department": "SMT",
    "wechatOpenId": "wx_001",
    "createdAt": "2024-01-01T08:00:00.000Z",
    "lastLoginAt": "2024-01-05T09:00:00.000Z"
  }
]
```

**失败响应** (401):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供有效的 Authorization 头",
    "details": {}
  }
}
```

**失败响应** (403):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "权限不足",
    "details": {}
  }
}
```

---

### 2.4 提升组长为管理员

**接口**: `POST /api/users/{userId}/promote`

**权限**: `admin`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `userId`: 用户ID

**成功响应** (200):
```json
{
  "userId": "leader_001",
  "oldRole": "leader",
  "newRole": "manager",
  "updatedAt": "2024-01-05T10:00:00.000Z"
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "无法提升管理员",
    "details": {}
  }
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "用户不存在",
    "details": {}
  }
}
```

---

### 2.5 撤销管理员为组长

**接口**: `POST /api/users/{userId}/demote`

**权限**: `admin`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `userId`: 用户ID

**成功响应** (200):
```json
{
  "userId": "leader_001",
  "oldRole": "manager",
  "newRole": "leader",
  "updatedAt": "2024-01-05T10:30:00.000Z"
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "仅能将管理员降级为组长",
    "details": {}
  }
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "用户不存在",
    "details": {}
  }
}
```

---

### 2.6 删除用户

**接口**: `DELETE /api/users/{userId}`

**权限**: `admin`

**说明**: 删除指定用户，用于清理测试用户或不需要的用户账号。不能删除平台管理员。

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `userId`: 用户ID

**成功响应** (200):
```json
{
  "success": true,
  "message": "用户删除成功",
  "deletedUser": {
    "userId": "leader_001",
    "nickName": "测试用户",
    "role": "leader"
  }
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "不能删除平台管理员",
    "details": {}
  }
}
```

**失败响应** (403):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "权限不足，仅平台管理员可以删除用户",
    "details": {}
  }
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "用户不存在",
    "details": {}
  }
}
```

---

### 2.7 绑定/修改组长所属部门

**接口**: `PUT /api/leaders/{leaderId}/department`

**权限**: `leader`, `admin`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `leaderId`: 组长ID

**请求体**:
```json
{
  "department": "SMT"
}
```

**成功响应** (200):
```json
{
  "leaderId": "leader_001",
  "department": "SMT"
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "参数不合法",
    "details": {}
  }
}
```

**失败响应** (403):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "无权操作其他组的出勤记录",
    "details": {}
  }
}
```

---

### 2.8 取消绑定部门

**接口**: `DELETE /api/leaders/{leaderId}/department`

**权限**: `leader`, `admin`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `leaderId`: 组长ID

**成功响应** (200):
```json
{
  "success": true
}
```

**失败响应** (403):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "权限不足",
    "details": {}
  }
}
```

---

### 2.9 获取全部组长与部门映射

**接口**: `GET /api/leaders`

**权限**: `admin`

**请求头**: `Authorization: Bearer <token>`

**查询参数**:
- `includeMembers` (可选, `true/false`): 是否包含组员信息

**成功响应** (200):
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

**失败响应** (401):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供有效的 Authorization 头",
    "details": {}
  }
}
```

---

## 3. 组员管理接口

### 3.1 获取组员列表

**接口**: `GET /api/leaders/{leaderId}/members`

**权限**: `leader`, `admin`, `manager`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `leaderId`: 组长ID

**成功响应** (200):
```json
[
  {
    "memberId": "member_001",
    "name": "白班组员1",
    "shiftType": "day",
    "createdAt": "2024-01-01T08:00:00.000Z"
  }
]
```

**失败响应** (403):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "权限不足",
    "details": {}
  }
}
```

---

### 3.2 新增组员

**接口**: `POST /api/leaders/{leaderId}/members`

**权限**: `leader`, `admin`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `leaderId`: 组长ID

**请求体**:
```json
{
  "name": "白班组员1",
  "shiftType": "day"
}
```

**成功响应** (201):
```json
{
  "memberId": "member_001",
  "leaderId": "leader_001",
  "name": "白班组员1",
  "shiftType": "day",
  "createdAt": "2024-01-01T08:00:00.000Z"
}
```

**失败响应** (400):
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

### 3.3 修改组员信息

**接口**: `PUT /api/leaders/{leaderId}/members/{memberId}`

**权限**: `leader`, `admin`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `leaderId`: 组长ID
- `memberId`: 组员ID

**请求体**:
```json
{
  "name": "白班组员1",
  "shiftType": "night"
}
```

**成功响应** (200):
```json
{
  "memberId": "member_001",
  "name": "白班组员1",
  "shiftType": "night",
  "updatedAt": "2024-01-02T08:00:00.000Z"
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "参数不合法",
    "details": {}
  }
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "组员不存在",
    "details": {}
  }
}
```

---

### 3.4 删除组员

**接口**: `DELETE /api/leaders/{leaderId}/members/{memberId}`

**权限**: `leader`, `admin`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `leaderId`: 组长ID
- `memberId`: 组员ID

**成功响应** (200):
```json
{
  "success": true
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "组员不存在",
    "details": {}
  }
}
```

---

## 4. 出勤统计接口（组长端）

### 4.1 获取组长当前出勤记录

**接口**: `GET /api/leaders/{leaderId}/attendance`

**权限**: `leader`, `admin`, `manager`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `leaderId`: 组长ID

**成功响应** (200):
```json
{
  "records": [
    {
      "recordId": "att_001",
      "memberId": "member_001",
      "name": "白班组员1",
      "department": "SMT",
      "shiftType": "day",
      "startTime": "2024-01-01T08:00:00.000Z",
      "endTime": "2024-01-01T17:00:00.000Z",
      "duration": 540,
      "lastUpdatedBy": "leader_001",
      "updatedAt": "2024-01-01T17:00:00.000Z"
    }
  ]
}
```

**失败响应** (403):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "无权操作其他组的出勤记录",
    "details": {}
  }
}
```

---

### 4.2 提交/更新出勤记录

**接口**: `POST /api/leaders/{leaderId}/attendance`

**权限**: `leader`, `admin`

**说明**: 一次性提交整组数据，后端需以成员为唯一键覆盖旧数据。

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `leaderId`: 组长ID

**请求体**:
```json
{
  "records": [
    {
      "memberId": "member_001",
      "startTime": "2024-01-01T08:00:00.000Z",
      "endTime": "2024-01-01T17:00:00.000Z",
      "duration": 540,
      "shiftType": "day"
    }
  ],
  "submittedAt": "2024-01-01T17:10:00.000Z"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "updatedCount": 3
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "records 不能为空",
    "details": {}
  }
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "records 内字段不完整",
    "details": {}
  }
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "shiftType 必须为 day 或 night",
    "details": {}
  }
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "组长不存在",
    "details": {}
  }
}
```

---

### 4.3 删除单条出勤记录

**接口**: `DELETE /api/leaders/{leaderId}/attendance/{recordId}`

**权限**: `leader`, `admin`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `leaderId`: 组长ID
- `recordId`: 记录ID

**成功响应** (200):
```json
{
  "success": true
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "出勤记录不存在",
    "details": {}
  }
}
```

---

## 5. 出勤历史记录接口

### 5.1 新增历史记录

**接口**: `POST /api/attendance/history`

**权限**: `leader`

**说明**: 每次修改（旧值存在时）由前端调用新增一条历史记录。

**请求头**: `Authorization: Bearer <token>`

**请求体**:
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
  "changedAt": "2024-01-02T01:00:00.000Z"
}
```

**成功响应** (201):
```json
{
  "historyId": "hist_001",
  "saved": true
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "缺少必要字段",
    "details": {}
  }
}
```

---

### 5.2 查询历史记录

**接口**: `GET /api/attendance/history`

**权限**: `admin`

**请求头**: `Authorization: Bearer <token>`

**查询参数**:
- `department` (可选): 部门名称
- `leaderId` (可选): 组长ID
- `memberName` (可选): 组员姓名
- `start` (可选): 开始时间 (ISO 时间字符串)
- `end` (可选): 结束时间 (ISO 时间字符串)

**成功响应** (200):
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
    "changedAt": "2024-01-02T01:00:00.000Z"
  }
]
```

**失败响应** (401):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供有效的 Authorization 头",
    "details": {}
  }
}
```

**失败响应** (403):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "权限不足",
    "details": {}
  }
}
```

---

## 6. 设置页接口（管理员端）

### 6.1 获取分组与出勤概览

**接口**: `GET /api/admin/attendance/groups`

**权限**: `admin`

**请求头**: `Authorization: Bearer <token>`

**成功响应** (200):
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
          "startTime": "2024-01-01T08:00:00.000Z",
          "endTime": "2024-01-01T17:00:00.000Z",
          "duration": 540,
          "updatedAt": "2024-01-01T17:00:00.000Z"
        }
      }
    ]
  }
]
```

**失败响应** (401):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供有效的 Authorization 头",
    "details": {}
  }
}
```

**失败响应** (403):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "权限不足",
    "details": {}
  }
}
```

---

### 6.2 导出某组数据

**接口**: `POST /api/admin/attendance/export`

**权限**: `admin`

**说明**: 生成 Excel 文件，返回导出任务 ID。

**请求头**: `Authorization: Bearer <token>`

**请求体**:
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

**成功响应** (202):
```json
{
  "taskId": "export_task_001",
  "status": "processing"
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "缺少必要字段",
    "details": {}
  }
}
```

---

### 6.3 导出全部数据

**接口**: `POST /api/admin/attendance/export/all`

**权限**: `admin`

**请求头**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-07"
}
```

**成功响应** (202):
```json
{
  "taskId": "export_task_002",
  "status": "processing"
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "startDate 与 endDate 必填",
    "details": {}
  }
}
```

---

### 6.4 查询导出进度

**接口**: `GET /api/admin/attendance/export/{taskId}`

**权限**: `admin`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `taskId`: 任务ID

**成功响应** (200):
```json
{
  "taskId": "export_task_001",
  "status": "finished",
  "progress": 100,
  "downloadUrl": "https://hvoqpnuvbtfp.sealosbja.site/files/export_task_001.xlsx",
  "expiredAt": "2024-01-02T00:00:00.000Z"
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "导出任务不存在",
    "details": {}
  }
}
```

---

## 7. 打卡数据上传与异常检测接口

### 7.1 上传打卡机数据

**接口**: `POST /api/admin/attendance/upload`

**权限**: `admin`

**说明**: 上传 Excel 文件，自动比对手工录入数据并检测异常。

**请求头**: 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**请求参数**:
- `file` (必填): Excel 文件（列名包含"姓名""出勤时间"等）
- `startDate` (可选): 开始日期，用于过滤
- `endDate` (可选): 结束日期，用于过滤

**成功响应** (201):
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
  "anomalyReportUrl": "https://hvoqpnuvbtfp.sealosbja.site/files/upload_001_anomalies.xlsx"
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "缺少上传文件",
    "details": {}
  }
}
```

---

### 7.2 下载上传异常报告

**接口**: `GET /api/admin/attendance/upload/{uploadId}/report`

**权限**: `admin`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `uploadId`: 上传任务ID

**成功响应** (200):
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Body**: Excel 文件流

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "上传记录不存在",
    "details": {}
  }
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "暂无异常报告",
    "details": {}
  }
}
```

---

## 8. 通知接口

### 8.1 发送微信通知（异常提醒）

**接口**: `POST /api/notifications/wechat`

**权限**: `admin`（后台在检测到异常后调用）

**请求头**: `Authorization: Bearer <token>`

**请求体**:
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

**成功响应** (200):
```json
{
  "success": true,
  "sent": 2,
  "failed": []
}
```

**失败响应** (400):
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

## 9. 通用数据结构说明

### 9.1 班次类型
- `day`: 白班（需要检查上班 ≥ 08:00）
- `night`: 夜班（不检查上班 ≥ 08:00）

### 9.2 出勤时长单位
- 统一使用分钟（`duration: number`），前端表现为"X小时Y分钟"。

### 9.3 时间格式
- 推荐使用 ISO 8601（UTC）格式，例如：`2024-01-01T08:00:00.000Z`
- 前端可根据时区转换显示

### 9.4 角色说明
- **leader**: 组长，默认角色，负责录入所在小组的出勤数据、维护组员、绑定部门
- **manager**: 管理员，由 `admin` 提升产生，负责全局设置、导出上传、查看所有历史记录和异常信息
- **admin**: 平台管理员，最高权限，除拥有管理员全部能力外，还可管理用户身份（将组长升级/降级为管理员）、初始化系统配置

---

## 10. 权限矩阵

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

---

## 11. 测试示例

### 测试管理员登录

**开发环境**:
```bash
curl -X POST http://localhost:3000/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}'
```

**生产环境**:
```bash
curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}'
```

### 测试获取当前用户信息

**开发环境**:
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**生产环境**:
```bash
curl -X GET https://hvoqpnuvbtfp.sealosbja.site/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 测试获取组员列表

**开发环境**:
```bash
curl -X GET http://localhost:3000/api/leaders/leader_001/members \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**生产环境**:
```bash
curl -X GET https://hvoqpnuvbtfp.sealosbja.site/api/leaders/leader_001/members \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 注意事项

1. **Token 有效期**: JWT Token 默认有效期为 12 小时，Refresh Token 有效期为 7 天
2. **文件上传**: 上传接口使用 `multipart/form-data` 格式，其他接口使用 `application/json`
3. **时间格式**: 所有时间字段建议使用 ISO 8601 格式（UTC）
4. **错误处理**: 所有错误响应统一格式，前端可根据 `error.code` 进行相应处理
5. **权限控制**: 部分接口需要特定角色权限，请确保 Token 中的角色信息正确
6. **数据库连接**: 确保 MongoDB 连接正常，连接字符串格式：`mongodb://root:password@host:port/database?authSource=admin`

---

**文档版本**: v1.0  
**最后更新**: 2024-01-01

