import mongoose from 'mongoose';

const CapacityMetaSchema = new mongoose.Schema(
  {
    // 固定单行配置，后续可扩展多工厂、多站点时再增加维度字段
    lines: {
      type: [String],
      default: []
    },
    models: {
      type: [String],
      default: []
    },
    processes: {
      type: [String],
      default: []
    },
    /** 按机型 + 制程段：{ 机型: { 制程段: { singleWorkHours, standardCapacity, standardManpower } } } */
    modelConfigs: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    /** 旧版单台工时（小时），读取时兼容映射到 modelConfigs */
    modelWorktimes: {
      type: Map,
      of: Number,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

// 目前仅维护一份全局配置，使用常量 ID 方便查找与覆盖
const CapacityMeta = mongoose.model('CapacityMeta', CapacityMetaSchema);

export async function getOrCreateCapacityMeta () {
  let doc = await CapacityMeta.findOne();
  if (!doc) {
    doc = await CapacityMeta.create({});
  }
  return doc;
}

export default CapacityMeta;

