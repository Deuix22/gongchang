# 仓储系统 - 送货单 API

> **汇总文档（推荐后端阅读）**：[`backend-warehouse-api.md`](./backend-warehouse-api.md)

前端页面：`pages/warehouse/shipment-entry`

## 字段说明

| 层级 | 字段 | 说明 |
|------|------|------|
| 表头 | `customerName` | 收货客户 |
| 表头 | `shippingDate` | 发运日 |
| 明细 | `customerOrderNo` | 客户订单号 |
| 明细 | `salesModel` | 销售型号 |
| 明细 | `productCode` | 产品编码 |
| 明细 | `quantityPcs` | 数量 |
| 明细 | `productionBatchNo` | 生产批号 |
| 明细 | `deliveryNoteNo` | 送货单号 |

## 1. 识别送货单（OCR）

`POST /api/warehouse/delivery-notes/recognize`

- Content-Type: `multipart/form-data`
- 字段：
  - `file`（图片文件，送货单截图/拍照）
  - `recognizeMode`：固定传 `field`，表示**按字段名匹配**，不要依赖红框圈选区域

### 识别方式

1. OCR 提取全文后，根据表头/明细上的**中文标签**匹配字段（如「收货客户」「发运日」「客户订单号」等）
2. 支持表格：识别表头行后按列解析多行明细
3. 支持「标签：值」单行/分块格式
4. 优先返回结构化 JSON；若只能返回全文，前端会按字段名规则兜底解析 `rawText`

### 响应示例

```json
{
  "header": {
    "customerName": "创维电器股份有限公司",
    "shippingDate": "2026-05-19"
  },
  "items": [
    {
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

若暂无法结构化，可返回 `rawText`，前端会用规则兜底解析：

```json
{
  "rawText": "收货客户：创维电器股份有限公司\n发运日：2026-05-19\n..."
}
```

## 2. 提交送货单

`POST /api/warehouse/delivery-notes`

### 请求体

```json
{
  "customerName": "创维电器股份有限公司",
  "shippingDate": "2026-05-19",
  "imageUrl": "https://.../optional.jpg",
  "items": [
    {
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

### 响应

```json
{
  "id": "dn_xxx",
  "saved": true
}
```

## 4. 权限

- 需登录（Bearer Token）
- 建议与考勤系统共用用户体系

## 5. OCR 实现建议

- **按字段名识别**，不要要求用户在单据上画红框
- 表头标签：收货客户、发运日（及别名见前端 `HEADER_FIELD_LABELS`）
- 明细标签：客户订单号、销售型号、产品编码、数量、生产批号、送货单号
- 可选返回 `recognizedFields: [{ key, label, value }]` 或扁平 `fields` 对象
- 支持 Excel 截图、拍照件；识别后清洗为上述 JSON 写入数据库
- **Excel 截图式送货单**（如视研模板）常见难点：空列多、产品编码单元格内换行（`002.027.00` / `07196`）、OCR 单空格分列。若结构化失败，请至少返回完整 `rawText`，前端会按订单号/批号锚点兜底解析

---

## 6. 列表 / 详情 / 修改 / 删除（前端 V1.3.6+）

> **后端配合专项文档（推荐直接发给后端）**：[`backend-warehouse-delivery-note-crud.md`](./backend-warehouse-delivery-note-crud.md)

前端页面：`pages/warehouse/shipment-entry` 已增加「单据管理」Tab。接口摘要见专项文档第 2～6 节。
