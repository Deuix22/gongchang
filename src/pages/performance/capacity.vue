<template>
  <view class="capacity-container">
    <view class="nav-bar">
      <view class="nav-back" @tap="handleBack">
        <text class="nav-back-icon">←</text>
      </view>
      <view class="nav-title">产能提报</view>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <view
        v-if="canManageBaseConfig"
        class="config-entry"
        @tap="handleGoBaseConfig"
      >
        <view class="config-entry-main">
          <text class="config-entry-title">产能基础数据维护</text>
          <text class="config-entry-desc">维护线体、制程段、机型及标准参数</text>
        </view>
        <text class="config-entry-arrow">›</text>
      </view>

      <view class="section-card">
        <!-- 1. 日期 -->
        <view class="form-item">
          <text class="form-label required">日期</text>
          <picker mode="date" :value="form.reportDate" @change="onReportDateChange">
            <view class="picker-display">
              <text :class="{ placeholder: !form.reportDate }">
                {{ form.reportDate || '请选择日期' }}
              </text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <!-- 2. 线体 -->
        <view class="form-item">
          <text class="form-label required">线体</text>
          <picker
            mode="selector"
            :range="lineOptions"
            :value="lineIndex"
            @change="onLineChange"
          >
            <view class="picker-display">
              <text :class="{ placeholder: !form.productionLine }">
                {{ form.productionLine || '请选择线体' }}
              </text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <!-- 3. 组长 -->
        <view class="form-item">
          <text class="form-label required">组长</text>
          <input
            class="form-input"
            v-model="form.teamLeader"
            placeholder="请输入组长姓名"
            placeholder-class="form-placeholder"
            @blur="persistDraft"
          />
        </view>

        <!-- 4. 制程段 -->
        <view class="form-item">
          <text class="form-label required">制程段</text>
          <picker
            mode="selector"
            :range="processSegmentOptions"
            :value="processSegmentIndex"
            @change="onProcessSegmentChange"
          >
            <view class="picker-display">
              <text :class="{ placeholder: !form.processSegment }">
                {{ form.processSegment || '请选择制程段' }}
              </text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
          <text class="form-hint">
            同一组长负责多个制程段时，请分别选择制程段并提交；不同制程段可使用相同时间段。
          </text>
        </view>

        <!-- 6. 默认机型 -->
        <view class="form-item">
          <text class="form-label required">默认机型</text>
          <picker
            mode="selector"
            :range="modelOptions"
            :value="machineModelIndex"
            @change="onMachineModelChange"
          >
            <view class="picker-display">
              <text :class="{ placeholder: !form.machineModel }">
                {{ form.machineModel || '请选择机型' }}
              </text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <view v-if="form.machineModel" class="form-item">
          <text class="form-label">单台工时（/min）</text>
          <view class="duration-display">
            <text :class="{ 'duration-placeholder': !currentModelSingleWorkHoursText }">
              {{
                !form.processSegment
                  ? '请先选择制程段'
                  : currentModelSingleWorkHoursText
                    ? currentModelSingleWorkHoursText + ' /min'
                    : '该机型与制程段未维护单台工时'
              }}
            </text>
          </view>
        </view>
      </view>

      <!-- 5. 时间段填报 -->
      <view
        v-for="(slot, slotIndex) in timeSlots"
        :key="slot.id"
        class="section-card time-slot-card"
        :class="{ 'time-slot-card--submitted': slot.submitted && !slot.editing }"
      >
        <view class="time-slot-header">
          <view class="time-slot-title-row">
            <text class="time-slot-title">
              时段 {{ slotIndex + 1 }}{{ slot.label ? `（${slot.label}）` : '' }}
            </text>
            <text v-if="slot.submitted && !slot.editing" class="time-slot-badge">已提交</text>
            <text v-if="slot.submitted && slot.editing" class="time-slot-badge time-slot-badge--editing">修改中</text>
          </view>
          <view class="time-slot-actions">
            <text
              v-if="slot.submitted && !slot.editing"
              class="time-slot-edit"
              @tap="handleEditTimeSlot(slotIndex)"
            >修改</text>
            <text
              v-if="slot.submitted && slot.editing"
              class="time-slot-cancel"
              @tap="handleCancelEditTimeSlot(slotIndex)"
            >取消</text>
            <text
              v-if="timeSlots.length > 1 && !slot.submitted"
              class="time-slot-remove"
              @tap="handleRemoveTimeSlot(slotIndex)"
            >删除</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label required">开始时间</text>
          <picker
            mode="selector"
            :range="timeOptions"
            :value="getTimeOptionIndex(slot.startTime)"
            :disabled="isSlotLocked(slot)"
            @change="onSlotStartTimeChange(slotIndex, $event)"
          >
            <view class="picker-display" :class="{ 'picker-disabled': isSlotLocked(slot) }">
              <text :class="{ placeholder: !slot.startTime }">
                {{ slot.startTime || '请选择开始时间' }}
              </text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label required">结束时间</text>
          <picker
            mode="selector"
            :range="timeOptions"
            :value="getTimeOptionIndex(slot.endTime)"
            :disabled="isSlotLocked(slot)"
            @change="onSlotEndTimeChange(slotIndex, $event)"
          >
            <view class="picker-display" :class="{ 'picker-disabled': isSlotLocked(slot) }">
              <text :class="{ placeholder: !slot.endTime }">
                {{ slot.endTime || '请选择结束时间' }}
              </text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">机型（选填）</text>
          <picker
            mode="selector"
            :range="slotMachineModelPickerLabels"
            :value="getSlotMachineModelPickerIndex(slot)"
            :disabled="isSlotLocked(slot)"
            @change="onSlotMachineModelChange(slotIndex, $event)"
          >
            <view class="picker-display" :class="{ 'picker-disabled': isSlotLocked(slot) }">
              <text :class="{ placeholder: !form.machineModel && !slot.machineModel }">
                {{ slotMachineModelDisplay(slot) }}
              </text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <view v-if="getSlotMachineModel(slot) && form.processSegment" class="form-item">
          <text class="form-label">单台工时（/min）</text>
          <view class="duration-display">
            <text :class="{ 'duration-placeholder': !getSlotModelSingleWorkHours(slot) }">
              {{
                getSlotModelSingleWorkHours(slot)
                  ? getSlotModelSingleWorkHours(slot) + ' /min'
                  : '该时段机型与制程段未维护单台工时'
              }}
            </text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label required">生产分钟数</text>
          <input
            class="form-input"
            :class="{ 'input-readonly': isSlotLocked(slot) }"
            v-model="slot.productionMinutes"
            type="number"
            placeholder="请输入生产分钟数"
            placeholder-class="form-placeholder"
            :disabled="isSlotLocked(slot)"
            @input="onSlotMinutesInput(slotIndex)"
          />
        </view>

        <view class="form-item">
          <text class="form-label">生产小时数（H）</text>
          <view class="duration-display">
            <text :class="{ 'duration-placeholder': !slot.productionHoursText }">
              {{ slot.productionHoursText ? slot.productionHoursText + ' H' : '根据生产分钟数自动计算' }}
            </text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label required">标准产能（PCS/H）</text>
          <view class="duration-display">
            <text :class="{ 'duration-placeholder': !slotStandardCapacityText(slot) }">
              {{ slotStandardCapacityText(slot) || '请先选择机型、制程段并在基础数据中维护' }}
            </text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">标准产能（PCS）</text>
          <view class="duration-display">
            <text :class="{ 'duration-placeholder': !slotStandardCapacityPcsText(slot) }">
              {{ slotStandardCapacityPcsText(slot) || '请先填写标准产能、生产分钟数' }}
            </text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label required">实际产能（PCS）</text>
          <input
            class="form-input"
            :class="{ 'input-readonly': isSlotLocked(slot) }"
            v-model="slot.actualCapacity"
            type="digit"
            placeholder="请输入实际产能（PCS）"
            placeholder-class="form-placeholder"
            :disabled="isSlotLocked(slot)"
            @input="persistDraft"
          />
        </view>

        <view class="form-item">
          <text class="form-label required">标准人力</text>
          <view class="duration-display">
            <text :class="{ 'duration-placeholder': !slotStandardManpowerText(slot) }">
              {{ slotStandardManpowerText(slot) || '请先选择机型、制程段并在基础数据中维护' }}
            </text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label required">实际出勤人力</text>
          <input
            class="form-input"
            :class="{ 'input-readonly': isSlotLocked(slot) }"
            v-model="slot.actualManpower"
            type="digit"
            placeholder="请输入实际出勤人力"
            placeholder-class="form-placeholder"
            :disabled="isSlotLocked(slot)"
            @input="persistDraft"
          />
        </view>

        <view class="form-item">
          <text class="form-label">产出工时</text>
          <view class="duration-display">
            <text :class="{ 'duration-placeholder': !slotOutputHoursText(slot) }">
              {{ slotOutputHoursText(slot) ? slotOutputHoursText(slot) + ' 小时' : '请先填写单台工时、实际产能' }}
            </text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">出勤工时</text>
          <view class="duration-display">
            <text :class="{ 'duration-placeholder': !slotAttendanceHoursText(slot) }">
              {{ slotAttendanceHoursText(slot) ? slotAttendanceHoursText(slot) + ' 小时' : '请先填写生产分钟数、实际出勤人力' }}
            </text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">差异产能（PCS）</text>
          <view class="duration-display">
            <text :class="{ 'duration-placeholder': !slotCapacityDifferenceText(slot) }">
              {{ slotCapacityDifferenceText(slot) || '请先填写标准产能、生产分钟数、实际产能' }}
            </text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">实际生产达成率</text>
          <view class="duration-display">
            <text :class="{ 'duration-placeholder': !slotAchievementRateText(slot) }">
              {{ slotAchievementRateText(slot) || '请先填写标准产能、生产分钟数、实际产能' }}
            </text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">借入人力</text>
          <input
            class="form-input"
            :class="{ 'input-readonly': isSlotLocked(slot) }"
            v-model="slot.borrowedInManpower"
            type="digit"
            placeholder="请输入借入人力"
            placeholder-class="form-placeholder"
            :disabled="isSlotLocked(slot)"
            @input="persistDraft"
          />
        </view>

        <view class="form-item">
          <text class="form-label">借入人力岗位</text>
          <input
            class="form-input"
            :class="{ 'input-readonly': isSlotLocked(slot) }"
            v-model="slot.borrowedInPosition"
            placeholder="请输入借入人力岗位"
            placeholder-class="form-placeholder"
            :disabled="isSlotLocked(slot)"
            @input="persistDraft"
          />
        </view>

        <view class="form-item">
          <text class="form-label">借出人力</text>
          <input
            class="form-input"
            :class="{ 'input-readonly': isSlotLocked(slot) }"
            v-model="slot.lentOutManpower"
            type="digit"
            placeholder="请输入借出人力"
            placeholder-class="form-placeholder"
            :disabled="isSlotLocked(slot)"
            @input="persistDraft"
          />
        </view>

        <view class="form-item">
          <text class="form-label">借出人力岗位</text>
          <input
            class="form-input"
            :class="{ 'input-readonly': isSlotLocked(slot) }"
            v-model="slot.lentOutPosition"
            placeholder="请输入借出人力岗位"
            placeholder-class="form-placeholder"
            :disabled="isSlotLocked(slot)"
            @input="persistDraft"
          />
        </view>

        <view class="form-item">
          <text class="form-label">ICT合格率</text>
          <input
            class="form-input"
            :class="{ 'input-readonly': isSlotLocked(slot) }"
            v-model="slot.ictPassRate"
            placeholder="请输入 ICT 合格率"
            placeholder-class="form-placeholder"
            :disabled="isSlotLocked(slot)"
            @input="persistDraft"
          />
        </view>

        <view class="form-item">
          <text class="form-label">FCT合格率</text>
          <input
            class="form-input"
            :class="{ 'input-readonly': isSlotLocked(slot) }"
            v-model="slot.fctPassRate"
            placeholder="请输入 FCT 合格率"
            placeholder-class="form-placeholder"
            :disabled="isSlotLocked(slot)"
            @input="persistDraft"
          />
        </view>

        <view class="form-item form-item-textarea">
          <text class="form-label">原因说明</text>
          <textarea
            class="form-textarea"
            :class="{ 'input-readonly': isSlotLocked(slot) }"
            v-model="slot.reasonRemark"
            placeholder="请输入该时段原因说明（选填）"
            placeholder-class="form-placeholder"
            auto-height
            :disabled="isSlotLocked(slot)"
            @blur="persistDraft"
          />
        </view>
      </view>

      <view v-if="hasUnsubmittedSlots" class="add-slot-inline">
        <button class="add-slot-btn" @tap="handleAddTimeSlot">新增时段</button>
      </view>

      <view v-if="hasSubmittedSlots" class="draft-tip">
        <text>已提交的时段可点击「修改」调整数据后重新提交；新增时段填写后一并提交。</text>
      </view>

      <view class="section-card">
        <!-- 19. 负责人 -->
        <view class="form-item">
          <text class="form-label required">负责人</text>
          <input
            class="form-input"
            v-model="form.personInCharge"
            placeholder="请输入负责人"
            placeholder-class="form-placeholder"
            @blur="persistDraft"
          />
        </view>

        <!-- 20. 提交人 -->
        <view class="form-item">
          <text class="form-label">提交人</text>
          <view class="duration-display">
            <text :class="{ 'duration-placeholder': !submitterName }">
              {{ submitterName || '未获取到登录账号信息' }}
            </text>
          </view>
        </view>
      </view>

      <view class="submit-area">
        <button class="submit-btn" type="primary" @tap="handleSubmit">提交</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { reactive, computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  postCapacity,
  getCapacityMeta,
  getCapacityLineOptions,
  getCapacityList,
  getModelProcessConfig
} from '@/utils/api/performance.js'
import {
  buildCapacityDraftKey,
  loadCapacityDraft,
  saveCapacityDraft,
  serializeSlot
} from '@/utils/capacityDraft.js'
import { canManageCapacityBaseConfig } from '@/utils/capacityPermissions.js'
import {
  buildCapacityRecordKey,
  findCapacityRecordForContext,
  isSameCapacityContext,
  buildSlotsForSubmit,
  parseRecordTimeSlots
} from '@/utils/capacityRecordUtils.js'
import {
  calcCapacityMetrics,
  getSlotProductionHours,
  formatCapacityHours,
  formatCapacityDifference,
  formatStandardCapacityPcs,
  formatAchievementRate,
  HALF_HOUR_TIME_OPTIONS,
  formatTimeSlotRange,
  getTimeSlotDraftKey,
  getTimeOptionIndex,
  isValidTimeSlotRange,
  parseTimeToMinutes,
  updateTimeSlotLabel
} from '@/utils/capacityCalculations.js'

const lineOptions = ref([])
const processSegmentOptions = ref([])
const modelOptions = ref([])
const modelConfigs = ref({})

const canManageBaseConfig = ref(false)
const submitterName = ref('')
const currentRecordId = ref('')

const timeOptions = HALF_HOUR_TIME_OPTIONS

let slotIdSeed = 0

const SLOT_EDIT_SNAPSHOT_KEYS = [
  'startTime',
  'endTime',
  'label',
  'machineModel',
  'productionMinutes',
  'productionHoursText',
  'standardCapacity',
  'actualCapacity',
  'standardManpower',
  'actualManpower',
  'borrowedInManpower',
  'borrowedInPosition',
  'lentOutManpower',
  'lentOutPosition',
  'ictPassRate',
  'fctPassRate',
  'reasonRemark'
]

const createSlotEditSnapshot = (slot) => {
  const snapshot = {}
  SLOT_EDIT_SNAPSHOT_KEYS.forEach((key) => {
    snapshot[key] = slot[key] ?? ''
  })
  return snapshot
}

const restoreSlotFromSnapshot = (slot, snapshot = {}) => {
  SLOT_EDIT_SNAPSHOT_KEYS.forEach((key) => {
    slot[key] = snapshot[key] ?? ''
  })
  updateTimeSlotLabel(slot)
}

const clearSlotEditState = (slot) => {
  slot.editing = false
  delete slot._editSnapshot
  delete slot._editOrigin
}

const isSlotLocked = (slot) => !!(slot?.submitted && !slot?.editing)

const createEmptyTimeSlot = (submitted = false) => ({
  id: ++slotIdSeed,
  startTime: '',
  endTime: '',
  label: '',
  machineModel: '',
  submitted,
  editing: false,
  productionMinutes: '',
  productionHoursText: '',
  standardCapacity: '',
  actualCapacity: '',
  standardManpower: '',
  actualManpower: '',
  borrowedInManpower: '',
  borrowedInPosition: '',
  lentOutManpower: '',
  lentOutPosition: '',
  ictPassRate: '',
  fctPassRate: '',
  reasonRemark: ''
})

const createTimeSlotFromStored = (startTime, endTime, stored = {}) => {
  const slot = {
    id: ++slotIdSeed,
    startTime: stored.startTime || startTime || '',
    endTime: stored.endTime || endTime || '',
    label: '',
    machineModel: stored.machineModel ?? '',
    submitted: !!stored.submitted,
    editing: false,
    productionMinutes: stored.productionMinutes ?? '',
    productionHoursText: stored.productionHoursText ?? '',
    standardCapacity: stored.standardCapacity ?? '',
    actualCapacity: stored.actualCapacity ?? '',
    standardManpower: stored.standardManpower ?? '',
    actualManpower: stored.actualManpower ?? '',
    borrowedInManpower: stored.borrowedInManpower ?? '',
    borrowedInPosition: stored.borrowedInPosition ?? '',
    lentOutManpower: stored.lentOutManpower ?? '',
    lentOutPosition: stored.lentOutPosition ?? '',
    ictPassRate: stored.ictPassRate ?? '',
    fctPassRate: stored.fctPassRate ?? '',
    reasonRemark: stored.reasonRemark ?? ''
  }
  updateTimeSlotLabel(slot)
  return slot
}

const calcHoursFromMinutes = (minutesStr) => {
  const minutes = Number(minutesStr)
  if (minutesStr === '' || Number.isNaN(minutes) || minutes < 0) return ''
  return (minutes / 60).toFixed(2)
}

const form = reactive({
  reportDate: '',
  productionLine: '',
  teamLeader: '',
  processSegment: '',
  machineModel: '',
  personInCharge: ''
})

const timeSlots = ref([createEmptyTimeSlot()])

const lineIndex = computed(() => {
  const idx = lineOptions.value.indexOf(form.productionLine)
  return idx >= 0 ? idx : 0
})

const processSegmentIndex = computed(() => {
  const idx = processSegmentOptions.value.indexOf(form.processSegment)
  return idx >= 0 ? idx : 0
})

const machineModelIndex = computed(() => {
  const idx = modelOptions.value.indexOf(form.machineModel)
  return idx >= 0 ? idx : 0
})

const currentModelConfig = computed(() => {
  if (!form.machineModel || !form.processSegment) return null
  return getModelProcessConfig(modelConfigs.value, form.machineModel, form.processSegment)
})

const currentModelSingleWorkHoursText = computed(() => {
  const v = currentModelConfig.value?.singleWorkHours
  if (v == null || v === '') return ''
  return String(v)
})

const formatConfigDisplayValue = (val) => {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  return n % 1 === 0 ? String(n) : String(n)
}

const slotMachineModelPickerLabels = computed(() => {
  const defaultLabel = form.machineModel
    ? `同默认机型（${form.machineModel}）`
    : '同默认机型'
  return [defaultLabel, ...modelOptions.value]
})

const getSlotMachineModel = (slot) => {
  const custom = String(slot?.machineModel || '').trim()
  return custom || form.machineModel
}

const getSlotMachineModelPickerIndex = (slot) => {
  if (!slot?.machineModel) return 0
  const idx = modelOptions.value.indexOf(slot.machineModel)
  return idx >= 0 ? idx + 1 : 0
}

const getSlotModelConfig = (slot) => {
  const model = getSlotMachineModel(slot)
  if (!model || !form.processSegment) return null
  return getModelProcessConfig(modelConfigs.value, model, form.processSegment)
}

const getSlotModelStandardCapacity = (slot) => {
  const v = getSlotModelConfig(slot)?.standardCapacity
  return v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null
}

const getSlotModelStandardManpower = (slot) => {
  const v = getSlotModelConfig(slot)?.standardManpower
  return v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null
}

const getSlotModelSingleWorkHours = (slot) => getSlotModelConfig(slot)?.singleWorkHours

const slotMachineModelDisplay = (slot) => {
  if (slot?.machineModel) return slot.machineModel
  return form.machineModel ? `默认：${form.machineModel}` : '请先选择默认机型'
}

const slotStandardCapacityText = (slot) => {
  const fromSlot = slot?.standardCapacity
  if (fromSlot !== '' && fromSlot != null) return formatConfigDisplayValue(fromSlot)
  const v = getSlotModelStandardCapacity(slot)
  return v != null ? formatConfigDisplayValue(v) : ''
}

const slotStandardManpowerText = (slot) => {
  const fromSlot = slot?.standardManpower
  if (fromSlot !== '' && fromSlot != null) return formatConfigDisplayValue(fromSlot)
  const v = getSlotModelStandardManpower(slot)
  return v != null ? formatConfigDisplayValue(v) : ''
}

const getSlotStandardCapacityNumber = (slot) => {
  const fromSlot = slot?.standardCapacity
  if (fromSlot !== '' && fromSlot != null) {
    const n = Number(fromSlot)
    if (!Number.isNaN(n)) return n
  }
  return getSlotModelStandardCapacity(slot)
}

const getSlotCapacityMetrics = (slot) => {
  return calcCapacityMetrics({
    singleWorkHours: getSlotModelSingleWorkHours(slot),
    productionHours: getSlotProductionHours(slot),
    standardCapacity: getSlotStandardCapacityNumber(slot),
    actualCapacity: slot?.actualCapacity,
    actualManpower: slot?.actualManpower
  })
}

const slotOutputHoursText = (slot) => formatCapacityHours(getSlotCapacityMetrics(slot).outputHours)
const slotAttendanceHoursText = (slot) => formatCapacityHours(getSlotCapacityMetrics(slot).attendanceHours)
const slotStandardCapacityPcsText = (slot) =>
  formatStandardCapacityPcs(getSlotCapacityMetrics(slot).standardCapacityPcs)
const slotCapacityDifferenceText = (slot) => formatCapacityDifference(getSlotCapacityMetrics(slot).capacityDifference)
const slotAchievementRateText = (slot) => formatAchievementRate(getSlotCapacityMetrics(slot).productionAchievementRate)

const applyModelDefaultsToSlot = (slot) => {
  if (!slot || isSlotLocked(slot)) return
  const sc = getSlotModelStandardCapacity(slot)
  const sm = getSlotModelStandardManpower(slot)
  slot.standardCapacity = sc != null ? String(sc) : ''
  slot.standardManpower = sm != null ? String(sm) : ''
}

const applyModelDefaultsToAllSlots = () => {
  timeSlots.value.forEach((slot) => applyModelDefaultsToSlot(slot))
}

const hasSubmittedSlots = computed(() => timeSlots.value.some((s) => s.submitted))

const slotsToSubmit = computed(() => timeSlots.value.filter((s) => !s.submitted || s.editing))

const pendingTimeSlots = computed(() => timeSlots.value.filter((s) => !s.submitted))

const hasUnsubmittedSlots = computed(() => pendingTimeSlots.value.length > 0)

const getSlotTimePrefix = (slot) => {
  if (slot?.label) return `${slot.label}：`
  if (slot?.startTime || slot?.endTime) {
    return `${slot.startTime || '—'}-${slot.endTime || '—'}：`
  }
  return '未设置时段：'
}

const parseStoredSlotEntry = (key, stored = {}) => {
  if (stored.startTime && stored.endTime) {
    return createTimeSlotFromStored(stored.startTime, stored.endTime, stored)
  }
  if (typeof key === 'string' && key.includes('-') && !key.startsWith('draft_')) {
    const [startTime, endTime] = key.split('-')
    return createTimeSlotFromStored(startTime, endTime, stored)
  }
  const hour = Number(key)
  if (!Number.isNaN(hour) && hour >= 0 && hour < 24) {
    const pad = (n) => String(n).padStart(2, '0')
    return createTimeSlotFromStored(`${pad(hour)}:00`, `${pad(hour + 2)}:00`, stored)
  }
  if (stored.startHour != null) {
    const pad = (n) => String(n).padStart(2, '0')
    const startHour = Number(stored.startHour)
    return createTimeSlotFromStored(`${pad(startHour)}:00`, `${pad(startHour + 2)}:00`, stored)
  }
  return createTimeSlotFromStored('', '', stored)
}

const getFormSnapshot = () => ({
  reportDate: form.reportDate,
  productionLine: form.productionLine,
  teamLeader: form.teamLeader,
  processSegment: form.processSegment,
  machineModel: form.machineModel,
  personInCharge: form.personInCharge
})

const applyFormSnapshot = (snapshot = {}) => {
  if (!snapshot || typeof snapshot !== 'object') return
  if (snapshot.productionLine) form.productionLine = snapshot.productionLine
  if (snapshot.teamLeader) form.teamLeader = snapshot.teamLeader
  if (snapshot.processSegment) form.processSegment = snapshot.processSegment
  if (snapshot.machineModel) form.machineModel = snapshot.machineModel
  if (snapshot.personInCharge) form.personInCharge = snapshot.personInCharge
}

const buildTimeSlotsFromDraft = (draft) => {
  const stored = draft?.slots || {}
  const list = Object.entries(stored)
    .map(([key, value]) => parseStoredSlotEntry(key, value))
    .sort((a, b) => {
      const am = parseTimeToMinutes(a.startTime) ?? 9999
      const bm = parseTimeToMinutes(b.startTime) ?? 9999
      return am - bm
    })

  const hasUnsubmitted = list.some((s) => !s.submitted)
  if (!hasUnsubmitted && list.length > 0) {
    list.push(createEmptyTimeSlot())
  }

  if (list.length === 0) {
    list.push(createEmptyTimeSlot())
  }

  return list
}

const getDraftContextKey = () =>
  buildCapacityDraftKey({
    reportDate: form.reportDate,
    productionLine: form.productionLine,
    processSegment: form.processSegment
  })

const applyContextFieldsFromDraft = (snapshot = {}) => {
  if (!snapshot || typeof snapshot !== 'object') return
  if (snapshot.teamLeader) form.teamLeader = snapshot.teamLeader
  if (snapshot.machineModel) form.machineModel = snapshot.machineModel
  if (snapshot.personInCharge) form.personInCharge = snapshot.personInCharge
}

const resetTimeSlotsForNewContext = () => {
  timeSlots.value = [createEmptyTimeSlot()]
}

const persistDraft = () => {
  const draftKey = getDraftContextKey()
  if (!draftKey) return
  const slots = {}
  timeSlots.value.forEach((slot) => {
    const key = getTimeSlotDraftKey(slot.startTime, slot.endTime, slot.id)
    slots[key] = serializeSlot(slot)
  })
  saveCapacityDraft(draftKey, {
    form: getFormSnapshot(),
    slots,
    recordId: currentRecordId.value
  })
}

const restoreDraftForContext = () => {
  if (!form.reportDate) return

  const draftKey = getDraftContextKey()
  const draft = loadCapacityDraft(draftKey, { legacyReportDate: form.reportDate })

  currentRecordId.value = draft?.recordId || ''

  if (draft?.form) {
    applyContextFieldsFromDraft(draft.form)
  } else {
    currentRecordId.value = ''
    resetTimeSlotsForNewContext()
    return
  }

  timeSlots.value = buildTimeSlotsFromDraft(draft)
}

const appendEmptySlotIfNeeded = () => {
  if (hasUnsubmittedSlots.value) return
  timeSlots.value.push(createEmptyTimeSlot())
}

const onReportDateChange = (e) => {
  persistDraft()
  form.reportDate = e.detail.value
  restoreDraftForContext()
}

const onLineChange = (e) => {
  persistDraft()
  const idx = Number(e.detail.value)
  form.productionLine = lineOptions.value[idx] || ''
  restoreDraftForContext()
  applyModelDefaultsToAllSlots()
}

const onProcessSegmentChange = (e) => {
  persistDraft()
  const idx = Number(e.detail.value)
  form.processSegment = processSegmentOptions.value[idx] || ''
  currentRecordId.value = ''
  restoreDraftForContext()
  applyModelDefaultsToAllSlots()
  if (form.machineModel && form.processSegment && !getSlotModelStandardCapacity({ machineModel: '' }) && !getSlotModelStandardManpower({ machineModel: '' })) {
    uni.showToast({ title: '该机型与制程段尚未维护标准参数', icon: 'none' })
  }
}

const onMachineModelChange = (e) => {
  const idx = Number(e.detail.value)
  form.machineModel = modelOptions.value[idx] || ''
  applyModelDefaultsToAllSlots()
  persistDraft()
  if (form.machineModel && form.processSegment && !getSlotModelStandardCapacity({ machineModel: '' }) && !getSlotModelStandardManpower({ machineModel: '' })) {
    uni.showToast({ title: '该机型与制程段尚未维护标准参数', icon: 'none' })
  }
}

const onSlotStartTimeChange = (slotIndex, e) => {
  const slot = timeSlots.value[slotIndex]
  if (!slot || isSlotLocked(slot)) return
  const idx = Number(e.detail.value)
  slot.startTime = timeOptions[idx] || ''
  updateTimeSlotLabel(slot)
  persistDraft()
}

const onSlotEndTimeChange = (slotIndex, e) => {
  const slot = timeSlots.value[slotIndex]
  if (!slot || isSlotLocked(slot)) return
  const idx = Number(e.detail.value)
  slot.endTime = timeOptions[idx] || ''
  updateTimeSlotLabel(slot)
  persistDraft()
}

const onSlotMachineModelChange = (slotIndex, e) => {
  const slot = timeSlots.value[slotIndex]
  if (!slot || isSlotLocked(slot)) return
  const idx = Number(e.detail.value)
  slot.machineModel = idx <= 0 ? '' : modelOptions.value[idx - 1] || ''
  applyModelDefaultsToSlot(slot)
  persistDraft()
  if (slot.machineModel && form.processSegment && !getSlotModelStandardCapacity(slot) && !getSlotModelStandardManpower(slot)) {
    uni.showToast({ title: '该时段机型与制程段尚未维护标准参数', icon: 'none' })
  }
}

const onSlotMinutesInput = (slotIndex) => {
  const slot = timeSlots.value[slotIndex]
  if (!slot || isSlotLocked(slot)) return
  slot.productionHoursText = calcHoursFromMinutes(slot.productionMinutes)
  persistDraft()
}

const handleEditTimeSlot = (index) => {
  const slot = timeSlots.value[index]
  if (!slot?.submitted || slot.editing) return
  slot._editSnapshot = createSlotEditSnapshot(slot)
  slot._editOrigin = {
    startTime: slot.startTime,
    endTime: slot.endTime,
    label: slot.label,
    timeRange: slot.label || formatTimeSlotRange(slot.startTime, slot.endTime)
  }
  slot.editing = true
}

const handleCancelEditTimeSlot = (index) => {
  const slot = timeSlots.value[index]
  if (!slot?.submitted || !slot.editing) return
  if (slot._editSnapshot) {
    restoreSlotFromSnapshot(slot, slot._editSnapshot)
  }
  clearSlotEditState(slot)
  persistDraft()
}

const handleAddTimeSlot = () => {
  timeSlots.value.push(createEmptyTimeSlot())
  persistDraft()
}

const handleRemoveTimeSlot = (index) => {
  const slot = timeSlots.value[index]
  if (slot?.submitted) {
    uni.showToast({ title: '已提交的时段不可删除', icon: 'none' })
    return
  }
  if (timeSlots.value.length <= 1) {
    uni.showToast({ title: '至少保留一个时间段', icon: 'none' })
    return
  }
  timeSlots.value.splice(index, 1)
  persistDraft()
}

const getTodayStr = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const resolveSubmitterName = () => {
  const userInfo = uni.getStorageSync('userInfo') || {}
  return (
    userInfo.name ||
    userInfo.realName ||
    userInfo.nickName ||
    userInfo.username ||
    userInfo.userName ||
    ''
  )
}

const isValidNumber = (val, { allowEmpty = false, min = 0 } = {}) => {
  if (val === '' || val == null) return allowEmpty
  const num = Number(val)
  return !Number.isNaN(num) && num >= min
}

const validateForm = () => {
  if (!form.reportDate) {
    uni.showToast({ title: '请选择日期', icon: 'none' })
    return false
  }
  if (!form.productionLine) {
    uni.showToast({ title: '请选择线体', icon: 'none' })
    return false
  }
  if (lineOptions.value.length > 0 && !lineOptions.value.includes(form.productionLine)) {
    uni.showToast({ title: '所选线体不在当前维护列表中，请重新选择', icon: 'none' })
    return false
  }
  if (!form.teamLeader.trim()) {
    uni.showToast({ title: '请填写组长', icon: 'none' })
    return false
  }
  if (!form.processSegment) {
    uni.showToast({ title: '请选择制程段', icon: 'none' })
    return false
  }
  if (!form.machineModel.trim()) {
    uni.showToast({ title: '请选择机型', icon: 'none' })
    return false
  }
  if (!modelOptions.value.includes(form.machineModel)) {
    uni.showToast({ title: '所选机型不在维护列表中，请重新选择', icon: 'none' })
    return false
  }
  applyModelDefaultsToAllSlots()
  const defaultSlot = { machineModel: '' }
  if (getSlotModelStandardCapacity(defaultSlot) == null) {
    uni.showToast({ title: '该机型与制程段未维护标准产能，请联系管理员', icon: 'none' })
    return false
  }
  if (getSlotModelStandardManpower(defaultSlot) == null) {
    uni.showToast({ title: '该机型与制程段未维护标准人力，请联系管理员', icon: 'none' })
    return false
  }
  if (!form.personInCharge.trim()) {
    uni.showToast({ title: '请填写负责人', icon: 'none' })
    return false
  }

  const slotsToValidate = slotsToSubmit.value
  if (slotsToValidate.length === 0) {
    uni.showToast({ title: '没有需要提交的时段', icon: 'none' })
    return false
  }

  for (let i = 0; i < slotsToValidate.length; i++) {
    const slot = slotsToValidate[i]
    const prefix = getSlotTimePrefix(slot)

    if (!slot.startTime) {
      uni.showToast({ title: `${prefix}请选择开始时间`, icon: 'none' })
      return false
    }
    if (!slot.endTime) {
      uni.showToast({ title: `${prefix}请选择结束时间`, icon: 'none' })
      return false
    }
    if (!isValidTimeSlotRange(slot.startTime, slot.endTime)) {
      uni.showToast({ title: `${prefix}结束时间须晚于开始时间，且不少于 30 分钟`, icon: 'none' })
      return false
    }
    updateTimeSlotLabel(slot)

    const duplicate = timeSlots.value.some(
      (other) =>
        other !== slot &&
        other.startTime === slot.startTime &&
        other.endTime === slot.endTime
    )
    if (duplicate) {
      uni.showToast({ title: `${prefix}时段重复，请调整时间`, icon: 'none' })
      return false
    }

    const slotModel = getSlotMachineModel(slot)
    if (!modelOptions.value.includes(slotModel)) {
      uni.showToast({ title: `${prefix}机型无效，请重新选择`, icon: 'none' })
      return false
    }
    if (getSlotModelStandardCapacity(slot) == null) {
      uni.showToast({ title: `${prefix}机型未维护标准产能`, icon: 'none' })
      return false
    }
    if (getSlotModelStandardManpower(slot) == null) {
      uni.showToast({ title: `${prefix}机型未维护标准人力`, icon: 'none' })
      return false
    }

    if (!isValidNumber(slot.productionMinutes)) {
      uni.showToast({ title: `${prefix}请填写有效的生产分钟数`, icon: 'none' })
      return false
    }
    slot.productionHoursText = calcHoursFromMinutes(slot.productionMinutes)

    const requiredSlotFields = [
      { key: 'actualCapacity', label: '实际产能（PCS）' },
      { key: 'actualManpower', label: '实际出勤人力' }
    ]
    for (const field of requiredSlotFields) {
      if (!isValidNumber(slot[field.key])) {
        uni.showToast({ title: `${prefix}请填写${field.label}`, icon: 'none' })
        return false
      }
    }

    applyModelDefaultsToSlot(slot)
    if (!isValidNumber(slot.standardCapacity)) {
      uni.showToast({ title: `${prefix}标准产能未配置`, icon: 'none' })
      return false
    }
    if (!isValidNumber(slot.standardManpower)) {
      uni.showToast({ title: `${prefix}标准人力未配置`, icon: 'none' })
      return false
    }

    const optionalNumericFields = [
      { key: 'borrowedInManpower', label: '借入人力' },
      { key: 'lentOutManpower', label: '借出人力' }
    ]
    for (const field of optionalNumericFields) {
      if (!isValidNumber(slot[field.key], { allowEmpty: true })) {
        uni.showToast({ title: `${prefix}${field.label}需为非负数字`, icon: 'none' })
        return false
      }
    }

  }

  return true
}

const serverSlotToFormSlot = (slot) => {
  const rangeParts = String(slot?.timeRange || '').split('-')
  const startTime = slot?.startTime || rangeParts[0]?.trim() || ''
  const endTime = slot?.endTime || rangeParts[1]?.trim() || ''
  const mapped = createTimeSlotFromStored(startTime, endTime, {
    machineModel: slot?.machineModel || '',
    productionMinutes: slot?.productionMinutes,
    productionHoursText: slot?.productionHours,
    standardCapacity: slot?.standardCapacity,
    actualCapacity: slot?.actualCapacity,
    standardManpower: slot?.standardManpower,
    actualManpower: slot?.actualManpower,
    borrowedInManpower: slot?.borrowedInManpower,
    borrowedInPosition: slot?.borrowedInPosition,
    lentOutManpower: slot?.lentOutManpower,
    lentOutPosition: slot?.lentOutPosition,
    ictPassRate: slot?.ictPassRate,
    fctPassRate: slot?.fctPassRate,
    reasonRemark: slot?.reasonRemark,
    submitted: true
  })
  mapped.label = slot?.timeRange || mapped.label
  return mapped
}

const fetchExistingRecordForCurrentContext = async () => {
  const context = {
    reportDate: form.reportDate,
    productionLine: form.productionLine,
    teamLeader: form.teamLeader.trim(),
    processSegment: form.processSegment
  }
  if (!context.reportDate || !context.productionLine || !context.teamLeader || !context.processSegment) {
    return null
  }
  // 拉取同日期/线体/组长下全部记录，再按制程段精确匹配，避免后端未按制程段过滤时串数据
  const res = await getCapacityList({
    reportDate: context.reportDate,
    productionLine: context.productionLine,
    teamLeader: context.teamLeader,
    page: 1,
    pageSize: 200
  })
  return findCapacityRecordForContext(res?.list || [], context)
}

const getSubmitContext = () => ({
  reportDate: form.reportDate,
  productionLine: form.productionLine,
  teamLeader: form.teamLeader.trim(),
  processSegment: form.processSegment
})

const buildSubmitPayload = (slots) => {
  const context = getSubmitContext()
  return {
    id: currentRecordId.value || undefined,
    recordKey: buildCapacityRecordKey(context),
    reportDate: form.reportDate,
    productionLine: form.productionLine,
    teamLeader: form.teamLeader.trim(),
    processSegment: form.processSegment,
    machineModel: form.machineModel.trim(),
    personInCharge: form.personInCharge.trim(),
    submitter: submitterName.value,
    singleWorkHours: (() => {
      const sw = currentModelConfig.value?.singleWorkHours
      return sw != null && sw !== '' && !Number.isNaN(Number(sw)) ? Number(sw) : undefined
    })(),
    timeSlots: slots.map((slot) => {
      const metrics = getSlotCapacityMetrics(slot)
      const startMinutes = parseTimeToMinutes(slot.startTime)
      const slotModel = getSlotMachineModel(slot)
      const slotConfig = getSlotModelConfig(slot)
      const singleWorkHours = slotConfig?.singleWorkHours
      return {
        timeRange: slot.label || formatTimeSlotRange(slot.startTime, slot.endTime),
        startTime: slot.startTime,
        endTime: slot.endTime,
        startHour: startMinutes != null ? Math.floor(startMinutes / 60) : undefined,
        machineModel: slotModel,
        productionMinutes: Number(slot.productionMinutes),
        productionHours: Number(slot.productionHoursText || calcHoursFromMinutes(slot.productionMinutes)),
        standardCapacity: Number(slot.standardCapacity),
        standardCapacityPcs:
          metrics.standardCapacityPcs != null
            ? Number(metrics.standardCapacityPcs.toFixed(2))
            : undefined,
        actualCapacity: Number(slot.actualCapacity),
        standardManpower: Number(slot.standardManpower),
        actualManpower: Number(slot.actualManpower),
        singleWorkHours:
          singleWorkHours != null && singleWorkHours !== '' && !Number.isNaN(Number(singleWorkHours))
            ? Number(singleWorkHours)
            : undefined,
        outputHours: metrics.outputHours != null ? Number(metrics.outputHours.toFixed(2)) : undefined,
        attendanceHours: metrics.attendanceHours != null ? Number(metrics.attendanceHours.toFixed(2)) : undefined,
        capacityDifference:
          metrics.capacityDifference != null ? Number(metrics.capacityDifference.toFixed(2)) : undefined,
        productionAchievementRate:
          metrics.productionAchievementRate != null
            ? Number(metrics.productionAchievementRate.toFixed(2))
            : undefined,
        borrowedInManpower: slot.borrowedInManpower !== '' ? Number(slot.borrowedInManpower) : undefined,
        borrowedInPosition: slot.borrowedInPosition.trim() || undefined,
        lentOutManpower: slot.lentOutManpower !== '' ? Number(slot.lentOutManpower) : undefined,
        lentOutPosition: slot.lentOutPosition.trim() || undefined,
        ictPassRate: slot.ictPassRate.trim() || undefined,
        fctPassRate: slot.fctPassRate.trim() || undefined,
        reasonRemark: slot.reasonRemark.trim() || undefined
      }
    })
  }
}

const handleSubmit = async () => {
  if (!validateForm()) return

  const submittingSlots = slotsToSubmit.value
  if (submittingSlots.length === 0) {
    uni.showToast({ title: '没有需要提交的时段', icon: 'none' })
    return
  }

  try {
    const context = getSubmitContext()
    const existingRecord = await fetchExistingRecordForCurrentContext()
    currentRecordId.value = ''

    let serverSlots = []
    if (existingRecord && isSameCapacityContext(existingRecord, context)) {
      if (existingRecord.id) {
        currentRecordId.value = existingRecord.id
      }
      serverSlots = parseRecordTimeSlots(existingRecord).map(serverSlotToFormSlot)
    }

    const slotsForPayload = buildSlotsForSubmit(serverSlots, timeSlots.value)

    const res = await postCapacity(buildSubmitPayload(slotsForPayload))
    currentRecordId.value = res?.id || res?.data?.id || currentRecordId.value

    const editedCount = submittingSlots.filter((slot) => slot.editing).length
    const newCount = submittingSlots.length - editedCount
    const onlyEdited = editedCount > 0 && newCount === 0
    const onlyNew = newCount > 0 && editedCount === 0

    submittingSlots.forEach((slot) => {
      if (slot.submitted) {
        clearSlotEditState(slot)
      } else {
        slot.submitted = true
      }
    })
    persistDraft()
    appendEmptySlotIfNeeded()
    persistDraft()

    uni.showToast({
      title: onlyEdited
        ? submittingSlots.length > 1
          ? '时段修改已保存'
          : `${submittingSlots[0].label || '时段'} 修改已保存`
        : onlyNew
          ? submittingSlots.length > 1
            ? '时段数据提交成功'
            : `${submittingSlots[0].label || '时段'} 提交成功`
          : '产能数据已更新',
      icon: 'success',
      duration: 2000
    })
    if (processSegmentOptions.value.length > 1) {
      setTimeout(() => {
        uni.showToast({
          title: '若还有其他制程段，请切换制程段继续提报',
          icon: 'none',
          duration: 2500
        })
      }, 2100)
    }
  } catch (e) {
    const msg = String(e?.message || e?.details?.message || '')
    const detailsText = JSON.stringify(e?.details || '')

    if (msg.includes('E11000') || msg.includes('duplicate key') || detailsText.includes('duplicate key')) {
      uni.showModal({
        title: '制程段冲突',
        content:
          '同一账号、同一天、同一线体、同一组长已存在提报记录，但服务器唯一索引未包含「制程段」，导致第二个制程段无法保存。\n\n请后端将 capacityreports 集合索引 uniq_v2_capacity_business_key 改为包含 processSegment（或 process），例如：reportDate + productionLine + teamLeader + processSegment + submitter。\n\n前端已正确提交 recordKey 与 processSegment，需后端更新数据库索引后生效。',
        showCancel: false
      })
      return
    }

    if (/DIP\d/i.test(msg) && msg.includes('线') && (msg.includes('校验') || msg.includes('限制') || msg.includes('不在'))) {
      uni.showModal({
        title: '线体校验未通过',
        content:
          '服务器仍将线体限制为 DIP1～DIP7。请在后台把产能提报的 productionLine 校验改为：允许 meta 中维护的任意线体（与「产能基础数据维护」列表一致）。',
        showCancel: false
      })
      return
    }

    uni.showToast({
      title: msg || '提交失败，请稍后重试',
      icon: 'none',
      duration: 3000
    })
  }
}

const loadLineAndProcessOptions = async () => {
  lineOptions.value = await getCapacityLineOptions()
  try {
    const meta = await getCapacityMeta()
    processSegmentOptions.value = Array.isArray(meta.processes) ? meta.processes : []
    modelOptions.value = Array.isArray(meta.models) ? meta.models : []
    modelConfigs.value =
      meta && typeof meta.modelConfigs === 'object' && meta.modelConfigs != null
        ? meta.modelConfigs
        : {}
  } catch (e) {
    processSegmentOptions.value = []
    modelOptions.value = []
    modelConfigs.value = {}
  }
  if (form.productionLine && !lineOptions.value.includes(form.productionLine)) {
    form.productionLine = ''
  }
  if (form.processSegment && !processSegmentOptions.value.includes(form.processSegment)) {
    form.processSegment = ''
  }
  if (form.machineModel && !modelOptions.value.includes(form.machineModel)) {
    form.machineModel = ''
  }
  applyModelDefaultsToAllSlots()
}

const handleGoBaseConfig = () => {
  uni.navigateTo({ url: '/pages/performance/capacity-config' })
}

onMounted(async () => {
  form.reportDate = getTodayStr()
  submitterName.value = resolveSubmitterName()

  canManageBaseConfig.value = canManageCapacityBaseConfig()

  await loadLineAndProcessOptions()
  restoreDraftForContext()
})

onShow(async () => {
  await loadLineAndProcessOptions()
})

onBeforeUnmount(() => {
  persistDraft()
})

const handleBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.redirectTo({ url: '/pages/performance/index' })
  }
}
</script>

<style lang="scss" scoped>
.capacity-container {
  height: 100vh;
  background: linear-gradient(180deg, #a7f3d0 0%, #6ee7b7 40%, #34d399 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nav-bar {
  height: 100rpx;
  padding: 40rpx 32rpx 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ffffff;
}

.nav-back {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back-icon {
  font-size: 40rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
}

.nav-placeholder {
  width: 80rpx;
  height: 80rpx;
}

.scroll-area {
  flex: 1;
  min-height: 0;
  padding: 24rpx 24rpx 60rpx;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}

.config-entry {
  margin-bottom: 20rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.config-entry-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #065f46;
  display: block;
}

.config-entry-desc {
  font-size: 22rpx;
  color: #6b7280;
  margin-top: 6rpx;
  display: block;
}

.form-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: #6b7280;
}

.config-entry-arrow {
  font-size: 40rpx;
  color: #9ca3af;
}

.section-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx 16rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.08);
  margin-bottom: 24rpx;
}

.time-slot-card {
  border: 2rpx solid #d1fae5;
}

.time-slot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #e5e7eb;
}

.time-slot-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.time-slot-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #047857;
}

.time-slot-badge {
  font-size: 26rpx;
  color: #059669;
  background: #d1fae5;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
}

.time-slot-badge--editing {
  color: #b45309;
  background: #fef3c7;
}

.time-slot-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.time-slot-edit {
  font-size: 30rpx;
  color: #2563eb;
  padding: 12rpx 8rpx;
}

.time-slot-cancel {
  font-size: 30rpx;
  color: #6b7280;
  padding: 12rpx 8rpx;
}

.time-slot-card--submitted {
  border-color: #a7f3d0;
  opacity: 0.95;
}

.input-readonly {
  color: #6b7280;
  background: #eef2f7 !important;
}

.draft-tip {
  margin-bottom: 24rpx;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.85);
  font-size: 30rpx;
  color: #047857;
  line-height: 1.6;
}

.time-slot-remove {
  font-size: 30rpx;
  color: #ef4444;
  padding: 12rpx 8rpx;
}

.form-item {
  margin-bottom: 28rpx;
}

.form-item-textarea {
  margin-bottom: 16rpx;
}

.form-label {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2933;
  margin-bottom: 16rpx;
  display: block;
  line-height: 1.4;
}

.form-label.required::before {
  content: '*';
  color: #ef4444;
  margin-right: 4rpx;
}

.form-input {
  width: 100%;
  min-height: 96rpx;
  padding: 28rpx 32rpx;
  border-radius: 20rpx;
  background: #f5f7fb;
  font-size: 34rpx;
  line-height: 1.5;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  min-height: 220rpx;
  padding: 28rpx 32rpx;
  border-radius: 20rpx;
  background: #f5f7fb;
  font-size: 34rpx;
  line-height: 1.6;
  box-sizing: border-box;
}

.picker-display {
  width: 100%;
  min-height: 96rpx;
  padding: 0 32rpx;
  border-radius: 20rpx;
  background: #f5f7fb;
  font-size: 34rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.picker-display .placeholder {
  color: #9ca3af;
}

.picker-disabled {
  opacity: 0.75;
  background: #eef2f7 !important;
}

.picker-arrow {
  color: #9ca3af;
  font-size: 40rpx;
}

.form-placeholder {
  color: #9ca3af;
  font-size: 34rpx;
}

.duration-display {
  width: 100%;
  min-height: 96rpx;
  padding: 24rpx 32rpx;
  border-radius: 20rpx;
  background: #e5e7eb;
  font-size: 34rpx;
  line-height: 1.5;
  color: #374151;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.duration-display .duration-placeholder {
  color: #9ca3af;
}

.add-slot-inline {
  margin-bottom: 24rpx;
}

.add-slot-btn {
  width: 100%;
  height: 100rpx;
  line-height: 100rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #059669;
  font-size: 34rpx;
  font-weight: 600;
  border: 2rpx dashed #34d399;
}

.add-slot-btn::after {
  border: none;
}

.submit-area {
  margin-top: 8rpx;
}

.submit-btn {
  width: 100%;
  height: 108rpx;
  line-height: 108rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  color: #ffffff;
  font-size: 36rpx;
  font-weight: 600;
}

.submit-btn::after {
  border: none;
}
</style>
