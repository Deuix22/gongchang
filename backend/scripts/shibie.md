# 仓储送货单：本次前端变更 — 是否需要后端配合

> 日期：2026-08-11  
> 涉及：生产批号后缀（01H/02B 等）、Excel 送货单图片识别仍失败

---

## 1. 结论速览

| 变更点 | 是否必须后端配合 | 说明 |
|--------|------------------|------|
| 生产批号后缀 `01H`/`02B` 等 | **建议配合，多数情况小改即可** | 匹配键仍是前 8 位 `batchKey`；库里应存完整批号 |
| **图片识别不出**（视研 Excel 截图） | **必须后端配合** | 前端不能独立做 OCR；依赖 `POST .../recognize` 返回内容 |

---

## 2. 生产批号后缀 — 后端怎么配合

### 规则

```
完整批号 = GR-HFYZBU + 8位batchKey + 可选后缀
例：
  GR-HFYZBU26070236        → batchKey=26070236，无后缀
  GR-HFYZBU2603014502B     → batchKey=26030145，后缀=02B
  GR-HFYZBU2607056402H     → batchKey=26070564，后缀=02H
```

### 后端检查项

1. **入库**：`productionBatchNo` 按原文完整存储（含后缀），不要截成只有 8 位。  
2. **出货比对 `lookup` / 余量汇总**：按 `batchKey`（前缀后前 8 位数字）聚合，**不要**要求与完整批号字符串完全相等才算同一批。  
3. **箱单匹配**：箱单中间 8 位 = `batchKey` 即可命中该批所有带/不带后缀的明细。  

若后端本来就是按 `batchKey` 匹配，则后缀相关**可不改接口**，只需确认不会因「批号多了 01H」而匹配失败。

前端查询已传：`boxNo` / `batchKey` / `productionBatchNo`（完整）。

---

## 3. 图片识别仍失败 — 必须后端排查（重点）

### 前端能做什么 / 不能做什么

```
选图 → POST /api/warehouse/delivery-notes/recognize（multipart）
     → 后端 OCR
     → 返回 JSON
     → 前端 normalize / 按 rawText 兜底填表
```

- 前端**不会**在本地对图片做 OCR。  
- 前端已具备：在拿到 **`rawText`（或结构化 header+items）** 后，解析视研 Excel 这类单据（含换行产品编码、带后缀批号）。  
- 若接口返回空、无 `rawText`、或 OCR 服务失败，前端**无法**从图片里「猜」出字段 → 表现就是「识别不到」。

### 请后端立刻确认的返回

`POST /api/warehouse/delivery-notes/recognize`

**推荐（结构化）：**

```json
{
  "header": {
    "customerName": "TCL家用电器（合肥）有限公司",
    "shippingDate": "2026-08-11"
  },
  "items": [
    {
      "customerOrderNo": "3C102-000943",
      "salesModel": "S.XGZBCT.1",
      "productCode": "002.027.0007196",
      "quantityPcs": 1094,
      "productionBatchNo": "GR-HFYZBU26070236",
      "deliveryNoteNo": "HFYD260811019174"
    }
  ],
  "rawText": "……OCR全文……"
}
```

**最低要求（结构化失败时）：**

```json
{
  "rawText": "收货客户：TCL家用电器（合肥）有限公司\n发运日：2026-08-11\n客户订单号 销售型号 ...\n3C102-000943 S.XGZBCT.1 ..."
}
```

以下情况前端都会表现为识别失败/空白：

| 后端实际返回 | 前端结果 |
|--------------|----------|
| 404 / 5xx / OCR SDK 报错 | 提示识别失败 |
| `{ "header": {}, "items": [] }` 且无 `rawText` | 未识别出有效字段 |
| 只有成功标记、无文本 | 同上 |
| `rawText` 极短或乱码（图被压糊、OCR 未开表格） | 解析不出明细 |

### 该张「视研 Excel 送货单」截图的注意点（给 OCR）

1. 表头含：收货客户、发运日；明细含客户订单号、销售型号、产品编码、数量PCS、生产批号、送货单号。  
2. **产品编码**常在单元格内换行：`002.027.00` + `07196` → 应为 `002.027.0007196`。  
3. **生产批号**可带 `01H`/`02B` 等后缀，需原样进 `rawText` / `items`。  
4. 多空列（客户料号、装箱备注等为空），勿按「每列都有字」做表结构。  
5. 建议对该类单据使用 **表格/通用文字 OCR**，并把**完整识别文本**放进 `rawText`。  
6. 前端已改为优先上传**原图**（减少压缩导致表格字糊掉）；若仍失败，基本可断定是识别接口未返回可用文本。

### 联调方法（后端自测）

用同一张截图调 recognize，在响应里应能看到：

- `TCL家用电器` 或 `收货客户`  
- `HFYD260811019174`  
- `GR-HFYZBU`  
- 至少一个 `3C102-` 订单号  

若响应里这些都没有 → 先修 OCR / 返回字段，再谈前端。

---

## 4. 与其它文档的关系

- 修改/删除接口：[`backend-warehouse-delivery-note-crud.md`](./backend-warehouse-delivery-note-crud.md)  
- 识别/提交约定：[`backend-warehouse-delivery-note-api.md`](./backend-warehouse-delivery-note-api.md)  
- 出货比对与 batchKey：[`backend-warehouse-scan-compare-api.md`](./backend-warehouse-scan-compare-api.md)  
