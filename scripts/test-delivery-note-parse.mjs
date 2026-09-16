import {
  parseDeliveryNoteFromText,
  normalizeRecognizeResult
} from '../src/utils/warehouse/deliveryNoteParser.js'

const sample = `合肥视研电子科技有限公司
送货单
收货客户：TCL家用电器（合肥）有限公司
收货地址：安徽省合肥市肥西县桃花工业园云湖路10号郭艳华18819111858
发运日：2026-08-11
客户订单号 客户料号 客户批号 销售型号 产品编码 版本 品名 数量PCS 装箱备注 生产批号 客户机型 备注 送货单号
3C102-000943  S.XGZBCT.1  002.027.00
07196  10  洗衣机家电组件  1094  GR-HFYZBU26070236  有客制标贴、通用- 【带】软件版  HFYD260811019174
3C102-000928  S.XGZBCT.1  002.027.0007196  10  洗衣机家电组件  121  GR-HFYZBU26070236  有客制标贴  HFYD260811019174
3C102-001124  S.XGZBCT.1  002.027.0007196  10  洗衣机家电组件  3  GR-HFYZBU2603014502B  HFYD260811019174
3C102-001119  S.XGZBCT.1  002.027.0007196  11  洗衣机家电组件  357  GR-HFYZBU2607035301H  HFYD260811019174
合计 5804
`

const r = parseDeliveryNoteFromText(sample)
console.log(JSON.stringify(r, null, 2))
console.log('items:', r.items.length)

const r2 = normalizeRecognizeResult({ header: {}, items: [], rawText: sample })
console.log('fallback items:', r2.items.length, r2.header)
