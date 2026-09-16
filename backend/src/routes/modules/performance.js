import { Router } from 'express';

import { authenticate, requireRoles } from '../../middlewares/auth.js';
import { requireCapacityMetaWrite } from '../../utils/capacityPermissions.js';
import {
  submitCapacity,
  listCapacity,
  getProductionLines,
  getCapacityMeta,
  updateCapacityMeta
} from '../../controllers/capacityController.js';
import { submitWorktime, listWorktime } from '../../controllers/worktimeController.js';
import {
  submitAbnormal,
  updateEngineeringReason,
  qualityApprove,
  listAbnormal
} from '../../controllers/abnormalController.js';

const router = Router();

router.use(authenticate);

// 产能：提交与列表查询任意登录用户；产线枚举仅 admin/manager
router.post('/capacity', submitCapacity);
router.get('/capacity', listCapacity);
router.get('/capacity/lines', requireRoles('admin', 'manager'), getProductionLines);
router.get('/capacity/meta', getCapacityMeta);
router.put('/capacity/meta', requireCapacityMetaWrite, updateCapacityMeta);

// 工时统计：提交 + 可选列表
router.post('/worktime', submitWorktime);
router.get('/worktime', listWorktime);

// 异常工时：提交、工程填原因、品质审批、列表
router.post('/abnormal', submitAbnormal);
router.put('/abnormal/:id/engineering', updateEngineeringReason);
router.put('/abnormal/:id/quality', qualityApprove);
router.get('/abnormal', listAbnormal);

export default router;
