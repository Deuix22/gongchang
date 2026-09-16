# 后端需要实现的接口

根据前端代码的更改，以下接口需要后端实现：

## 1. 更新当前用户信息（新增）

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

**注意事项**:
- 用户只能更新自己的信息
- 可以更新的字段：`nickName`（昵称）
- 其他字段（如 `role`、`department`）需要通过其他接口修改
- 更新后应返回完整的用户信息

---

## 2. 已存在的接口（无需修改）

以下接口在API文档中已存在，后端应该已经实现：

### 2.1 用户管理相关
- ✅ `GET /api/users/me` - 查询当前用户信息（已存在）
- ✅ `GET /api/users` - 获取所有用户（已存在，admin权限）
- ✅ `POST /api/users/{userId}/promote` - 提升组长为管理员（已存在，admin权限）
- ✅ `POST /api/users/{userId}/demote` - 撤销管理员为组长（已存在，admin权限）

### 2.2 部门管理相关
- ✅ `PUT /api/leaders/{leaderId}/department` - 绑定/修改组长所属部门（已存在）
- ✅ `DELETE /api/leaders/{leaderId}/department` - 取消绑定部门（已存在）

### 2.3 组员管理相关
- ✅ `GET /api/leaders/{leaderId}/members` - 获取组员列表（已存在）
- ✅ `POST /api/leaders/{leaderId}/members` - 新增组员（已存在）
- ✅ `PUT /api/leaders/{leaderId}/members/{memberId}` - 修改组员信息（已存在）
- ✅ `DELETE /api/leaders/{leaderId}/members/{memberId}` - 删除组员（已存在）

### 2.4 鉴权相关
- ✅ `POST /api/auth/login-admin` - 管理员账号密码登录（已存在）
- ✅ `POST /api/auth/login-wechat` - 微信认证登录（已存在）
- ✅ `POST /api/auth/refresh` - 刷新Token（已存在）
- ✅ `POST /api/auth/logout` - 登出（已存在）

---

## 总结

**需要后端新增的接口**：
1. `PUT /api/users/me` - 更新当前用户信息（用于组长设置自己的名字）

**需要确认的接口**：
- 所有其他接口在API文档中已存在，请确认后端是否已实现

**接口地址更新**：
- 生产环境API地址已更新为：`https://hvoqpnuvbtfp.sealosbja.site`
- 请确保后端服务正常运行并可访问

