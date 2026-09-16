import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import config from '../../config/env.js';
import { authenticate } from '../../middlewares/auth.js';
import { badRequest } from '../../utils/errors.js';
import {
  recognizeDeliveryNote,
  submitDeliveryNote,
  listDeliveryNotes,
  getDeliveryNoteDetail,
  updateDeliveryNote,
  deleteDeliveryNote
} from '../../controllers/deliveryNoteController.js';
import {
  lookupScanCompare,
  confirmShip
} from '../../controllers/scanCompareController.js';
import { traceManageQuery } from '../../controllers/manageQueryController.js';
import { submitMaterialInbound, listMaterialStocks, listMaterialInboundRecords } from '../../controllers/materialInboundController.js';

const router = Router();

const warehouseUploadDir = path.join(config.uploadDir, 'warehouse');
if (!fs.existsSync(warehouseUploadDir)) {
  fs.mkdirSync(warehouseUploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, warehouseUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `delivery_${Date.now()}${ext}`);
    }
  }),
  // 送货单拍照/相册常见 jpg/png，限制 2MB
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype?.startsWith('image/') ||
      /\.(jpe?g|png|webp|bmp)$/i.test(file.originalname || '');
    if (!ok) {
      cb(new Error('仅支持上传图片文件（jpg/png 等）'));
      return;
    }
    cb(null, true);
  }
});

router.use(authenticate);

router.post(
  '/delivery-notes/recognize',
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(badRequest('图片大小不能超过 2MB'));
      }
      return next(badRequest(err.message || '图片上传失败'));
    });
  },
  recognizeDeliveryNote
);

// 列表 / 新建（静态路径需在 :id 之前）
router.get('/delivery-notes', listDeliveryNotes);
router.post('/delivery-notes', submitDeliveryNote);

// 详情 / 更新 / 删除
router.get('/delivery-notes/:id', getDeliveryNoteDetail);
router.put('/delivery-notes/:id', updateDeliveryNote);
router.delete('/delivery-notes/:id', deleteDeliveryNote);

router.get('/scan-compare/lookup', lookupScanCompare);
router.post('/scan-compare/ship', confirmShip);

router.get('/manage-query/trace', traceManageQuery);

// 物料入库（Reel ID）
router.post('/materials/inbound', submitMaterialInbound);
router.get('/materials/stocks', listMaterialStocks);
router.get('/materials/inbound-records', listMaterialInboundRecords);

export default router;
