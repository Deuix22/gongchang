# 绩效系统 - 后端需配合事项

本文档单独列出**绩效系统**联调时**后端需要实现或保证**的接口与约定，供后端排期与联调对照。前端已按本文档约定对接。

---

## 一、通用约定

| 项目 | 要求 |
|------|------|
| 鉴权 | 除登录、刷新 Token 外，绩效相关接口均需校验 `Authorization: Bearer <token>`；未带或无效返回 **401**，前端会尝试刷新 Token 或跳转登录。 |
| 错误响应 | 400/403/404 等建议返回 Body：`{ code?: string, message: string }`，前端会解析并提示 `message`，必要时按 `code`（如 FORBIDDEN）做分支。 |
| 分页格式 | 所有列表接口统一返回 `{ list: Array, total: number }`，前端按此解析。 |

---

## 二、产能

| 接口 | 方法 | 路径 | 后端需配合 |
|------|------|------|------------|
| 产能提报 | POST | `/api/performance/capacity` | 接收 Body：`productionLine`（DIP1线～DIP7线 之一）、`batchNo`、`model`、`process`、`passQuantity`(number)、`startDate`、`startTime`、`endDate`、`endTime`；做必填、产线枚举、passQuantity≥0、结束时间晚于开始时间等校验。 |
| 产能列表 | GET | `/api/performance/capacity` | 仅 **admin / manager** 可调；支持查询参数：`productionLine`、`model`、`batchNo`、`process`、`startDate`、`endDate`、`page`、`pageSize`；返回 `{ list, total }`。 |
| 产线枚举 | GET | `/api/performance/capacity/lines` | 返回 `{ list: ['DIP1线', 'DIP2线', ..., 'DIP7线'] }`，供前端下拉选项（可选实现，前端目前也可写死）。 |

---

## 三、工时统计

| 接口 | 方法 | 路径 | 后端需配合 |
|------|------|------|------------|
| 工时提交 | POST | `/api/performance/worktime` | 接收 Body（camelCase）：必填 `productionBatch`、`team`、`teamLeader`、`actualStartDate`、`actualStartTime`、`actualEndDate`、`actualEndTime`；其余见下表。成功响应 2xx，Body：`{ success: true, id: '<recordId>' }`。 |
| 工时列表 | GET | `/api/performance/worktime` | 可选。支持参数：`page`、`pageSize`、`productionBatch`、`team`、`teamLeader`、`startDate`、`endDate`；返回 `{ list, total }`。 |

**工时提交 Body 字段一览（与前端 worktime 表单一致）：**

- 必填：`productionBatch`、`team`、`teamLeader`、`actualStartDate`、`actualStartTime`、`actualEndDate`、`actualEndTime`
- 可选：`productionModel`、`singleWorkHours`、`machineCount`、`outputWorkHours`、`exceptionReason`、`exceptionDuration`、`workshop`、`productionLine`、`attendanceCount`、`actualOutput`、`lendHours`、`borrowHours`

---

## 四、异常工时

| 接口 | 方法 | 路径 | 后端需配合 |
|------|------|------|------------|
| 生产提交 | POST | `/api/performance/abnormal` | Body：`name`（必填）、`people`、`hours`、`totalHours`、`remark`；`source` 由后端固定为「生产」。响应中需返回 `abnormalId`，供后续工程/品质接口使用。 |
| 异常列表 | GET | `/api/performance/abnormal` | 支持参数：`page`、`pageSize`、`source`、`qualityStatus`；返回 `{ list, total }`。列表项需含 `abnormalId`，供工程填原因、品质审批的 `:id`。 |
| 工程填原因 | PUT | `/api/performance/abnormal/:id/engineering` | `:id` 为异常记录的 **abnormalId**。Body：`{ engineeringReason }`。 |
| 品质审批 | PUT | `/api/performance/abnormal/:id/quality` | `:id` 为异常记录的 **abnormalId**。Body：`{ status: 'approved' \| 'rejected', comment?: string }`。 |

说明：身份（工程/品质/生产）目前由前端本地 `abnormal_leader_identity` 控制展示；若后端后续在 `GET /api/users/me` 中增加 `abnormalIdentity`，前端可改为以后端为准。

---

## 五、用户与权限（已有接口的补充）

| 项目 | 要求 |
|------|------|
| GET /api/users/me | 必须包含 `role`（如 `leader`/`admin`/`manager`），前端据此展示「产能管理」入口（仅 admin/manager 可见）及异常页 Tab 权限。 |
| 可选扩展 | 若需统一管理「异常页身份」，可在 `GET /api/users/me` 中增加 `abnormalIdentity`（工程/品质/生产），并配合相应更新接口。 |

---

## 六、接口路径汇总（后端需实现）

| 功能 | 方法 | 路径 |
|------|------|------|
| 产能提报 | POST | `/api/performance/capacity` |
| 产能列表 | GET | `/api/performance/capacity` |
| 产线枚举 | GET | `/api/performance/capacity/lines` |
| 工时统计提交 | POST | `/api/performance/worktime` |
| 工时统计列表 | GET | `/api/performance/worktime` |
| 异常提交 | POST | `/api/performance/abnormal` |
| 异常列表 | GET | `/api/performance/abnormal` |
| 工程填原因 | PUT | `/api/performance/abnormal/:id/engineering` |
| 品质审批 | PUT | `/api/performance/abnormal/:id/quality` |

---

## 七、相关文档

- 产能字段与校验细节：前端项目 `docs/backend-capacity-report-api.md`
- 绩效系统整体说明与前端对接注意点：前端项目 `docs/backend-performance-system.md`

若后端路径或字段与本文不一致，请提前与前端约定并更新本文或接口文档，避免联调时命名不一致。
