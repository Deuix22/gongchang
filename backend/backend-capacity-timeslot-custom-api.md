# 产能提报 - 自定义时段与时段机型（后端对接文档）

> 对应前端变更：产能提报页不再自动生成 2 小时固定时段，改为用户自选开始/结束时间（半小时粒度），且每个时段可单独选择机型。  
> 关联前端文件：`src/pages/performance/capacity.vue`、`src/utils/api/performance.js`  
> 更完整的产能提报总览见：`backend-capacity-frontend-changes-checklist.md`

---

## 一、变更背景

### 1.1 旧逻辑（后端若仍按此校验需调整）

| 项目 | 旧行为 |
|------|--------|
| 时段生成 | 前端固定 8 档：`08:00-10:00` … `20:00-22:00`，每档 2 小时 |
| 时段标识 | 主要靠 `startHour`（8、10、12…20）与 `timeRange` |
| 机型 | 仅主表 `machineModel` 一个字段，所有时段共用 |
| 新增时段 | 按固定顺序自动追加下一档 |

### 1.2 新逻辑

| 项目 | 新行为 |
|------|--------|
| 时段选择 | 用户手动选择**开始时间**、**结束时间**，步长 **30 分钟**（`00:00`–`23:30`） |
| 时段标识 | 以 `startTime` + `endTime` 为准，`timeRange` 为展示用（如 `08:30-11:00`） |
| 机型 | 主表 `machineModel` 为**默认机型**；`timeSlots[].machineModel` 为**时段实际机型**（可与默认不同） |
| 新增时段 | 用户点击「新增时段」，数量与起止时间均不固定 |

### 1.3 业务场景

同一条产线在同一提报日内可能发生机型切换。例如：

- 默认机型：`机型-A`
- 时段 1 `08:00-10:30` 使用 `机型-A`
- 时段 2 `10:30-12:00` 切换为 `机型-B`

此时主表 `machineModel` 仍为默认机型，但时段 2 的 `machineModel` 为 `机型-B`，标准产能/人力/单台工时应按时段机型计算。

---

## 二、涉及接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/performance/capacity` | 产能提报提交（**主要变更**） |
| GET | `/api/performance/capacity` | 产能列表查询（返回字段需补充） |

`GET/PUT /api/performance/capacity/meta` 无需改动，仍提供线体、制程段、机型及 `modelConfigs`。

---

## 三、提交接口变更（P0）

### 3.1 主表字段

主表结构不变，`machineModel` 语义调整为**默认机型**（必填）。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| machineModel | string | 是 | 默认机型；时段未单独指定机型时使用此值 |
| singleWorkHours | number | 否 | 默认机型 + 制程段对应的单台工时快照（/min） |

### 3.2 `timeSlots` 每项 — 新增/调整字段

| 字段 | 类型 | 必填 | 变更 | 说明 |
|------|------|------|------|------|
| startTime | string | **是** | **新增** | 开始时间，`HH:mm`，分钟仅允许 `00` 或 `30` |
| endTime | string | **是** | **新增** | 结束时间，格式同上 |
| timeRange | string | 是 | 规则变化 | 由前端拼接，如 `08:30-11:00`；建议与 `startTime-endTime` 一致 |
| machineModel | string | 是 | **新增** | 时段实际机型；未自选时前端会填入默认机型 |
| singleWorkHours | number | 否 | 建议新增 | 该时段机型 + 制程段对应的单台工时快照（/min） |
| startHour | number | 否 | **降级为兼容** | 由 `startTime` 推算的小时整数（如 `08:30` → `8`）；**不可再作为唯一时段标识** |

其余已有字段（`productionMinutes`、`productionHours`、`standardCapacity`、`actualCapacity`、`standardManpower`、`actualManpower`、`standardCapacityPcs`、`outputHours`、`attendanceHours`、`capacityDifference`、`productionAchievementRate`、借入/借出人力、合格率等）**继续保留**，含义不变。

### 3.3 完整提交示例

```json
{
  "reportDate": "2026-06-24",
  "productionLine": "DIP6线",
  "teamLeader": "张三",
  "processSegment": "包装段",
  "machineModel": "机型-A",
  "personInCharge": "李四",
  "submitter": "王五",
  "singleWorkHours": 1.1,
  "reasonRemark": "",
  "timeSlots": [
    {
      "timeRange": "08:00-10:30",
      "startTime": "08:00",
      "endTime": "10:30",
      "startHour": 8,
      "machineModel": "机型-A",
      "productionMinutes": 120,
      "productionHours": 2,
      "standardCapacity": 600,
      "standardCapacityPcs": 1200,
      "actualCapacity": 1100,
      "standardManpower": 11,
      "actualManpower": 11,
      "singleWorkHours": 1.1,
      "outputHours": 20.17,
      "attendanceHours": 22,
      "capacityDifference": 100,
      "productionAchievementRate": 91.67
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
      "standardCapacityPcs": 600,
      "actualCapacity": 580,
      "standardManpower": 8,
      "actualManpower": 8,
      "singleWorkHours": 1.3,
      "outputHours": 12.57,
      "attendanceHours": 10,
      "capacityDifference": 20,
      "productionAchievementRate": 96.67
    }
  ]
}
```

### 3.4 后端校验要求（请替换旧固定时段校验）

#### （1）时间格式与粒度

```text
startTime、endTime 须匹配：^([01]\d|2[0-3]):(00|30)$
```

#### （2）时段有效性

- `endTime` 对应的分钟数须 **大于** `startTime`
- 时长须 **≥ 30 分钟**（前端已校验，后端建议复验）

#### （3）时段唯一性（同一笔提报内）

同一 `reportDate + productionLine + teamLeader + submitter`（或业务主键）下，**不允许**出现相同的 `startTime + endTime` 组合。

> 若采用「分次提交、合并追加时段」策略（见 `backend-capacity-frontend-changes-checklist.md` 第 4 节），合并时也应校验与已有 `timeSlots` 不重复。

#### （4）机型校验

- `timeSlots[].machineModel` 须在 `capacity/meta` 的 `models` 列表内（或与主表 `machineModel` 使用相同校验源）
- 每个时段的标准参数应基于 **`timeSlots[].machineModel` + `processSegment`**，而非仅主表 `machineModel`

#### （5）请移除或放宽的旧校验

若后端存在以下逻辑，**必须修改**：

| 旧校验 | 问题 | 建议 |
|--------|------|------|
| `startHour` 必须为 8/10/12/14/16/18/20 | 不再适用 | 改为校验 `startTime`/`endTime`；`startHour` 仅作兼容字段可选接收 |
| `timeRange` 必须为 2 小时整档 | 不再适用 | 允许任意符合半小时粒度的区间，如 `08:30-11:00` |
| 时段数量固定为 7 档 | 不再适用 | 允许 1～N 个时段 |
| 仅主表 `machineModel` 参与标准产能计算 | 换线场景错误 | 以 `timeSlots[].machineModel` 为准 |

---

## 四、列表查询接口变更（P0）

`GET /api/performance/capacity` 返回的每条记录及其 `timeSlots` 需**原样带回**以下字段，供管理页展示与导出：

| 字段 | 位置 | 说明 |
|------|------|------|
| startTime | timeSlots[] | 开始时间 |
| endTime | timeSlots[] | 结束时间 |
| machineModel | timeSlots[] | 时段机型 |
| singleWorkHours | timeSlots[] | 时段单台工时快照（可选，缺失时前端尝试用 meta 回算） |
| timeRange | timeSlots[] | 展示用时段文案 |

管理页行为：

- 当 `timeSlots[].machineModel` 与主表 `machineModel` 不同时，展示「时段机型」
- 导出 Excel 增加列：**时段机型**
- 产出工时等指标优先使用接口持久化值；回算时使用**时段机型**而非仅主表机型

### 4.1 列表返回示例（片段）

```json
{
  "list": [
    {
      "reportDate": "2026-06-24",
      "productionLine": "DIP6线",
      "machineModel": "机型-A",
      "processSegment": "包装段",
      "timeSlots": [
        {
          "timeRange": "08:00-10:30",
          "startTime": "08:00",
          "endTime": "10:30",
          "startHour": 8,
          "machineModel": "机型-A",
          "singleWorkHours": 1.1,
          "productionMinutes": 120,
          "outputHours": 20.17,
          "attendanceHours": 22
        },
        {
          "timeRange": "10:30-12:00",
          "startTime": "10:30",
          "endTime": "12:00",
          "startHour": 10,
          "machineModel": "机型-B",
          "singleWorkHours": 1.3,
          "productionMinutes": 75,
          "outputHours": 12.57,
          "attendanceHours": 10
        }
      ]
    }
  ]
}
```

---

## 五、人力总达成率统计范围调整（P1）

前端管理页「人力总达成率」的统计范围已从**固定 2 小时档**调整为：

> 时段与 **08:00–22:00** 有重叠即纳入统计（按 `startTime`/`endTime` 或 `timeRange` 解析）。

判断逻辑（与前端 `capacityCalculations.js` 一致）：

```javascript
function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function isSlotInDayShiftRange(slot) {
  const start = parseTimeToMinutes(slot.startTime) // 或从 timeRange 解析
  const end = parseTimeToMinutes(slot.endTime)
  const DAY_START = 8 * 60   // 08:00
  const DAY_END = 22 * 60    // 22:00
  return start < DAY_END && end > DAY_START
}
```

**示例：**

| 时段 | 是否纳入 08:00–22:00 统计 |
|------|---------------------------|
| `07:30-08:30` | 是（与 08:00 重叠） |
| `08:00-10:30` | 是 |
| `21:00-23:00` | 是（与 22:00 重叠） |
| `22:00-23:30` | 否 |
| `06:00-07:00` | 否 |

若后端自行计算人力总达成率，请同步更新筛选逻辑；**不要**再依赖 `startHour ∈ {8,10,12,14,16,18,20}`。

---

## 六、数据库 / 存储建议

### 6.1 `timeSlots` JSON 或明细表

建议在时段明细中增加列（或在 JSON 中增加键）：

| 字段 | 类型 | 说明 |
|------|------|------|
| start_time | string(5) | `HH:mm` |
| end_time | string(5) | `HH:mm` |
| machine_model | string | 时段机型 |
| single_work_hours | decimal | 时段单台工时快照 |

`start_hour` 可保留但标记为 deprecated，新数据由 `start_time` 推导。

### 6.2 索引与去重

若时段存明细表，建议唯一约束（按业务主键调整）：

```text
(report_id, start_time, end_time) UNIQUE
```

### 6.3 历史数据兼容

| 场景 | 处理方式 |
|------|----------|
| 旧记录仅有 `startHour` + `timeRange`（如 `08:00-10:00`） | 列表返回时可补全：`startTime: "08:00"`, `endTime: "10:00"`（从 `timeRange` 解析） |
| 旧记录无 `timeSlots[].machineModel` | 列表返回时回退为主表 `machineModel` |
| 旧记录 `timeRange` 为 2 小时档 | 继续有效，无需迁移 |

---

## 七、分次提交策略（不变，但去重键变化）

前端仍可能**分多次**提交同一日的不同未填时段（已提交时段在本地标记为 `submitted` 后不再重复提交）。

后端若采用「按日合并追加 `timeSlots`」：

- 去重键由 **`startHour`** 改为 **`startTime + endTime`**
- 追加前校验新时段不与已有 `timeSlots` 重复

---

## 八、后端改造检查清单

### P0（阻塞联调）

- [ ] `POST /performance/capacity` 接收并持久化 `timeSlots[].startTime`、`endTime`、`machineModel`
- [ ] 移除「`startHour` 必须为 8/10/12…」或「时段必须 2 小时」等固定档位校验
- [ ] 校验 `startTime`/`endTime` 为半小时粒度，且 `endTime > startTime`、时长 ≥ 30 分钟
- [ ] 同一提报内 `startTime + endTime` 不重复（含合并追加场景）
- [ ] `timeSlots[].machineModel` 参与标准参数校验；允许与主表 `machineModel` 不同
- [ ] `GET /performance/capacity` 列表返回 `startTime`、`endTime`、`machineModel`（及建议的 `singleWorkHours`）
- [ ] 分次提交合并时，按 `startTime + endTime` 去重

### P1（统计与报表一致）

- [ ] 人力总达成率统计：时段与 08:00–22:00 重叠即纳入（不再依赖 `startHour` 枚举）
- [ ] 导出/报表按时段展开时增加「时段机型」列
- [ ] 旧数据无 `startTime`/`endTime` 时，从 `timeRange` 解析补全

### P2（可选增强）

- [ ] 后端校验同一提报内时段互不重叠（前端当前仅校验完全重复，未校验部分重叠）
- [ ] 时段明细表增加 `start_time`/`end_time` 索引，便于按时间范围查询

---

## 九、联调验证用例

1. **自定义半小时时段**  
   提交 `08:30-11:00`，后端落库并列表原样返回 `startTime`/`endTime`/`timeRange`。

2. **换机型**  
   主表 `machineModel=机型-A`，某时段 `machineModel=机型-B`；列表该时段展示机型-B，标准产能与 `singleWorkHours` 对应机型-B。

3. **多时段自由新增**  
   同一日提交 3 个以上非固定档位时段，均成功保存。

4. **分次提交不重复**  
   先提交 `08:00-09:30`，再提交 `09:30-11:00`；两次合并后共 2 条 `timeSlots`，无覆盖。

5. **重复时段拒绝**  
   第二次再提交 `08:00-09:30` 应返回 400（或业务错误码），提示时段重复。

6. **旧数据兼容**  
   仅有 `startHour: 8`、`timeRange: "08:00-10:00"` 的历史记录，管理页仍可正常展示。

---

## 十、与现有文档的关系

| 文档 | 关系 |
|------|------|
| `backend-capacity-frontend-changes-checklist.md` | 产能提报总体对接清单；本文档为其**时段与机型**专项补充 |
| `backend-capacity-report-api.md` | 部分内容为旧版单条提报结构，**时段相关以本文档为准** |
| `backend-capacity-meta-api.md` | 无变更，机型列表仍来自 meta |

---

**文档版本**：2026-06-24  
**前端版本**：产能提报自定义时段 + 时段机型自选
