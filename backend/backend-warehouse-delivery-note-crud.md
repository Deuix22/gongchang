# 仓储送货单：修改 / 删除 — 后端配合说明

> **背景**：前端「录入送货单」页（`pages/warehouse/shipment-entry`）已上线 **单据管理**（列表、修改、删除）。  
> **本文档仅描述本次新增能力所需后端配合**，不含 OCR / 新建提交（既有接口见 [`backend-warehouse-delivery-note-api.md`](./backend-warehouse-delivery-note-api.md)）。  
> **前端版本**：仓储系统 V1.3.6+  
> **日期**：2026-08-11

---

## 1. 为何需要后端配合

送货单据现场常有数量、批号、客户等信息变更。前端已支持：

1. 查看已录入送货单列表  
2. 打开详情并整单修改后保存  
3. 删除整张送货单  

以上能力依赖后端提供 **列表 / 详情 / 更新 / 删除** 四个接口，并保证修改、删除后 **出货比对余量** 仍正确。

---

## 2. 接口一览（本次新增）

| 方法 | 路径 | 说明 | 前端调用 |
|------|------|------|----------|
| `GET` | `/api/warehouse/delivery-notes` | 列表（可筛选） | 单据管理 Tab |
| `GET` | `/api/warehouse/delivery-notes/:id` | 详情（含明细） | 点「修改」回填表单 |
| `PUT` | `/api/warehouse/delivery-notes/:id` | 整单更新 | 「保存修改」 |
| `DELETE` | `/api/warehouse/delivery-notes/:id` | 整单删除 | 「删除」 |

**约定**

- Base URL：与现有仓储一致，例如 `https://hvoqpnuvbtfp.sealosbja.site/api`
- 鉴权：`Authorization: Bearer <token>`（与考勤/仓储共用）
- Content-Type：`application/json`（除上传外）
- 日期：`YYYY-MM-DD`
- 错误格式建议：`{ "error": { "code": "...", "message": "..." } }`

**既有、本次无需改动的接口**（可忽略）：

- `POST /api/warehouse/delivery-notes/recognize` — OCR  
- `POST /api/warehouse/delivery-notes` — 新建提交  

---

## 3. 列表 `GET /api/warehouse/delivery-notes`

### 3.1 Query 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `keyword` | 否 | 模糊匹配：收货客户、送货单号等 |
| `shippingDate` | 否 | 发运日精确匹配，`YYYY-MM-DD` |
| `deliveryNoteNo` | 否 | 送货单号（可选，前端当前以 keyword 为主） |
| `page` | 否 | 页码，默认 `1` |
| `pageSize` | 否 | 每页条数，前端默认传 `50` |

### 3.2 成功响应

```json
{
  "list": [
    {
      "id": "dn_202605280001",
      "customerName": "创维电器股份有限公司",
      "shippingDate": "2026-05-19",
      "deliveryNoteNo": "HFYD260519023630",
      "itemCount": 2,
      "totalQuantityPcs": 3000,
      "createdAt": "2026-05-19T10:00:00.000Z",
      "updatedAt": "2026-05-20T09:12:00.000Z"
    }
  ],
  "total": 1
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `list[].id` | **是** | 主表主键；前端无 `id` 的项会丢弃，无法编辑/删除 |
| `list[].customerName` | 是 | 收货客户 |
| `list[].shippingDate` | 是 | 发运日 |
| `list[].deliveryNoteNo` | 建议 | 展示用；多明细时可取首行或主单号 |
| `list[].itemCount` | 建议 | 明细行数 |
| `list[].totalQuantityPcs` | 建议 | 本单登记数量合计 |
| `list[].createdAt` / `updatedAt` | 否 | 展示用 |

也可返回 `{ "items": [...] }` / `{ "records": [...] }`，前端均可解析；**推荐统一用 `list` + `total`**。

---

## 4. 详情 `GET /api/warehouse/delivery-notes/:id`

用于编辑回填，**必须返回完整明细 `items`**。

### 4.1 成功响应

```json
{
  "id": "dn_202605280001",
  "customerName": "创维电器股份有限公司",
  "shippingDate": "2026-05-19",
  "imageUrl": "",
  "items": [
    {
      "id": "item_001",
      "customerOrderNo": "N032402-000494-001",
      "salesModel": "S.XG01Z BCW.6",
      "productCode": "002.027.0004083",
      "quantityPcs": 1500,
      "productionBatchNo": "GR-HFYZBU26040149",
      "deliveryNoteNo": "HFYD260519023630"
    }
  ]
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | **是** | 主表 ID |
| `customerName` | 是 | |
| `shippingDate` | 是 | |
| `imageUrl` | 否 | |
| `items` | **是** | 明细数组；也可用 `lineItems`，推荐 `items` |
| `items[].id` | 强烈建议 | 有则更新时带回，便于后端做行级覆盖 |
| `items[].quantityPcs` | 是 | 数字 |
| 其余明细字段 | 是 | 与新建提交字段一致 |

未找到：`404` + `NOT_FOUND`。

---

## 5. 更新 `PUT /api/warehouse/delivery-notes/:id`

### 5.1 请求体

与新建 `POST /api/warehouse/delivery-notes` **字段一致**：

```json
{
  "customerName": "创维电器股份有限公司",
  "shippingDate": "2026-05-19",
  "imageUrl": "",
  "items": [
    {
      "id": "item_001",
      "customerOrderNo": "N032402-000494-001",
      "salesModel": "S.XG01Z BCW.6",
      "productCode": "002.027.0004083",
      "quantityPcs": 1200,
      "productionBatchNo": "GR-HFYZBU26040149",
      "deliveryNoteNo": "HFYD260519023630"
    },
    {
      "customerOrderNo": "N032402-000494-002",
      "salesModel": "S.XG01Z BCW.6",
      "productCode": "002.027.0004083",
      "quantityPcs": 300,
      "productionBatchNo": "GR-HFYZBU26040149",
      "deliveryNoteNo": "HFYD260519023630"
    }
  ]
}
```

### 5.2 明细处理建议（推荐整单覆盖）

| 情况 | 建议行为 |
|------|----------|
| 明细带 `id` | 更新该行 |
| 明细无 `id` | 新增行 |
| 库中旧行未出现在本次 `items` | 删除该行 |

也可采用「先删后插」整单替换，效果等价。

### 5.3 业务约束（重要）

更新后必须保证出货比对口径正确：

1. 按受影响的 `batchKey`（生产批号末 8 位）**重算登记总量** `totalQuantityPcs`。  
2. 若该批次已有出货：`登记总量` 不得小于 `已出货量`，否则拒绝并返回明确错误，例如：

```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "修改后登记数量小于已出货数量，无法保存"
  }
}
```

3. 修改生产批号时，需同时处理「旧批次」与「新批次」的汇总。

### 5.4 成功响应

```json
{
  "id": "dn_202605280001",
  "saved": true
}
```

---

## 6. 删除 `DELETE /api/warehouse/delivery-notes/:id`

### 6.1 行为

- 删除送货单主表记录  
- 级联删除其全部明细  
- 重算相关 `batchKey` 的登记总量  

### 6.2 与出货记录的策略（二选一，需定一种）

| 策略 | 说明 | 建议 |
|------|------|------|
| A. 有出货则禁止删除 | 该单任一明细对应批次若已有出货记录，返回业务错误 | **推荐，实现简单、数据安全** |
| B. 允许删除但校验余量 | 删除后各批次 `登记量 >= 已出货量`，否则拒绝 | 更灵活，逻辑稍复杂 |

策略 A 示例错误：

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "该送货单关联批次已有出货记录，无法删除"
  }
}
```

### 6.3 成功响应

```json
{
  "deleted": true
}
```

未找到：`404`。

---

## 7. 数据与余量一致性（必读）

出货比对使用：

- `totalQuantityPcs` = 同 `batchKey` 下送货单明细 `quantityPcs` 之和  
- `shippedQuantityPcs` = 出货记录累计  
- `remainingQuantityPcs` = total − shipped  

因此 **PUT / DELETE 完成后**，同批次查询 `GET /api/warehouse/scan-compare/lookup` 的余量必须立即反映变更，避免前端缓存外的脏数据。

建议：

- 更新/删除放在同一事务内  
- 明细变更后刷新或按需重算 `batch_key` 汇总（若有冗余汇总表）

---

## 8. 前端联调说明

| 项目 | 路径 / 文件 |
|------|-------------|
| 页面 | `src/pages/warehouse/shipment-entry.vue` |
| API 封装 | `src/utils/api/warehouse.js`（`listDeliveryNotes` / `getDeliveryNoteDetail` / `updateDeliveryNote` / `deleteDeliveryNote`） |
| 结果规范化 | `src/utils/warehouse/deliveryNoteParser.js` |

联调步骤建议：

1. 先通列表：单据管理 Tab 能刷出带 `id` 的数据  
2. 再通详情：点「修改」表单回填正确  
3. 再通更新：改数量保存后，出货比对余量变化正确  
4. 最后通删除：删除后列表消失，余量正确；有出货时的拒绝文案可被前端 Toast/Modal 展示  

接口未部署时，前端会对 `404` 提示「接口未就绪」及对应路径。

---

## 9. 后端自检清单

- [ ] `GET /delivery-notes` 返回 `list`，且每项含稳定 `id`  
- [ ] `GET /delivery-notes/:id` 返回完整 `items`（建议含明细 `id`）  
- [ ] `PUT /delivery-notes/:id` 支持整单覆盖；数量变少时校验已出货  
- [ ] `DELETE /delivery-notes/:id` 级联删明细，并按约定处理已出货场景  
- [ ] 修改/删除后，同批次 `scan-compare/lookup` 余量立即正确  
- [ ] 全部接口 Bearer 鉴权；无权限 / 未找到错误码清晰  

---

## 10. 相关文档

- 送货单既有 OCR / 新建提交：[`backend-warehouse-delivery-note-api.md`](./backend-warehouse-delivery-note-api.md)  
- 仓储总览（出货比对、管理查询）：[`backend-warehouse-api.md`](./backend-warehouse-api.md)  
