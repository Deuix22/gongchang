import { parseBoxOrBatchCode, extractBatchKeyFromProductionBatch } from '../src/utils/warehouse/boxCodeParser.js'
import { parseDeliveryNoteFromText } from '../src/utils/warehouse/deliveryNoteParser.js'

const cases = [
  'GR-HFYZBU26070236',
  'GR-HFYZBU2603014502B',
  'GR-HFYZBU2607035301H',
  'GR-HFYZBU2607056402H',
  'HFSYHFYZBU26040149000001',
  'gr-hfyzbu2603014502b'
]

for (const c of cases) {
  const r = parseBoxOrBatchCode(c)
  console.log(c, '=>', r.valid, r.batchKey, r.suffix, r.productionBatchNo || r.boxNo)
}

console.log('key of 02B:', extractBatchKeyFromProductionBatch('GR-HFYZBU2603014502B'))

const sample = `收货客户：TCL家用电器（合肥）有限公司
发运日：2026-08-11
3C102-001124  S.XGZBCT.1  002.027.0007196  10  洗衣机家电组件  3  GR-HFYZBU2603014502B  HFYD260811019174
3C102-001119  S.XGZBCT.1  002.027.0007196  11  洗衣机家电组件  357  GR-HFYZBU2607035301H  HFYD260811019174
`
const parsed = parseDeliveryNoteFromText(sample)
console.log(JSON.stringify(parsed, null, 2))
