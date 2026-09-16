# 物料入库（Reel ID）— 后端配合说明

> **背景**：前端「物料库存管理 → 物料入库」页（`pages/warehouse/inventory-inbound`）已完成扫码解析与提交联调准备。  
> **本文档仅描述物料入库所需后端配合**，不含库存查询（尚未开发）。  
> **前端解析**：`utils/warehouse/reelIdParser.js`（按 `@` 拆 7 段，后端仍需二次校验）  
> **日期**：2026-09-16

---

## 1. 为何需要后端配合

现场通过扫描物料标签二维码得到一串 Reel ID，例如：

```
260329121225675025@004.070.0059754@126013@FX-01129@26137@2026032904@52
```

前端已能：

1. 扫码 / 粘贴后按 `@` 拆成 7 段并回填表单  
2. 人工核对后点「确认入库」提交  

入库结果必须写入数据库，并保证 **同一 Reel ID 不可重复入库**。以上依赖后端提供 **入库写入接口** 与唯一约束。

---

## 2. 接口一览（本次需新增）

| 方法 | 路径 | 说明 | 前端调用 |
|------|------|------|----------|
| `POST` | `/api/warehouse/materials/inbound` | 物料入库 | 「确认入库」 |

**约定**

- Base URL：与现有仓储一致，例如 `https://hvoqpnuvbtfp.sealosbja.site/api`
- 鉴权：`Authorization: Bearer <token>`（与考勤/仓储共用）
- Content-Type：`application/json`
- 错误建议带业务码，便于前端区分重复入库；兼容两种体均可：
  - `{ "code": "REEL_ALREADY_INBOUND", "message": "..." }`
  - `{ "error": { "code": "REEL_ALREADY_INBOUND", "message": "..." } }`

**本次不需要**（可忽略）：库存查询、出库、调整单等接口。

---

## 3. Reel ID 字段含义（与请求体一一对应）

用 `@` 分隔 **恰好 7 段**；完整原文存 `rawCode`。

| 段 | 请求字段 | 标签含义 | 示例 |
|----|----------|----------|------|
| 1 | `materialBaseCode` | 厂内物料基础标识（流水号 + 订单/入库关联号） | `260329121225675025` |
| 2 | `partNumber` | P/N 正式物料号 / 零件号 | `004.070.0059754` |
| 3 | `versionCode` | V.code 版本/合规编码（标签上可能写作 `126013[RoHS]`，码中通常只有数字） | `126013` |
| 4 | `versionDesc` | V.DES 物料版本号 | `FX-01129` |
| 5 | `designCode` | D.C 设计代码 / 图纸代号 | `26137` |
| 6 | `lotNumber` | 生产批次号（日期 + 当日流水） | `2026032904` |
| 7 | `quantityPcs` | Q'ty 包装数量（正整数） | `52` |

---

## 4. 入库 `POST /api/warehouse/materials/inbound`

### 4.1 Request Body

```json
{
  "rawCode": "260329121225675025@004.070.0059754@126013@FX-01129@26137@2026032904@52",
  "materialBaseCode": "260329121225675025",
  "partNumber": "004.070.0059754",
  "versionCode": "126013",
  "versionDesc": "FX-01129",
  "designCode": "26137",
  "lotNumber": "2026032904",
  "quantityPcs": 52
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `rawCode` | string | **是** | 完整 Reel ID，入库唯一键 |
| `materialBaseCode` | string | **是** | 段1 |
| `partNumber` | string | **是** | 段2 P/N |
| `versionCode` | string | 是 | 段3 |
| `versionDesc` | string | 是 | 段4 |
| `designCode` | string | 是 | 段5 |
| `lotNumber` | string | **是** | 段6 批次号 |
| `quantityPcs` | number | **是** | 段7，必须为正整数 |

> 前端会先校验格式；后端仍应校验必填、`quantityPcs > 0` 且为整数，勿信任客户端。

### 4.2 必须实现的业务规则

1. **`rawCode` 全局唯一**（建议 DB UNIQUE 索引）  
   - 同一码再次提交 → HTTP **409**，业务码 **`REEL_ALREADY_INBOUND`**  
   - 前端据此弹「重复入库」Modal，不叠 Toast  
2. 写入 **入库流水**（每次扫码一条记录）  
3. **累加库存**（建议按 `partNumber` + `lotNumber`，或至少按 `partNumber`）  
4. 记录 **操作人**（JWT 用户）、**入库时间**  
5. 建议在事务内完成：写流水 + 更新库存，避免只写一半

### 4.3 成功响应 `200`

可直接返回对象，或包在 `{ code: 0, data: {...} }` 中（与现有仓储接口风格保持一致即可）。

```json
{
  "id": "mi_202609160001",
  "rawCode": "260329121225675025@004.070.0059754@126013@FX-01129@26137@2026032904@52",
  "partNumber": "004.070.0059754",
  "lotNumber": "2026032904",
  "quantityPcs": 52,
  "inboundAt": "2026-09-16T02:00:00.000Z"
}
```

| 字段 | 说明 |
|------|------|
| `id` | 入库流水主键 |
| `inboundAt` | 入库时间（ISO 8601） |

### 4.4 错误

| HTTP | code | 说明 | 前端处理 |
|------|------|------|----------|
| 400 | `INVALID_PAYLOAD` | 缺字段 / 数量非法 / 段数不对 | Toast 或 Modal 展示 `message` |
| 409 | `REEL_ALREADY_INBOUND` | 该 Reel ID 已入库 | Modal「重复入库」 |
| 401 | — | 未登录 / token 失效 | 跳转登录 |

示例：

```json
{
  "code": "REEL_ALREADY_INBOUND",
  "message": "该 Reel ID 已入库，不能重复提交"
}
```

---

## 5. 表结构建议

### 5.1 入库流水 `material_inbound_records`

| 列 | 类型 | 约束 | 说明 |
|----|------|------|------|
| `id` | PK | | |
| `raw_code` | varchar(255) | **UNIQUE NOT NULL** | 完整 Reel ID |
| `material_base_code` | varchar(64) | NOT NULL | 段1 |
| `part_number` | varchar(64) | NOT NULL | 段2 |
| `version_code` | varchar(64) | | 段3 |
| `version_desc` | varchar(64) | | 段4 |
| `design_code` | varchar(64) | | 段5 |
| `lot_number` | varchar(64) | NOT NULL | 段6 |
| `quantity_pcs` | int | NOT NULL | 段7 |
| `operator_user_id` | varchar | | 操作人 |
| `created_at` | datetime | | 入库时间 |

建议索引：`part_number`、`lot_number`、`(part_number, lot_number)`。

### 5.2 库存汇总 `material_stocks`（推荐）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | PK | |
| `part_number` | varchar | P/N |
| `lot_number` | varchar | 批次（若按批次汇总） |
| `on_hand_qty` | int | 现存量 |
| `updated_at` | datetime | |

入库时：`on_hand_qty += quantity_pcs`。  
唯一键建议：`(part_number, lot_number)`。

---

## 6. 验收清单（后端自测）

- [ ] 合法 7 段 Reel ID 首次提交 → 200，流水有记录，库存增加对应数量  
- [ ] 同一 `rawCode` 再提交 → 409 + `REEL_ALREADY_INBOUND`，库存不重复加  
- [ ] `quantityPcs` 为 0 / 负数 / 缺字段 → 400  
- [ ] 无 Token → 401  
- [ ] 并发双请求同一 `rawCode` → 仅一条成功（靠 UNIQUE + 事务）

---

## 7. 前端已对接说明（供联调）

| 项 | 值 |
|----|-----|
| 页面 | `/pages/warehouse/inventory-inbound` |
| API 封装 | `submitMaterialInbound` → `POST /warehouse/materials/inbound` |
| 重复入库码 | `REEL_ALREADY_INBOUND` |
| 接口未就绪 | 前端会提示需实现上述路径 |

联调时用示例码扫一次成功、再扫一次应出现「重复入库」即可。
