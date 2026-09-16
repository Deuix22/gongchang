# 产能基础数据维护 — 后端权限修复说明

## 1. 问题描述

管理员账号已在前端开通「产能基础数据维护」入口，但**保存配置时后端返回 403**，前端提示「权限不足」。

### 复现场景

| 步骤 | 接口 | 结果 |
| --- | --- | --- |
| 进入「产能基础数据维护」页 | `GET /api/performance/capacity/meta` | ✅ 200 |
| 新增/修改线体、机型等后保存 | `PUT /api/performance/capacity/meta` | ❌ **403 Forbidden** |

### 报错账号（示例）

| 字段 | 值 |
| --- | --- |
| 用户名 | `houxinglong` |
| userId | `manager_j4kcpw` |
| 角色 | `manager`（前端展示为「管理员」） |

### 前端日志摘要

```
GET  /api/performance/capacity/meta  → 200
PUT  /api/performance/capacity/meta  → 403
Error: 权限不足
```

---

## 2. 问题原因

**前后端权限不一致**：

| 层级 | 当前行为 | 应有行为 |
| --- | --- | --- |
| 前端 | 已允许 `admin`、`manager`/`管理员`、白名单 userId | 与后端一致 |
| 后端 `GET` | 任意登录用户可读 | ✅ 正常 |
| 后端 `PUT` | **仅 `admin` 可写**（推测） | 应允许 `admin` + `manager`/`管理员` |

接口设计文档（`docs/backend-capacity-meta-api.md` 第 4 节）已写明：

> **权限**：仅 admin / **管理员** 可调用

但现网实现仍把 `PUT` 限制为 `admin`，导致 `manager` 角色被 403 拒绝。

---

## 3. 需要修复的接口

### `PUT /api/performance/capacity/meta`

- **路径**：`/api/performance/capacity/meta`
- **方法**：`PUT`
- **鉴权**：`Authorization: Bearer <JWT>`

**当前权限要求（推测）**：仅 `role === 'admin'`

**应改为**：以下任一条件满足即可写入：

1. `role === 'admin'`
2. `role === 'manager'`
3. `role === '管理员'`（若数据库存中文角色名，需兼容）

> 可选：若希望仅对部分管理员开放，可增加 userId 白名单（如 `manager_j4kcpw`）。当前前端已按「全部 manager + 白名单」实现，建议后端与前端保持一致，直接放开 `manager`/`管理员`。

**`GET` 接口无需修改**（保持所有登录用户可读）。

---

## 4. 建议的后端实现

### 4.1 权限判断函数（示例）

```javascript
function canWriteCapacityMeta(user) {
  if (!user) return false
  const role = String(user.role || '').trim()
  if (role === 'admin') return true
  if (role === 'manager' || role === '管理员') return true
  // 可选：单独白名单
  const allowUserIds = ['manager_j4kcpw']
  if (allowUserIds.includes(user.userId)) return true
  return false
}
```

### 4.2 控制器 / 中间件（示例）

```javascript
// PUT /api/performance/capacity/meta
router.put('/performance/capacity/meta', authenticate, async (req, res) => {
  if (!canWriteCapacityMeta(req.user)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: '仅管理员可修改产能基础数据'
      }
    })
  }
  // ... 原有保存逻辑
})
```

### 4.3 注意事项

1. **JWT 中的 `role` 字段**：请确认 `manager` 账号登录后 token 解析出的 `role` 为 `manager`（而非空或其他值）。可用 `GET /api/users/me` 核对。
2. **请求体结构**：前端当前 PUT 的 body 含 `lines`、`processes`、`models`、`modelConfigs`（按机型 + 制程段配置单台工时、标准产能、标准人力），不是旧版文档中的 `modelWorktimes` 扁平结构。保存逻辑请按现网 `modelConfigs` 处理。
3. **错误文案**：403 时建议返回 `{ error: { code: 'FORBIDDEN', message: '仅管理员可修改产能基础数据' } }`，与前端 `request.js` 解析一致。

---

## 5. 验证步骤

### 5.1 确认账号角色

```bash
curl -s "https://hvoqpnuvbtfp.sealosbja.site/api/users/me" \
  -H "Authorization: Bearer <manager_token>"
```

期望响应含：

```json
{
  "userId": "manager_j4kcpw",
  "username": "houxinglong",
  "role": "manager"
}
```

### 5.2 用 manager token 测试 PUT

```bash
curl -X PUT "https://hvoqpnuvbtfp.sealosbja.site/api/performance/capacity/meta" \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "lines": ["DIP1线","DIP2线"],
    "processes": ["插件段","包装段"],
    "models": ["TEST-MODEL"],
    "modelConfigs": {}
  }'
```

- **修复前**：403，`message` 含「权限不足」或「仅管理员可修改…」
- **修复后**：200 / 204，且再次 `GET` 能读到更新后的数据

### 5.3 前端回归

1. 使用 `houxinglong` 登录小程序
2. 进入 **绩效 → 产能提报 → 产能基础数据维护**
3. 新增一条线体或修改机型参数，点击保存
4. 应提示保存成功，刷新后数据仍在

### 5.4 权限边界（建议一并验证）

| 角色 | GET meta | PUT meta |
| --- | --- | --- |
| `leader`（组长） | ✅ | ❌ 403 |
| `manager`（管理员） | ✅ | ✅ |
| `admin`（平台管理员） | ✅ | ✅ |

---

## 6. 前端已对齐的改动（供后端对照）

| 文件 | 说明 |
| --- | --- |
| `src/utils/capacityPermissions.js` | 统一权限：`admin`、`manager`/`管理员`、白名单 `manager_j4kcpw` |
| `src/pages/performance/capacity.vue` | 产能提报页显示「产能基础数据维护」入口 |
| `src/pages/performance/capacity-config.vue` | 维护页进入校验与保存调用 `saveCapacityMeta` |
| `src/utils/api/performance.js` | `saveCapacityMeta` → `PUT /performance/capacity/meta` |

**前端无法绕过 403**：即使入口可见，写入仍依赖后端放行 `manager` 角色。

---

## 7. 相关文档

- 接口字段说明：`docs/backend-capacity-meta-api.md`
- 产能整体改造清单：`docs/backend-capacity-frontend-changes-checklist.md`（其中「PUT /capacity/meta 仅 admin 可写」条目需在后端修复后视为 **admin + manager**）
- 类似权限修复参考：`docs/backend-permission-fix-required.md`（`GET /api/leaders` 对 manager 开放）

---

## 8. 修复优先级

**P0 — 阻塞业务**：管理员无法维护产线、机型、制程段及标准参数，新增线体后提报可能因校验失败无法提交。

**建议**：与 `GET /api/leaders` 对 `manager` 开放同一批次处理，统一梳理「管理员应能写/读哪些绩效与考勤接口」。
