# 物料库存查询 — 后端配合说明

> **背景**：前端「物料库存管理 → 库存查询」页（`pages/warehouse/inventory-stock`）需按 Reel ID 七段规则筛选已入库数据。  
> **入库接口已落地**：`POST /api/warehouse/materials/inbound`（见 [`backend-warehouse-material-inbound.md`](./backend-warehouse-material-inbound.md)）。  
> **本文档仅描述查询能力所需后端配合。**  
> **日期**：2026-09-16

---

## 1. 为何需要后端配合

入库数据已写入：

- `material_inbound_records` — 每次扫码一条流水（含 7 段字段 + `rawCode`）
- `material_stocks` — 按 `partNumber + lotNumber` 汇总 `onHandQty`

现场需要按 **P/N、批次、厂内标识、版本、设计代码** 等查询现存量与入库明细。前端不落库，必须由后端提供查询接口。

---

## 2. 接口一览（本次需新增）

| 方法 | 路径 | 说明 | 前端调用 |
|------|------|------|----------|
| `GET` | `/api/warehouse/materials/stocks` | 库存汇总列表 | 「库存汇总」Tab |
| `GET` | `/api/warehouse/materials/inbound-records` | 入库流水列表 | 「入库明细」Tab |

**约定**

- Base URL / 鉴权：与仓储现有接口一致（Bearer JWT）
- Query 参数均为可选；**全部为空时返回最近入库/库存列表**（建议默认 `pageSize=50`，按更新时间倒序）
- 字符串条件：建议 **精确匹配**（`partNumber`、`lotNumber` 等）；`keyword` 对 `rawCode` / `partNumber` / `lotNumber` / `materialBaseCode` **模糊包含**

---

## 3. 查询条件（与 Reel ID 字段对应）

| Query 参数 | 对应段 | 说明 |
|------------|--------|------|
| `partNumber` | 2 P/N | 正式物料号，如 `004.070.0059754` |
| `lotNumber` | 6 | 生产批次号，如 `2026032904` |
| `materialBaseCode` | 1 | 厂内物料基础标识 |
| `versionCode` | 3 | V.code |
| `versionDesc` | 4 | V.DES 物料版本号 |
| `designCode` | 5 | D.C 设计代码 |
| `rawCode` | 全文 | 完整 Reel ID（明细接口；汇总可忽略或用于反查） |
| `keyword` | — | 模糊：rawCode / partNumber / lotNumber / materialBaseCode |
| `page` | — | 默认 `1` |
| `pageSize` | — | 默认 `50`，最大建议 `100` |

前端支持扫码 Reel ID：解析后自动填入 `partNumber`、`lotNumber` 等再请求。

**库存汇总**主要按 `partNumber` + `lotNumber` 过滤（表主键维度）；其余字段若库存表未存，可：

- 方案 A（推荐）：库存行关联「最近一条入库流水」补齐 `versionCode` 等展示字段，并用这些字段过滤时 **join 流水表**  
- 方案 B：仅支持 `partNumber` / `lotNumber` / `keyword` 过滤汇总；细字段只在明细接口过滤  

前端两种都能用；**明细接口必须支持全部七段相关字段过滤**。

---

## 4. 库存汇总 `GET /api/warehouse/materials/stocks`

### 4.1 成功响应 `200`

```json
{
  "list": [
    {
      "id": "ms_001",
      "partNumber": "004.070.0059754",
      "lotNumber": "2026032904",
      "onHandQty": 104,
      "updatedAt": "2026-09-16T02:10:00.000Z",
      "materialBaseCode": "260329121225675025",
      "versionCode": "126013",
      "versionDesc": "FX-01129",
      "designCode": "26137"
    }
  ],
  "total": 1,
  "summary": {
    "skuCount": 1,
    "totalOnHandQty": 104
  }
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `list[].partNumber` | **是** | P/N |
| `list[].lotNumber` | **是** | 批次 |
| `list[].onHandQty` | **是** | 现存量 |
| `list[].updatedAt` | 建议 | 最近更新时间 |
| `list[].versionCode` 等 | 建议 | 来自关联流水，便于展示 |
| `summary.skuCount` | 建议 | 命中条数（或 distinct SKU） |
| `summary.totalOnHandQty` | 建议 | 命中库存数量合计 |
| `total` | 建议 | 分页总数 |

无数据时：`list: []`，`total: 0`，`summary` 可为 `{ skuCount: 0, totalOnHandQty: 0 }`。

---

## 5. 入库明细 `GET /api/warehouse/materials/inbound-records`

### 5.1 成功响应 `200`

```json
{
  "list": [
    {
      "id": "mi_202609160001",
      "rawCode": "260329121225675025@004.070.0059754@126013@FX-01129@26137@2026032904@52",
      "materialBaseCode": "260329121225675025",
      "partNumber": "004.070.0059754",
      "versionCode": "126013",
      "versionDesc": "FX-01129",
      "designCode": "26137",
      "lotNumber": "2026032904",
      "quantityPcs": 52,
      "operatorUserId": "u_xxx",
      "inboundAt": "2026-09-16T02:00:00.000Z"
    }
  ],
  "total": 1
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `list[].rawCode` | **是** | 完整 Reel ID |
| `list[].partNumber` | **是** | |
| `list[].lotNumber` | **是** | |
| `list[].quantityPcs` | **是** | 本条入库数量 |
| `list[].inboundAt` / `createdAt` | **是** | 入库时间（前端两种都认） |
| 其余段字段 | **是** | 与入库写入一致 |

排序：建议 `inboundAt` **倒序**。

---

## 6. 错误

| HTTP | code | 说明 |
|------|------|------|
| 400 | `INVALID_QUERY` | 参数非法（如 pageSize 超限） |
| 401 | — | 未登录 |

---

## 7. 验收清单

- [ ] 无条件查询：返回最近库存 / 流水（分页）  
- [ ] `partNumber=004.070.0059754`：只返回该物料  
- [ ] `lotNumber=2026032904`：只返回该批次  
- [ ] `partNumber` + `lotNumber`：与入库累加库存一致  
- [ ] `rawCode` 精确查明细：至多 1 条  
- [ ] `keyword` 模糊能命中 P/N 或批次片段  
- [ ] 未入库条件：`list: []`

---

## 8. 前端对接

| 项 | 值 |
|----|-----|
| 页面 | `/pages/warehouse/inventory-stock` |
| 汇总 API | `queryMaterialStocks` → `GET /warehouse/materials/stocks` |
| 明细 API | `queryMaterialInboundRecords` → `GET /warehouse/materials/inbound-records` |
