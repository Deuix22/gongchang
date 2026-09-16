# 产能模块后端配合说明（最终版）

> 本文汇总「产能提报 / 产能管理 / 基础数据维护」前端改版后，**后端需要检查、修改或确认**的全部事项。  
> 前端涉及文件：`src/pages/performance/capacity.vue`、`capacity-manage.vue`、`capacity-config.vue`，API：`src/utils/api/performance.js`。

---

## 一、改动概览

| 模块 | 主要变化 |
|------|----------|
| 产能提报 | 表单字段全部更换；按 2 小时分时段填报；支持分次提交时段；草稿仅存客户端 |
| 产能基础数据维护 | 维护 **线体（lines）**、**制程段（processes）**、**机型（models）**；每机型按制程段维护 **单台工时（/min）、标准产能（PCS/H）、标准人力** |
| 产能管理 | 筛选与列表、导出对齐新字段；兼容旧格式历史数据展示 |

---

## 二、优先级说明

| 级别 | 说明 |
|------|------|
| **P0 必改** | 不改则核心功能不可用（已出现 400 等错误） |
| **P1 应改** | 不改则管理页查询/导出、分次提报体验不完整 |
| **P2 建议** | 兼容、性能或数据一致性优化 |

---

## 三、P0：提交接口 `POST /api/performance/capacity`

### 3.1 请求体已切换为新结构（旧字段不再提交）

前端**不再**发送：`batchNo`、`model`、`process`、`passQuantity`、`startDate`、`startTime`、`endDate`、`endTime`、`attendanceHours`、`outputHours`、`uph` 等。

当前实际发送示例：

```json
{
  "reportDate": "2026-06-03",
  "productionLine": "SMT-A线",
  "teamLeader": "张三",
  "processSegment": "插件",
  "machineModel": "机型-X",
  "personInCharge": "李四",
  "submitter": "王五",
  "timeSlots": [
    {
      "timeRange": "08:00-10:00",
      "startHour": 8,
      "productionMinutes": 120,
      "productionHours": 2,
      "standardCapacity": 100,
      "actualCapacity": 95,
      "standardManpower": 5,
      "actualManpower": 5,
      "borrowedInManpower": 2,
      "borrowedInPosition": "支援岗",
      "lentOutManpower": 1,
      "lentOutPosition": "测试岗",
      "ictPassRate": "99%",
      "fctPassRate": "98%",
      "reasonRemark": "设备故障导致产能偏低"
    }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| reportDate | string | 是 | 提报日期，YYYY-MM-DD |
| productionLine | string | 是 | 线体，须在 meta.lines 内 |
| teamLeader | string | 是 | 组长 |
| processSegment | string | 是 | 制程段，建议在 meta.processes 内 |
| machineModel | string | 是 | 机型 |
| personInCharge | string | 是 | 负责人 |
| submitter | string | 是 | 提交人（登录账号姓名） |
| timeSlots | array | 是 | 分时段产能数据（见下表） |

**timeSlots 每项：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| timeRange | string | 是 | 如 `08:00-10:00` |
| startHour | number | 是 | 时段起始小时，如 8 |
| productionMinutes | number | 是 | 生产分钟数 |
| productionHours | number | 是 | 生产小时数，单位 H |
| standardCapacity | number | 是 | 标准产能，单位 PCS/H |
| actualCapacity | number | 是 | 实际产能，单位 PCS |
| standardManpower | number | 是 | 标准人力 |
| actualManpower | number | 是 | 实际出勤人力 |
| borrowedInManpower | number | 否 | 借入人力 |
| borrowedInPosition | string | 否 | 借入人力岗位 |
| lentOutManpower | number | 否 | 借出人力 |
| lentOutPosition | string | 否 | 借出人力岗位 |
| ictPassRate | string | 否 | ICT 合格率 |
| fctPassRate | string | 否 | FCT 合格率 |
| reasonRemark | string | 否 | 该时段原因说明（选填） |

**后端需检查：**

- [ ] 入参校验、DTO、数据库表结构是否仍要求旧必填字段（会导致 400）。
- [ ] 能正确解析并持久化上表全部字段及 `timeSlots` 数组。
- [ ] 数值字段为 number；可选人力/合格率字段允许不传。

### 3.2 线体校验修复（P0，当前线上已报错）

#### 问题现象

前端在「产能基础数据维护」中新增了自定义线体（如 `SMT-A线`），提报页下拉可正常选择，但提交时报：

```http
POST /api/performance/capacity
400 Bad Request

{
  "error": {
    "message": "productionLine 须为 DIP1线～DIP7线 之一"
  }
}
```

#### 原因

`POST /performance/capacity` 仍将 `productionLine` **写死校验**为 DIP1～DIP7，与 `GET/PUT /performance/capacity/meta` 中维护的 `lines` **不一致**。

#### 修复要求

1. **线体合法集合** = `capacity/meta` 中保存的 `lines` 数组（去重、去首尾空格后匹配）。
2. `GET /performance/capacity/lines` 返回的 `list`（或 `lines`）应与 meta 中 `lines` **完全一致**（建议直接读同一份存储）。
3. `PUT /performance/capacity/meta` 保存 `lines` 后，提交接口立即认可新线体，**无需发版**。
4. 仅当 meta 中 `lines` 为空时，可回退默认：`DIP1线`～`DIP7线`。

#### 参考实现（Node.js 伪代码）

```javascript
const DEFAULT_LINES = ['DIP1线', 'DIP2线', 'DIP3线', 'DIP4线', 'DIP5线', 'DIP6线', 'DIP7线']

async function getAllowedProductionLines() {
  const meta = await loadCapacityMetaFromDb() // 与 GET /capacity/meta 同源
  const lines = (meta?.lines || [])
    .map((s) => String(s).trim())
    .filter(Boolean)
  return lines.length > 0 ? [...new Set(lines)] : DEFAULT_LINES
}

async function validateCapacitySubmit(body) {
  const allowed = await getAllowedProductionLines()
  const line = String(body.productionLine || '').trim()
  if (!allowed.includes(line)) {
    throw badRequest(`productionLine 须为已维护线体之一：${allowed.join('、')}`)
  }

  const processes = await getAllowedProcesses() // meta.processes，逻辑同上
  const segment = String(body.processSegment || '').trim()
  if (processes.length && segment && !processes.includes(segment)) {
    throw badRequest(`processSegment 须为已维护制程段之一`)
  }
}
```

#### 线体相关验收

1. [ ] admin 在「产能基础数据维护」新增线体 `测试线X` 并保存。
2. [ ] 普通用户提报页选择 `测试线X`，填写必填项后提交 → **200 成功**（非 400）。
3. [ ] `GET /performance/capacity/lines` 响应包含 `测试线X`。

### 3.3 制程段校验

- [ ] `processSegment` 建议在 meta.`processes` 内校验（逻辑同线体，见上文伪代码）。
- [ ] 若数据库字段名仍为 `process`，需兼容接收 `processSegment` 或做字段映射。

---

## 四、P1：分次提交时段（业务逻辑需后端确认）

前端行为：

1. 用户先提交 `08:00-10:00`，成功后在本地标记该时段「已提交」。
2. 稍后只提交 `10:00-12:00` 时，请求体中 **`timeSlots` 仅包含本次新增时段**（不含已提交时段）。
3. 同一次提报的公共字段（日期、线体、组长、机型等）每次提交都会带上。

**后端需确认并实现一种策略（请与产品对齐）：**

| 方案 | 说明 | 建议 |
|------|------|------|
| A. 合并更新 | 按 **`reportDate + productionLine + teamLeader + processSegment + submitter`**（或 `recordKey`）查找记录，将新 `timeSlots` **追加**到**同一制程段**已有记录 | **推荐**；同一组长不同制程段须为**独立多条记录** |
| B. 每次新建 | 每次 POST 生成独立记录，管理页按多条展示 | 需前端改展示逻辑 |
| C. 拒绝部分提交 | 要求每次 POST 带全天全部时段 | 与当前前端不符 |

**【P0】同一组长多制程段：**

- 唯一键**必须包含 `processSegment`（或 `process`）**，不可仅用 `reportDate + teamLeader + submitter`。
- 前端每次 POST 会携带 `recordKey`：`{reportDate}__{productionLine}__{teamLeader}__{processSegment}`，后端请以此（或等价字段）区分记录。
- 示例：张三组长同一天提报「插件段」与「包装段」，管理页应显示 **2 条**记录，而非后者覆盖前者。

**【P0】MongoDB 唯一索引（当前报错 `E11000 duplicate key uniq_v2_capacity_business_key`）：**

旧索引（错误，不含制程段）：
```js
{ reportDate: 1, productionLine: 1, teamLeader: 1, submitter: 1 }
```

应改为（含制程段）：
```js
{ reportDate: 1, productionLine: 1, teamLeader: 1, processSegment: 1, submitter: 1 }
// 或 process 字段，与入库字段一致
```

迁移步骤：
1. `db.capacityreports.dropIndex("uniq_v2_capacity_business_key")`
2. 创建新唯一索引（字段名与文档 schema 一致）
3. POST 逻辑：按 `recordKey` 或上述复合键 upsert，**不同 processSegment 必须 insert 新文档**

前端已传 `recordKey` 示例：`2026-07-08__DIP2线__1__包装段`

**检查项：**

- [ ] 明确采用方案并实现，避免重复时段或覆盖已提交时段。
- [ ] 同一用户、同一日期、同一线体重复提交同一 `timeRange` 时的幂等/去重策略。

> 说明：已提交时段的「回填」目前仅 **客户端 localStorage 草稿**，不依赖后端接口。

---

## 五、P1：列表查询 `GET /api/performance/capacity`（产能管理页）

### 5.1 查询参数（前端已传）

| 参数 | 说明 |
|------|------|
| `productionLine` | 线体（精确） |
| `processSegment` | 制程段（精确）；同时兼容传 `process` |
| `machineModel` | 机型关键字（模糊）；同时兼容传 `model` |
| `teamLeader` | 组长关键字（模糊） |
| `submitter` | 提交人关键字（模糊） |
| `personInCharge` | 负责人关键字（模糊） |
| `reportDate` | 提报日期（精确，可选） |
| `startDate` / `endDate` | 提报日期范围 |
| `page` / `pageSize` | 分页（管理页常传 `pageSize=9999` 后前端再分页） |

**检查项：**

- [ ] 支持上述新参数筛选（至少 `productionLine`、`startDate`/`endDate`）。
- [ ] 暂不支持时，前端会对返回结果做**二次本地过滤**（功能可用但性能差）。

### 5.2 响应结构（管理页列表 / 导出依赖）

每条记录建议包含：

```json
{
  "id": "xxx",
  "reportDate": "2026-06-03",
  "productionLine": "DIP1线",
  "teamLeader": "张三",
  "processSegment": "插件",
  "machineModel": "机型-X",
  "personInCharge": "李四",
  "submitter": "王五",
  "timeSlots": [
    {
      "timeRange": "08:00-10:00",
      "startHour": 8,
      "productionMinutes": 120,
      "productionHours": 2,
      "standardCapacity": 100,
      "actualCapacity": 95,
      "standardManpower": 5,
      "actualManpower": 5,
      "borrowedInManpower": 2,
      "borrowedInPosition": "支援岗",
      "lentOutManpower": 1,
      "lentOutPosition": "测试岗",
      "ictPassRate": "99%",
      "fctPassRate": "98%",
      "reasonRemark": "设备故障导致产能偏低"
    }
  ],
  "createdAt": "2026-06-03T02:00:00.000Z"
}
```

**检查项：**

- [ ] 列表返回 `timeSlots` 数组（管理页按时段块展示；导出按时段拆行）。
- [ ] 旧数据无 `timeSlots` 时可保留旧字段，前端会走「历史格式」兼容展示（`batchNo`、`model`、`process`、`passQuantity`、`startDate` 等）。

---

## 六、P1：基础数据 `GET/PUT /api/performance/capacity/meta`

### 6.1 当前前端使用的字段

| 字段 | 用途 |
|------|------|
| `lines` | 线体下拉、提交校验数据源 |
| `processes` | 制程段下拉、建议提交校验数据源 |
| `models` | 机型下拉列表 |
| `modelConfigs` | 按机型 + 制程段维护参数，外层键为机型名，内层键为制程段名 |

**`modelConfigs` 结构（按机型 + 制程段）：**

```json
{
  "机型-X": {
    "插件": {
      "singleWorkHours": 1.5,
      "standardCapacity": 100,
      "standardManpower": 5
    },
    "测试": {
      "singleWorkHours": 2.0,
      "standardCapacity": 80,
      "standardManpower": 4
    }
  }
}
```

**制程段下每项字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `singleWorkHours` | number | 单台工时，单位 **/min**（该机型在该制程段生产一台所需分钟数） |
| `standardCapacity` | number | 标准产能，单位 PCS/H |
| `standardManpower` | number | 标准人力 |

完整示例：

```json
{
  "lines": ["SMT-A线", "DIP1线"],
  "processes": ["插件", "测试"],
  "models": ["机型-X", "机型-Y"],
  "modelConfigs": {
    "机型-X": {
      "插件": {
        "singleWorkHours": 1.5,
        "standardCapacity": 100,
        "standardManpower": 5
      },
      "测试": {
        "singleWorkHours": 2.0,
        "standardCapacity": 80,
        "standardManpower": 4
      }
    }
  }
}
```

**检查项：**

- [ ] `GET /meta` 返回 `models`、`modelConfigs`；提报页按 **机型 + 制程段** 匹配参数，只读展示单台工时，各时段标准产能/标准人力自动带出。
- [ ] `PUT /meta` 支持保存嵌套 `modelConfigs`；`singleWorkHours` 按 **/min** 存储与返回；**仅保存有填写内容的制程段**，未涉及的制程段可不传或为空。
- [ ] 同一机型不必维护全部制程段，提报时按所选「机型 + 制程段」匹配已有配置即可。
- [ ] 兼容旧版扁平 `modelConfigs[机型] = { singleWorkHours, ... }`（不区分制程段）；新数据请使用按制程段嵌套结构。
- [ ] 兼容旧字段 `modelWorktimes`（若存在）：前端会映射为扁平 `singleWorkHours`；若历史数据为「小时」，需后端迁移或约定换算后再写入。
- [ ] `POST /performance/capacity` 的 `productionLine` 校验必须与 meta.`lines` 一致（见第三节 3.2）。

### 6.2 已废弃（兼容读取即可）

| 字段 | 说明 |
|------|------|
| `modelWorktimes` | 旧版单台工时映射；前端读取后会转为扁平 `modelConfigs[机型].singleWorkHours`，新数据请用按制程段嵌套的 `modelConfigs` |

---

## 七、P2：`GET /api/performance/capacity/lines`

- [ ] 返回格式支持 `{ "list": ["线体1", "线体2"] }` 或 `{ "lines": [...] }`（前端两种都兼容）。
- [ ] 内容与 meta.`lines` 一致（见第三节 3.2）。

---

## 八、权限与其它

| 项目 | 说明 |
|------|------|
| 提交权限 | 登录用户均可提报（与现网一致即可） |
| `PUT /capacity/meta` | 仅 **admin** 可写 |
| `GET /capacity` 列表 | 产能管理页：建议 **admin / manager**（与现网一致即可） |
| 鉴权 | 继续 `Authorization: Bearer <token>` |

---

## 九、旧数据兼容建议

- [ ] 历史产能记录保留旧字段即可，无需强制迁移；新查询按 `reportDate` 等新字段过滤。
- [ ] 新提交只写新结构；若需报表统计，可按 `timeSlots` 展开为明细表。
- [ ] 导出/列表：前端已兼容旧记录展示，后端无需为旧数据补 `timeSlots`。

---

## 十、联调验收清单（建议逐项打勾）

### 提报

1. [ ] meta 新增线体 `测试线X` 后，提报选择 `测试线X` 提交成功（非 400）。
2. [ ] 提交 Body 含 `timeSlots`，库内可查到对应时段明细。
3. [ ] 先提交 08:00-10:00，再只提交 10:00-12:00，业务上合并或展示符合约定（见第四节）。
4. [ ] 制程段选 meta 中维护项，提交成功。

### 管理

5. [ ] 按线体、日期范围查询到新提报记录。
6. [ ] 列表中能看到 `timeSlots` 各时段字段。
7. [ ] 关键字筛选组长/机型/提交人（后端支持或前端本地过滤均可）。

### 基础数据

8. [ ] admin 维护线体、制程段、机型，并按制程段维护单台工时（/min）、标准产能、标准人力保存成功；提报页按机型+制程段匹配并即时更新。

---

## 十一、前端暂不依赖的后端能力（无需优先开发）

- 服务端保存/恢复「已提交时段」草稿（当前为客户端 `localStorage`）。
- 按当前时间自动推荐应填时段（前端写死 8:00～22:00 每 2 小时一档）。

---

**文档版本：** 2026-06 产能提报改版最终版（含线体校验修复说明）  
**维护：** 前端变更产能相关接口时，请同步更新本文档。

---

## 十二、近期补充：自动计算字段与人力总达成率（2026-06-03）

> 本节为产能提报/管理页**近期新增**的自动计算能力，以及当前「产出工时为 —、人力总达成率为 0%」问题的**后端配合说明**。  
> 前端计算逻辑：`src/utils/capacityCalculations.js`；提报页 `capacity.vue`；管理页 `capacity-manage.vue`。

### 12.1 前端近期改动汇总

| 模块 | 新增内容 |
|------|----------|
| **产能提报** | 每个时段自动计算并展示：标准产能（PCS）、产出工时、出勤工时、差异产能（PCS）、实际生产达成率；提交时写入 `timeSlots`；主表增加 `singleWorkHours` 快照 |
| **产能管理** | 列表/导出展示上述字段；新增 **人力总达成率**（按日期+提交人聚合） |
| **公共** | 抽取 `capacityCalculations.js` 统一计算公式 |

### 12.2 自动计算公式（时段级）

| 字段 | 接口字段名 | 公式 | 单位 |
|------|------------|------|------|
| 标准产能（PCS） | `standardCapacityPcs` | `standardCapacity × productionHours` | PCS |
| 产出工时 | `outputHours` | `singleWorkHours × actualCapacity ÷ 60` | 小时 |
| 出勤工时 | `attendanceHours` | `productionHours × actualManpower` | 小时 |
| 差异产能 | `capacityDifference` | `standardCapacity × productionHours − actualCapacity` | PCS |
| 实际生产达成率 | `productionAchievementRate` | `actualCapacity ÷ (standardCapacity × productionHours) × 100` | 数值（如 90.00 表示 90%） |

说明：

- `standardCapacity` 单位为 **PCS/H**；`actualCapacity` 单位为 **PCS**。
- `singleWorkHours` 单位为 **/min**（单台工时），来自 `GET /capacity/meta` 的 `modelConfigs[机型][制程段]`。
- 以上字段在提报页由前端实时计算；**管理页优先使用接口返回的持久化值**，缺失时再尝试用 meta 回算。

### 12.3 人力总达成率（记录级，管理页展示）

| 项目 | 说明 |
|------|------|
| 展示位置 | 产能管理列表每条提报记录的「提交人」下方 |
| 聚合维度 | **同一 `reportDate` + 同一提交账号**（优先 `submitter`，无则 `teamLeader`） |
| 统计范围 | 该组内所有提报记录、所有 `timeSlots` 中 **08:00–22:00** 标准时段（`startHour` ∈ 8,10,12,14,16,18,20） |
| 公式 | `Σ outputHours ÷ Σ attendanceHours × 100`，保留两位小数 |
| 当前实现 | **前端**根据列表数据聚合计算；导出表格含「人力总达成率」列 |

**示例（DIP6线 / 2026-06-03 / 苏勇）：**

```
时段 12:00-14:00：产出 9.90h，出勤 11.00h
时段 14:00-16:00：产出 16.13h，出勤 20.57h
人力总达成率 = (9.90 + 16.13) / (11.00 + 20.57) × 100% ≈ 82.46%
（单台工时 1.1 min 时；具体值随 meta 中配置略有差异）
```

### 12.4 【P0】提交接口需持久化的新增字段

前端 `POST /api/performance/capacity` **已在 `timeSlots` 中提交**下列字段（旧文档 3.1 示例尚未包含，需后端补充）：

**主表新增（建议快照，便于管理页回算）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `singleWorkHours` | number | 提报时机型+制程段对应的单台工时（/min），快照保存 |

**`timeSlots` 每项新增：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `standardCapacityPcs` | number | 标准产能（PCS） |
| `outputHours` | number | 产出工时（小时） |
| `attendanceHours` | number | 出勤工时（小时） |
| `capacityDifference` | number | 差异产能（PCS） |
| `productionAchievementRate` | number | 实际生产达成率（数值，非字符串，如 90.00） |

**完整提交示例：**

```json
{
  "reportDate": "2026-06-03",
  "productionLine": "DIP6线",
  "teamLeader": "苏勇",
  "processSegment": "包装段",
  "machineModel": "S.XB390DZBE.2自动线",
  "personInCharge": "苏勇",
  "submitter": "苏勇",
  "singleWorkHours": 1.1,
  "timeSlots": [
    {
      "timeRange": "12:00-14:00",
      "startHour": 12,
      "productionMinutes": 60,
      "productionHours": 1,
      "standardCapacity": 600,
      "standardCapacityPcs": 600,
      "actualCapacity": 540,
      "standardManpower": 11,
      "actualManpower": 11,
      "outputHours": 9.9,
      "attendanceHours": 11,
      "capacityDifference": 60,
      "productionAchievementRate": 90,
      "reasonRemark": "换线调试占用 30 分钟"
    }
  ]
}
```

**后端检查项：**

- [ ] DTO / 校验器**不要丢弃**上述新字段（常见原因：白名单校验未更新）。
- [ ] 数据库 `timeSlots` JSON（或明细表）**落库并原样返回**。
- [ ] 主表保存 `singleWorkHours`（或与 `machineModel`、`processSegment` 一并快照），列表查询时返回。
- [ ] 若后端自行重算，公式须与 12.2 一致；**至少** `outputHours` 必须可查，否则人力总达成率分子为 0。

### 12.5 【P0】列表查询 `GET /capacity` 需返回的字段

管理页展示/导出/人力总达成率**依赖**列表接口返回：

**主表：**

```json
{
  "reportDate": "2026-06-03",
  "teamLeader": "苏勇",
  "submitter": "苏勇",
  "processSegment": "包装段",
  "machineModel": "S.XB390DZBE.2自动线",
  "singleWorkHours": 1.1,
  "timeSlots": [ ... ]
}
```

**`timeSlots` 每项需含（至少）：**

`outputHours`、`attendanceHours`、`standardCapacityPcs`、`capacityDifference`、`productionAchievementRate`、`reasonRemark`（时段原因说明）

> **当前线上问题根因（产出工时为 —、人力总达成率 0%）：**  
> 1. 提报时前端已算好 `outputHours` 并提交，但后端**未持久化或未在 GET 列表中返回**；  
> 2. 管理页回退用 `GET /meta` 的 `modelConfigs` 查单台工时；若 meta 中**无该机型/制程段**或**键名与提报不一致**（如 `包装` vs `包装段`），则 `outputHours` 无法回算；  
> 3. 分子为 0 时，`Σ outputHours / Σ attendanceHours = 0%`。

### 12.6 【P1】`GET /capacity/meta` 要求（与产出工时相关）

- [ ] `modelConfigs` 必须包含提报所用**全部机型**，且制程段键名与提报 `processSegment` **完全一致**（如 `包装段` 不能写成 `包装`）。
- [ ] 每项含 `singleWorkHours`（/min）、`standardCapacity`（PCS/H）、`standardManpower`。
- [ ] admin 在「产能基础数据维护」保存后，提报页与管理页回算逻辑立即生效。

### 12.7 【P2】可选：后端预聚合人力总达成率

若希望管理页不依赖全量列表本地聚合，可增加字段（主表或单独统计接口）：

| 字段 | 说明 |
|------|------|
| `manpowerTotalAchievementRate` | 按 `reportDate + submitter`（或业务约定主键）预计算的 8:00–22:00 人力总达成率 |

公式同 12.3。前端可优先展示该字段，无则本地计算。

### 12.8 本节验收清单

1. [ ] 提报提交后，数据库 `timeSlots` 中能查到 `outputHours`、`attendanceHours` 等 5 个新字段。
2. [ ] `GET /capacity` 列表返回的 `timeSlots` 含上述字段，管理页「产出工时」不为 —。
3. [ ] 主表返回 `singleWorkHours`（或 meta 能匹配机型+制程段），人力总达成率不为 0%（有产出数据时）。
4. [ ] 同一日期、同一提交人多条提报/多时段，人力总达成率 = 产出工时之和 ÷ 出勤工时之和。
5. [ ] 导出 Excel 含：标准产能（PCS）、产出工时、出勤工时、差异产能、实际生产达成率、人力总达成率。

---

**文档版本：** 2026-06-03 补充（自动计算字段 + 人力总达成率）
