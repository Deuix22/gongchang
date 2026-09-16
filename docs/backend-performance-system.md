# 绩效系统 - 后端配合说明

本文档说明**工厂绩效系统**各功能模块需要后端提供的接口与配合事项，便于前后端联调与排期。

**使用说明**：若您在后端仓库中查看本文档，文末「相关文档」中提到的其他文档位于**前端项目**内，请向前端同事索取或在前端项目根目录下的 `docs/` 文件夹中打开对应文件；路径均以前端项目根目录为基准。

---

## 一、绩效系统模块概览

| 模块 | 页面/入口 | 当前前端状态 | 后端需求 |
|------|-----------|--------------|----------|
| 绩效首页 | `pages/performance/index` | 已用 `GET /api/users/me` 做角色展示与入口控制 | 依赖鉴权 + 用户信息 |
| 产能提报 | 产能提报页 | 提交逻辑已写好，**未接后端** | 需 **POST** 提交 + 可选 **GET** 列表 |
| 产能管理 | 产能管理页（仅管理员/admin 可见） | 已调用 **GET** 产能列表，支持筛选与导出 | 需 **GET** 列表（已有文档） |
| 工时统计 | 工时统计页 | 提交仅本地 Toast，导出为前端生成 Excel | 需 **POST** 提交，可选 **GET** 列表 |
| 异常工时流程 | 异常工时页（组长选身份：工程/品质/生产） | 数据全在内存，无持久化 | 需 **提交 / 列表 / 审批** 等接口 |

除上述业务接口外，绩效系统统一依赖：**登录鉴权**、**Token 刷新**、**当前用户信息**。

---

## 二、通用依赖（鉴权与用户）

以下接口为全系统共用，绩效模块进入前会校验 Token，首页与异常页会拉取当前用户以判断角色。

| 用途 | 接口 | 说明 |
|------|------|------|
| 登录 | `POST /api/auth/login` | 账号密码登录，返回 `token`、`refreshToken`、`user`（含 `role` 等） |
| 刷新 Token | `POST /api/auth/refresh` | Body: `{ refreshToken }`，返回新 `token`、`refreshToken` |
| 登出 | `POST /api/auth/logout` | 可选，前端会清除本地 Token |
| 当前用户 | `GET /api/users/me` | 返回当前用户信息，**必须含 `role`**（如 `leader`/`admin`/`manager`） |

**前端使用方式：**

- 请求头：`Authorization: Bearer <token>`（除登录、刷新外均需携带）。
- 绩效首页根据 `role` 显示「产能管理」入口：仅 `admin`、`管理员`、`manager` 可见。
- 异常工时页根据 `role` 判断：管理员/admin 看全部 Tab（生产/工程/品质）；组长首次进入需选择身份（工程/品质/生产），目前身份存前端 `abnormal_leader_identity`，若后端要统一管理可增加「身份」字段或单独接口。

---

## 三、产能提报与产能管理

产能相关接口已有单独文档，这里只做汇总。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 产能提报提交 | POST | `/api/performance/capacity` | 单条提交，Body 见下方 |
| 产能列表查询 | GET | `/api/performance/capacity` | 分页+筛选，供产能管理页与导出 |

**提交 Body 字段（产能提报）：**

- `productionLine`（string，必填，枚举：DIP1线～DIP7线）
- `batchNo`、`model`、`process`（string，必填）
- `passQuantity`（number，必填，≥0）
- `startDate`、`startTime`、`endDate`、`endTime`（string，必填，格式 YYYY-MM-DD、HH:mm 或 HH:mm:ss）

详细约定、产线枚举、校验建议、响应格式见前端项目文档：**产能提报 - 后端对接文档**（前端项目根目录下 `docs/backend-capacity-report-api.md`）。

**前端现状：**

- 产能提报页：提交时前端已校验并组好上述 Body，**尚未调用 POST**，对接时在 `capacity.vue` 的 `handleSubmit` 中调用 `post('/performance/capacity', body)` 即可。
- 产能管理页：已调用 `getCapacityList` → `GET /api/performance/capacity`，列表与导出依赖该接口返回的 `list`、`total`。

---

## 四、工时统计

**功能说明：** 用户填写生产批次、机型、单台工时、机器数量、产出工时、异常原因/时间、车间、产线、班组、班组长、出勤人数、实际开工/完工时间、实际生产数量、借出/借入工时等，可「提交」和「导出表格」。导出由前端按当前表单生成 Excel，不依赖后端。

**后端需提供：**

- **提交接口**：将当前表单数据持久化，便于后续查询或报表。

### 4.1 工时统计提交接口

| 项目 | 说明 |
|------|------|
| 接口路径 | 建议 `POST /api/performance/worktime` 或 `/api/performance/worktime/submit` |
| 请求头 | `Content-Type: application/json`，`Authorization: Bearer <token>` |
| 说明 | 提交一条工时统计记录 |

**请求体（Body）建议字段：**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| productionBatch | string | 是 | 生产批次 |
| productionModel | string | 否 | 生产机型 |
| singleWorkHours | string/number | 否 | 单台工时 |
| machineCount | string/number | 否 | 机器数量 |
| outputWorkHours | string/number | 否 | 产出工时 |
| exceptionReason | string | 否 | 异常原因 |
| exceptionDuration | string | 否 | 异常时间 |
| workshop | string | 否 | 生产车间 |
| productionLine | string | 否 | 生产线 |
| team | string | 是 | 班组 |
| teamLeader | string | 是 | 班组长 |
| attendanceCount | string/number | 否 | 出勤人数 |
| actualStartDate | string | 是 | 实际开工日期 YYYY-MM-DD |
| actualStartTime | string | 是 | 实际开工时间 HH:mm |
| actualEndDate | string | 是 | 实际完工日期 YYYY-MM-DD |
| actualEndTime | string | 是 | 实际完工时间 HH:mm |
| actualOutput | string/number | 否 | 实际生产数量 |
| lendHours | string/number | 否 | 借出工时 |
| borrowHours | string/number | 否 | 借入工时 |

以上与前端 `worktime.vue` 中表单字段一致；后端可按需增删或改为 snake_case，前后端约定即可。

**成功响应：** HTTP 2xx，Body 可仅含 `success: true` 或 `{ id, ... }`。前端目前仅根据 2xx 和未报错提示「提交成功」。

**可选：列表/查询接口**

- 若需要「工时统计记录列表」或按条件查询，可再提供 `GET /api/performance/worktime`，参数建议：`page`、`pageSize`、`productionBatch`、`team`、`teamLeader`、`startDate`、`endDate` 等。当前前端未实现列表页，可后续再加。

---

## 五、异常工时流程

**功能说明：** 组长首次进入需选择身份（工程 / 品质 / 生产），之后只看到对应 Tab；管理员/admin 可看全部（生产/工程/品质）。  
- **生产**：录入异常（名称、涉及人数、涉及时间、总工时、备注），提交后进入列表。  
- **工程**：对生产提交的异常填写原因。  
- **品质**：对异常进行通过/驳回审批。

当前前端：生产「添加异常」、工程「保存原因」、品质「通过/驳回」均为**本地内存操作**，刷新即丢失，需后端持久化。

**后端需提供（建议）：**

1. **生产提交异常**：一条异常记录（名称、人数、时间、总工时、备注、来源=生产）。
2. **工程填写原因**：按异常 id 更新「工程原因」等字段。
3. **品质审批**：按异常 id 更新审批状态（通过/驳回）及备注。
4. **异常列表**：分页/筛选查询，支持按来源（生产/工程/品质）或状态筛选，供三个 Tab 展示。

**身份与权限：**

- 组长身份（工程/品质/生产）：目前前端用 `uni.setStorageSync('abnormal_leader_identity', identity)` 存储；若后端要统一管理，可：
  - 在 `GET /api/users/me` 中增加字段（如 `abnormalIdentity`），或
  - 提供 `PUT /api/users/me` 或单独接口保存「异常页身份」，前端进入时先读后端再决定展示哪个 Tab。
- 权限：列表/提交/审批接口需根据当前用户角色与身份做校验（例如仅品质身份可审批、仅工程可填原因等），具体规则可与业务一起定。

**前端数据结构参考（当前本地示例）：**

- 单条异常：`id`、`name`、`people`、`hours`、`totalHours`、`remark`、`source`（'生产'）、`engineeringReason`、`qualityStatus`（pending/approved/rejected）、`qualityComment`。
- 对接时由后端定义表结构与接口字段，前端再对应适配。

---

## 六、接口汇总与优先级

| 优先级 | 模块 | 接口 | 方法 | 说明 |
|--------|------|------|------|------|
| 必须 | 通用 | 登录 / 刷新 / GET 当前用户 | 见第二节 | 绩效各页依赖 |
| 必须 | 产能 | POST 产能提报 | POST | 产能提报页提交 |
| 必须 | 产能 | GET 产能列表 | GET | 产能管理页列表与导出 |
| 建议 | 工时统计 | POST 工时统计 | POST | 工时统计页提交 |
| 可选 | 工时统计 | GET 工时统计列表 | GET | 若做历史查询/报表 |
| 建议 | 异常工时 | 异常 CRUD + 审批 | POST/GET/PUT | 生产提交、工程填原因、品质审批、列表 |

---

## 七、相关文档

以下文档位于**前端项目**内（前端项目根目录下的 `docs/` 文件夹）。若您在后端仓库中工作，请向前端索取或拉取前端项目后按路径打开：

| 文档名称 | 在前端项目中的路径 |
|----------|---------------------|
| 产能提报 - 后端对接文档 | `docs/backend-capacity-report-api.md` |
| 后端需要实现的接口 | `docs/backend-api-required.md` |
| **绩效系统 - 后端需配合事项** | `docs/backend-performance-required.md` |

- **产能提报 - 后端对接文档**：产能 POST/GET 详细字段、产线枚举、校验与响应格式。
- **后端需要实现的接口**：含 `PUT /api/users/me` 等用户相关接口，可与「异常页身份」结合使用。
- **绩效系统 - 后端需配合事项**：绩效联调时后端需实现/保证的接口与约定，单独列出供后端排期与对照。

若后端路径前缀或字段命名与本文不一致，以实际约定为准，建议在本文或单独接口文档中注明，便于前端对接。

---

## 八、前端对接注意事项（根据当前后端实现）

以下为根据后端实现整理的前端对接要点，前端按此对齐路径与字段即可。

### 1. 鉴权与请求头

- 除登录、刷新 Token 外，所有绩效相关请求都要带：`Authorization: Bearer <token>`。
- 若返回 401，需按现有逻辑刷新 Token 或跳转登录。

### 2. 产能

- **提交**：`POST /api/performance/capacity`，Body 字段与文档一致（`productionLine` 为 DIP1线～DIP7线 之一）。
- **列表/导出**：`GET /api/performance/capacity`，仅 **admin / manager** 可调；前端已按角色展示「产能管理」入口，需保证只有这两种角色才调该接口。
- **产线枚举**：如需下拉选项，可调 `GET /api/performance/capacity/lines`，返回 `{ list: ['DIP1线', ..., 'DIP7线'] }`。

### 3. 工时统计

- **提交**：`POST /api/performance/worktime`，必填字段：`productionBatch`、`team`、`teamLeader`、`actualStartDate`、`actualStartTime`、`actualEndDate`、`actualEndTime`；其余与 `worktime.vue` 表单一致即可（camelCase）。
- **成功响应**：2xx，Body 为 `{ success: true, id: '<recordId>' }`，前端按 2xx 提示「提交成功」即可。
- **列表（可选）**：`GET /api/performance/worktime`，参数：`page`、`pageSize`、`productionBatch`、`team`、`teamLeader`、`startDate`、`endDate`，返回 `{ list, total }`。

### 4. 异常工时

- **生产提交**：`POST /api/performance/abnormal`，Body 传 `name`（必填）、`people`、`hours`、`totalHours`、`remark`；`source` 由后端固定为「生产」。
- **工程填原因**：`PUT /api/performance/abnormal/:id/engineering`，Body：`{ engineeringReason }`。**:id 为异常记录的 abnormalId**（列表或提交返回里的 `abnormalId`）。
- **品质审批**：`PUT /api/performance/abnormal/:id/quality`，Body：`{ status: 'approved' | 'rejected', comment?: string }`。
- **列表**：`GET /api/performance/abnormal`，支持 `page`、`pageSize`、`source`、`qualityStatus`；三个 Tab（生产/工程/品质）可按 `source` 或 `qualityStatus` 筛，管理员可看全部。
- 身份（工程/品质/生产）目前仍由前端 `abnormal_leader_identity` 控制展示；若后端以后在 `GET /api/users/me` 增加 `abnormalIdentity`，再改为以后端为准。

### 5. 错误与分页

- **错误**：400/403/404 等会带 Body（如 `code`、`message`），前端可统一解析并提示 `message`，必要时根据 `code` 做分支（如 FORBIDDEN 提示无权限）。
- **分页**：产能/工时/异常列表均返回 `{ list: [], total }`，前端按现有分页方式使用即可。

### 6. 路径汇总（前端需对齐）

| 功能           | 方法 | 路径 |
|----------------|------|------|
| 产能提报       | POST | `/api/performance/capacity` |
| 产能列表       | GET  | `/api/performance/capacity` |
| 产线枚举       | GET  | `/api/performance/capacity/lines` |
| 工时统计提交   | POST | `/api/performance/worktime` |
| 工时统计列表   | GET  | `/api/performance/worktime` |
| 异常提交       | POST | `/api/performance/abnormal` |
| 异常列表       | GET  | `/api/performance/abnormal` |
| 工程填原因     | PUT  | `/api/performance/abnormal/:id/engineering` |
| 品质审批       | PUT  | `/api/performance/abnormal/:id/quality` |

说明：前端请求封装中 path 为「不含 /api 前缀」时（如 `/performance/capacity`），与 `API_BASE_URL`（含 `/api`）拼接后即为上表路径，无需在 path 中重复写 `/api`。

---

## 九、前端检查结果（与当前代码对照）

根据当前前端实现核对上述说明，结论如下。

| 项目 | 状态 | 说明 |
|------|------|------|
| 鉴权 / 401 | 已对齐 | `request.js` 已带 `Authorization: Bearer <token>`，401 会尝试刷新 Token 或跳转登录。 |
| 产能提交 | 待对接 | `capacity.vue` 的 `handleSubmit` 仍为本地 Toast，需改为调用 `post('/performance/capacity', body)`，Body 中 `passQuantity` 传 number。 |
| 产能列表 | 已对齐 | `performance.js` 的 `getCapacityList` 已调 `GET /performance/capacity`，参数一致；产能管理入口仅 `admin`/`管理员`/`manager` 可见，与「仅 admin/manager 可调」一致。 |
| 产线枚举 | 可选 | 当前 `capacity.vue` 产线为前端写死 DIP1线～DIP7线；若改用接口，可调 `GET /performance/capacity/lines` 取 `list` 作为下拉选项。 |
| 工时提交 | 待对接 | `worktime.vue` 的 `handleSubmit` 仍为本地 Toast，需改为调用 `post('/performance/worktime', body)`，必填与表单一致；成功按 2xx 提示即可。 |
| 工时列表 | 未实现 | 前端暂无工时列表页，若后端已提供 `GET /api/performance/worktime`，可后续加页面与分页。 |
| 异常提交/列表/工程/品质 | 待对接 | `abnormal.vue` 当前为本地内存列表，需接入：POST 提交、GET 列表（含 `source`/`qualityStatus`）、PUT 工程原因（`:id` 用返回的 `abnormalId`）、PUT 品质审批（Body `status`+`comment`）。 |
| 错误 Body | 建议统一 | 建议前端在请求封装中统一解析 4xx/5xx 的 `code`、`message`，Toast 提示 `message`，必要时按 `code` 分支。 |
| 分页格式 | 已对齐 | 产能列表已按 `{ list, total }` 使用；工时/异常列表对接时按同样格式即可。 |

如有单独接口文档，可将第八节的路径与字段说明合并进去，避免前后端命名不一致。
