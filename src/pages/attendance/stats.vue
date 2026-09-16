<template>
  <view class="attendance-container">
    <!-- 顶部Header -->
    <view class="header">
      <view class="back-btn" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="header-title">出勤时间统计</view>
      <view class="header-placeholder"></view>
    </view>

    <!-- 每日报告（仅组长可见） -->
    <view 
      v-if="showDailyReportSection" 
      class="daily-report-section"
    >
      <view class="section-title-row">
        <text class="section-title">每日报告</text>
        <text class="section-tip">全员到齐情况下点左边，有请假人员选择后点右边</text>
      </view>
      <!-- 未出勤成员暂时隐藏 -->
      <!-- <view class="daily-report-row" @tap="handleOpenDailyReportModal">
        <text class="field-label">未出勤成员</text>
        <text class="daily-report-value">
          {{ dailyReportSelectedMembers.length > 0 ? dailyReportSelectedMembers.join('、') : '请选择' }}
        </text>
        <text class="arrow-icon">›</text>
      </view> -->
      <view class="daily-report-row" @tap="handleOpenLeaveReportModal">
        <text class="field-label">请假成员</text>
        <text class="daily-report-value">
          {{ leaveReportSelectedMembers.length > 0 ? leaveReportSelectedMembers.map(m => m.name).join('、') : '请选择' }}
        </text>
        <text class="arrow-icon">›</text>
      </view>
      <view class="daily-report-action">
        <view 
          class="submit-btn all-present-btn"
          :class="{ 'btn-disabled': isSendingDailyReport || isSubmittingAllPresent }"
          @tap="handleSubmitAllPresent"
        >
          <text class="submit-text">{{ isSubmittingAllPresent ? '提交中' : '全员到齐' }}</text>
        </view>
        <view 
          class="submit-btn"
          :class="{ 'btn-disabled': isSendingDailyReport || leaveReportSelectedMembers.length === 0 }"
          @tap="handleSubmitDailyReport"
        >
          <text class="submit-text">{{ isSendingDailyReport ? '提交中' : '请假人员提交' }}</text>
        </view>
        <view 
          v-if="leaveReportSelectedMembers.length > 0" 
          class="clear-selected-btn" 
          @tap="handleClearDailyReportSelection"
        >
          <text class="clear-text">清空</text>
        </view>
      </view>
    </view>

    <!-- 出勤记录列表 -->
    <scroll-view class="attendance-list" scroll-y="true">
      <view 
        v-for="(record, index) in attendanceList" 
        :key="index"
        class="attendance-item"
      >
        <!-- 删除按钮 -->
        <view class="delete-btn" @tap="handleDeleteRecord(index)" hover-class="delete-hover">
          <text class="delete-icon">×</text>
        </view>

        <!-- 姓名 -->
        <view class="field-group">
          <text class="field-label">姓名</text>
          <view class="name-picker-container">
            <view class="field-input name-picker" @tap.stop="handleShowMemberModal(index)">
              {{ record.name || '请选择' }}
            </view>
            <view v-if="record.name && getMemberShiftType(record.name)" class="shift-badge" :class="getMemberShiftType(record.name) === 'night' ? 'night-shift' : 'day-shift'">
              <text class="shift-text">{{ getMemberShiftType(record.name) === 'night' ? '夜班' : '白班' }}</text>
            </view>
          </view>
        </view>

        <!-- 上班时间 -->
        <view class="field-group">
          <text class="field-label">上班时间</text>
          <view class="field-input time-picker" @tap="handleOpenDateTimePicker('start', index)">
            {{ formatDateTimeDisplay(record.startTime) || '请选择' }}
          </view>
        </view>

        <!-- 下班时间 -->
        <view class="field-group">
          <text class="field-label">下班时间</text>
          <view class="field-input time-picker" @tap="handleOpenDateTimePicker('end', index)">
            {{ formatDateTimeDisplay(record.endTime) || '请选择' }}
          </view>
        </view>

        <!-- 出勤时长 -->
        <view class="field-group">
          <text class="field-label">出勤时长</text>
          <view class="field-input duration-display">
            {{ calcRecordDuration(record) || '--' }}
          </view>
        </view>
      </view>

      <view v-if="attendanceList.length === 0" class="empty-tip">
        <text class="empty-text">暂无出勤记录，点击下方按钮添加</text>
      </view>
      
      <view v-if="memberOptions.length === 0" class="warning-tip">
        <text class="warning-text">⚠️ 请先在组员管理页面添加组员</text>
      </view>
    </scroll-view>

    <!-- 按钮区域 -->
    <view class="button-group">
      <view class="add-record-btn" @tap="handleAddRecord" hover-class="btn-hover">
        <text class="add-icon">+</text>
        <text class="add-text">添加记录</text>
      </view>
      <view class="submit-btn" @tap="handleSubmit" hover-class="btn-hover">
        <text class="submit-text">提交</text>
      </view>
    </view>
    
    <!-- 查看提交情况按钮 -->
    <view v-if="showDailyReportSection" class="view-submit-btn" @tap="handleViewSubmitHistory" hover-class="btn-hover">
      <text class="view-submit-text">查看提交情况</text>
    </view>

    <!-- 组员多选弹窗 -->
    <view v-if="showMemberModal" class="modal-overlay" @tap="handleCloseMemberModal">
      <view class="modal-content member-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">选择组员（可多选）</text>
          <view class="modal-close" @tap="handleCloseMemberModal">×</view>
        </view>
        <view class="modal-body">
          <scroll-view class="member-select-list" scroll-y="true">
            <view 
              v-for="(member, index) in memberOptions" 
              :key="index"
              class="member-select-item"
              :class="{ 'selected': selectedMembers.includes(member) }"
              @tap.stop="handleToggleMember(member)"
            >
              <view class="member-select-checkbox">
                <text class="checkbox-icon" v-if="selectedMembers.includes(member)">✓</text>
              </view>
              <text class="member-select-name">{{ member }}</text>
              <view class="member-shift-badge" :class="getMemberShiftType(member) === 'night' ? 'night-shift' : 'day-shift'">
                <text class="shift-text">{{ getMemberShiftType(member) === 'night' ? '夜班' : '白班' }}</text>
              </view>
            </view>
            <view v-if="memberOptions.length === 0" class="empty-member-tip">
              <text class="empty-member-text">暂无组员，请先在组员管理页面添加</text>
            </view>
          </scroll-view>

          <view class="batch-time-section">
            <view class="batch-time-group">
              <text class="batch-time-label">统一上班时间</text>
              <view class="batch-time-picker" @tap="handleOpenBatchDateTimePicker('start')">
                {{ formatDateTimeDisplay(batchStartTime) || '请选择' }}
              </view>
            </view>
            <view class="batch-time-group">
              <text class="batch-time-label">统一下班时间</text>
              <view class="batch-time-picker" @tap="handleOpenBatchDateTimePicker('end')">
                {{ formatDateTimeDisplay(batchEndTime) || '请选择' }}
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @tap="handleCloseMemberModal">取消</button>
          <button 
            class="modal-btn select-all-btn" 
            @tap="handleToggleSelectAll"
          >
            {{ isAllSelected ? '取消全选' : '全选' }}
          </button>
          <button 
            class="modal-btn confirm-btn" 
            :class="{ 'btn-disabled': selectedMembers.length === 0 || !batchStartTime || !batchEndTime }"
            :disabled="selectedMembers.length === 0 || !batchStartTime || !batchEndTime"
            @tap="handleConfirmMemberSelection"
          >
            确定（{{ selectedMembers.length }}人）
          </button>
        </view>
      </view>
    </view>

    <!-- 每日报告组员选择弹窗（未出勤成员暂时隐藏） -->
    <!-- <view v-if="showDailyReportModal" class="modal-overlay" @tap="handleCloseDailyReportModal">
      <view class="modal-content daily-report-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">选择未出勤成员</text>
          <view class="modal-close" @tap="handleCloseDailyReportModal">×</view>
        </view>
        <view class="modal-body">
          <scroll-view class="member-select-list" scroll-y="true">
            <view 
              v-for="(member, index) in memberOptions" 
              :key="index"
              class="member-select-item"
              :class="{ 'selected': dailyReportSelectedMembers.includes(member) }"
              @tap.stop="handleToggleDailyReportMember(member)"
            >
              <view class="member-select-checkbox">
                <text class="checkbox-icon" v-if="dailyReportSelectedMembers.includes(member)">✓</text>
              </view>
              <text class="member-select-name">{{ member }}</text>
              <view class="member-shift-badge" :class="getMemberShiftType(member) === 'night' ? 'night-shift' : 'day-shift'">
                <text class="shift-text">{{ getMemberShiftType(member) === 'night' ? '夜班' : '白班' }}</text>
              </view>
            </view>
            <view v-if="memberOptions.length === 0" class="empty-member-tip">
              <text class="empty-member-text">暂无组员，请先在组员管理页面添加</text>
            </view>
          </scroll-view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @tap="handleCloseDailyReportModal">取消</button>
          <button 
            class="modal-btn select-all-btn" 
            @tap="handleToggleDailyReportSelectAll"
            :disabled="memberOptions.length === 0"
          >
            {{ isDailyReportAllSelected ? '取消全选' : '全选' }}
          </button>
          <button 
            class="modal-btn confirm-btn" 
            :class="{ 'btn-disabled': dailyReportSelectedMembers.length === 0 }"
            :disabled="dailyReportSelectedMembers.length === 0"
            @tap="handleConfirmDailyReportSelection"
          >
            确定（{{ dailyReportSelectedMembers.length }}人）
          </button>
        </view>
      </view>
    </view> -->

    <!-- 请假成员选择弹窗 -->
    <view v-if="showLeaveReportModal" class="modal-overlay" @tap="handleCloseLeaveReportModal">
      <view class="modal-content daily-report-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">选择请假成员</text>
          <view class="modal-close" @tap="handleCloseLeaveReportModal">×</view>
        </view>
        <view class="modal-body">
          <scroll-view class="member-select-list" scroll-y="true">
            <view 
              v-for="(member, index) in memberOptions" 
              :key="index"
              class="member-select-item leave-member-item"
            >
              <view class="member-select-row" @tap.stop="handleToggleLeaveReportMember(member)">
                <view class="member-select-checkbox">
                  <text class="checkbox-icon" v-if="isLeaveMemberSelected(member)">✓</text>
                </view>
                <text class="member-select-name">{{ member }}</text>
                <view class="member-shift-badge" :class="getMemberShiftType(member) === 'night' ? 'night-shift' : 'day-shift'">
                  <text class="shift-text">{{ getMemberShiftType(member) === 'night' ? '夜班' : '白班' }}</text>
                </view>
              </view>
              <!-- 请假类型选择器（仅在选择该成员时显示） -->
              <view v-if="isLeaveMemberSelected(member)" class="leave-type-selector">
                <text class="leave-type-label">请假类型：</text>
                <view class="leave-type-options">
                  <view 
                    v-for="(type, typeIndex) in leaveTypes" 
                    :key="typeIndex"
                    class="leave-type-option"
                    :class="{ 'selected': getLeaveMemberType(member) === type }"
                    @tap.stop="handleSelectLeaveType(member, type)"
                  >
                    <text>{{ type }}</text>
                  </view>
                </view>
              </view>
            </view>
            <view v-if="memberOptions.length === 0" class="empty-member-tip">
              <text class="empty-member-text">暂无组员，请先在组员管理页面添加</text>
            </view>
          </scroll-view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @tap="handleCloseLeaveReportModal">取消</button>
          <button 
            class="modal-btn select-all-btn" 
            @tap="handleToggleLeaveReportSelectAll"
            :disabled="memberOptions.length === 0"
          >
            {{ isLeaveReportAllSelected ? '取消全选' : '全选' }}
          </button>
          <button 
            class="modal-btn confirm-btn" 
            :class="{ 'btn-disabled': leaveReportSelectedMembers.length === 0 }"
            :disabled="leaveReportSelectedMembers.length === 0"
            @tap="handleConfirmLeaveReportSelection"
          >
            确定（{{ leaveReportSelectedMembers.length }}人）
          </button>
        </view>
      </view>
    </view>

    <!-- 日期时间选择器模态框 -->
    <view v-if="showDateTimePicker" class="modal-overlay" @tap="handleCloseDateTimePicker">
      <view class="modal-content datetime-picker-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">选择{{ currentDateTimeType === 'start' ? '上班' : '下班' }}时间</text>
          <view class="modal-close" @tap="handleCloseDateTimePicker">×</view>
        </view>
        <view class="modal-body">
          <!-- 日期选择 -->
          <view class="datetime-section">
            <text class="datetime-label">日期</text>
            <picker 
              mode="date" 
              :value="selectedDate" 
              @change="handleDateChange"
            >
              <view class="datetime-picker">
                {{ selectedDate || '请选择日期' }}
              </view>
            </picker>
          </view>
          <!-- 时间选择 -->
          <view class="datetime-section">
            <text class="datetime-label">时间</text>
            <picker 
              mode="selector"
              :range="timeOptions"
              :value="getTimeIndex(selectedTime)"
              @change="handleTimeChange"
            >
              <view class="datetime-picker">
                {{ selectedTime || '请选择时间' }}
              </view>
            </picker>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @tap="handleCloseDateTimePicker">取消</button>
          <button 
            class="modal-btn confirm-btn" 
            :class="{ 'btn-disabled': !selectedDate || !selectedTime }"
            :disabled="!selectedDate || !selectedTime"
            @tap="handleConfirmDateTime"
          >
            确定
          </button>
        </view>
      </view>
    </view>

    <!-- 查看提交情况弹窗 -->
    <view v-if="showSubmitHistoryModal" class="modal-overlay" @tap="handleCloseSubmitHistoryModal">
      <view class="modal-content submit-history-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">查看提交情况</text>
          <view class="modal-close" @tap="handleCloseSubmitHistoryModal">×</view>
        </view>
        <view class="modal-body">
          <!-- 时间筛选 -->
          <view class="date-filter-row">
            <view class="date-filter-item">
              <text class="date-filter-label">开始日期</text>
              <picker 
                mode="date" 
                :value="submitHistoryStartDate" 
                @change="handleSubmitHistoryStartDateChange"
              >
                <view class="date-filter-picker">
                  {{ submitHistoryStartDate || '请选择' }}
                </view>
              </picker>
            </view>
            <view class="date-filter-item">
              <text class="date-filter-label">结束日期</text>
              <picker 
                mode="date" 
                :value="submitHistoryEndDate" 
                @change="handleSubmitHistoryEndDateChange"
              >
                <view class="date-filter-picker">
                  {{ submitHistoryEndDate || '请选择' }}
                </view>
              </picker>
            </view>
          </view>
          <view class="filter-actions">
            <button 
              class="filter-btn query-btn" 
              :class="{ 'btn-disabled': !submitHistoryStartDate || !submitHistoryEndDate || isLoadingSubmitHistory }"
              :disabled="!submitHistoryStartDate || !submitHistoryEndDate || isLoadingSubmitHistory"
              @tap="handleQuerySubmitHistory"
            >
              {{ isLoadingSubmitHistory ? '查询中...' : '查询' }}
            </button>
            <button class="filter-btn reset-btn" @tap="handleResetSubmitHistoryFilter">重置</button>
          </view>
          
          <!-- 提交记录列表 -->
          <scroll-view class="submit-history-list" scroll-y="true">
            <view v-if="submitHistoryList.length === 0 && !isLoadingSubmitHistory" class="empty-tip">
              <text class="empty-text">{{ submitHistoryStartDate && submitHistoryEndDate ? '该日期范围内暂无提交记录' : '请选择日期范围后查询' }}</text>
            </view>
            <view 
              v-for="(record, index) in submitHistoryList" 
              :key="index"
              class="submit-history-item"
            >
              <view class="submit-history-header">
                <text class="submit-history-name">{{ record.name || record.memberName || '未知' }}</text>
                <text class="submit-history-date">{{ formatDateOnly(record.recordDate || record.startTime) }}</text>
              </view>
              <view class="submit-history-content">
                <view class="submit-history-row">
                  <text class="submit-history-label">上班时间：</text>
                  <text class="submit-history-value">{{ formatDateTimeDisplay(record.startTime) || '--' }}</text>
                </view>
                <view class="submit-history-row">
                  <text class="submit-history-label">下班时间：</text>
                  <text class="submit-history-value">{{ formatDateTimeDisplay(record.endTime) || '--' }}</text>
                </view>
                <view class="submit-history-row">
                  <text class="submit-history-label">出勤时长：</text>
                  <text class="submit-history-value">{{ formatDuration(record.duration) || '--' }}</text>
                </view>
                <view class="submit-history-row" v-if="record.submittedAt">
                  <text class="submit-history-label">提交时间：</text>
                  <text class="submit-history-value">{{ formatSubmittedTime(record.submittedAt) }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn confirm-btn" @tap="handleCloseSubmitHistoryModal" style="width: 100%;">
            关闭
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { submitAttendance, getAttendanceRecords, saveMonthlyAttendance } from '@/utils/api/attendance.js'
import { createHistory } from '@/utils/api/history.js'
import { getCurrentUser } from '@/utils/api/user.js'
import { getMembers } from '@/utils/api/member.js'
import { sendWechatNotification as sendWechatNotificationAPI, getWechatBoundAdmins } from '@/utils/api/notification.js'
import {
  calculateAttendanceDuration as calculateDuration,
  normalizeShiftType,
  isNightShiftType,
  parseDurationTextToMinutes
} from '@/utils/attendanceDuration.js'

// 出勤记录列表
const attendanceList = ref([])
// 时间选项（半小时为单位，从00:00到23:30）
const timeOptions = ref([])
// 组员选项（从组员管理页面获取）
const memberOptions = ref([])
// 当前组长的部门名称
const leaderDepartment = ref('')
// 当前用户信息
const currentUser = ref(null)
const leaderId = ref('')
const isSendingDailyReport = ref(false)
const isSubmittingAllPresent = ref(false)
const dailyReportRoleWhitelist = ['leader', '组长', 'group_leader']

const showDailyReportSection = computed(() => {
  const role = (currentUser.value?.role || '').toString()
  const normalized = role.toLowerCase()
  return dailyReportRoleWhitelist.some(keyword => keyword === normalized || keyword === role)
})

// 组员多选相关
const showMemberModal = ref(false)
const selectedMembers = ref([])
const currentRecordIndex = ref(-1) // 当前正在编辑的记录索引
const batchStartTime = ref('')
const batchEndTime = ref('')

// 每日报告选择
const showDailyReportModal = ref(false)
const dailyReportSelectedMembers = ref([])
const isDailyReportAllSelected = computed(() => {
  if (memberOptions.value.length === 0) return false
  return dailyReportSelectedMembers.value.length === memberOptions.value.length
})

// 请假成员选择
const showLeaveReportModal = ref(false)
const leaveReportSelectedMembers = ref([]) // 改为对象数组：[{name: 'xxx', leaveType: '事假'}, ...]
const leaveTypes = ['事假', '调休', '旷工', '年假', '病假']
const isLeaveReportAllSelected = computed(() => {
  if (memberOptions.value.length === 0) return false
  return leaveReportSelectedMembers.value.length === memberOptions.value.length
})

// 查看提交情况
const showSubmitHistoryModal = ref(false)
const submitHistoryStartDate = ref('')
const submitHistoryEndDate = ref('')
const submitHistoryList = ref([])
const isLoadingSubmitHistory = ref(false)

// 日期时间选择器相关
const showDateTimePicker = ref(false)
const currentDateTimeType = ref('start') // 'start' 或 'end'
const currentDateTimeIndex = ref(-1) // 当前编辑的记录索引
const selectedDate = ref('')
const selectedTime = ref('')

// 生成时间选项（精确到半小时）
const generateTimeOptions = () => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour.toString().padStart(2, '0')
      const minuteStr = minute.toString().padStart(2, '0')
      options.push(`${hourStr}:${minuteStr}`)
    }
  }
  return options
}

// 格式化日期时间显示（从 "YYYY-MM-DD HH:mm" 格式转换为显示格式）
const formatDateTimeDisplay = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  // 如果是旧的 HH:mm 格式，直接返回
  if (/^\d{2}:\d{2}$/.test(dateTimeStr)) {
    return dateTimeStr
  }
  // 如果是 ISO 格式，转换为显示格式
  if (dateTimeStr.includes('T')) {
    try {
      const date = new Date(dateTimeStr)
      if (isNaN(date.getTime())) return dateTimeStr
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}`
    } catch (e) {
      return dateTimeStr
    }
  }
  // 如果是 "YYYY-MM-DD HH:mm" 格式，直接返回
  return dateTimeStr
}

// 打开日期时间选择器
const handleOpenDateTimePicker = (type, index) => {
  currentDateTimeType.value = type
  currentDateTimeIndex.value = index
  const record = attendanceList.value[index]
  const currentValue = type === 'start' ? record.startTime : record.endTime
  
  // 解析当前值
  if (currentValue) {
    if (/^\d{2}:\d{2}$/.test(currentValue)) {
      // 旧格式 HH:mm，使用今天日期
      const today = new Date()
      selectedDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      selectedTime.value = currentValue
    } else if (currentValue.includes('T')) {
      // ISO 格式
      try {
        const date = new Date(currentValue)
        if (!isNaN(date.getTime())) {
          selectedDate.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          selectedTime.value = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        } else {
          initDateTimePicker()
        }
      } catch (e) {
        initDateTimePicker()
      }
    } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(currentValue)) {
      // "YYYY-MM-DD HH:mm" 格式
      const [datePart, timePart] = currentValue.split(' ')
      selectedDate.value = datePart
      selectedTime.value = timePart
    } else {
      initDateTimePicker()
    }
  } else {
    initDateTimePicker()
  }
  
  showDateTimePicker.value = true
}

// 初始化日期时间选择器（使用当前日期和时间）
const initDateTimePicker = () => {
  const now = new Date()
  selectedDate.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  // 默认时间：上班时间默认 08:00，下班时间默认 17:30
  if (currentDateTimeType.value === 'start') {
    selectedTime.value = '08:00'
  } else {
    selectedTime.value = '17:30'
  }
}

// 日期改变
const handleDateChange = (e) => {
  selectedDate.value = e.detail.value
}

// 时间改变
const handleTimeChange = (e) => {
  const selectedIndex = e.detail.value
  selectedTime.value = timeOptions.value[selectedIndex]
}

// 确认日期时间选择
const handleConfirmDateTime = () => {
  if (!selectedDate.value || !selectedTime.value) return
  
  const dateTimeStr = `${selectedDate.value} ${selectedTime.value}`
  const index = currentDateTimeIndex.value
  const type = currentDateTimeType.value
  
  // 如果是批量设置（index === -1）
  if (index === -1) {
    if (type === 'start') {
      batchStartTime.value = dateTimeStr
    } else {
      batchEndTime.value = dateTimeStr
    }
    handleCloseDateTimePicker()
    return
  }
  
  // 单个记录设置
  if (type === 'start') {
    attendanceList.value[index].startTime = dateTimeStr
  } else {
    attendanceList.value[index].endTime = dateTimeStr
  }
  
  // 重新计算出勤时长
  const department = resolveDepartmentName()
  attendanceList.value[index].duration = calculateDuration(
    attendanceList.value[index].startTime,
    attendanceList.value[index].endTime,
    attendanceList.value[index].department || department || '',
    resolveRecordShiftType(attendanceList.value[index])
  )
  
  saveAttendanceList()
  handleCloseDateTimePicker()
}

// 关闭日期时间选择器
const handleCloseDateTimePicker = () => {
  showDateTimePicker.value = false
  currentDateTimeType.value = 'start'
  currentDateTimeIndex.value = -1
  selectedDate.value = ''
  selectedTime.value = ''
}

const recalculateAllDurations = () => {
  const department = resolveDepartmentName()
  attendanceList.value.forEach((record, index) => {
    if (!record?.startTime || !record?.endTime) return
    attendanceList.value[index].duration = calculateDuration(
      record.startTime,
      record.endTime,
      record.department || department || '',
      resolveRecordShiftType(record)
    )
  })
}

// 页面加载时初始化
onMounted(async () => {
  timeOptions.value = generateTimeOptions()
  await loadUserInfo()
  await loadMemberOptions()
  loadLeaderDepartment()
  loadAttendanceList()
})

onShow(async () => {
  await loadMemberOptions()
  recalculateAllDurations()
})

// 加载用户信息
const loadUserInfo = async () => {
  try {
    const user = await getCurrentUser()
    currentUser.value = user
    leaderId.value = user.userId
  } catch (error) {
    console.error('获取用户信息失败:', error)
    // 如果API失败，从本地存储获取
    const userInfo = uni.getStorageSync('userInfo') || {}
    currentUser.value = userInfo
    leaderId.value = userInfo.userId || userInfo.nickName || userInfo.openid || 'unknown'
  }
}

const getLeaderStorageKey = () => {
  return leaderId.value ||
    currentUser.value?.userId ||
    currentUser.value?.nickName ||
    currentUser.value?.openid ||
    (uni.getStorageSync('userInfo')?.userId ||
     uni.getStorageSync('userInfo')?.nickName ||
     uni.getStorageSync('userInfo')?.openid) ||
    'unknown'
}

const getLeaderRecordMapFromStorage = () => {
  const allRecords = uni.getStorageSync('attendanceRecords')
  if (!allRecords || typeof allRecords !== 'object' || Array.isArray(allRecords)) {
    return {}
  }
  const leaderKey = getLeaderStorageKey()
  const leaderRecords = allRecords[leaderKey]
  if (leaderRecords && typeof leaderRecords === 'object' && !Array.isArray(leaderRecords)) {
    return leaderRecords
  }
  return {}
}

// 加载组长部门信息
const loadLeaderDepartment = () => {
  const department = uni.getStorageSync('leaderDepartment')
  if (department) {
    leaderDepartment.value = department
    return
  }
  const userDept = currentUser.value?.department || currentUser.value?.deptName || currentUser.value?.orgName
  if (userDept) {
    leaderDepartment.value = userDept
  }
}

const resolveDepartmentName = () => {
  return leaderDepartment.value ||
    currentUser.value?.department ||
    currentUser.value?.deptName ||
    currentUser.value?.orgName ||
    uni.getStorageSync('leaderDepartment') ||
    ''
}

// 组员信息映射（包含班次类型）
const memberInfoMap = ref({})

// 加载组员选项（优先从后端拉取，确保班次类型最新）
const loadMemberOptions = async () => {
  let members = []

  if (leaderId.value) {
    try {
      const apiMembers = await getMembers(leaderId.value)
      members = (apiMembers || []).map((member) => ({
        id: member.memberId,
        name: member.name,
        shiftType: normalizeShiftType(member.shiftType || 'day')
      }))
      uni.setStorageSync('teamMembers', members)
    } catch (error) {
      console.warn('获取组员列表失败，使用本地缓存:', error)
    }
  }

  if (members.length === 0) {
    const savedMembers = uni.getStorageSync('teamMembers')
    if (savedMembers && Array.isArray(savedMembers)) {
      members = savedMembers.map((member) => ({
        ...member,
        shiftType: normalizeShiftType(member.shiftType || 'day')
      }))
    }
  }

  memberOptions.value = members.map((member) => member.name)
  memberInfoMap.value = {}
  members.forEach((member) => {
    memberInfoMap.value[member.name] = member
  })
}

watch(memberOptions, (newList) => {
  const set = new Set(newList)
  dailyReportSelectedMembers.value = dailyReportSelectedMembers.value.filter(name => set.has(name))
})

const findMemberInfo = (memberName) => {
  if (!memberName) return null
  if (memberInfoMap.value[memberName]) return memberInfoMap.value[memberName]
  const teamMembers = uni.getStorageSync('teamMembers') || []
  return Array.isArray(teamMembers) ? teamMembers.find((m) => m.name === memberName) : null
}

// 获取组员的班次类型（以组员管理中的当前班次为准）
const getMemberShiftType = (memberName) => {
  if (!memberName) return 'day'
  const member = findMemberInfo(memberName)
  return normalizeShiftType(member?.shiftType || 'day')
}

const resolveRecordShiftType = (record) => {
  if (!record?.name) return 'day'
  return getMemberShiftType(record.name)
}

const calcRecordDuration = (record) => {
  if (!record?.startTime || !record?.endTime) return ''
  const department = resolveDepartmentName()
  return calculateDuration(
    record.startTime,
    record.endTime,
    record.department || department || '',
    resolveRecordShiftType(record)
  )
}

// 获取当前记录可用的组员列表（现在允许选择已有记录的组员，会覆盖）
const getAvailableMembers = (currentIndex) => {
  // 现在允许所有组员都可以选择（选择已有记录的组员会覆盖）
  return memberOptions.value
}

// 获取组员在选项中的索引（基于可用组员列表）
const getMemberIndex = (name, currentIndex) => {
  if (!name) return 0
  const availableMembers = getAvailableMembers(currentIndex)
  const index = availableMembers.indexOf(name)
  return index >= 0 ? index : 0
}

// 加载出勤记录列表（转换为数组格式显示）
const loadAttendanceList = () => {
  const savedData = uni.getStorageSync('attendanceRecords')
  const leaderKey = getLeaderStorageKey()
  const isRecordMap = (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false
    return Object.values(data).every(item => {
      return item && typeof item === 'object' && 'name' in item
    })
  }
  const convertArrayToGroupedMap = (records) => {
    const grouped = {}
    records.forEach(record => {
      if (!record || !record.name) return
      const key = record.leaderId || leaderKey || 'unknown'
      if (!grouped[key]) grouped[key] = {}
      grouped[key][record.name] = {
        ...record,
        duration: calculateDuration(
          record.startTime,
          record.endTime,
          record.department || '',
          resolveRecordShiftType(record)
        )
      }
    })
    return grouped
  }
  const migrateLegacyObject = (legacyObj) => {
    const grouped = {}
    Object.values(legacyObj).forEach(record => {
      if (!record || !record.name) return
      const key = record.leaderId || leaderKey || 'unknown'
      if (!grouped[key]) grouped[key] = {}
      grouped[key][record.name] = {
        ...record,
        duration: calculateDuration(
          record.startTime,
          record.endTime,
          record.department || '',
          resolveRecordShiftType(record)
        )
      }
    })
    uni.setStorageSync('attendanceRecords', grouped)
    return grouped
  }
  const migrateLegacyArray = (legacyArr) => {
    const grouped = convertArrayToGroupedMap(legacyArr)
    uni.setStorageSync('attendanceRecords', grouped)
    return grouped
  }

  let recordMap = null

  if (Array.isArray(savedData)) {
    const grouped = migrateLegacyArray(savedData)
    recordMap = grouped[leaderKey] || null
  } else if (isRecordMap(savedData)) {
    const grouped = migrateLegacyObject(savedData)
    recordMap = grouped[leaderKey] || null
  } else if (savedData && typeof savedData === 'object') {
    // 新结构：leaderKey => recordMap
    const leaderRecords = savedData[leaderKey]
    if (isRecordMap(leaderRecords)) {
      recordMap = leaderRecords
    } else {
      recordMap = null
    }
  }

  if (recordMap) {
    const department = resolveDepartmentName()
    attendanceList.value = Object.values(recordMap).map(record => ({
      ...record,
      duration: calculateDuration(
        record.startTime,
        record.endTime,
        record.department || department || '',
        resolveRecordShiftType(record)
      )
    }))
  }
  
  // 如果没有记录，添加一条空记录
  if (attendanceList.value.length === 0) {
    attendanceList.value = [{
      name: '',
      startTime: '',
      endTime: '',
      duration: ''
    }]
  }
}

// 保存出勤记录列表（以姓名为key的对象格式，确保每个组员只有一条记录）
const saveAttendanceList = () => {
  const leaderKey = getLeaderStorageKey()
  const storageData = uni.getStorageSync('attendanceRecords')
  const allRecords = (storageData && typeof storageData === 'object' && !Array.isArray(storageData))
    ? storageData
    : {}

  const recordMap = {}
  const finalDepartment = resolveDepartmentName()
  attendanceList.value.forEach(record => {
    if (record.name) {
      const duration = calcRecordDuration(record)
      recordMap[record.name] = {
        name: record.name,
        startTime: record.startTime,
        endTime: record.endTime,
        duration,
        department: finalDepartment || '',
        leaderId: leaderKey
      }
    }
  })
  allRecords[leaderKey] = recordMap
  uni.setStorageSync('attendanceRecords', allRecords)
}

// 获取时间在选项中的索引
const getTimeIndex = (time) => {
  if (!time) return 0
  const index = timeOptions.value.indexOf(time)
  return index >= 0 ? index : 0
}

// 返回上一级
const handleBack = () => {
  // 保存数据
  saveAttendanceList()
  // 返回首页
  uni.redirectTo({
    url: '/pages/index/index'
  })
}

// 显示组员选择弹窗
const handleShowMemberModal = (index) => {
  console.log('handleShowMemberModal 被调用', { index, memberCount: memberOptions.value.length })
  if (memberOptions.value.length === 0) {
    uni.showToast({
      title: '请先添加组员',
      icon: 'none',
      duration: 2000
    })
    return
  }
  currentRecordIndex.value = index
  showMemberModal.value = true
  console.log('弹窗状态已设置为 true', showMemberModal.value)
  // 初始化选中列表：如果当前记录已有姓名，则选中该姓名
  const currentName = attendanceList.value[index]?.name
  if (currentName && memberOptions.value.includes(currentName)) {
    selectedMembers.value = [currentName]
  } else {
    selectedMembers.value = []
  }
  batchStartTime.value = attendanceList.value[index]?.startTime || ''
  batchEndTime.value = attendanceList.value[index]?.endTime || ''
  console.log('选中的组员:', selectedMembers.value)
}

// 关闭组员选择弹窗
const handleCloseMemberModal = () => {
  showMemberModal.value = false
  selectedMembers.value = []
  currentRecordIndex.value = -1
  batchStartTime.value = ''
  batchEndTime.value = ''
}

// 切换组员选择
const handleToggleMember = (memberName) => {
  console.log('handleToggleMember 被调用', { memberName, currentSelected: selectedMembers.value })
  const index = selectedMembers.value.indexOf(memberName)
  if (index >= 0) {
    selectedMembers.value.splice(index, 1)
    console.log('取消选择:', memberName, '当前选中:', selectedMembers.value)
  } else {
    selectedMembers.value.push(memberName)
    console.log('选择:', memberName, '当前选中:', selectedMembers.value)
  }
}

// 全选/取消全选
const handleToggleSelectAll = () => {
  console.log('handleToggleSelectAll 被调用', { isAllSelected: isAllSelected.value, memberCount: memberOptions.value.length })
  if (isAllSelected.value) {
    selectedMembers.value = []
    console.log('取消全选')
  } else {
    selectedMembers.value = [...memberOptions.value]
    console.log('全选，选中:', selectedMembers.value)
  }
}

// 计算是否全选
const isAllSelected = computed(() => {
  return memberOptions.value.length > 0 && 
         selectedMembers.value.length === memberOptions.value.length
})

// 打开批量日期时间选择器
const handleOpenBatchDateTimePicker = (type) => {
  currentDateTimeType.value = type
  currentDateTimeIndex.value = -1 // -1 表示批量设置
  const currentValue = type === 'start' ? batchStartTime.value : batchEndTime.value
  
  // 解析当前值
  if (currentValue) {
    if (/^\d{2}:\d{2}$/.test(currentValue)) {
      // 旧格式 HH:mm，使用今天日期
      const today = new Date()
      selectedDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      selectedTime.value = currentValue
    } else if (currentValue.includes('T')) {
      // ISO 格式
      try {
        const date = new Date(currentValue)
        if (!isNaN(date.getTime())) {
          selectedDate.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          selectedTime.value = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        } else {
          initDateTimePicker()
        }
      } catch (e) {
        initDateTimePicker()
      }
    } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(currentValue)) {
      // "YYYY-MM-DD HH:mm" 格式
      const [datePart, timePart] = currentValue.split(' ')
      selectedDate.value = datePart
      selectedTime.value = timePart
    } else {
      initDateTimePicker()
    }
  } else {
    initDateTimePicker()
  }
  
  showDateTimePicker.value = true
}

// 统一设置上班时间（已废弃，改用日期时间选择器）
const handleBatchStartTimeChange = (e) => {
  const selectedIndex = e.detail.value
  batchStartTime.value = timeOptions.value[selectedIndex]
}

// 统一设置下班时间（已废弃，改用日期时间选择器）
const handleBatchEndTimeChange = (e) => {
  const selectedIndex = e.detail.value
  batchEndTime.value = timeOptions.value[selectedIndex]
}

// 确认选择组员并统一设置时间
const handleConfirmMemberSelection = () => {
  const selectedCount = selectedMembers.value.length
  if (selectedMembers.value.length === 0) {
    uni.showToast({
      title: '请至少选择一个组员',
      icon: 'none',
      duration: 2000
    })
    return
  }

  if (!batchStartTime.value || !batchEndTime.value) {
    uni.showToast({
      title: '请选择上/下班时间',
      icon: 'none',
      duration: 2000
    })
    return
  }

  const department = resolveDepartmentName()

  selectedMembers.value.forEach((memberName, idx) => {
    let targetIndex = attendanceList.value.findIndex(record => record.name === memberName)

    if (targetIndex === -1 && idx === 0) {
      targetIndex = currentRecordIndex.value
      if (!attendanceList.value[targetIndex]) {
        attendanceList.value[targetIndex] = {
          name: '',
          startTime: '',
          endTime: '',
          duration: ''
        }
      }
    }

    if (targetIndex === -1) {
      attendanceList.value.push({
        name: memberName,
        startTime: '',
        endTime: '',
        duration: ''
      })
      targetIndex = attendanceList.value.length - 1
    }

    const record = attendanceList.value[targetIndex]
    const oldStart = record.startTime
    const oldEnd = record.endTime

    record.name = memberName
    record.startTime = batchStartTime.value
    record.endTime = batchEndTime.value
    record.duration = calculateDuration(
      batchStartTime.value,
      batchEndTime.value,
      department || '',
      getMemberShiftType(memberName) || 'day'
    )

    // 不再在批量设置时记录历史，只在提交时记录
  })

  saveAttendanceList()
  handleCloseMemberModal()

  uni.showToast({
    title: `已设置${selectedCount}人出勤`,
    icon: 'success',
    duration: 2000
  })
}

// 深度比较两个值是否相等（支持对象、数组、基本类型）
const deepEqual = (a, b) => {
  // 如果类型不同，直接返回 false
  if (typeof a !== typeof b) {
    return false
  }
  
  // 如果是基本类型，直接比较
  if (a === null || b === null || typeof a !== 'object') {
    return a === b
  }
  
  // 如果是对象或数组，深度比较
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false
  }
  
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  
  if (keysA.length !== keysB.length) {
    return false
  }
  
  for (const key of keysA) {
    if (!keysB.includes(key)) {
      return false
    }
    if (!deepEqual(a[key], b[key])) {
      return false
    }
  }
  
  return true
}

// 记录历史变更
const recordHistory = async (memberName, field, oldValue, newValue) => {
  console.log('recordHistory 调用:', { memberName, field, oldValue, newValue })
  
  if (!memberName) {
    console.log('缺少成员姓名，不记录')
    return
  }
  
  let finalOldValue, finalNewValue
  
  // 对于对象类型的值（如 record），使用深度比较
  if (field === 'record' && typeof oldValue === 'object' && typeof newValue === 'object' && oldValue !== null && newValue !== null) {
    // 深度比较对象是否相同
    if (deepEqual(oldValue, newValue)) {
      console.log('对象值相同，不记录历史')
      return
    }
    // 对象类型，直接使用
    finalOldValue = oldValue
    finalNewValue = newValue
  } else {
    // 对于其他字段，转换为字符串比较
    const oldVal = typeof oldValue === 'object' && oldValue !== null 
      ? JSON.stringify(oldValue) 
      : String(oldValue || '').trim()
    const newVal = typeof newValue === 'object' && newValue !== null 
      ? JSON.stringify(newValue) 
      : String(newValue || '').trim()
    
    // 如果旧值是"未设置"或空值，不记录历史（第一次填写不记录）
    if (!oldVal || oldVal === '未设置' || oldVal === '' || oldVal === 'null' || oldVal === '{}' || oldVal === '[]') {
      console.log('旧值为空，不记录历史（第一次填写）')
      return
    }
    
    // 确保新值存在且不为空
    if (!newVal || newVal === '' || newVal === 'null' || newVal === '{}' || newVal === '[]') {
      console.log('新值为空，不记录')
      return
    }
    
    // 如果新旧值相同，不记录
    if (oldVal === newVal) {
      console.log('新旧值相同，不记录')
      return
    }
    
    // 使用处理后的值
    finalOldValue = oldVal
    finalNewValue = newVal
  }
  
  console.log('准备记录历史:', { finalOldValue, finalNewValue })
  
  // 获取部门信息（优先使用当前组长的部门，如果没有则从出勤记录中查找）
  let departmentName = resolveDepartmentName()
  if (!departmentName) {
    const leaderRecords = getLeaderRecordMapFromStorage()
    const record = leaderRecords[memberName]
    if (record && record.department) {
      departmentName = record.department
    }
  }
  
  // 如果没有部门信息，使用默认值
  const groupName = departmentName || '未分组'
  
  // 获取组员ID
  const teamMembers = uni.getStorageSync('teamMembers') || []
  const memberInfo = Array.isArray(teamMembers) 
    ? teamMembers.find(m => m.name === memberName)
    : null
  const memberId = memberInfo?.id || ''
  
  // 只保存到后端，不再使用本地存储
  if (leaderId.value && memberId) {
    try {
      const historyPayload = {
        leaderId: leaderId.value,
        department: departmentName,
        memberId: memberId,
        memberName: memberName,
        field: field,
        oldValue: finalOldValue,
        newValue: finalNewValue,
        changedBy: leaderId.value,
        changedAt: new Date().toISOString()
      }
      console.log('📝 准备保存历史记录到后端:', historyPayload)
      const result = await createHistory(historyPayload)
      console.log('✅ 历史记录已保存到后端，响应:', result)
    } catch (error) {
      console.error('❌ 保存历史记录到后端失败:', error)
      console.error('错误详情:', {
        message: error?.message,
        response: error?.response,
        stack: error?.stack
      })
      // 后端失败时不再保存到本地，因为小程序上线后本地存储无法跨设备共享
      // 如果后端失败，记录错误但不影响主流程
      // 但需要提示用户，因为这是重要功能
      uni.showToast({
        title: '历史记录保存失败',
        icon: 'none',
        duration: 2000
      })
    }
  } else {
    console.warn('⚠️ 无法保存历史记录：缺少必要参数', { 
      leaderId: leaderId.value, 
      memberId: memberId,
      memberName: memberName,
      field: field
    })
  }
}

// 上班时间改变
const handleStartTimeChange = (e, index) => {
  const selectedIndex = e.detail.value
  const newTime = timeOptions.value[selectedIndex]
  const memberName = attendanceList.value[index].name
  
  // 从存储中获取该组员的旧记录（确保获取到真实的旧值）
  let oldTime = ''
  if (memberName) {
    const leaderRecords = getLeaderRecordMapFromStorage()
    const savedRecord = leaderRecords[memberName]
    if (savedRecord && savedRecord.startTime) {
      oldTime = savedRecord.startTime
    } else {
      // 如果存储中没有，使用当前列表中的值
      oldTime = attendanceList.value[index].startTime || ''
    }
  } else {
    // 如果没有姓名，使用当前列表中的值
    oldTime = attendanceList.value[index].startTime || ''
  }
  
  // 不再在修改时记录历史，只在提交时记录
  attendanceList.value[index].startTime = newTime
  // 重新计算出勤时长
  const department = resolveDepartmentName()
  attendanceList.value[index].duration = calculateDuration(
    attendanceList.value[index].startTime,
    attendanceList.value[index].endTime,
    attendanceList.value[index].department || department || '',
    resolveRecordShiftType(attendanceList.value[index])
  )
  
  saveAttendanceList()
}

// 下班时间改变
const handleEndTimeChange = (e, index) => {
  const selectedIndex = e.detail.value
  const newTime = timeOptions.value[selectedIndex]
  const memberName = attendanceList.value[index].name
  
  // 从存储中获取该组员的旧记录（确保获取到真实的旧值）
  let oldTime = ''
  if (memberName) {
    const leaderRecords = getLeaderRecordMapFromStorage()
    const savedRecord = leaderRecords[memberName]
    if (savedRecord && savedRecord.endTime) {
      oldTime = savedRecord.endTime
    } else {
      // 如果存储中没有，使用当前列表中的值
      oldTime = attendanceList.value[index].endTime || ''
    }
  } else {
    // 如果没有姓名，使用当前列表中的值
    oldTime = attendanceList.value[index].endTime || ''
  }
  
  // 不再在修改时记录历史，只在提交时记录
  attendanceList.value[index].endTime = newTime
  // 重新计算出勤时长
  const department = resolveDepartmentName()
  attendanceList.value[index].duration = calculateDuration(
    attendanceList.value[index].startTime,
    attendanceList.value[index].endTime,
    attendanceList.value[index].department || department || '',
    resolveRecordShiftType(attendanceList.value[index])
  )
  
  saveAttendanceList()
}

// 删除单条记录
const handleDeleteRecord = (index) => {
  const record = attendanceList.value[index]
  
  if (!record.name) {
    // 如果是空记录，直接删除
    attendanceList.value.splice(index, 1)
    saveAttendanceList()
    return
  }
  
  // 确认删除
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 ${record.name} 的出勤记录吗？`,
    success: (res) => {
      if (res.confirm) {
        // 删除记录
        attendanceList.value.splice(index, 1)
        
        // 如果删除后列表为空，添加一条空记录
        if (attendanceList.value.length === 0) {
          attendanceList.value.push({
            name: '',
            startTime: '',
            endTime: '',
            duration: ''
          })
        }
        
        saveAttendanceList()
        
        uni.showToast({
          title: '已删除',
          icon: 'success',
          duration: 1500
        })
      }
    }
  })
}

// 添加新记录
const handleAddRecord = () => {
  attendanceList.value.push({
    name: '',
    startTime: '',
    endTime: '',
    duration: ''
  })
  saveAttendanceList()
  
  uni.showToast({
    title: '已添加新记录',
    icon: 'success',
    duration: 1500
  })
}


// 格式化详细错误信息
const formatErrorDetails = (error) => {
  // 提取详细错误信息
  const errorDetails = {
    message: error?.message || '未知错误',
    code: error?.code || '',
    statusCode: error?.details?.statusCode || '',
    url: error?.details?.url || '',
    errMsg: error?.details?.errMsg || error?.errMsg || '',
    serverMessage: error?.details?.message || ''
  }
  
  // 构建详细错误信息
  let detailedErrorMsg = errorDetails.message
  if (errorDetails.code) {
    detailedErrorMsg += ` (错误代码: ${errorDetails.code})`
  }
  if (errorDetails.statusCode) {
    detailedErrorMsg += `\nHTTP状态码: ${errorDetails.statusCode}`
  }
  if (errorDetails.serverMessage && errorDetails.serverMessage !== errorDetails.message) {
    detailedErrorMsg += `\n服务器返回: ${errorDetails.serverMessage}`
  }
  if (errorDetails.errMsg) {
    detailedErrorMsg += `\n网络错误: ${errorDetails.errMsg}`
  }
  if (errorDetails.url) {
    const urlParts = errorDetails.url.split('/')
    detailedErrorMsg += `\n请求接口: ${urlParts.slice(-2).join('/')}`
  }
  
  // 获取设备信息（用于调试）
  try {
    const systemInfo = uni.getSystemInfoSync()
    detailedErrorMsg += `\n设备信息: ${systemInfo.platform} ${systemInfo.system}`
    detailedErrorMsg += `\n网络类型: ${systemInfo.networkType || '未知'}`
    if (systemInfo.brand && systemInfo.model) {
      detailedErrorMsg += `\n设备型号: ${systemInfo.brand} ${systemInfo.model}`
    }
  } catch (e) {
    console.warn('获取设备信息失败:', e)
  }
  
  return detailedErrorMsg
}

// 提交数据
const handleSubmit = async () => {
  // 验证数据完整性
  const incompleteRecords = attendanceList.value.filter(record => 
    !record.name || !record.startTime || !record.endTime
  )
  
  if (incompleteRecords.length > 0) {
    uni.showToast({
      title: '请完善所有记录信息',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  const departmentName = resolveDepartmentName()
  if (!departmentName) {
    uni.showToast({
      title: '请先在设置页填写部门信息',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  // 提交前验证：过滤掉无效记录，并写入最新计算的出勤时长
  const validRecords = attendanceList.value
    .filter(record => record.name?.trim() && record.startTime && record.endTime)
    .map(record => ({
      ...record,
      duration: calcRecordDuration(record)
    }))
    .filter(record => {
    if (!record.duration || record.duration.trim() === '') {
      return false
    }
    // 解析时长，确保大于0
    const hourMatch = record.duration.match(/(\d+)小时/)
    const minuteMatch = record.duration.match(/(\d+)分钟/)
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0
    const totalMinutes = hours * 60 + minutes
    if (totalMinutes <= 0) {
      return false
    }
    return true
  })
  
  if (validRecords.length === 0) {
    uni.showToast({
      title: '没有有效的出勤记录，请确保所有记录都包含姓名、上班时间、下班时间',
      icon: 'none',
      duration: 3000
    })
    return
  }
  
  // 获取提交前的原始记录（优先从后端获取，确保跨设备数据一致性）
  let originalRecords = {}
  if (leaderId.value) {
    try {
      // 优先从后端获取原始记录，确保跨设备数据一致性
      const backendRecords = await getAttendanceRecords(leaderId.value)
      if (backendRecords && backendRecords.records && Array.isArray(backendRecords.records)) {
        // 将后端记录转换为本地格式
        backendRecords.records.forEach(record => {
          const memberName = record.name || record.memberName
          if (memberName) {
            // 将ISO时间转换为 HH:MM 格式
            const formatTime = (isoTime) => {
              if (!isoTime) return ''
              const date = new Date(isoTime)
              const hours = String(date.getHours()).padStart(2, '0')
              const minutes = String(date.getMinutes()).padStart(2, '0')
              return `${hours}:${minutes}`
            }
            originalRecords[memberName] = {
              name: memberName,
              startTime: formatTime(record.startTime),
              endTime: formatTime(record.endTime),
              duration: record.duration
            }
          }
        })
        console.log('从后端获取原始记录:', Object.keys(originalRecords).length, '条', Object.keys(originalRecords))
      } else {
        // 如果后端没有记录，尝试从本地存储获取（作为fallback）
        const leaderRecords = getLeaderRecordMapFromStorage()
        originalRecords = leaderRecords || {}
        console.log('后端无记录，从本地存储获取原始记录:', Object.keys(originalRecords).length, '条')
      }
    } catch (error) {
      console.warn('从后端获取原始记录失败，尝试从本地获取:', error)
      // 后端失败时，从本地存储获取（作为fallback）
      try {
        const leaderRecords = getLeaderRecordMapFromStorage()
        originalRecords = leaderRecords || {}
        console.log('从本地存储获取原始记录:', Object.keys(originalRecords).length, '条')
      } catch (localError) {
        console.warn('从本地存储获取原始记录也失败:', localError)
      }
    }
  }
  
  // 保存数据到本地（提交前保存一次，用于记录）
  saveAttendanceList()
  
  let submitSucceeded = false
  const errorMessages = [] // 收集所有错误信息
  const failedRecords = [] // 收集失败的记录
  
  if (leaderId.value) {
    // 第一步：提交出勤记录到后端
    let attendanceSubmitSuccess = false
    try {
      await submitAttendance(leaderId.value, validRecords, departmentName)
      attendanceSubmitSuccess = true
      console.log('✅ 出勤记录提交成功')
    } catch (error) {
      console.error('❌ 提交出勤记录失败:', error)
      
      // 使用辅助函数格式化详细错误信息
      const detailedErrorMsg = formatErrorDetails(error)
      
      errorMessages.push(`出勤记录提交失败: ${detailedErrorMsg}`)
      
      // 记录所有失败的记录，包含详细错误信息
      validRecords.forEach(record => {
        failedRecords.push({
          name: record.name,
          reason: '出勤记录提交失败',
          error: detailedErrorMsg
        })
      })
    }
    
    // 第二步：保存月度统计表到后端
    let monthlySaveSuccess = false
    if (attendanceSubmitSuccess) {
      try {
        const today = formatDateOnly(new Date())
        const submittedAt = new Date().toISOString()
        
        // 转换记录格式为后端需要的格式
        const monthlyRecords = validRecords.map(record => {
          const memberInfo = memberInfoMap.value[record.name] || null
          const shiftType = resolveRecordShiftType(record)
          const durationText = calcRecordDuration(record)
          const totalMinutes = parseDurationTextToMinutes(durationText)
          
          // 解析时间字符串为ISO格式
          const parseTime = (timeStr) => {
            if (!timeStr) return null
            // 如果是 "YYYY-MM-DD HH:mm" 格式
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(timeStr)) {
              const [datePart, timePart] = timeStr.split(' ')
              const [year, month, day] = datePart.split('-').map(Number)
              const [hour, minute] = timePart.split(':').map(Number)
              const date = new Date(year, month - 1, day, hour, minute, 0, 0)
              return date.toISOString()
            }
            // 如果是旧的 "HH:mm" 格式，使用今天日期
            if (/^\d{2}:\d{2}$/.test(timeStr)) {
              const [hour, minute] = timeStr.split(':').map(Number)
              const date = new Date()
              date.setHours(hour, minute, 0, 0)
              return date.toISOString()
            }
            // 如果已经是 ISO 格式，直接返回
            if (timeStr.includes('T')) {
              return timeStr
            }
            return null
          }
          
          let startTime = parseTime(record.startTime)
          let endTime = parseTime(record.endTime)
          
          // 处理夜班跨天情况
          if (isNightShiftType(shiftType) && startTime && endTime) {
            const startDate = new Date(startTime)
            const endDate = new Date(endTime)
            const startHour = startDate.getHours()
            if (startHour >= 12) {
              startDate.setDate(startDate.getDate() - 1)
              startTime = startDate.toISOString()
            }
            const finalStartDate = new Date(startTime)
            const finalEndDate = new Date(endTime)
            if (finalEndDate <= finalStartDate) {
              finalEndDate.setDate(finalEndDate.getDate() + 1)
              endTime = finalEndDate.toISOString()
            }
          }
          
          return {
            memberId: memberInfo?.id || record.memberId || '',
            memberName: record.name || memberInfo?.name || '',
            startTime: startTime,
            endTime: endTime,
            duration: totalMinutes,
            shiftType: shiftType,
            department: memberInfo?.department || departmentName || ''
          }
        }).filter(record => record.memberName && record.startTime && record.endTime && record.duration > 0)
        
        if (monthlyRecords.length > 0 && leaderId.value) {
          await saveMonthlyAttendance(leaderId.value, today, monthlyRecords, submittedAt)
          monthlySaveSuccess = true
          console.log(`✅ 已保存月度统计表到后端: ${today}, 记录数: ${monthlyRecords.length}`)
        } else {
          monthlySaveSuccess = true // 如果没有记录需要保存，也算成功
        }
      } catch (monthlyError) {
        console.error('❌ 保存月度统计表到后端失败:', monthlyError)
        
        // 使用辅助函数格式化详细错误信息
        const detailedMonthlyError = formatErrorDetails(monthlyError)
        errorMessages.push(`月度统计表保存失败: ${detailedMonthlyError}`)
        
        // 记录所有失败的记录
        validRecords.forEach(record => {
          const existingFailed = failedRecords.find(f => f.name === record.name)
          if (existingFailed) {
            existingFailed.reason = `${existingFailed.reason}；月度统计表保存失败`
            existingFailed.error = `${existingFailed.error}\n\n月度统计表错误: ${detailedMonthlyError}`
          } else {
            failedRecords.push({
              name: record.name,
              reason: '月度统计表保存失败',
              error: detailedMonthlyError
            })
          }
        })
      }
    }
    
    // 只有两个步骤都成功，才算提交成功
    if (attendanceSubmitSuccess && monthlySaveSuccess) {
      submitSucceeded = true
      
      // 提交成功后，记录历史（对比原始记录和提交后的记录）
      console.log('开始记录历史，对比原始记录和提交后的记录...')
      for (const record of validRecords) {
        const memberName = record.name
        const originalRecord = originalRecords[memberName]
        
        console.log(`检查 ${memberName}:`, {
          original: originalRecord ? { startTime: originalRecord.startTime, endTime: originalRecord.endTime } : null,
          new: { startTime: record.startTime, endTime: record.endTime }
        })
        
        if (originalRecord) {
          // 只有同一天的出勤时间更改才记录历史
          const originalDate = formatDateOnly(originalRecord.startTime || originalRecord.endTime)
          const newDate = formatDateOnly(record.startTime || record.endTime)
          if (!originalDate || !newDate || originalDate !== newDate) {
            console.log(`跳过历史记录：日期不一致 original=${originalDate} new=${newDate}`)
            continue
          }
          
          // 检查提交时间（系统时间）是否与记录的日期在同一天
          const submitDate = formatDateOnly(new Date())
          if (submitDate !== newDate) {
            console.log(`跳过历史记录：提交时间（${submitDate}）与记录日期（${newDate}）不在同一天`)
            continue
          }
          
          // 对比上班时间
          if (originalRecord.startTime && record.startTime && originalRecord.startTime !== record.startTime) {
            console.log(`记录上班时间历史: ${memberName} ${originalRecord.startTime} -> ${record.startTime}`)
            await recordHistory(memberName, '上班时间', originalRecord.startTime, record.startTime)
          }
          // 对比下班时间
          if (originalRecord.endTime && record.endTime && originalRecord.endTime !== record.endTime) {
            console.log(`记录下班时间历史: ${memberName} ${originalRecord.endTime} -> ${record.endTime}`)
            await recordHistory(memberName, '下班时间', originalRecord.endTime, record.endTime)
          }
        } else {
          // 如果没有原始记录，说明是新增的记录，不记录历史（第一次填写不记录）
          console.log('新增记录，不记录历史:', memberName)
        }
      }
      
      uni.showToast({
        title: '提交成功',
        icon: 'success',
        duration: 1500
      })
    } else {
      // 如果有任何失败，显示详细的错误信息
      let errorMsg = '提交失败！以下记录未成功保存到后端：\n\n'
      
      if (failedRecords.length > 0) {
        // 按姓名分组显示失败记录，包含详细错误信息
        const failedByName = {}
        failedRecords.forEach(f => {
          if (!failedByName[f.name]) {
            failedByName[f.name] = {
              reasons: new Set(),
              errors: []
            }
          }
          failedByName[f.name].reasons.add(f.reason)
          if (f.error && !failedByName[f.name].errors.includes(f.error)) {
            failedByName[f.name].errors.push(f.error)
          }
        })
        
        const failedNames = Object.keys(failedByName)
        failedNames.forEach((name, index) => {
          const failedInfo = failedByName[name]
          const reasons = Array.from(failedInfo.reasons)
          errorMsg += `${index + 1}. ${name}\n   失败原因: ${reasons.join('、')}\n`
          
          // 添加详细错误信息（只显示第一个，避免信息过长）
          if (failedInfo.errors.length > 0) {
            const firstError = failedInfo.errors[0]
            // 截取错误信息的前500个字符，避免过长
            const shortError = firstError.length > 500 ? firstError.substring(0, 500) + '...' : firstError
            errorMsg += `   详细错误: ${shortError.replace(/\n/g, ' ')}\n`
          }
          errorMsg += '\n'
        })
      } else if (errorMessages.length > 0) {
        // 如果没有失败的记录，显示错误消息
        errorMessages.forEach(msg => {
          const shortMsg = msg.length > 500 ? msg.substring(0, 500) + '...' : msg
          errorMsg += `${shortMsg.replace(/\n/g, ' ')}\n\n`
        })
      } else {
        errorMsg += '未知错误，请重试'
      }
      
      // 添加所有错误信息的完整版本到控制台（用于调试）
      if (errorMessages.length > 0) {
        console.error('📋 完整错误信息:', errorMessages.join('\n\n'))
      }
      if (failedRecords.length > 0) {
        console.error('📋 失败记录详情:', failedRecords)
      }
      
      errorMsg += '\n\n⚠️ 重要提示：只有所有记录都成功保存到后端（包括提取表格和月度统计表），才能提交成功。\n\n'
      errorMsg += '💡 调试信息：详细错误信息已输出到控制台，请联系管理员并提供上述信息。'
      
      uni.showModal({
        title: '提交失败',
        content: errorMsg,
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#ff4444'
      })
    }
  } else {
    uni.showToast({
      title: '缺少组长身份，已保存到本地',
      icon: 'none',
      duration: 2000
    })
  }
  
  if (submitSucceeded) {
    // 提交成功后，清空本地存储的出勤记录和当前页面的列表
    const leaderKey = getLeaderStorageKey()
    const storageData = uni.getStorageSync('attendanceRecords')
    if (storageData && typeof storageData === 'object' && !Array.isArray(storageData)) {
      // 删除当前组长的出勤记录
      delete storageData[leaderKey]
      uni.setStorageSync('attendanceRecords', storageData)
      console.log('✅ 已清空本地存储的出勤记录')
    }
    
    // 延迟跳转到首页并清空列表
    setTimeout(() => {
      // 清空当前页面的列表（用于下次填写）
      attendanceList.value = [{
        name: '',
        startTime: '',
        endTime: '',
        duration: ''
      }]
      
      // 跳转到首页
      uni.redirectTo({
        url: '/pages/index/index'
      })
    }, 1500)
  } else {
    // 提交失败时，不清空列表，不跳转，保留所有数据让用户重试
    console.warn('出勤记录提交失败，保留数据供用户重试')
  }
}

// 查看提交情况相关函数
const handleViewSubmitHistory = () => {
  showSubmitHistoryModal.value = true
  // 默认设置为最近7天
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  submitHistoryStartDate.value = formatDateOnly(sevenDaysAgo)
  submitHistoryEndDate.value = formatDateOnly(today)
  // 自动查询
  handleQuerySubmitHistory()
}

const handleCloseSubmitHistoryModal = () => {
  showSubmitHistoryModal.value = false
  submitHistoryList.value = []
}

const handleSubmitHistoryStartDateChange = (e) => {
  submitHistoryStartDate.value = e.detail.value
}

const handleSubmitHistoryEndDateChange = (e) => {
  submitHistoryEndDate.value = e.detail.value
}

const handleQuerySubmitHistory = async () => {
  if (!submitHistoryStartDate.value || !submitHistoryEndDate.value) {
    uni.showToast({
      title: '请选择日期范围',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  if (submitHistoryStartDate.value > submitHistoryEndDate.value) {
    uni.showToast({
      title: '开始日期不能晚于结束日期',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  if (!leaderId.value) {
    uni.showToast({
      title: '缺少组长身份',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  isLoadingSubmitHistory.value = true
  submitHistoryList.value = []
  
  try {
    // 从后端获取出勤记录
    const response = await getAttendanceRecords(leaderId.value)
    const records = response?.records || []
    
    // 根据日期范围过滤记录
    const filteredRecords = records.filter(record => {
      const recordDate = record.recordDate || formatDateOnly(record.startTime)
      return recordDate >= submitHistoryStartDate.value && recordDate <= submitHistoryEndDate.value
    })
    
    // 按日期和提交时间排序（最新的在前）
    filteredRecords.sort((a, b) => {
      const dateA = a.recordDate || formatDateOnly(a.startTime)
      const dateB = b.recordDate || formatDateOnly(b.startTime)
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA) // 日期降序
      }
      // 如果日期相同，按提交时间排序
      const submittedAtA = a.submittedAt || ''
      const submittedAtB = b.submittedAt || ''
      return submittedAtB.localeCompare(submittedAtA) // 提交时间降序
    })
    
    submitHistoryList.value = filteredRecords
    console.log(`查询到 ${filteredRecords.length} 条提交记录`)
  } catch (error) {
    console.error('查询提交记录失败:', error)
    uni.showToast({
      title: '查询失败：' + (error.message || '未知错误'),
      icon: 'none',
      duration: 3000
    })
  } finally {
    isLoadingSubmitHistory.value = false
  }
}

const handleResetSubmitHistoryFilter = () => {
  submitHistoryStartDate.value = ''
  submitHistoryEndDate.value = ''
  submitHistoryList.value = []
}

// 格式化提交时间
const formatSubmittedTime = (submittedAt) => {
  if (!submittedAt) return '--'
  try {
    // 支持 "YYYY-MM-DD HH:mm" 格式（本地时间字符串），直接返回
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(submittedAt)) {
      return submittedAt
    }
    // 支持 ISO 格式（UTC时间），转换为本地时间
    // 注意：new Date() 会自动将 UTC 时间转换为本地时间
    if (submittedAt.includes('T') || submittedAt.includes('Z')) {
      const date = new Date(submittedAt)
      if (!Number.isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day} ${hours}:${minutes}`
      }
    }
    // 尝试解析其他格式
    const date = new Date(submittedAt)
    if (!Number.isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}`
    }
    return submittedAt
  } catch (e) {
    return submittedAt
  }
}

// 格式化时长（从分钟转换为小时分钟）
const formatDuration = (duration) => {
  if (!duration) return '--'
  // 如果已经是字符串格式（如 "9小时30分钟"），直接返回
  if (typeof duration === 'string' && duration.includes('小时')) {
    return duration
  }
  // 如果是数字（分钟），转换为小时分钟
  if (typeof duration === 'number') {
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    if (minutes > 0) {
      return `${hours}小时${minutes}分钟`
    }
    return `${hours}小时`
  }
  return duration
}

const formatDateTime = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) {
    return ''
  }
  const pad = (num) => num.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatDateOnly = (date) => {
  if (!date) return ''
  
  // 如果是字符串，先尝试解析为兼容格式（iOS 不支持 "YYYY-MM-DD HH:mm"）
  let d
  if (typeof date === 'string') {
    // 如果是 "YYYY-MM-DD HH:mm" 格式，转换为 iOS 支持的格式
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date)) {
      const [datePart, timePart] = date.split(' ')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hour, minute] = timePart.split(':').map(Number)
      d = new Date(year, month - 1, day, hour, minute, 0, 0)
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // 如果是 "YYYY-MM-DD" 格式，直接解析
      const [year, month, day] = date.split('-').map(Number)
      d = new Date(year, month - 1, day)
    } else {
      // 其他格式（如 ISO），直接使用 new Date
      d = new Date(date)
    }
  } else {
    d = date
  }
  
  if (Number.isNaN(d.getTime())) {
    return ''
  }
  const pad = (num) => num.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const getDailyReportStorageKey = (dateStr = formatDateOnly(new Date())) => {
  const leaderKey = getLeaderStorageKey()
  return `dailyReportSubmitted_${leaderKey}_${dateStr}`
}

const getSubmittedDailyReportMembers = (dateStr = formatDateOnly(new Date())) => {
  const key = getDailyReportStorageKey(dateStr)
  const stored = uni.getStorageSync(key)
  if (Array.isArray(stored)) {
    return stored
  }
  if (stored && Array.isArray(stored.members)) {
    return stored.members
  }
  return []
}

const saveSubmittedDailyReportMembers = (members, dateStr = formatDateOnly(new Date())) => {
  const key = getDailyReportStorageKey(dateStr)
  const uniqueMembers = Array.from(new Set((members || []).filter(Boolean)))
  uni.setStorageSync(key, uniqueMembers)
}

const handleOpenDailyReportModal = () => {
  if (!showDailyReportSection.value) {
    uni.showToast({
      title: '仅组长可用',
      icon: 'none'
    })
    return
  }
  if (memberOptions.value.length === 0) {
    uni.showToast({
      title: '请先添加组员',
      icon: 'none'
    })
    return
  }
  showDailyReportModal.value = true
}

const handleCloseDailyReportModal = () => {
  showDailyReportModal.value = false
}

const handleToggleDailyReportMember = (member) => {
  if (!member) return
  const index = dailyReportSelectedMembers.value.indexOf(member)
  if (index >= 0) {
    dailyReportSelectedMembers.value.splice(index, 1)
  } else {
    dailyReportSelectedMembers.value.push(member)
  }
}

const handleToggleDailyReportSelectAll = () => {
  if (memberOptions.value.length === 0) return
  if (isDailyReportAllSelected.value) {
    dailyReportSelectedMembers.value = []
  } else {
    dailyReportSelectedMembers.value = [...memberOptions.value]
  }
}

const handleConfirmDailyReportSelection = () => {
  if (dailyReportSelectedMembers.value.length === 0) {
    uni.showToast({
      title: '请选择成员',
      icon: 'none'
    })
    return
  }
  showDailyReportModal.value = false
}

// 请假成员相关函数
const handleOpenLeaveReportModal = () => {
  if (!showDailyReportSection.value) {
    uni.showToast({
      title: '仅组长可用',
      icon: 'none'
    })
    return
  }
  if (memberOptions.value.length === 0) {
    uni.showToast({
      title: '请先添加组员',
      icon: 'none'
    })
    return
  }
  showLeaveReportModal.value = true
}

const handleCloseLeaveReportModal = () => {
  showLeaveReportModal.value = false
}

// 检查成员是否已选择
const isLeaveMemberSelected = (member) => {
  return leaveReportSelectedMembers.value.some(m => m.name === member)
}

// 获取成员的请假类型
const getLeaveMemberType = (member) => {
  const item = leaveReportSelectedMembers.value.find(m => m.name === member)
  return item?.leaveType || '事假' // 默认事假
}

// 切换成员选择
const handleToggleLeaveReportMember = (member) => {
  if (!member) return
  const index = leaveReportSelectedMembers.value.findIndex(m => m.name === member)
  if (index >= 0) {
    leaveReportSelectedMembers.value.splice(index, 1)
  } else {
    // 添加成员，默认请假类型为"事假"
    leaveReportSelectedMembers.value.push({
      name: member,
      leaveType: '事假'
    })
  }
}

// 选择请假类型
const handleSelectLeaveType = (member, leaveType) => {
  const index = leaveReportSelectedMembers.value.findIndex(m => m.name === member)
  if (index >= 0) {
    leaveReportSelectedMembers.value[index].leaveType = leaveType
  }
}

const handleToggleLeaveReportSelectAll = () => {
  if (memberOptions.value.length === 0) return
  if (isLeaveReportAllSelected.value) {
    leaveReportSelectedMembers.value = []
  } else {
    // 全选时，为每个成员添加默认请假类型
    leaveReportSelectedMembers.value = memberOptions.value.map(member => ({
      name: member,
      leaveType: '事假'
    }))
  }
}

const handleConfirmLeaveReportSelection = () => {
  if (leaveReportSelectedMembers.value.length === 0) {
    uni.showToast({
      title: '请选择成员',
      icon: 'none'
    })
    return
  }
  // 验证所有成员都已选择请假类型
  const hasNoType = leaveReportSelectedMembers.value.some(m => !m.leaveType)
  if (hasNoType) {
    uni.showToast({
      title: '请为所有成员选择请假类型',
      icon: 'none',
      duration: 2000
    })
    return
  }
  showLeaveReportModal.value = false
}

const handleClearDailyReportSelection = () => {
  dailyReportSelectedMembers.value = []
  leaveReportSelectedMembers.value = []
}

// 处理全员到齐
const handleSubmitAllPresent = async () => {
  if (!showDailyReportSection.value) {
    uni.showToast({
      title: '仅组长可用',
      icon: 'none'
    })
    return
  }
  
  if (isSubmittingAllPresent.value || isSendingDailyReport.value) {
    return
  }
  
  // 检查是否有组员
  if (memberOptions.value.length === 0) {
    uni.showToast({
      title: '请先添加组员',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  const reportDate = formatDateOnly(new Date())
  const submittedMembers = getSubmittedDailyReportMembers(reportDate)
  const submittedSet = new Set(submittedMembers)
  
  // 获取所有未提交的组员
  const allMembers = memberOptions.value
  const unsubmittedMembers = allMembers.filter(name => !submittedSet.has(name))
  
  if (unsubmittedMembers.length === 0) {
    uni.showToast({
      title: '今日已上报，无需重复提交',
      icon: 'none'
    })
    return
  }
  
  isSubmittingAllPresent.value = true
  uni.showLoading({
    title: '提交中...',
    mask: true
  })
  
  try {
    // 为所有组员保存"正常出勤"状态
    await saveDailyReportHistory(unsubmittedMembers, reportDate, '正常出勤')
    
    // 标记为已提交
    saveSubmittedDailyReportMembers([...submittedMembers, ...unsubmittedMembers], reportDate)
    
    // 清空选择
    dailyReportSelectedMembers.value = []
    leaveReportSelectedMembers.value = []
    
    uni.showToast({
      title: `全员到齐，已记录${unsubmittedMembers.length}人`,
      icon: 'success',
      duration: 2000
    })
    
    // 延迟跳转到首页
    setTimeout(() => {
      try {
        uni.redirectTo({
          url: '/pages/index/index',
          success: () => {
            console.log('跳转成功')
          },
          fail: (err) => {
            console.error('跳转失败:', err)
            uni.reLaunch({
              url: '/pages/index/index'
            })
          }
        })
      } catch (error) {
        console.error('跳转异常:', error)
        uni.reLaunch({
          url: '/pages/index/index'
        })
      }
    }, 2000)
  } catch (error) {
    console.error('提交全员到齐失败:', error)
    uni.showToast({
      title: error?.message || '提交失败，请重试',
      icon: 'none',
      duration: 2000
    })
  } finally {
    isSubmittingAllPresent.value = false
    uni.hideLoading()
  }
}

const getTeamMembers = () => {
  const members = uni.getStorageSync('teamMembers')
  if (Array.isArray(members)) {
    return members
  }
  return []
}

const buildDailyReportSummary = (members) => {
  if (!members || members.length === 0) {
    return '今日所有成员均已出勤'
  }
  const preview = members.slice(0, 5).join('、')
  const suffix = members.length > 5 ? ' 等' : ''
  return `缺勤 ${members.length} 人：${preview}${suffix}`
}

const saveDailyReportHistory = async (members, reportDate = formatDateOnly(new Date()), status = '缺勤', leaveType = null) => {
  if (!leaderId.value || !Array.isArray(members) || members.length === 0) {
    return { success: true, successCount: 0, failedRecords: [] }
  }
  const teamMembers = uni.getStorageSync('teamMembers') || []
  const leaderName = currentUser.value?.nickName || currentUser.value?.name || currentUser.value?.username || '未命名组长'
  const defaultDept = resolveDepartmentName() || currentUser.value?.department || currentUser.value?.deptName || ''
  
  // 处理成员数据：可能是字符串数组或对象数组
  const memberList = members.map(m => {
    if (typeof m === 'string') {
      return { name: m, leaveType: null }
    }
    return m
  })
  
  const payloads = memberList.map((member, index) => {
    const memberName = typeof member === 'string' ? member : member.name
    const memberInfo = Array.isArray(teamMembers) ? teamMembers.find(m => m.name === memberName) : null
    const memberId = memberInfo?.id || memberInfo?._id || memberInfo?.memberId
    if (!memberId) {
      console.warn('daily report history 缺少 memberId，跳过：', memberName)
      return { memberName, promise: Promise.resolve({ status: 'rejected', reason: '缺少成员ID' }) }
    }
    const department = memberInfo?.department || defaultDept || '未分组'
    const finalLeaveType = typeof member === 'object' && member.leaveType ? member.leaveType : leaveType
    const oldValue = status === '请假' && finalLeaveType ? `请假-${finalLeaveType}` : status
    return {
      memberName,
      promise: createHistory({
        leaderId: leaderId.value,
        department,
        memberId,
        memberName,
        field: 'daily_report',
        oldValue, // '缺勤' 或 '请假' 或 '请假-事假' 等
        newValue: JSON.stringify({
          leaderName,
          department,
          reportDate,
          leaveType: finalLeaveType, // 保存请假类型
          submittedAt: new Date().toISOString()
        }),
        changedBy: leaderId.value,
        changedAt: new Date().toISOString()
      }).then(() => ({ status: 'fulfilled' })).catch(err => {
        console.warn('保存每日报告历史失败：', memberName, err)
        return { status: 'rejected', reason: err?.message || '未知错误' }
      })
    }
  }).filter(item => item.promise)
  
  if (payloads.length === 0) {
    return { success: true, successCount: 0, failedRecords: [] }
  }
  
  // 等待所有请求完成
  const results = await Promise.all(payloads.map(item => item.promise))
  
  // 收集成功和失败的记录
  const failedRecords = []
  let successCount = 0
  
  results.forEach((result, index) => {
    const memberName = payloads[index].memberName
    if (result.status === 'fulfilled') {
      successCount++
    } else {
      failedRecords.push({
        name: memberName,
        reason: '每日报告保存失败',
        error: result.reason || '未知错误'
      })
    }
  })
  
  return {
    success: failedRecords.length === 0,
    successCount,
    failedRecords
  }
}

const handleSubmitDailyReport = async () => {
  if (!showDailyReportSection.value) {
    uni.showToast({
      title: '仅组长可用',
      icon: 'none'
    })
    return
  }
  // 至少需要选择请假成员（未出勤成员功能暂时隐藏）
  if (leaveReportSelectedMembers.value.length === 0) {
    uni.showToast({
      title: '请选择请假成员',
      icon: 'none'
    })
    return
  }
  const reportDate = formatDateOnly(new Date())
  const submittedMembers = getSubmittedDailyReportMembers(reportDate)
  const submittedSet = new Set(submittedMembers)
  
  // 处理未出勤成员
  const newAbsentMembers = dailyReportSelectedMembers.value
    .filter(name => !!name && !submittedSet.has(name))
  const skippedAbsentMembers = dailyReportSelectedMembers.value
    .filter(name => !!name && submittedSet.has(name))
  
  // 处理请假成员（现在是对象数组）
  const newLeaveMembers = leaveReportSelectedMembers.value
    .filter(m => m && m.name && !submittedSet.has(m.name))
  const skippedLeaveMembers = leaveReportSelectedMembers.value
    .filter(m => m && m.name && submittedSet.has(m.name))
  
  // 如果都没有新成员，提示已上报
  if (newAbsentMembers.length === 0 && newLeaveMembers.length === 0) {
    uni.showToast({
      title: '今日已上报，无需重复提交',
      icon: 'none'
    })
    return
  }
  
  // 显示跳过的成员提示
  const skippedLeaveMemberNames = skippedLeaveMembers.map(m => typeof m === 'string' ? m : m.name)
  const allSkipped = [...skippedAbsentMembers, ...skippedLeaveMemberNames]
  if (allSkipped.length > 0) {
    uni.showToast({
      title: `${allSkipped.join('、')} 今日已上报，已跳过`,
      icon: 'none',
      duration: 2500
    })
  }
  if (isSendingDailyReport.value) {
    return
  }
  isSendingDailyReport.value = true
  uni.showLoading({
    title: '发送中...',
    mask: true
  })
  try {
    const targets = await getWechatBoundAdmins()
    if (!targets || targets.length === 0) {
      // 即使没有管理员，也保存历史记录
      const allFailedRecords = []
      let allSuccess = true
      
      // 分别保存未出勤和请假成员
      if (newAbsentMembers.length > 0) {
        const absentResult = await saveDailyReportHistory(newAbsentMembers, reportDate, '缺勤')
        if (absentResult && !absentResult.success) {
          allSuccess = false
          allFailedRecords.push(...(absentResult.failedRecords || []))
        }
      }
      if (newLeaveMembers.length > 0) {
        const leaveResult = await saveDailyReportHistory(newLeaveMembers, reportDate, '请假')
        if (leaveResult && !leaveResult.success) {
          allSuccess = false
          allFailedRecords.push(...(leaveResult.failedRecords || []))
        }
      }
      
      if (allSuccess) {
        const newLeaveMemberNames = newLeaveMembers.map(m => typeof m === 'string' ? m : m.name)
        saveSubmittedDailyReportMembers([...submittedMembers, ...newAbsentMembers, ...newLeaveMemberNames], reportDate)
        dailyReportSelectedMembers.value = []
        leaveReportSelectedMembers.value = []
        
        uni.showToast({
          title: '无已绑定管理员，但出勤记录已成功保存',
          icon: 'success',
          duration: 3000
        })
      } else {
        // 有失败的记录，显示详细错误信息
        let errorMsg = '提交失败！以下记录未成功保存到后端：\n\n'
        
        if (allFailedRecords.length > 0) {
          allFailedRecords.forEach((record, index) => {
            errorMsg += `${index + 1}. ${record.name}\n   失败原因: ${record.reason}\n   错误信息: ${record.error}\n\n`
          })
        } else {
          errorMsg += '未知错误，请重试\n\n'
        }
        
        errorMsg += '⚠️ 重要提示：只有所有记录都成功保存到后端，才能提交成功。请检查网络连接或联系管理员。'
        
        uni.showModal({
          title: '提交失败',
          content: errorMsg,
          showCancel: false,
          confirmText: '我知道了',
          confirmColor: '#ff4444'
        })
        return // 如果保存失败，不跳转，让用户重试
      }
      
      // 延迟跳转到首页
      console.log('无管理员情况：准备跳转到首页，延迟3秒')
      setTimeout(() => {
        console.log('无管理员情况：开始跳转到首页')
        try {
          uni.redirectTo({
            url: '/pages/index/index',
            success: () => {
              console.log('跳转成功')
            },
            fail: (err) => {
              console.error('跳转失败:', err)
              uni.reLaunch({
                url: '/pages/index/index'
              })
            }
          })
        } catch (error) {
          console.error('跳转异常:', error)
          uni.reLaunch({
            url: '/pages/index/index'
          })
        }
      }, 3000)
      return
    }
    const teamMembers = getTeamMembers()
    const shouldCount = teamMembers.length || memberOptions.value.length || (dailyReportSelectedMembers.value.length + leaveReportSelectedMembers.value.length)
    const absentMembers = [...newAbsentMembers]
    const leaveMembers = [...newLeaveMembers]
    const leaveMemberNames = leaveMembers.map(m => typeof m === 'string' ? m : m.name)
    const actualCount = Math.max(shouldCount - absentMembers.length - leaveMembers.length, 0)
    const leaderName = currentUser.value?.name || currentUser.value?.nickName || currentUser.value?.username || '未命名组长'
    // 合并未出勤和请假成员用于通知
    const allAnomalyMembers = [...absentMembers, ...leaveMemberNames]
    const notificationData = {
      targets,
      data: {
        teamName: leaderName,
        shouldCheckinCount: shouldCount,
        actualCheckinCount: actualCount,
        lateCount: 0,
        anomalyCount: allAnomalyMembers.length,
        summary: buildDailyReportSummary(allAnomalyMembers),
        uploadedAt: formatDateTime(new Date()),
        details: allAnomalyMembers.slice(0, 20).map(name => {
          const leaveMember = leaveMembers.find(m => (typeof m === 'string' ? m : m.name) === name)
          const leaveType = typeof leaveMember === 'object' && leaveMember.leaveType ? leaveMember.leaveType : null
          return {
            name,
            reason: absentMembers.includes(name) ? '今日未出勤' : (leaveType ? `请假-${leaveType}` : '请假'),
            startTime: ''
          }
        })
      }
    }
    const result = await sendWechatNotificationAPI(notificationData)
    let notificationSuccess = false
    let notificationError = null
    
    if (result?.success) {
      const sent = result.sent || 0
      const failedCount = result.failed?.length || 0
      notificationSuccess = true
      
      // 先不显示 toast，等保存记录后再统一显示
      
      if (failedCount > 0) {
        const messages = result.failed.map(item => `${item.userId || item.wechatOpenId || '管理员'}: ${item.error || '未知错误'}`)
        uni.showModal({
          title: '部分管理员推送失败',
          content: messages.join('\n').slice(0, 500),
          showCancel: false,
          success: (res) => {
            // Modal 关闭后，显示记录已保存的提示
            console.log('Modal 已关闭，检查是否需要跳转')
            // 延迟显示，确保 modal 完全关闭
            setTimeout(() => {
              // 这里会在保存记录后统一显示，避免重复
            }, 100)
          }
        })
      }
    } else {
      notificationError = result?.message || '发送失败'
    }
    
    // 无论推送成功还是失败，都保存历史记录，确保管理员能在缺勤汇总中看到
    const allFailedRecords = []
    let allSaveSuccess = true
    
    // 分别保存未出勤和请假成员
    if (absentMembers.length > 0) {
      const absentResult = await saveDailyReportHistory(absentMembers, reportDate, '缺勤')
      if (absentResult && !absentResult.success) {
        allSaveSuccess = false
        allFailedRecords.push(...(absentResult.failedRecords || []))
      }
    }
    if (leaveMembers.length > 0) {
      const leaveResult = await saveDailyReportHistory(leaveMembers, reportDate, '请假')
      if (leaveResult && !leaveResult.success) {
        allSaveSuccess = false
        allFailedRecords.push(...(leaveResult.failedRecords || []))
      }
    }
    
    // 只有所有记录都成功保存，才标记为已提交并清空选择
    if (allSaveSuccess) {
      // 保存已提交的成员列表，避免重复提交
      saveSubmittedDailyReportMembers([...submittedMembers, ...absentMembers, ...leaveMemberNames], reportDate)
      dailyReportSelectedMembers.value = []
      leaveReportSelectedMembers.value = []
      console.log('每日报告历史已保存，管理员可在缺勤汇总中查看')
    }
    
    // 根据推送和保存结果显示相应的提示信息
    if (notificationSuccess) {
      // 推送成功的情况
      const sent = result?.sent || 0
      const failedCount = result?.failed?.length || 0
      
      if (allSaveSuccess) {
        // 推送成功且记录已保存
        if (failedCount > 0) {
          // 部分推送失败，但记录已保存
          // modal 会先显示，等 modal 关闭后再显示 toast
          // 使用较长的延迟，确保 modal 关闭后再显示
          setTimeout(() => {
            uni.showToast({
              title: `已推送${sent}人，出勤记录已成功保存`,
              icon: 'success',
              duration: 3000
            })
          }, 1000)
        } else {
          // 全部推送成功且记录已保存
          uni.showToast({
            title: `已推送${sent}人，出勤记录已成功保存`,
            icon: 'success',
            duration: 3000
          })
        }
      } else {
        // 推送成功但记录保存失败，显示详细错误信息
        let errorMsg = `已推送${sent}人，但以下记录未成功保存到后端：\n\n`
        
        if (allFailedRecords.length > 0) {
          allFailedRecords.forEach((record, index) => {
            errorMsg += `${index + 1}. ${record.name}\n   失败原因: ${record.reason}\n   错误信息: ${record.error}\n\n`
          })
        } else {
          errorMsg += '未知错误，请重试\n\n'
        }
        
        errorMsg += '⚠️ 重要提示：只有所有记录都成功保存到后端，才能提交成功。请检查网络连接或联系管理员。'
        
        uni.showModal({
          title: '提交失败',
          content: errorMsg,
          showCancel: false,
          confirmText: '我知道了',
          confirmColor: '#ff4444'
        })
        return // 如果保存失败，不跳转，让用户重试
      }
    } else if (!notificationSuccess && notificationError) {
      // 推送失败的情况
      if (allSaveSuccess) {
        // 推送失败但记录已保存
        uni.showToast({
          title: '推送失败，但出勤记录已成功保存',
          icon: 'success',
          duration: 3000
        })
      } else {
        // 推送失败且记录保存也失败，显示详细错误信息
        let errorMsg = '推送失败，且以下记录未成功保存到后端：\n\n'
        
        if (allFailedRecords.length > 0) {
          allFailedRecords.forEach((record, index) => {
            errorMsg += `${index + 1}. ${record.name}\n   失败原因: ${record.reason}\n   错误信息: ${record.error}\n\n`
          })
        } else {
          errorMsg += '未知错误，请重试\n\n'
        }
        
        errorMsg += '⚠️ 重要提示：只有所有记录都成功保存到后端，才能提交成功。请检查网络连接或联系管理员。'
        
        uni.showModal({
          title: '提交失败',
          content: errorMsg,
          showCancel: false,
          confirmText: '我知道了',
          confirmColor: '#ff4444'
        })
        return // 如果保存失败，不跳转，让用户重试
      }
    }
    
    // 只有所有记录都成功保存，才跳转到首页
    if (allSaveSuccess) {
      // 提交成功后，延迟跳转到首页
    // 增加延迟时间，确保所有提示信息都已显示
    console.log('准备跳转到首页，延迟3秒')
    setTimeout(() => {
      console.log('开始跳转到首页')
      try {
        uni.redirectTo({
          url: '/pages/index/index',
          success: () => {
            console.log('跳转成功')
          },
          fail: (err) => {
            console.error('跳转失败:', err)
            // 如果 redirectTo 失败，尝试使用 navigateBack
            uni.navigateBack({
              delta: 999,
              fail: () => {
                // 如果 navigateBack 也失败，尝试使用 switchTab（如果首页是 tabBar）
                uni.reLaunch({
                  url: '/pages/index/index'
                })
              }
            })
          }
        })
      } catch (error) {
        console.error('跳转异常:', error)
        // 最后的兜底方案
        uni.reLaunch({
          url: '/pages/index/index'
        })
      }
    }, 3000)
    }
  } catch (error) {
    console.error('发送每日报告失败:', error)
    
    // 即使发生异常，也尝试保存历史记录（使用 newAbsentMembers，因为 absentMembers 只在 try 块内定义）
    let exceptionSaveSuccess = false
    if (newAbsentMembers && newAbsentMembers.length > 0) {
      try {
        await saveDailyReportHistory(newAbsentMembers, reportDate)
        exceptionSaveSuccess = true
        console.log('异常情况下仍保存了每日报告历史')
        
        // 保存已提交的成员列表，避免重复提交
        saveSubmittedDailyReportMembers([...submittedMembers, ...newAbsentMembers], reportDate)
        dailyReportSelectedMembers.value = []
      } catch (err) {
        console.warn('异常情况下保存历史记录也失败:', err)
        exceptionSaveSuccess = false
      }
    }
    
    // 根据保存结果显示相应的提示信息
    if (newAbsentMembers && newAbsentMembers.length > 0) {
      if (exceptionSaveSuccess) {
        uni.showToast({
          title: '发送失败，但出勤记录已成功保存',
          icon: 'success',
          duration: 3000
        })
        
        // 异常情况下保存成功后，延迟跳转到首页
        console.log('异常情况：准备跳转到首页，延迟3秒')
        setTimeout(() => {
          console.log('异常情况：开始跳转到首页')
          try {
            uni.redirectTo({
              url: '/pages/index/index',
              success: () => {
                console.log('跳转成功')
              },
              fail: (err) => {
                console.error('跳转失败:', err)
                uni.reLaunch({
                  url: '/pages/index/index'
                })
              }
            })
          } catch (error) {
            console.error('跳转异常:', error)
            uni.reLaunch({
              url: '/pages/index/index'
            })
          }
        }, 3000)
      } else {
        uni.showToast({
          title: '发送失败，记录保存失败，请重试',
          icon: 'none',
          duration: 3000
        })
      }
    } else {
      uni.showToast({
        title: '发送失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  } finally {
    isSendingDailyReport.value = false
    try {
      uni.hideLoading()
    } catch (e) {
      // ignore
    }
  }
}
</script>

<style lang="scss" scoped>
.attendance-container {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 30%, #bae6fd 60%, #7dd3fc 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* 装饰元素 */
.attendance-container::before {
  content: '';
  position: absolute;
  width: 500rpx;
  height: 500rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 50%;
  top: -250rpx;
  right: -250rpx;
  opacity: 0.15;
  filter: blur(40rpx);
}

.attendance-container::after {
  content: '';
  position: absolute;
  width: 400rpx;
  height: 400rpx;
  background: linear-gradient(135deg, #06ad56 0%, #07c160 100%);
  border-radius: 50%;
  bottom: -200rpx;
  left: -200rpx;
  opacity: 0.15;
  filter: blur(40rpx);
}

/* Header区域 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 60rpx 30rpx 40rpx;
  position: relative;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;
  gap: 20rpx;
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(7, 193, 96, 0.3);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.back-btn:active {
  transform: scale(0.95);
}

.back-icon {
  color: white;
  font-size: 40rpx;
  font-weight: bold;
}

.header-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1a1a1a;
  flex: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-placeholder {
  width: 80rpx;
  height: 80rpx;
}

.daily-report-section {
  margin: 0 30rpx 20rpx;
  padding: 30rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 32rpx;
  box-shadow: 0 10rpx 30rpx rgba(7, 193, 96, 0.18);
  position: relative;
  z-index: 1;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  flex-wrap: wrap;
  gap: 10rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
}

.section-tip {
  font-size: 22rpx;
  color: #ef4444;
  flex-shrink: 0;
}

.daily-report-row {
  display: flex;
  align-items: center;
  padding: 22rpx 20rpx;
  border: 2rpx dashed #bae6fd;
  border-radius: 18rpx;
  background: #f8fbff;
}

.daily-report-row .field-label {
  width: auto;
  min-width: 140rpx;
  color: #475569;
}

.daily-report-value {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #0f172a;
  margin: 0 20rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-icon {
  font-size: 36rpx;
  color: #94a3b8;
}

.daily-report-action {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
  margin-top: 24rpx;
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.daily-report-section .submit-btn {
  flex: 1;
}

.daily-report-section .all-present-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 8rpx 25rpx rgba(59, 130, 246, 0.4),
              0 4rpx 12rpx rgba(59, 130, 246, 0.2);
}

.daily-report-section .all-present-btn.btn-disabled {
  background: #cbd5e1;
  box-shadow: none;
}

.clear-selected-btn {
  min-width: 120rpx;
  height: 80rpx;
  border-radius: 40rpx;
  border: 2rpx solid #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-text {
  color: #475569;
  font-size: 26rpx;
}


/* 出勤记录列表 */
.attendance-list {
  flex: 1;
  padding: 40rpx 30rpx;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
}

.attendance-item {
  background: white;
  border-radius: 24rpx;
  padding: 40rpx 30rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.1),
              0 2rpx 6rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

.delete-btn {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  width: 60rpx;
  height: 60rpx;
  background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(245, 87, 108, 0.3);
  transition: all 0.3s ease;
  z-index: 10;
}

.delete-btn.delete-hover {
  transform: scale(0.9);
  box-shadow: 0 2rpx 8rpx rgba(245, 87, 108, 0.2);
}

.delete-icon {
  color: white;
  font-size: 40rpx;
  font-weight: bold;
  line-height: 1;
}

.field-group {
  display: flex;
  align-items: center;
  gap: 20rpx;
  width: 100%;
  min-width: 0;
}

.field-label {
  width: 140rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex-shrink: 0;
}

.field-label-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  width: 100%;
}

.name-picker-container {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.shift-badge {
  padding: 6rpx 12rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.day-shift {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.night-shift {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
}

.shift-text {
  color: white;
  font-size: 22rpx;
}

.name-picker {
  flex: 1;
}

.field-input {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name-picker {
  color: #1a1a1a;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name-picker:active {
  background: #e9ecef;
}

.time-picker {
  color: #1a1a1a;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time-picker:active {
  background: #e9ecef;
}

.duration-display {
  background: #e7f5ff;
  color: #07c160;
  font-weight: 600;
  border: 2rpx solid #b3e5fc;
}

/* 按钮区域 */
.button-group {
  display: flex;
  gap: 24rpx;
  margin-bottom: 40rpx;
}

/* 添加记录按钮 */
.add-record-btn {
  flex: 1;
  height: 100rpx;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 25rpx rgba(245, 87, 108, 0.4),
              0 4rpx 12rpx rgba(245, 87, 108, 0.2);
  transition: all 0.3s ease;
}

.add-record-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(245, 87, 108, 0.3),
              0 2rpx 8rpx rgba(245, 87, 108, 0.15);
}

.add-icon {
  color: white;
  font-size: 40rpx;
  font-weight: bold;
  line-height: 1;
}

.add-text {
  color: white;
  font-size: 28rpx;
  font-weight: 600;
}

/* 提交按钮 */
.submit-btn {
  flex: 1;
  height: 100rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 25rpx rgba(7, 193, 96, 0.4),
              0 4rpx 12rpx rgba(7, 193, 96, 0.2);
  transition: all 0.3s ease;
}

.submit-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(7, 193, 96, 0.3),
              0 2rpx 8rpx rgba(7, 193, 96, 0.15);
}

.submit-text {
  color: white;
  font-size: 32rpx;
  font-weight: 600;
}

/* 查看提交情况按钮 */
.view-submit-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
  box-shadow: 0 8rpx 25rpx rgba(102, 126, 234, 0.4),
              0 4rpx 12rpx rgba(102, 126, 234, 0.2);
  transition: all 0.3s ease;
}

.view-submit-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(102, 126, 234, 0.3),
              0 2rpx 8rpx rgba(102, 126, 234, 0.15);
}

.view-submit-text {
  color: white;
  font-size: 30rpx;
  font-weight: 600;
}

/* 提交情况弹窗 */
.submit-history-modal {
  width: 90%;
  max-width: 800rpx;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
}

.submit-history-list {
  flex: 1;
  max-height: 600rpx;
  margin-top: 30rpx;
}

.date-filter-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.date-filter-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.date-filter-label {
  font-size: 26rpx;
  color: #666;
}

.date-filter-picker {
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  text-align: center;
  border: 2rpx solid #e9ecef;
  transition: all 0.3s ease;
}

.date-filter-picker:active {
  background: #e9ecef;
  border-color: #07c160;
}

.filter-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

.filter-btn {
  flex: 1;
  height: 70rpx;
  border-radius: 35rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.query-btn {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
}

.query-btn.btn-disabled {
  background: #ccc;
  color: #999;
}

.reset-btn {
  background: #f8f9fa;
  color: #666;
  border: 2rpx solid #e9ecef;
}

.reset-btn:active {
  background: #e9ecef;
}

.submit-history-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.submit-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #e5e5e5;
}

.submit-history-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.submit-history-date {
  font-size: 26rpx;
  color: #666;
}

.submit-history-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.submit-history-row {
  display: flex;
  align-items: center;
  font-size: 28rpx;
}

.submit-history-label {
  color: #666;
  min-width: 140rpx;
}

.submit-history-value {
  color: #333;
  font-weight: 500;
}

.empty-tip {
  padding: 100rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.warning-tip {
  padding: 30rpx;
  margin-top: 20rpx;
  background: #fff3cd;
  border: 2rpx solid #ffc107;
  border-radius: 16rpx;
  text-align: center;
}

.warning-text {
  font-size: 26rpx;
  color: #856404;
}

/* 批量填写弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.member-modal {
  width: 90%;
  max-width: 700rpx;
  max-height: 80vh;
  background: white;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.member-modal .modal-body {
  padding-bottom: 200rpx;
}

.daily-report-modal {
  width: 85%;
  max-width: 640rpx;
  max-height: 75vh;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 18rpx 40rpx rgba(0, 0, 0, 0.15);
  border: 2rpx solid rgba(255, 255, 255, 0.6);
}

.daily-report-modal .modal-body {
  padding-bottom: 40rpx;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 30rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.modal-close {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50rpx;
  color: #999;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.modal-close:active {
  background: #f0f0f0;
}

.modal-body {
  flex: 1;
  padding: 30rpx;
  overflow-y: auto;
}


.member-select-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.member-select-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}


.member-select-list {
  max-height: 500rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 16rpx;
  padding: 10rpx;
}

.batch-time-section {
  margin-top: 30rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
  border: 2rpx dashed #d0d7de;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.batch-time-group {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.batch-time-label {
  width: 180rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex-shrink: 0;
}

.batch-time-picker {
  flex: 1;
  height: 72rpx;
  background: white;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  border: 2rpx solid #e0e0e0;
  transition: all 0.3s ease;
}

.batch-time-picker:active {
  background: #eef2ff;
}

.member-select-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  margin-bottom: 10rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.member-select-item:active {
  background: #e9ecef;
}

.member-select-item.selected {
  background: #e7f5ff;
  border-color: #07c160;
}

/* 请假成员选择项样式 */
.leave-member-item {
  flex-direction: column;
  align-items: stretch;
  padding: 20rpx;
}

.member-select-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.leave-type-selector {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #e0e0e0;
}

.leave-type-label {
  font-size: 26rpx;
  color: #666;
  font-weight: 500;
  margin-bottom: 16rpx;
}

.leave-type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.leave-type-option {
  padding: 12rpx 24rpx;
  border-radius: 20rpx;
  background: white;
  border: 2rpx solid #e0e0e0;
  font-size: 26rpx;
  color: #666;
  transition: all 0.2s ease;
}

.leave-type-option.selected {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-color: #07c160;
  color: white;
  font-weight: 600;
}

.leave-type-option:active {
  transform: scale(0.95);
}

.member-select-checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #ccc;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  transition: all 0.3s ease;
}

.member-select-item.selected .member-select-checkbox {
  background: #07c160;
  border-color: #07c160;
}

.checkbox-icon {
  color: white;
  font-size: 28rpx;
  font-weight: bold;
}

.member-select-name {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 500;
}

.member-shift-badge {
  padding: 6rpx 12rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.empty-member-tip {
  padding: 40rpx 20rpx;
  text-align: center;
}

.empty-member-text {
  font-size: 26rpx;
  color: #999;
}

.modal-footer {
  display: flex;
  gap: 24rpx;
  padding: 30rpx;
  border-top: 2rpx solid #f0f0f0;
  flex-shrink: 0;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  transition: all 0.3s ease;
  padding: 0 12rpx;
  min-width: 0;
  box-sizing: border-box;
}

.cancel-btn {
  background: #f0f0f0;
  color: #666;
}

.cancel-btn:active {
  background: #e0e0e0;
}

.confirm-btn {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.3);
  flex: 1.3;
}

.confirm-btn:active {
  transform: scale(0.98);
}

.confirm-btn.btn-disabled {
  background: #ccc;
  color: #999;
  box-shadow: none;
  opacity: 0.6;
}

.select-all-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
}

.select-all-btn:active {
  transform: scale(0.98);
}

/* 日期时间选择器模态框样式 */
.datetime-picker-modal {
  width: 90%;
  max-width: 600rpx;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.datetime-picker-modal .modal-header {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  padding: 40rpx 30rpx;
  border-bottom: none;
}

.datetime-picker-modal .modal-title {
  color: #ffffff;
  font-weight: 700;
}

.datetime-picker-modal .modal-close {
  color: #ffffff;
  font-size: 48rpx;
  font-weight: 300;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.datetime-picker-modal .modal-body {
  background: #ffffff;
  padding: 40rpx 30rpx;
}

.datetime-section {
  margin-bottom: 40rpx;
}

.datetime-section:last-child {
  margin-bottom: 0;
}

.datetime-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 20rpx;
  display: block;
}

.datetime-picker {
  height: 88rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  font-size: 30rpx;
  color: #1a1a1a;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  border: 2rpx solid #e9ecef;
  transition: all 0.3s ease;
}

.datetime-picker:active {
  background: #e9ecef;
  border-color: #07c160;
}

.datetime-picker-modal .modal-footer {
  background: #ffffff;
  border-top: 1rpx solid #e9ecef;
  padding: 30rpx;
}
</style>
