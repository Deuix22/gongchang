# 后端权限修复说明

## 问题描述

管理员（`manager` 角色）无法导出组员信息，调用 `GET /api/leaders?includeMembers=true` 时返回 403 Forbidden 错误。

## 问题原因

根据权限矩阵（`docs/backend-api-spec.md` 第 1470-1483 行），`manager` 角色应该能够：
- ✅ 查看全部出勤/分组
- ✅ 导出/上传

但 `GET /api/leaders` 接口的权限检查只允许 `admin` 角色访问，导致 `manager` 无法获取所有组长和组员信息。

## 需要修复的接口

### `GET /api/leaders`

**当前权限要求**: `admin`  
**应该改为**: `admin`, `manager`

**接口路径**: `/api/leaders`  
**查询参数**: `includeMembers` (可选, `true/false`)

**修复说明**:
- 后端需要修改权限中间件或路由守卫
- 允许 `manager` 和 `admin` 角色访问此接口
- 确保返回的数据格式不变

## 相关代码位置

前端调用位置：
- `src/utils/api/user.js` - `getAllLeaders` 函数
- `src/pages/settings/index.vue` - `refreshLeaderMembersCache` 函数
- `src/pages/settings/index.vue` - `handleExportGroupMembers` 函数
- `src/pages/settings/index.vue` - `handleViewAttendanceSummary` 函数

## 权限矩阵参考

根据 `docs/backend-api-spec.md` 第 1470-1483 行的权限矩阵：

| 功能模块 | 组长 leader | 管理员 manager | 平台管理员 admin |
| --- | --- | --- | --- |
| 查看全部出勤/分组 | ❌ | ✅ | ✅ |
| 导出/上传 | ❌ | ✅ | ✅ |

因此，`manager` 应该能够访问 `GET /api/leaders` 接口。

## 临时解决方案（如果后端暂时无法修复）

如果后端暂时无法修改权限，可以考虑以下临时方案：

1. **使用 `GET /api/leaders/{leaderId}/members` 接口**：
   - 该接口允许 `leader`, `admin`, `manager` 访问
   - 前端可以遍历所有组长ID，逐个获取组员信息
   - 但需要先获取所有组长列表（这仍然需要 `GET /api/leaders` 接口）

2. **添加降级逻辑**：
   - 当 `getAllLeaders` 失败时，尝试从本地缓存获取数据
   - 但这只能获取之前已加载的数据，无法获取最新数据

**建议**: 直接修复后端权限检查，这是最根本的解决方案。

