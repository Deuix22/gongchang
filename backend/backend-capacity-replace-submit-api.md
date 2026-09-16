# 产能提报 - 编辑修改与整单覆盖提交（后端对接文档）

> 对应前端变更：产能提报页允许对已填写/正在填写的内容**随时修改、删除**；重新提交时以**整单覆盖**方式更新后端，确保产能管理页同一业务主键仅展示**唯一且最新**的一条记录。  
> 关联前端文件：`src/pages/performance/capacity.vue`、`src/utils/api/performance.js`  
> 相关文档：`backend-capacity-timeslot-custom-api.md`（自定义时段与时段机型）、`backend-capacity-frontend-changes-checklist.md`（总体清单）

---

## 一、变更背景

### 1.1 旧逻辑（后端若仍按此实现需调整）

| 项目 | 旧行为 |
|------|--------|
| 已提交时段 | 前端本地标记 `submitted`，字段锁定不可改 |
| 提交范围 | 每次仅提交**未提交的新时段**（`timeSlots` 为增量） |
| 后端策略 | 推荐「合并追加」：新 `timeSlots` append 到已有记录 |
| 修改历史数据 | 无法在前端修改已提交时段；需后端手动处理 |
| 管理页风险 | 多次 append 或每次新建，可能出现**重复记录**或**旧时段残留** |

### 1.2 新逻辑

| 项目 | 新行为 |
|------|--------|
| 时段编辑 | 所有时段均可修改、删除，无「已提交锁定」 |
| 提交范围 | 每次提交**当前表单全部有效时段**（非增量） |
| 覆盖标志 | 请求体固定带 `replaceExisting: true` |
| 记录定位 | 优先带已有记录 `id`；业务主键见下文 |
| 删除时段 | 用户删除某时段后提交，该时段不应再出现在库中 |
| 回显 | 填写日期+线体+组长后，前端调用列表接口拉取已有记录编辑 |

---

## 二、业务主键与唯一性（P0）

### 2.1 业务主键定义

同一提报日在系统中应视为**一条记录**的维度：

```text
reportDate + productionLine + teamLeader + submitter
```

| 字段 | 类型 | 说明 |
|------|------|------|
| reportDate | string | 提报日期，`YYYY-MM-DD` |
| productionLine | string | 线体 |
| teamLeader | string | 组长（去首尾空格后匹配） |
| submitter | string | 提交人（登录账号姓名） |

### 2.2 唯一性要求

- 数据库层建议对上述四字段建**唯一索引**（或等价约束）。
- `GET /api/performance/capacity` 列表中，同一业务主键**不得返回多条**重复记录。
- 若历史数据已存在重复，需一次性清洗合并（见第六节）。

---

## 三、提交接口变更 `POST /api/performance/capacity`（P0）

### 3.1 新增请求字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| replaceExisting | boolean | 是 | 前端恒为 `true`；表示**整单覆盖**，非 append |
| id | string | 否 | 已有记录 ID；编辑后再次提交时会带上，便于后端精准更新 |

其余主表字段（`reportDate`、`productionLine`、`teamLeader`、`processSegment`、`machineModel`、`personInCharge`、`submitter`、`reasonRemark`、`singleWorkHours`）及 `timeSlots` 数组结构**保持不变**，详见 `backend-capacity-timeslot-custom-api.md`。

### 3.2 `timeSlots` 提交语义变化

| 对比项 | 旧语义 | 新语义 |
|--------|--------|--------|
| 数组内容 | 仅本次新增时段 | **当前表单全部有效时段** |
| 修改已有时段 | 不支持 | 修改后的完整数据随本次提交覆盖 |
| 删除时段 | 不支持 | 请求中不含该时段 → 库中应删除 |
| 空时段 | — | 前端不会提交空白时段行 |

> **重要**：后端收到 `replaceExisting: true` 时，`timeSlots` 必须以请求体为准**全量替换**，禁止与旧 `timeSlots` 做 merge/append。

### 3.3 完整请求示例

**首次提交（无 `id`）：**

```json
{
  "replaceExisting": true,
  "reportDate": "2026-06-24",
  "productionLine": "DIP6线",
  "teamLeader": "张三",
  "processSegment": "包装段",
  "machineModel": "S.XB390DZBE.2自动线",
  "personInCharge": "李四",
  "submitter": "王五",
  "singleWorkHours": 1.08,
  "reasonRemark": "",
  "timeSlots": [
    {
      "timeRange": "08:00-10:30",
      "startTime": "08:00",
      "endTime": "10:30",
      "startHour": 8,
      "machineModel": "S.XB390DZBE.2自动线",
      "productionMinutes": 120,
      "productionHours": 2,
      "standardCapacity": 550,
      "standardCapacityPcs": 1100,
      "actualCapacity": 1000,
      "standardManpower": 10,
      "actualManpower": 10,
      "singleWorkHours": 1.08,
      "outputHours": 18,
      "attendanceHours": 20,
      "capacityDifference": 100,
      "productionAchievementRate": 90.91
    },
    {
      "timeRange": "10:30-12:00",
      "startTime": "10:30",
      "endTime": "12:00",
      "startHour": 10,
      "machineModel": "机型-B",
      "productionMinutes": 75,
      "productionHours": 1.25,
      "standardCapacity": 480,
      "actualCapacity": 460,
      "standardManpower": 8,
      "actualManpower": 8
    }
  ]
}
```

**修改后再次提交（带 `id`，且删除了第二个时段、修改了第一个时段产量）：**

```json
{
  "replaceExisting": true,
  "id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "reportDate": "2026-06-24",
  "productionLine": "DIP6线",
  "teamLeader": "张三",
  "processSegment": "包装段",
  "machineModel": "S.XB390DZBE.2自动线",
  "personInCharge": "李四",
  "submitter": "王五",
  "reasonRemark": "修正产量",
  "timeSlots": [
    {
      "timeRange": "08:00-10:30",
      "startTime": "08:00",
      "endTime": "10:30",
      "machineModel": "S.XB390DZBE.2自动线",
      "productionMinutes": 120,
      "productionHours": 2,
      "standardCapacity": 550,
      "actualCapacity": 980,
      "standardManpower": 10,
      "actualManpower": 10
    }
  ]
}
```

期望落库结果：**仅 1 条记录**，且 `timeSlots` **只有 1 个时段**；`10:30-12:00` 时段已被删除，不得残留。

### 3.4 后端处理流程（推荐）

```javascript
async function submitCapacity(body) {
  const key = {
    reportDate: trim(body.reportDate),
    productionLine: trim(body.productionLine),
    teamLeader: trim(body.teamLeader),
    submitter: trim(body.submitter)
  }

  validateCapacityBody(body) // 含 timeSlots 校验，见 timeslot 文档

  if (body.replaceExisting !== false) {
    // 1. 优先按 id 查找（若传入且属于当前用户/权限范围内）
    let existing = body.id ? await findById(body.id) : null

    // 2. 否则按业务主键查找
    if (!existing) {
      existing = await findByBusinessKey(key)
    }

    if (existing) {
      // 整单覆盖：主表字段 + timeSlots 全量替换
      return await updateRecord(existing.id, {
        ...pickMainFields(body),
        timeSlots: body.timeSlots, // 全量替换，非 append
        updatedAt: new Date()
      })
    }
  }

  // 新建
  return await createRecord({
    ...pickMainFields(body),
    timeSlots: body.timeSlots
  })
}
```

### 3.5 请移除或禁止的旧逻辑

若后端存在以下行为，**必须停用**：

| 旧逻辑 | 问题 |
|--------|------|
| 收到 POST 一律 append `timeSlots` | 删除/修改无效，旧时段残留 |
| 每次 POST 新建一条记录 | 管理页出现多条重复 |
| 忽略 `replaceExisting` | 无法保证唯一最新 |
| 仅按 `timeRange` 去重追加 | 用户修改时段内容时无法覆盖原值 |

### 3.6 响应要求

成功响应建议返回：

```json
{
  "success": true,
  "id": "64f1a2b3c4d5e6f7a8b9c0d1"
}
```

- 前端会用返回的 `id` 更新本地 `serverRecordId`，供下次覆盖提交使用。
- 若无 `id` 字段，前端仍可工作，但依赖业务主键查回记录。

---

## 四、列表查询接口 `GET /api/performance/capacity`（P0）

前端通过列表接口**回显已有提报**供编辑，调用方式：

```http
GET /api/performance/capacity?reportDate=2026-06-24&productionLine=DIP6线&teamLeader=张三&submitter=王五&pageSize=20
```

### 4.1 查询要求

| 要求 | 说明 |
|------|------|
| 精确筛选 | `reportDate`、`productionLine` 需支持精确匹配 |
| 组长/提交人 | `teamLeader`、`submitter` 建议支持精确或前缀匹配 |
| 返回完整 `timeSlots` | 含 `startTime`、`endTime`、`machineModel` 及各指标字段 |
| 返回 `id` | 供前端再次提交时带回 |
| 返回 `updatedAt` | 前端在多条命中时取最新一条 |
| 唯一性 | 同一业务主键 ideally 只返回 1 条；若有多条，前端取 `updatedAt` 最新 |

### 4.2 列表返回示例

```json
{
  "list": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "reportDate": "2026-06-24",
      "productionLine": "DIP6线",
      "teamLeader": "张三",
      "processSegment": "包装段",
      "machineModel": "S.XB390DZBE.2自动线",
      "personInCharge": "李四",
      "submitter": "王五",
      "reasonRemark": "",
      "singleWorkHours": 1.08,
      "createdAt": "2026-06-24T08:30:00.000Z",
      "updatedAt": "2026-06-24T10:15:00.000Z",
      "timeSlots": [
        {
          "timeRange": "08:00-10:30",
          "startTime": "08:00",
          "endTime": "10:30",
          "machineModel": "S.XB390DZBE.2自动线",
          "productionMinutes": 120,
          "productionHours": 2,
          "standardCapacity": 550,
          "actualCapacity": 980,
          "standardManpower": 10,
          "actualManpower": 10,
          "outputHours": 17.64,
          "attendanceHours": 20
        }
      ]
    }
  ],
  "total": 1
}
```

### 4.3 产能管理页要求

- 列表展示与导出均基于上述唯一记录。
- 用户修改并重新提交后，管理页应立刻（或刷新后）看到**覆盖后的最新数据**，不应并列显示旧版。

---

## 五、主表字段同步更新

覆盖提交时，除 `timeSlots` 外，以下主表字段也会随请求更新，后端应一并写入：

| 字段 | 说明 |
|------|------|
| processSegment | 制程段 |
| machineModel | 默认机型 |
| personInCharge | 负责人 |
| reasonRemark | 原因说明 |
| singleWorkHours | 默认机型+制程段单台工时快照 |

用户修改表单头信息后重新提交，管理页应展示更新后的主表字段。

---

## 六、历史数据清洗（P1，建议上线前完成）

若旧版 append/多次新建已产生重复数据，建议执行一次性清洗：

### 6.1 识别重复

按业务主键分组：

```sql
SELECT report_date, production_line, team_leader, submitter, COUNT(*) AS cnt
FROM capacity_reports
GROUP BY report_date, production_line, team_leader, submitter
HAVING COUNT(*) > 1;
```

### 6.2 合并策略

对每个重复组：

1. 保留 `updatedAt`（或 `createdAt`）**最新**的一条作为主记录。
2. 若旧策略为 append-only 且最新记录 `timeSlots` 不完整，可将各条记录的 `timeSlots` 按 `startTime+endTime` 去重合并到主记录（**仅迁移用**）。
3. 删除同组其余记录。

### 6.3 上线后

启用唯一索引，新的 `replaceExisting: true` 提交不再产生重复。

---

## 七、与旧文档的差异说明

| 文档/章节 | 原说明 | 现说明 |
|-----------|--------|--------|
| `backend-capacity-frontend-changes-checklist.md` 第四节 | 推荐 append 合并（方案 A） | **已废弃**；改为整单覆盖 |
| `backend-capacity-timeslot-custom-api.md` 第七节 | 整单覆盖策略 | 与本文档一致，可交叉引用 |
| 前端草稿 `submitted` 标记 | 本地锁定已提交时段 | **已移除**；编辑态完全开放 |

---

## 八、后端改造检查清单

### P0（阻塞联调）

- [ ] `POST /performance/capacity` 接收 `replaceExisting: true`
- [ ] `replaceExisting: true` 时按 `id` 或业务主键查找记录并**整单覆盖**（主表 + `timeSlots` 全量替换）
- [ ] 禁止默认 append 合并 `timeSlots`
- [ ] 用户删除时段后重新提交，库中对应时段被删除
- [ ] 业务主键唯一：`(reportDate, productionLine, teamLeader, submitter)`
- [ ] 成功响应返回 `id`
- [ ] `GET /performance/capacity` 支持 `reportDate` + `productionLine` + `teamLeader` + `submitter` 精确查询
- [ ] 列表返回完整 `timeSlots`、`id`、`updatedAt`

### P1（数据质量）

- [ ] 清洗历史重复记录
- [ ] 加唯一索引防止再次重复
- [ ] 管理页/导出不再出现同一主键多条记录

### P2（可选）

- [ ] 覆盖提交写审计日志（谁、何时、改了哪些时段）
- [ ] 支持 `replaceExisting: false` 的显式拒绝（返回 400 提示升级），避免误用旧客户端

---

## 九、联调验证用例

| # | 步骤 | 期望结果 |
|---|------|----------|
| 1 | 首次提交 2 个时段 | 库中 1 条记录，2 个 `timeSlots` |
| 2 | 修改第 1 时段 `actualCapacity`，再次提交（带 `id`） | 同一条记录被更新，产量为新值 |
| 3 | 删除第 2 时段，再次提交 | 同一条记录仅剩 1 个 `timeSlots` |
| 4 | 修改主表 `reasonRemark`，再次提交 | 主表字段更新，管理页可见 |
| 5 | 用 GET 按日期+线体+组长+提交人查询 | 返回 1 条最新记录，前端可回显编辑 |
| 6 | 同一主键连续提交 3 次 | 库中始终只有 1 条记录 |
| 7 | 产能管理页刷新 | 仅展示最新数据，无重复行、无已删时段 |

---

## 十、常见问题

**Q：还需要支持旧的 append 吗？**  
A：不需要。前端已全部改为整单覆盖；后端若继续 append 会导致删除/modify 不生效。

**Q：`id` 与业务主键冲突怎么办？**  
A：优先信任 `id` 定位记录；若 `id` 无效则回退业务主键；更新后仍保持业务主键唯一。

**Q：用户提交 0 个时段可以吗？**  
A：前端校验不允许；后端也应拒绝空 `timeSlots`（400）。

**Q：不同 submitter 同一日期/线体/组长算几条？**  
A：按当前设计为不同记录（`submitter` 在主键内）。若业务要求合并，需产品另行确认并同步改前端主键逻辑。

---

**文档版本**：2026-06-24  
**前端版本**：产能提报可编辑 + 整单覆盖提交
