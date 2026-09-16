<template>
  <view class="settings-container">
    <!-- 顶部Header -->
    <view class="header">
      <view class="back-btn" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="header-title">设置</view>
      <view class="header-placeholder"></view>
    </view>

    <!-- 组别数据提取区域 -->
    <scroll-view class="content-list" scroll-y="true">
      <view 
        v-for="(group, index) in groupList" 
        :key="index"
        class="group-item"
      >
        <view class="group-info">
          <view class="group-label">{{ group.department || group.name }}</view>
          <view v-if="getLeaderDisplayName(group)" class="group-leader">
            组长：{{ getLeaderDisplayName(group) }}
          </view>
          <view class="group-member-count">
            组员数量：{{ getGroupMemberCount(group) }}
          </view>
        </view>
        <view class="group-actions">
          <view 
            class="info-btn" 
            @tap="handleShowGroupMembers(group)"
            hover-class="btn-hover"
          >
            <text class="info-text">显示信息</text>
          </view>
          <view 
            class="member-export-btn" 
            @tap="handleExportGroupMembers(group)"
            hover-class="btn-hover"
          >
            <text class="member-export-text">导出组员</text>
          </view>
          <view 
            class="export-btn" 
            @tap="handleOpenExportGroupDateModal(group)"
            hover-class="btn-hover"
          >
            <text class="export-text">提取表格</text>
          </view>
        </view>
      </view>

      <!-- 提取所有信息按钮 -->
      <view class="action-section">
        <view 
          class="export-all-btn" 
          @tap="handleOpenExportAllDateModal"
          hover-class="btn-hover"
        >
          <text class="export-text">提取所有信息</text>
        </view>
        <view 
          class="export-members-btn" 
          @tap="handleExportAllGroupMembers"
          hover-class="btn-hover"
        >
          <text class="export-text">提取所有组员信息</text>
        </view>

        <!-- 上传打卡机数据按钮 -->
        <view 
          class="upload-btn" 
          @tap="handleUploadData"
          hover-class="btn-hover"
        >
          <text class="upload-text">上传打卡机数据</text>
        </view>

        <!-- 历史记录按钮 -->
        <view 
          class="history-btn" 
          @tap="handleViewHistory"
          hover-class="btn-hover"
        >
          <text class="history-text">历史记录</text>
        </view>

        <!-- 查看出勤信息按钮 -->
        <view 
          class="attendance-summary-btn" 
          @tap="handleViewAttendanceSummary"
          hover-class="btn-hover"
        >
          <text class="attendance-summary-text">查看出勤信息</text>
        </view>

        <!-- 月度统计表按钮 -->
        <view 
          class="monthly-stats-btn" 
          @tap="handleViewMonthlyStats"
          hover-class="btn-hover"
        >
          <text class="monthly-stats-text">月度统计表</text>
        </view>

        <!-- 绑定/解绑微信按钮（仅管理员和admin可见） -->
        <!-- #ifdef MP-WEIXIN -->
        <view 
          v-if="allowedSettingRoles.includes(currentUserRole)"
          class="bind-wechat-btn" 
          :class="{ 'unbind-btn': isWechatBound }"
          @tap="isWechatBound ? handleUnbindWechat() : handleBindWechat()"
          hover-class="btn-hover"
        >
          <text class="bind-wechat-text">{{ wechatBindStatus }}</text>
        </view>
        <!-- #endif -->
      </view>
    </scroll-view>

    <!-- 导出进度弹窗 -->
    <view v-if="showExportProgress" class="modal-overlay" @tap.stop>
      <view class="progress-modal" @tap.stop>
        <view class="progress-title">导出中...</view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: exportProgress + '%' }"></view>
        </view>
        <text class="progress-text">{{ exportProgress }}%</text>
      </view>
    </view>

    <!-- 上传文件选择 -->
    <view v-if="showUploadModal" class="modal-overlay" @tap="handleCloseUploadModal">
      <view class="upload-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">上传打卡机数据</text>
          <view class="modal-close" @tap="handleCloseUploadModal">×</view>
        </view>
        <view class="modal-body">
          <view class="upload-tips">
            <text class="tips-text">请选择Excel文件</text>
            <text class="tips-desc">模板格式：姓名、出勤时间</text>
          </view>
          <view class="upload-warning">
            <text class="warning-icon">⚠️</text>
            <view class="warning-text-group">
              <text class="warning-text">仅支持检测单日数据，请选择同一天的开始日期和结束日期</text>
              <text class="warning-text-sub">夜班注意：例如 1月4日20:00-1月5日08:00，请将开始日期和结束日期都选择为 1月4日</text>
            </view>
          </view>
          <view class="date-filter-row">
            <view class="date-filter-item">
              <text class="date-filter-label">开始日期</text>
              <view class="upload-date-picker" @tap="handleOpenUploadStartDatePicker">
                <text class="date-picker-text" :class="{ 'placeholder-text': !uploadStartDate }">{{ uploadStartDate || '请选择' }}</text>
                <text class="date-picker-icon">📅</text>
              </view>
            </view>
            <view class="date-filter-item">
              <text class="date-filter-label">结束日期</text>
              <view class="upload-date-picker" @tap="handleOpenUploadEndDatePicker">
                <text class="date-picker-text" :class="{ 'placeholder-text': !uploadEndDate }">{{ uploadEndDate || '请选择' }}</text>
                <text class="date-picker-icon">📅</text>
              </view>
            </view>
          </view>
          <button class="file-select-btn" @tap="handleSelectFile">选择文件</button>
          <view v-if="selectedFileName" class="file-name">
            <text class="file-name-text">已选择：{{ selectedFileName }}</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel-btn" @tap="handleCloseUploadModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm-btn" @tap="handleConfirmUpload" :class="{ 'btn-disabled': !selectedFile }">
            <text class="btn-text">上传</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 历史记录弹窗 -->
    <view v-if="showHistoryModal" class="modal-overlay" @tap="handleCloseHistoryModal">
      <view class="history-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">历史记录</text>
          <view class="modal-close" @tap="handleCloseHistoryModal">×</view>
        </view>
        <view class="modal-body">
          <!-- 日期筛选 -->
          <view class="date-filter-row">
            <view class="date-filter-item">
              <text class="date-filter-label">开始日期</text>
              <picker 
                mode="date" 
                :value="historyStartDate" 
                @change="handleHistoryStartDateChange"
              >
                <view class="date-filter-picker">
                  {{ historyStartDate || '请选择' }}
                </view>
              </picker>
            </view>
            <view class="date-filter-item">
              <text class="date-filter-label">结束日期</text>
              <picker 
                mode="date" 
                :value="historyEndDate" 
                @change="handleHistoryEndDateChange"
              >
                <view class="date-filter-picker">
                  {{ historyEndDate || '请选择' }}
                </view>
              </picker>
            </view>
          </view>
          <view class="filter-actions">
            <button 
              class="filter-btn query-btn" 
              :class="{ 'btn-disabled': !historyStartDate || !historyEndDate || isLoadingHistory }"
              :disabled="!historyStartDate || !historyEndDate || isLoadingHistory"
              @tap="handleQueryHistory"
            >
              {{ isLoadingHistory ? '查询中...' : '查询' }}
            </button>
            <button class="filter-btn reset-btn" @tap="handleResetHistoryFilter">重置</button>
          </view>
          
          <!-- 历史记录列表 -->
          <view v-if="historyList.length > 0" class="history-count-info">
            <text class="history-count-text">
              共 {{ historyList.length }} 条，第 {{ historyCurrentPage }} / {{ historyTotalPages }} 页
            </text>
          </view>
          <scroll-view 
            class="history-content" 
            scroll-y="true"
            @scrolltolower="handleLoadMoreHistory"
          >
            <view v-if="historyDisplayList.length === 0 && !isLoadingHistory" class="no-history">
              <text class="no-history-text">{{ historyStartDate && historyEndDate ? '该日期范围内暂无历史记录' : '请选择日期范围后查询' }}</text>
            </view>
            <view 
              v-for="(item, index) in historyDisplayList" 
              :key="index"
              class="history-item"
            >
              <view class="history-header">
                <text class="history-time">{{ formatHistoryTime(item.timestamp || item.changedAt) }}</text>
                <text class="history-group">{{ item.groupName || item.group || '未知分组' }}</text>
              </view>
              <view class="history-member">{{ item.memberName }}</view>
              <view class="history-change">
                <text class="change-label">{{ formatHistoryField(item.field) }}：</text>
                <text class="change-old">{{ formatHistoryValue(item.field, item.oldValue) }}</text>
                <text class="change-arrow">→</text>
                <text class="change-new">{{ formatHistoryValue(item.field, item.newValue) }}</text>
              </view>
            </view>
            <view v-if="historyCurrentPage < historyTotalPages" class="load-more-tip">
              <text class="load-more-text">滚动到底部加载更多...</text>
            </view>
          </scroll-view>
          <!-- 分页控件 -->
          <view v-if="historyTotalPages > 1" class="history-pagination-controls">
            <view 
              class="pagination-btn"
              :class="{ 'btn-disabled': historyCurrentPage === 1 }"
              @tap="handlePrevPageHistory"
            >
              <text class="pagination-btn-text">上一页</text>
            </view>
            <view class="pagination-info">
              <text class="pagination-info-text">{{ historyCurrentPage }} / {{ historyTotalPages }}</text>
            </view>
            <view 
              class="pagination-btn"
              :class="{ 'btn-disabled': historyCurrentPage >= historyTotalPages }"
              @tap="handleNextPageHistory"
            >
              <text class="pagination-btn-text">下一页</text>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn confirm-btn" @tap="handleCloseHistoryModal" style="width: 100%;">
            <text class="btn-text">关闭</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 组员信息弹窗 -->
    <view v-if="showGroupMembersModal" class="modal-overlay" @tap="handleCloseGroupMembersModal">
      <view class="group-members-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">组员信息</text>
          <view class="modal-close" @tap="handleCloseGroupMembersModal">×</view>
        </view>
        <view class="group-members-summary">
          <text class="summary-line">组别：{{ currentGroupSummary.name || '未知组别' }}</text>
          <text class="summary-line">部门：{{ currentGroupSummary.department || '未分组' }}</text>
          <text class="summary-line">组长：{{ currentGroupSummary.leaderName || '未知组长' }}</text>
        </view>
        <view class="group-change-section">
          <view class="group-change-header">
            <text class="group-change-title">变动信息</text>
            <text class="group-change-tip">展示最近 10 条</text>
          </view>
          <view v-if="isLoadingGroupChanges" class="group-change-placeholder">
            <text>加载中...</text>
          </view>
          <view v-else-if="groupChangeLogs.length === 0" class="group-change-placeholder">
            <text>暂无组员变动记录</text>
          </view>
          <scroll-view v-else class="group-change-list" scroll-y="true">
            <view 
              v-for="(log, idx) in groupChangeLogs"
              :key="log.id || idx"
              class="group-change-item"
            >
              <view class="change-item-header">
                <text class="change-type" :class="{ add: log.changeType.includes('新增'), remove: log.changeType.includes('删除') }">{{ log.changeType }}</text>
                <text class="change-time">{{ formatChangeLogTime(log.timestamp) }}</text>
              </view>
              <view class="change-item-body">
                <text class="change-member">{{ log.memberName }}</text>
                <text v-if="log.shiftText" class="change-meta">{{ log.shiftText }}</text>
                <text v-if="log.operator" class="change-meta">操作人：{{ log.operator }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
        <scroll-view class="group-members-list" scroll-y="true">
          <view v-if="isLoadingGroupMembers" class="group-members-loading">
            <text>加载中...</text>
          </view>
          <view v-else-if="currentGroupMembers.length === 0" class="group-members-empty">
            <text>暂无组员信息</text>
          </view>
          <view 
            v-else
            v-for="(member, idx) in currentGroupMembers"
            :key="idx"
            class="group-member-item"
          >
            <view class="member-header">
              <text class="member-name">{{ member.name }}</text>
              <view 
                class="member-shift-badge"
                :class="member.shiftType === 'night' ? 'night-shift' : 'day-shift'"
              >
                <text class="shift-text">{{ member.shiftType === 'night' ? '夜班' : '白班' }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <view class="modal-btn confirm-btn" @tap="handleCloseGroupMembersModal" style="width: 100%;">
            <text class="btn-text">关闭</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 异常数据结果弹窗 -->
    <view v-if="showAnomalyModal" class="modal-overlay" @tap="handleCloseAnomalyModal">
      <view class="anomaly-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">异常数据检测结果</text>
          <view class="modal-close" @tap="handleCloseAnomalyModal">×</view>
        </view>
        <scroll-view class="anomaly-content" scroll-y="true">
          <view v-if="anomalyList.length === 0" class="no-anomaly">
            <text class="no-anomaly-text">✅ 未发现异常数据</text>
          </view>
          <view 
            v-for="(item, index) in anomalyList" 
            :key="index"
            class="anomaly-item"
          >
            <view class="anomaly-name">{{ item.name }}</view>
            <view class="anomaly-reason">{{ item.reason }}</view>
            <view class="anomaly-detail">
              <text v-if="item.startTime">打卡时间：{{ item.startTime }}</text>
              <text v-if="item.manualDuration">手动时长：{{ item.manualDuration }}</text>
              <text v-if="item.uploadDuration">上传时长：{{ item.uploadDuration }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <view class="modal-btn confirm-btn" @tap="handleCloseAnomalyModal" style="width: 100%;">
            <text class="btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 月度统计表弹窗 -->
    <view 
      v-if="showMonthlyStatsModal" 
      class="modal-overlay" 
      @tap="handleCloseMonthlyStatsModal"
    >
      <view class="monthly-stats-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">月度统计表</text>
          <view class="modal-actions">
            <view 
              class="export-mini-btn" 
              :class="{ 'btn-disabled': monthlyStatsList.length === 0 }"
              @tap.stop="handleExportMonthlyStats"
            >
              <text class="btn-text">导出表格</text>
            </view>
            <view class="modal-close" @tap="handleCloseMonthlyStatsModal">×</view>
          </view>
        </view>
        <view class="modal-body monthly-stats-body">
          <!-- 月份选择 -->
          <view class="monthly-stats-filter">
            <view class="filter-item">
              <text class="filter-label">选择月份</text>
              <picker 
                mode="date" 
                fields="month"
                :value="selectedMonth"
                @change="handleMonthChange"
              >
                <view class="filter-picker">
                  {{ selectedMonth || '请选择月份' }}
                </view>
              </picker>
            </view>
          </view>
          <!-- 月度统计表列表 -->
          <scroll-view 
            class="monthly-stats-list" 
            scroll-y="true"
            :scroll-top="0"
            :enable-back-to-top="true"
            :show-scrollbar="true"
          >
            <view 
              v-for="(item, index) in monthlyStatsList" 
              :key="index"
              class="monthly-stats-item"
            >
              <view class="monthly-stats-date">{{ item.date }}</view>
              <view class="monthly-stats-records">
                <view 
                  v-for="(record, recordIndex) in getDisplayRecords(item)" 
                  :key="recordIndex"
                  class="monthly-stats-record"
                >
                  <text class="record-name">{{ record.name }}</text>
                  <text class="record-time">{{ record.startTime }} - {{ record.endTime }}</text>
                  <text class="record-duration">{{ record.duration }}</text>
                </view>
                <view v-if="item.records.length === 0" class="no-data-tip">
                  <text class="no-data-text">当日无数据</text>
                </view>
                <!-- 展开/折叠按钮 -->
                <view 
                  v-if="item.records.length > 2" 
                  class="expand-toggle"
                  @tap="toggleDateExpand(item.date)"
                >
                  <text class="expand-text">
                    {{ isDateExpanded(item.date) ? '收起' : `展开更多（共${item.records.length}条）` }}
                  </text>
                  <text class="expand-icon">{{ isDateExpanded(item.date) ? '▲' : '▼' }}</text>
                </view>
              </view>
            </view>
            <view v-if="monthlyStatsList.length === 0" class="empty-tip">
              <text class="empty-text">暂无数据，请先选择月份</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- 出勤信息汇总弹窗 -->
    <view 
      v-if="showAttendanceSummaryModal" 
      class="modal-overlay" 
      @tap="handleCloseAttendanceSummaryModal"
    >
      <view class="attendance-summary-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">出勤汇总</text>
          <view class="modal-actions">
            <view 
              class="export-mini-btn" 
              :class="{ 'btn-disabled': attendanceSummaryList.length === 0 }"
              @tap.stop="handleExportAttendanceSummary"
            >
              <text class="btn-text">导出表格</text>
            </view>
            <view class="modal-close" @tap="handleCloseAttendanceSummaryModal">×</view>
          </view>
        </view>
        <!-- 时间筛选区域 -->
        <view class="attendance-summary-filter">
          <view class="filter-row">
            <view class="filter-item">
              <text class="filter-label">开始日期</text>
              <view class="filter-picker" @tap="handleOpenStartDatePicker">
                {{ attendanceSummaryStartDate || '请选择' }}
              </view>
            </view>
            <view class="filter-item">
              <text class="filter-label">结束日期</text>
              <view class="filter-picker" @tap="handleOpenEndDatePicker">
                {{ attendanceSummaryEndDate || '请选择' }}
              </view>
            </view>
          </view>
          <view class="filter-actions">
            <view 
              class="filter-btn reset-btn" 
              @tap="handleResetAttendanceSummaryFilter"
            >
              <text class="filter-btn-text">重置</text>
            </view>
            <view 
              class="filter-btn query-btn" 
              :class="{ 'btn-disabled': isLoadingAttendanceSummary }"
              @tap="handleQueryAttendanceSummary"
            >
              <text class="filter-btn-text">{{ isLoadingAttendanceSummary ? '查询中...' : '查询' }}</text>
            </view>
          </view>
        </view>
        <view class="summary-table-header">
          <text class="col department">部门</text>
          <text class="col leader">组长</text>
          <text class="col member">组员</text>
          <text class="col date">日期</text>
          <text class="col status">出勤情况</text>
        </view>
        <!-- 分页信息 -->
        <view v-if="attendanceSummaryList.length > 0" class="summary-pagination-info">
          <text class="pagination-text">
            共 {{ attendanceSummaryList.length }} 条，第 {{ attendanceSummaryCurrentPage }} / {{ attendanceSummaryTotalPages }} 页
          </text>
        </view>
        <scroll-view 
          class="summary-table" 
          scroll-y="true"
          :scroll-top="0"
          :enable-back-to-top="true"
          :show-scrollbar="true"
          @scrolltolower="handleLoadMoreAttendanceSummary"
        >
          <view v-if="attendanceSummaryDisplayList.length === 0 && !isLoadingAttendanceSummary" class="empty-summary">
            <text class="empty-summary-text">
              {{ attendanceSummaryStartDate || attendanceSummaryEndDate ? '暂无出勤数据' : '请选择日期后点击查询' }}
            </text>
          </view>
          <view v-if="isLoadingAttendanceSummary" class="empty-summary">
            <text class="empty-summary-text">加载中...</text>
          </view>
          <view 
            v-for="(row, index) in attendanceSummaryDisplayList" 
            :key="index"
            class="summary-row"
          >
            <text class="col department">{{ row.department || '未分组' }}</text>
            <text class="col leader">{{ row.leaderName || '未知组长' }}</text>
            <text class="col member">{{ row.memberName || '未知成员' }}</text>
            <text class="col date">{{ row.date || '--' }}</text>
            <text class="col status">{{ row.attendanceStatus || '正常出勤' }}</text>
          </view>
          <!-- 加载更多提示 -->
          <view v-if="attendanceSummaryCurrentPage < attendanceSummaryTotalPages" class="load-more-tip">
            <text class="load-more-text">滚动到底部加载更多...</text>
          </view>
        </scroll-view>
        <!-- 分页控制按钮 -->
        <view v-if="attendanceSummaryTotalPages > 1" class="summary-pagination-controls">
          <view 
            class="pagination-btn"
            :class="{ 'btn-disabled': attendanceSummaryCurrentPage === 1 }"
            @tap="handlePrevPageAttendanceSummary"
          >
            <text class="pagination-btn-text">上一页</text>
          </view>
          <view class="pagination-info">
            <text class="pagination-info-text">{{ attendanceSummaryCurrentPage }} / {{ attendanceSummaryTotalPages }}</text>
          </view>
          <view 
            class="pagination-btn"
            :class="{ 'btn-disabled': attendanceSummaryCurrentPage >= attendanceSummaryTotalPages }"
            @tap="handleNextPageAttendanceSummary"
          >
            <text class="pagination-btn-text">下一页</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 自定义日期选择器弹窗 -->
    <view v-if="showDatePickerModal" class="modal-overlay date-picker-overlay" @tap="handleCloseDatePickerModal">
      <view class="date-picker-modal" @tap.stop>
        <view class="date-picker-header">
          <text class="date-picker-title">{{ currentDatePickerType === 'start' ? '选择开始日期' : '选择结束日期' }}</text>
          <view class="date-picker-close" @tap="handleCloseDatePickerModal">×</view>
        </view>
        <view class="date-picker-body">
          <!-- 月份/年份选择 -->
          <view class="date-picker-nav">
            <view class="nav-btn" @tap="handlePrevYear">
              <text>‹‹</text>
            </view>
            <view class="nav-btn" @tap="handlePrevMonth">
              <text>‹</text>
            </view>
            <view class="date-picker-month-year" @tap="handleShowYearMonthPicker">
              <text>{{ currentYear }}年{{ currentMonth }}月</text>
            </view>
            <view class="nav-btn" @tap="handleNextMonth">
              <text>›</text>
            </view>
            <view class="nav-btn" @tap="handleNextYear">
              <text>››</text>
            </view>
          </view>
          <!-- 星期标题 -->
          <view class="date-picker-weekdays">
            <text class="weekday" v-for="day in weekdays" :key="day">{{ day }}</text>
          </view>
          <!-- 日期网格 -->
          <view class="date-picker-grid">
            <view 
              v-for="(date, index) in calendarDays" 
              :key="index"
              class="date-cell"
              :class="{
                'other-month': !date.isCurrentMonth,
                'today': date.isToday,
                'selected': date.isSelected,
                'disabled': date.isDisabled
              }"
              @tap="handleSelectDate(date)"
            >
              <text>{{ date.day }}</text>
            </view>
          </view>
        </view>
        <view class="date-picker-footer">
          <view class="date-picker-action-btn clear-btn" @tap="handleClearDate">
            <text>清除</text>
          </view>
          <view class="date-picker-action-btn today-btn" @tap="handleSelectToday">
            <text>今天</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 提取所有信息的日期选择弹窗 -->
    <view v-if="showExportAllDateModal" class="modal-overlay" @tap="handleCloseExportAllDateModal">
      <view class="export-date-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">选择日期范围</text>
          <view class="modal-close" @tap="handleCloseExportAllDateModal">×</view>
        </view>
        <view class="modal-body">
          <view class="date-filter-row">
            <view class="date-filter-item">
              <text class="date-filter-label">开始日期</text>
              <view class="date-filter-picker" @tap="handleOpenExportAllStartDatePicker">
                {{ exportAllStartDate || '请选择' }}
              </view>
            </view>
            <view class="date-filter-item">
              <text class="date-filter-label">结束日期</text>
              <view class="date-filter-picker" @tap="handleOpenExportAllEndDatePicker">
                {{ exportAllEndDate || '请选择' }}
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @tap="handleCloseExportAllDateModal">取消</button>
          <button 
            class="modal-btn confirm-btn" 
            :class="{ 'btn-disabled': !exportAllStartDate || !exportAllEndDate }"
            :disabled="!exportAllStartDate || !exportAllEndDate"
            @tap="handleConfirmExportAllDate"
          >
            确定
          </button>
        </view>
      </view>
    </view>

    <!-- 提取表格的日期选择弹窗 -->
    <view v-if="showExportGroupDateModal && currentExportGroup" class="modal-overlay" @tap="handleCloseExportGroupDateModal">
      <view class="export-date-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">选择日期范围 - {{ currentExportGroup.department || currentExportGroup.name }}</text>
          <view class="modal-close" @tap="handleCloseExportGroupDateModal">×</view>
        </view>
        <view class="modal-body">
          <view class="date-filter-row">
            <view class="date-filter-item">
              <text class="date-filter-label">开始日期</text>
              <view class="date-filter-picker" @tap="handleOpenExportGroupStartDatePicker">
                {{ exportGroupDateMap[currentExportGroup.name]?.startDate || '请选择' }}
              </view>
            </view>
            <view class="date-filter-item">
              <text class="date-filter-label">结束日期</text>
              <view class="date-filter-picker" @tap="handleOpenExportGroupEndDatePicker">
                {{ exportGroupDateMap[currentExportGroup.name]?.endDate || '请选择' }}
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @tap="handleCloseExportGroupDateModal">取消</button>
          <button 
            class="modal-btn confirm-btn" 
            :class="{ 'btn-disabled': !exportGroupDateMap[currentExportGroup.name]?.startDate || !exportGroupDateMap[currentExportGroup.name]?.endDate }"
            :disabled="!exportGroupDateMap[currentExportGroup.name]?.startDate || !exportGroupDateMap[currentExportGroup.name]?.endDate"
            @tap="handleConfirmExportGroupDate(currentExportGroup.name, currentExportGroup.index)"
          >
            确定
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getAttendanceGroups, exportGroupData, exportAllData, uploadAttendanceData, downloadAnomalyReport } from '@/utils/api/admin.js'
import { getHistory } from '@/utils/api/history.js'
import { getCurrentUser, getAllUsers, updateCurrentUser, getAllLeaders } from '@/utils/api/user.js'
import { getMonthlyAttendance } from '@/utils/api/attendance.js'
import { getAttendanceRecords } from '@/utils/api/attendance.js'
// #ifdef MP-WEIXIN
// xlsx 改为按需动态加载，避免打入主包（约 850KB）
// #endif

// 提取所有信息的日期选择
const exportAllStartDate = ref('')
const exportAllEndDate = ref('')
const showExportAllDateModal = ref(false)
// 提取表格的日期选择（每个组别独立）
const exportGroupDateMap = ref({}) // key: groupName, value: { startDate, endDate }
const showExportGroupDateModal = ref(false)
const currentExportGroup = ref(null) // 当前正在选择日期的组别
// 日期选择器类型（用于区分不同的用途）
const datePickerContext = ref('attendance') // 'attendance' | 'exportAll' | 'exportGroup' | 'upload'
// 上传打卡机数据的日期筛选
const uploadStartDate = ref('')
const uploadEndDate = ref('')
// 组别列表
const groupList = ref([])
// 导出进度
const showExportProgress = ref(false)
const exportProgress = ref(0)
// 上传相关
const showUploadModal = ref(false)
const selectedFile = ref(null)
const selectedFileName = ref('')
// 异常数据
const showAnomalyModal = ref(false)
const anomalyList = ref([])
// 历史记录
const showHistoryModal = ref(false)
const historyList = ref([]) // 所有历史记录数据（筛选后）
const historyDisplayList = ref([]) // 当前显示的数据（分页后）
const historyStartDate = ref('')
const historyEndDate = ref('')
const isLoadingHistory = ref(false)
const allHistoryData = ref([]) // 存储所有历史记录数据，用于前端筛选
// 历史记录分页
const historyPageSize = ref(100) // 每页显示100条
const historyCurrentPage = ref(1)
const historyTotalPages = ref(1)
// 出勤汇总
const showAttendanceSummaryModal = ref(false)
const attendanceSummaryList = ref([])
const attendanceSummaryDisplayList = ref([]) // 当前显示的数据（分页后）
const isLoadingAttendanceSummary = ref(false)
// 出勤汇总时间筛选
const attendanceSummaryStartDate = ref('')
const attendanceSummaryEndDate = ref('')
// 出勤汇总分页
const attendanceSummaryPageSize = ref(100) // 每页显示100条
const attendanceSummaryCurrentPage = ref(1)
const attendanceSummaryTotalPages = ref(1)
// 月度统计表
const showMonthlyStatsModal = ref(false)
const selectedMonth = ref('')
const monthlyStatsList = ref([])
const expandedDates = ref(new Set()) // 存储展开的日期
// 组员展示
const showGroupMembersModal = ref(false)
const currentGroupMembers = ref([])
const currentGroupSummary = ref({
  name: '',
  leaderName: '',
  department: ''
})
const isLoadingGroupMembers = ref(false)
const leaderMembersCache = ref({})
const groupChangeLogs = ref([])
const isLoadingGroupChanges = ref(false)

// 自定义日期选择器
const showDatePickerModal = ref(false)
const currentDatePickerType = ref('start') // 'start' 或 'end'
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const weekdays = ['日', '一', '二', '三', '四', '五', '六']
// 微信绑定状态
const wechatBindStatus = ref('绑定微信')
const isWechatBound = ref(false)
const currentUserInfo = ref(null)
const currentUserRole = ref('')
const cachedWechatTemplateId = ref(uni.getStorageSync('wechatTemplateId') || '')
const defaultWechatTemplateId = (() => {
  const envValue = import.meta.env?.VITE_WECHAT_TEMPLATE_ID
  if (typeof envValue === 'string' && envValue.trim()) {
    return envValue.trim()
  }
  // 与后端保持一致的兜底模板ID
  return '5s9PrgECb5TwoylWDaXv_ErXF5egPEJqAEsczgawtBY'
})()

if (!cachedWechatTemplateId.value && defaultWechatTemplateId) {
  cachedWechatTemplateId.value = defaultWechatTemplateId
  uni.setStorageSync('wechatTemplateId', defaultWechatTemplateId)
}

const hideLoadingSilently = (() => {
  let lastError = ''
  return () => {
    try {
      uni.hideLoading()
    } catch (err) {
      const msg = err?.errMsg || err?.message || ''
      if (!msg) return
      if (msg.includes("toast can't be found")) {
        return
      }
      if (msg !== lastError) {
        console.warn('hideLoading 调用异常：', msg)
        lastError = msg
      }
    }
  }
})()

// 允许访问设置页的角色
const allowedSettingRoles = ['admin', '管理员', 'manager']

// 同步获取最新角色
const refreshUserRole = async () => {
  try {
    const currentUser = await getCurrentUser()
    if (currentUser?.role) {
      uni.setStorageSync('userRole', currentUser.role)
      if (currentUser.nickName) {
        uni.setStorageSync('userNickName', currentUser.nickName)
      }
      return currentUser.role
    }
  } catch (error) {
    console.warn('获取最新用户角色失败:', error)
  }
  return uni.getStorageSync('userRole') || ''
}

// 页面加载时检查权限
onMounted(async () => {
  const hasPermission = await checkPermission()
  if (!hasPermission) return
  
  // 初始化用户角色
  currentUserRole.value = uni.getStorageSync('userRole') || ''
  
  // 初始化日期范围已移除，现在使用独立的日期选择器
  // initDateRange()
  // 加载分组（管理员身份进入设置会自动创建设置数据）
  loadGroups()
  // 加载组员缓存
  refreshLeaderMembersCache()
  // 检查微信绑定状态
  await checkWechatBindStatus()
})

// 检查权限
const checkPermission = async () => {
  let userRole = uni.getStorageSync('userRole') || ''
  
  if (!allowedSettingRoles.includes(userRole)) {
    userRole = await refreshUserRole()
  }
  
  if (!allowedSettingRoles.includes(userRole)) {
    uni.showToast({
      title: '无权限访问',
      icon: 'none',
      duration: 2000
    })
    setTimeout(() => {
      uni.redirectTo({
        url: '/pages/index/index'
      })
    }, 2000)
    return false
  }
  return true
}

// 初始化日期范围（已移除，现在使用独立的日期选择器）
// const initDateRange = () => {
//   // 不再需要默认日期，用户需要手动选择
// }

// 格式化日期
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateTime = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const detectTeamNameFromUpload = (uploadData = []) => {
  if (!Array.isArray(uploadData) || uploadData.length === 0) {
    return ''
  }
  const candidateFields = ['组别', '部门', '团队', 'teamName', 'TeamName', 'team', 'Team', 'department', 'Department']
  for (const field of candidateFields) {
    const values = uploadData
      .map(item => (item?.[field] || '').toString().trim())
      .filter(Boolean)
    if (values.length) {
      const frequencyMap = values.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1
        return acc
      }, {})
      return Object.keys(frequencyMap).sort((a, b) => frequencyMap[b] - frequencyMap[a])[0]
    }
  }
  return ''
}

const updateLeaderMembersCacheFromList = (leaders = []) => {
  if (!Array.isArray(leaders)) return
  const cache = {}
  leaders.forEach(leader => {
    if (!leader) return
    const leaderId = leader.leaderId || leader.id || leader.userId || leader._id || leader.username || ''
    const leaderName = leader.nickName || leader.name || leader.username || ''
    const members = Array.isArray(leader.members)
      ? leader.members.map(member => ({
          name: member?.name || member?.memberName || '',
          shiftType: member?.shiftType || 'day',
          jobTitle: member?.jobTitle || member?.position || member?.role || '',
          phone: member?.phone || member?.mobile || '',
        })).filter(member => !!member.name)
      : []
    if (leaderId) {
      cache[leaderId] = members
    }
    if (leaderName && leaderName !== leaderId) {
      cache[leaderName] = members
    }
  })
  leaderMembersCache.value = cache
}

const refreshLeaderMembersCache = async () => {
  try {
    const leaders = await getAllLeaders(true)
    if (Array.isArray(leaders) && leaders.length > 0) {
      updateLeaderMembersCacheFromList(leaders)
    }
  } catch (error) {
    console.warn('加载组员信息失败，将稍后重试', error)
  }
}

// 获取组长显示名称（优先显示真实名字，如果没有则显示ID）
const getLeaderDisplayName = (group) => {
  const leaderName = group.leaderName || group.leaderId || ''
  
  // 如果是"未知"或空，不显示
  if (!leaderName || leaderName === '未知' || leaderName === 'unknown_legacy') {
    return ''
  }
  
  // 如果组长名字是leaderId格式（如leader_xxx），尝试从用户信息中获取真实名字
  if (leaderName.startsWith('leader_')) {
    // 尝试从本地存储的用户列表中查找真实名字
    const allUsers = uni.getStorageSync('allUsers') || []
    const user = allUsers.find(u => u.userId === leaderName)
    if (user && user.nickName) {
      return user.nickName
    }
    // 如果找不到真实名字，返回ID（但去掉leader_前缀，只显示后面的部分）
    return leaderName.replace(/^leader_/, '')
  }
  
  // 如果已经是真实名字，直接返回
  return leaderName
}

const resolveGroupSummary = (group = {}) => {
  return {
    name: group.department || group.name || '未命名组别',
    leaderName: getLeaderDisplayName(group) || group.leaderName || '未知组长',
    department: group.department || group.name || '未分组'
  }
}

const getGroupMemberCount = (group = {}) => {
  const members = pickMembersFromCache(getLeaderLookupKeys(group))
  return Array.isArray(members) ? members.length : 0
}

const pickMembersFromCache = (keys = []) => {
  if (!keys || keys.length === 0) return []
  for (const key of keys) {
    if (key && leaderMembersCache.value?.[key]) {
      return leaderMembersCache.value[key]
    }
  }
  return []
}

const getLeaderLookupKeys = (group = {}) => {
  return [
    group.leaderId,
    group.leaderName,
    getLeaderDisplayName(group)
  ].filter(Boolean)
}

const formatShiftLabel = (shiftType = '') => {
  if (shiftType === 'night') return '夜班'
  if (shiftType === 'day') return '白班'
  return ''
}

const ensureMembersForGroup = async (group = {}) => {
  const leaderKeys = getLeaderLookupKeys(group)
  let members = pickMembersFromCache(leaderKeys)
  if (!members.length) {
    await refreshLeaderMembersCache()
    members = pickMembersFromCache(leaderKeys)
  }
  return members
}

const parseMemberChangeLog = (log) => {
  if (!log) return null
  let detail = {}
  if (log.newValue) {
    try {
      detail = JSON.parse(log.newValue)
    } catch (error) {
      detail = {}
    }
  }
  const changeType = detail.changeType || log.oldValue || '变动'
  const memberName = detail.memberName || log.memberName || ''
  const shiftType = detail.shiftType || log.shiftType || ''
  const timestamp = detail.timestamp || log.changedAt || log.createdAt || log.timestamp || ''
  const operator = detail.leaderName || log.changedBy || log.leaderName || ''
  return {
    id: log._id || log.id || `${memberName}-${timestamp}-${changeType}`,
    changeType,
    memberName,
    shiftType,
    timestamp,
    operator,
    description: detail.description || '',
    shiftText: shiftType ? `班次：${formatShiftLabel(shiftType)}` : ''
  }
}

const loadGroupChangeLogs = async (leaderKeys = [], department = '') => {
  groupChangeLogs.value = []
  isLoadingGroupChanges.value = true
  if ((!leaderKeys || leaderKeys.length === 0) && !department) {
    isLoadingGroupChanges.value = false
    return
  }
  try {
    let logs = []
    for (const key of leaderKeys) {
      if (!key) continue
      const result = await getHistory({
        leaderId: key,
        field: 'member_change'
      })
      if (Array.isArray(result) && result.length) {
        logs = result
        break
      }
    }
    if ((!logs || logs.length === 0) && department) {
      const deptLogs = await getHistory({
        department,
        field: 'member_change'
      })
      if (Array.isArray(deptLogs) && deptLogs.length) {
        logs = deptLogs
      }
    }
    groupChangeLogs.value = (logs || [])
      .map(parseMemberChangeLog)
      .filter(Boolean)
      .sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime()
        const timeB = new Date(b.timestamp || 0).getTime()
        return timeB - timeA
      })
      .slice(0, 10)
  } catch (error) {
    console.warn('加载组员变动信息失败:', error)
    uni.showToast({
      title: '变动信息加载失败',
      icon: 'none',
      duration: 2000
    })
  } finally {
    isLoadingGroupChanges.value = false
  }
}

const formatChangeLogTime = (timestamp) => {
  return formatHistoryTime(timestamp)
}

const handleShowGroupMembers = async (group) => {
  if (!group) return
  currentGroupSummary.value = resolveGroupSummary(group)
  currentGroupMembers.value = []
  groupChangeLogs.value = []
  showGroupMembersModal.value = true
  const leaderKeys = getLeaderLookupKeys(group)
  isLoadingGroupMembers.value = true
  try {
    const members = await ensureMembersForGroup(group)
    currentGroupMembers.value = members
    if (!members.length) {
      uni.showToast({
        title: '暂无组员信息',
        icon: 'none',
        duration: 2000
      })
    }
  } catch (error) {
    console.warn('加载组员信息失败:', error)
    uni.showToast({
      title: '获取组员失败',
      icon: 'none',
      duration: 2000
    })
  }
  isLoadingGroupMembers.value = false
  loadGroupChangeLogs(leaderKeys, currentGroupSummary.value.department)
}

const handleCloseGroupMembersModal = () => {
  showGroupMembersModal.value = false
  currentGroupMembers.value = []
  groupChangeLogs.value = []
}

// 加载组别列表（从出勤记录中提取部门信息，自动分组）
const loadGroups = async () => {
  console.log('开始加载组别列表...')
  
  // 优先从后端API获取分组数据
  try {
    const groups = await getAttendanceGroups()
    if (groups && groups.length > 0) {
      // 尝试获取所有用户列表，用于将leaderId转换为真实名字
      let allUsers = []
      try {
        allUsers = await getAllUsers()
        // 缓存用户列表，供后续使用
        uni.setStorageSync('allUsers', allUsers)
      } catch (userError) {
        console.warn('获取用户列表失败，将使用leaderId:', userError)
        // 尝试从本地缓存获取
        allUsers = uni.getStorageSync('allUsers') || []
      }
      
      // 转换后端数据格式为前端格式，并尝试获取组长真实名字
      groupList.value = groups.map(group => {
        let leaderName = group.leaderName || group.leaderId || ''
        
        // 如果leaderName是ID格式（如leader_xxx），尝试从用户列表中获取真实名字
        if (leaderName && leaderName.startsWith('leader_')) {
          const user = allUsers.find(u => u.userId === leaderName)
          if (user && user.nickName) {
            leaderName = user.nickName
          }
        }
        
        return {
          name: group.groupName || `${group.department}-${group.groupIndex}组`,
          department: group.department,
          leaderId: group.leaderId,
          leaderName: leaderName
        }
      })
      console.log('从后端加载分组成功:', groupList.value.length, '个分组')
      return
    }
  } catch (error) {
    console.error('从后端加载分组失败，使用本地数据:', error)
  }
  
  // 如果后端API失败，使用本地数据（作为备用）
  // 从出勤记录中提取所有唯一的部门名称和组长标识
  const recordsData = uni.getStorageSync('attendanceRecords') || {}
  
  // 处理对象格式或数组格式
  let records = []
  if (Array.isArray(recordsData)) {
    records = recordsData
  } else if (typeof recordsData === 'object') {
    records = Object.values(recordsData)
  }
  
  console.log(`找到 ${records.length} 条出勤记录`)
  
  // 按部门分组，统计每个部门下有多少个不同的组长
  const departmentLeadersMap = {} // { 部门名: Set([组长ID1, 组长ID2, ...]) }
  
  records.forEach(record => {
    if (record.department && record.department.trim() !== '') {
      const dept = record.department.trim()
      // 对于没有leaderId的旧记录，使用'unknown'作为默认值
      // 这样同一个部门的旧记录会被归为一组
      const leaderId = record.leaderId || 'unknown_legacy'
      
      if (!departmentLeadersMap[dept]) {
        departmentLeadersMap[dept] = new Set()
      }
      departmentLeadersMap[dept].add(leaderId)
      
      console.log(`记录: ${record.name}, 部门: ${dept}, 组长: ${leaderId}`)
    }
  })
  
  console.log('部门-组长映射:', Object.keys(departmentLeadersMap).map(dept => ({
    department: dept,
    leaders: Array.from(departmentLeadersMap[dept])
  })))
  
  // 生成组别列表
  const groups = []
  let groupIndex = 1
  
  Object.keys(departmentLeadersMap).forEach(dept => {
    const leaderIds = Array.from(departmentLeadersMap[dept])
    const leaderCount = leaderIds.length
    
    console.log(`部门 ${dept} 有 ${leaderCount} 个组长:`, leaderIds)
    
    // 尝试获取用户列表，用于将leaderId转换为真实名字
    let allUsers = uni.getStorageSync('allUsers') || []
    
    if (leaderCount === 1) {
      // 只有一个组长（或只有旧数据），直接显示部门名
      const leaderId = leaderIds[0]
      let leaderName = leaderId !== 'unknown_legacy' ? leaderId : '未知'
      
      // 如果leaderId是ID格式，尝试从用户列表中获取真实名字
      if (leaderId !== 'unknown_legacy' && leaderId.startsWith('leader_')) {
        const user = allUsers.find(u => u.userId === leaderId)
        if (user && user.nickName) {
          leaderName = user.nickName
        }
      }
      
      groups.push({
        name: dept,
        id: String(groupIndex++),
        department: dept,
        leaderId: leaderId,
        leaderName: leaderName
      })
      console.log(`创建单组: ${dept} (组长: ${leaderName})`)
    } else {
      // 多个组长，自动分组为"部门名-1组"、"部门名-2组"等
      // 将unknown_legacy放在最后，其他按出现顺序排序
      const sortedLeaderIds = leaderIds.sort((a, b) => {
        if (a === 'unknown_legacy') return 1
        if (b === 'unknown_legacy') return -1
        return 0
      })
      
      sortedLeaderIds.forEach((leaderId, index) => {
        const groupName = `${dept}-${index + 1}组`
        let leaderName = leaderId !== 'unknown_legacy' ? leaderId : '未知'
        
        // 如果leaderId是ID格式，尝试从用户列表中获取真实名字
        if (leaderId !== 'unknown_legacy' && leaderId.startsWith('leader_')) {
          const user = allUsers.find(u => u.userId === leaderId)
          if (user && user.nickName) {
            leaderName = user.nickName
          }
        }
        
        groups.push({
          name: groupName,
          id: String(groupIndex++),
          department: dept,
          leaderId: leaderId,
          leaderName: leaderName,
          groupNumber: index + 1 // 组号
        })
        console.log(`创建分组: ${groupName} (组长: ${leaderName})`)
      })
    }
  })
  
  if (groups.length > 0) {
    groupList.value = groups
    console.log(`✅ 最终生成 ${groups.length} 个组别:`, groups.map(g => `${g.name}(${g.leaderName})`))
  } else {
    // 如果没有部门信息，使用默认组别
    console.warn('⚠️ 没有找到部门信息，使用默认组别')
    groupList.value = [
      { name: '1组', id: '1' },
      { name: '2组', id: '2' }
    ]
  }
}

// 返回上一级
const handleBack = () => {
  uni.redirectTo({
    url: '/pages/index/index'
  })
}

// 打开提取所有信息的日期选择弹窗
const handleOpenExportAllDateModal = () => {
  showExportAllDateModal.value = true
}

// 关闭提取所有信息的日期选择弹窗
const handleCloseExportAllDateModal = () => {
  showExportAllDateModal.value = false
}

// 打开提取所有信息的开始日期选择器
const handleOpenExportAllStartDatePicker = () => {
  datePickerContext.value = 'exportAll'
  currentDatePickerType.value = 'start'
  if (exportAllStartDate.value) {
    const date = new Date(exportAllStartDate.value)
    currentYear.value = date.getFullYear()
    currentMonth.value = date.getMonth() + 1
  } else {
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
  }
  showDatePickerModal.value = true
}

// 打开提取所有信息的结束日期选择器
const handleOpenExportAllEndDatePicker = () => {
  datePickerContext.value = 'exportAll'
  currentDatePickerType.value = 'end'
  if (exportAllEndDate.value) {
    const date = new Date(exportAllEndDate.value)
    currentYear.value = date.getFullYear()
    currentMonth.value = date.getMonth() + 1
  } else {
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
  }
  showDatePickerModal.value = true
}

// 确认提取所有信息的日期选择
const handleConfirmExportAllDate = () => {
  if (!exportAllStartDate.value || !exportAllEndDate.value) {
    uni.showToast({
      title: '请选择开始日期和结束日期',
      icon: 'none',
      duration: 2000
    })
    return
  }
  if (exportAllStartDate.value > exportAllEndDate.value) {
    uni.showToast({
      title: '开始日期不能晚于结束日期',
      icon: 'none',
      duration: 2000
    })
    return
  }
  handleCloseExportAllDateModal()
  handleExportAll()
}

// 打开提取表格的日期选择弹窗
const handleOpenExportGroupDateModal = (group) => {
  currentExportGroup.value = { ...group, index: groupList.value.findIndex(g => g.name === group.name) }
  // 如果该组已有日期，使用已有日期
  if (!exportGroupDateMap.value[group.name]) {
    exportGroupDateMap.value[group.name] = {
      startDate: '',
      endDate: ''
    }
  }
  showExportGroupDateModal.value = true
}

// 关闭提取表格的日期选择弹窗
const handleCloseExportGroupDateModal = () => {
  showExportGroupDateModal.value = false
  currentExportGroup.value = null
}

// 打开提取表格的开始日期选择器
const handleOpenExportGroupStartDatePicker = () => {
  if (!currentExportGroup.value) return
  datePickerContext.value = 'exportGroup'
  currentDatePickerType.value = 'start'
  const dateInfo = exportGroupDateMap.value[currentExportGroup.value.name] || {}
  if (dateInfo.startDate) {
    const date = new Date(dateInfo.startDate)
    currentYear.value = date.getFullYear()
    currentMonth.value = date.getMonth() + 1
  } else {
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
  }
  showDatePickerModal.value = true
}

// 打开提取表格的结束日期选择器
const handleOpenExportGroupEndDatePicker = () => {
  if (!currentExportGroup.value) return
  datePickerContext.value = 'exportGroup'
  currentDatePickerType.value = 'end'
  const dateInfo = exportGroupDateMap.value[currentExportGroup.value.name] || {}
  if (dateInfo.endDate) {
    const date = new Date(dateInfo.endDate)
    currentYear.value = date.getFullYear()
    currentMonth.value = date.getMonth() + 1
  } else {
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
  }
  showDatePickerModal.value = true
}

// 打开上传打卡机数据的开始日期选择器
const handleOpenUploadStartDatePicker = () => {
  datePickerContext.value = 'upload'
  currentDatePickerType.value = 'start'
  if (uploadStartDate.value) {
    const date = new Date(uploadStartDate.value)
    currentYear.value = date.getFullYear()
    currentMonth.value = date.getMonth() + 1
  } else {
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
  }
  showDatePickerModal.value = true
}

// 打开上传打卡机数据的结束日期选择器
const handleOpenUploadEndDatePicker = () => {
  datePickerContext.value = 'upload'
  currentDatePickerType.value = 'end'
  if (uploadEndDate.value) {
    const date = new Date(uploadEndDate.value)
    currentYear.value = date.getFullYear()
    currentMonth.value = date.getMonth() + 1
  } else {
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
  }
  showDatePickerModal.value = true
}

// 确认提取表格的日期选择
const handleConfirmExportGroupDate = (groupName, groupIndex) => {
  const dateInfo = exportGroupDateMap.value[groupName]
  if (!dateInfo || !dateInfo.startDate || !dateInfo.endDate) {
    uni.showToast({
      title: '请选择开始日期和结束日期',
      icon: 'none',
      duration: 2000
    })
    return
  }
  if (dateInfo.startDate > dateInfo.endDate) {
    uni.showToast({
      title: '开始日期不能晚于结束日期',
      icon: 'none',
      duration: 2000
    })
    return
  }
  handleCloseExportGroupDateModal()
  handleExportGroup(groupName, groupIndex, dateInfo.startDate, dateInfo.endDate)
}

// 导出组别数据
const handleExportGroup = async (groupName, groupIndex, startDate, endDate) => {
  showExportProgress.value = true
  exportProgress.value = 0
  
  try {
    // 模拟导出进度
    const progressInterval = setInterval(() => {
      if (exportProgress.value < 90) {
        exportProgress.value += 10
      }
    }, 200)
    
    // 获取该组的数据
    const data = await getGroupData(groupName, groupIndex, startDate, endDate)
    
    // 检查数据是否为空
    if (!data || data.length === 0) {
      clearInterval(progressInterval)
      showExportProgress.value = false
      exportProgress.value = 0
      uni.showToast({
        title: '该日期范围内没有数据',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    console.log('📊 准备导出', data.length, '条数据')
    
    // 生成Excel
    await generateExcel(data, `${groupName}_${startDate}_${endDate}.xlsx`)
    
    clearInterval(progressInterval)
    exportProgress.value = 100
    
    setTimeout(() => {
      showExportProgress.value = false
      exportProgress.value = 0
      uni.showToast({
        title: '导出成功',
        icon: 'success',
        duration: 2000
      })
    }, 500)
    
  } catch (error) {
    showExportProgress.value = false
    exportProgress.value = 0
    uni.showToast({
      title: '导出失败',
      icon: 'none',
      duration: 2000
    })
  }
}

// 导出所有数据
const handleExportAll = async () => {
  showExportProgress.value = true
  exportProgress.value = 0
  
  try {
    const progressInterval = setInterval(() => {
      if (exportProgress.value < 90) {
        exportProgress.value += 10
      }
    }, 200)
    
    // 获取所有数据
    const data = await getAllData(exportAllStartDate.value, exportAllEndDate.value)
    
    // 检查数据是否为空
    if (!data || data.length === 0) {
      clearInterval(progressInterval)
      showExportProgress.value = false
      exportProgress.value = 0
      uni.showToast({
        title: '该日期范围内没有数据',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    console.log('📊 准备导出', data.length, '条数据')
    
    // 生成Excel
    await generateExcel(data, `全部数据_${exportAllStartDate.value}_${exportAllEndDate.value}.xlsx`)
    
    clearInterval(progressInterval)
    exportProgress.value = 100
    
    setTimeout(() => {
      showExportProgress.value = false
      exportProgress.value = 0
      uni.showToast({
        title: '导出成功',
        icon: 'success',
        duration: 2000
      })
    }, 500)
    
  } catch (error) {
    console.error('❌ 导出全部数据失败:', error)
    showExportProgress.value = false
    exportProgress.value = 0
    uni.showToast({
      title: '导出失败: ' + (error.message || '未知错误'),
      icon: 'none',
      duration: 3000
    })
  }
}

const loadLocalAttendanceRecords = () => {
  const recordsData = uni.getStorageSync('attendanceRecords') || []
  if (Array.isArray(recordsData)) {
    return recordsData
  }
  if (typeof recordsData === 'object') {
    return Object.values(recordsData)
  }
  return []
}

const extractDatePart = (timeStr) => {
  if (!timeStr) return ''
  if (timeStr.includes('T')) {
    return timeStr.split('T')[0]
  }
  return timeStr.split(' ')[0] || timeStr
}

const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return ''
  
  // 如果已经是 "YYYY-MM-DD HH:mm" 格式，直接返回
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(timeStr)) {
    return timeStr
  }
  
  // 如果是 ISO 格式（包含 'T'），转换为 "YYYY-MM-DD HH:mm" 格式
  if (timeStr.includes('T')) {
    const date = new Date(timeStr)
    if (!Number.isNaN(date.getTime())) {
      const pad = (num) => String(num).padStart(2, '0')
      const yyyy = date.getFullYear()
      const mm = pad(date.getMonth() + 1)
      const dd = pad(date.getDate())
      const hh = pad(date.getHours())
      const min = pad(date.getMinutes())
      return `${yyyy}-${mm}-${dd} ${hh}:${min}`
    }
  }
  
  // 如果是旧的 "HH:mm" 格式，返回原值（兼容旧数据）
  return timeStr
}

// 格式化提交时间为北京时间（确保显示为本地时间）
const formatSubmittedTime = (timeStr) => {
  if (!timeStr) return ''
  
  // 如果已经是 "YYYY-MM-DD HH:MM" 格式（本地时间），直接返回
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(timeStr)) {
    return timeStr
  }
  
  // 如果是 ISO 格式（包含 'T'），需要特殊处理
  // 后端可能把北京时间当作UTC存储，导致显示时多出8小时
  if (timeStr.includes('T')) {
    const date = new Date(timeStr)
    if (!Number.isNaN(date.getTime())) {
      const pad = (num) => String(num).padStart(2, '0')
      
      // 检查是否是UTC时间格式（以Z结尾）
      // 后端现在正确返回ISO UTC格式，直接转换为本地时间显示
      if (timeStr.endsWith('Z')) {
        // 直接使用本地时间（Date对象会自动转换UTC到本地时区）
        const yyyy = date.getFullYear()
        const mm = pad(date.getMonth() + 1)
        const dd = pad(date.getDate())
        const hh = pad(date.getHours())
        const min = pad(date.getMinutes())
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`
      }
      
      // 非UTC格式的ISO时间，使用本地时间方法，自动转换为北京时间（UTC+8）
      const yyyy = date.getFullYear()
      const mm = pad(date.getMonth() + 1)
      const dd = pad(date.getDate())
      const hh = pad(date.getHours())
      const min = pad(date.getMinutes())
      return `${yyyy}-${mm}-${dd} ${hh}:${min}`
    }
  }
  
  // 其他格式，尝试解析
  try {
    const date = new Date(timeStr)
    if (!Number.isNaN(date.getTime())) {
      const pad = (num) => String(num).padStart(2, '0')
      const yyyy = date.getFullYear()
      const mm = pad(date.getMonth() + 1)
      const dd = pad(date.getDate())
      const hh = pad(date.getHours())
      const min = pad(date.getMinutes())
      return `${yyyy}-${mm}-${dd} ${hh}:${min}`
    }
  } catch (e) {
    console.warn('解析提交时间失败:', timeStr, e)
  }
  
  return timeStr
}

const formatDurationDisplay = (duration) => {
  if (duration === undefined || duration === null || duration === '') return ''
  if (typeof duration === 'string' && duration.includes('小时')) {
    return duration
  }
  const minutes = Number(duration)
  if (Number.isNaN(minutes)) {
    return duration
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) {
    return `${mins}分钟`
  }
  return mins ? `${hours}小时${mins}分钟` : `${hours}小时`
}

const filterRecordsByGroup = (records, group) => {
  return records.filter(record => {
    if (!record.name || !record.startTime || !record.endTime) {
      return false
    }
    if (group.department && record.department !== group.department) {
      return false
    }
    if (group.leaderId && group.leaderId !== 'unknown_legacy') {
      const recordLeaderId = record.leaderId || 'unknown_legacy'
      if (recordLeaderId !== group.leaderId) {
        return false
      }
    }
    return true
  })
}

const filterRecordsByDate = (records, startDate, endDate) => {
  if (!startDate || !endDate) return records
  return records.filter(record => {
    const recordDate = extractDatePart(record.startTime)
    if (!recordDate) return false
    return recordDate >= startDate && recordDate <= endDate
  })
}

const convertToExcelRows = (records, fallbackDepartment = '') => {
  const shiftTextMap = {
    day: '白班',
    night: '夜班'
  }
  
  // 计算总出勤工时（所有记录的duration总和，单位：小时）
  let totalMinutes = 0
  records.forEach(record => {
    const duration = record.duration
    if (duration !== undefined && duration !== null && duration !== '') {
      // 如果已经是格式化字符串（包含"小时"），需要解析
      if (typeof duration === 'string' && duration.includes('小时')) {
        const hourMatch = duration.match(/(\d+)小时/)
        const minMatch = duration.match(/(\d+)分钟/)
        const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0
        const mins = minMatch ? parseInt(minMatch[1], 10) : 0
        totalMinutes += hours * 60 + mins
      } else {
        // 直接是分钟数
        const minutes = Number(duration)
        if (!Number.isNaN(minutes) && minutes > 0) {
          totalMinutes += minutes
        }
      }
    }
  })
  
  // 转换为小时（保留2位小数）
  const totalHours = (totalMinutes / 60).toFixed(2)
  
  return records.map(record => ({
    '姓名': record.name,
    '班次': shiftTextMap[record.shiftType] || '',
    '部门': record.department || fallbackDepartment || '',
    '上班时间（组长选择）': formatTimeDisplay(record.startTime),
    '下班时间（组长选择）': formatTimeDisplay(record.endTime),
    '出勤时长': formatDurationDisplay(record.duration),
    '提交时间（系统时间）': formatSubmittedTime(record.submittedAt) || '',
    '总出勤工时': `${totalHours}小时`
  }))
}

const buildMemberExportRows = (group = {}, members = []) => {
  const summary = resolveGroupSummary(group)
  return members.map(member => ({
    '组别': summary.name || '',
    '部门': summary.department || '',
    '组长': summary.leaderName || '',
    '组员': member.name || '',
    '班次': formatShiftLabel(member.shiftType || 'day')
  }))
}

let cachedXLSX = null
const loadXLSX = async () => {
  if (cachedXLSX) return cachedXLSX
  // #ifdef MP-WEIXIN
  // 分包内同步 require，避免 xlsx 被打入主包 vendor.js
  // eslint-disable-next-line
  const mod = require('./libs/xlsx-esm.js')
  cachedXLSX = mod?.default || mod
  return cachedXLSX
  // #endif

  // #ifndef MP-WEIXIN
  const XLSXModule = await import('xlsx')
  cachedXLSX = XLSXModule.default || XLSXModule
  return cachedXLSX
  // #endif
}

const arrayBufferToUtf8 = (buffer) => {
  if (!buffer) return ''
  if (typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder('utf-8').decode(buffer instanceof ArrayBuffer ? buffer : buffer.buffer)
    } catch (error) {
      console.warn('TextDecoder解码失败，使用手动方法', error)
    }
  }
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let str = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    str += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize))
  }
  try {
    return decodeURIComponent(escape(str))
  } catch (error) {
    console.warn('decodeURIComponent 失败，返回原始字符串', error)
    return str
  }
}

const decodeXmlEntities = (text) => {
  if (text === undefined || text === null) return ''
  return String(text)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

const parseSpreadsheetMLString = (xmlString) => {
  if (!xmlString || typeof xmlString !== 'string') return []
  const trimmed = xmlString.trim()
  if (!trimmed.includes('<Workbook')) return []

  const rowRegex = /<Row[^>]*>([\s\S]*?)<\/Row>/g
  const cellRegex = /<Cell[^>]*>([\s\S]*?)<\/Cell>/g
  const dataRegex = /<Data[^>]*>([\s\S]*?)<\/Data>/
  const rows = []
  let headers = []
  let rowIndex = 0
  let rowMatch

  while ((rowMatch = rowRegex.exec(trimmed)) !== null) {
    const rowContent = rowMatch[1]
    const cells = []
    let cellMatch
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const cellContent = cellMatch[1]
      const dataMatch = cellContent.match(dataRegex)
      const cellValue = dataMatch ? decodeXmlEntities(dataMatch[1]) : ''
      cells.push(cellValue)
    }
    if (cells.length === 0) continue
    if (rowIndex === 0) {
      headers = cells
    } else {
      const rowObj = {}
      headers.forEach((header, idx) => {
        const key = header || `列${idx + 1}`
        rowObj[key] = cells[idx] || ''
      })
      rows.push(rowObj)
    }
    rowIndex++
  }

  return rows
}

const parseSpreadsheetMLBuffer = (buffer) => {
  try {
    const utf8String = arrayBufferToUtf8(buffer instanceof ArrayBuffer ? buffer : buffer.buffer || buffer)
    return parseSpreadsheetMLString(utf8String)
  } catch (error) {
    console.warn('解析SpreadsheetML失败:', error)
    return []
  }
}

const retrieveRecordsForGroup = async (group) => {
  const localRecords = loadLocalAttendanceRecords()
  const localFiltered = filterRecordsByGroup(localRecords, group)

  if (group.leaderId && group.leaderId !== 'unknown_legacy') {
    try {
      const response = await getAttendanceRecords(group.leaderId)
      const remoteRecords = (response?.records || []).map(item => ({
        name: item.name || item.memberName || '',
        department: item.department || group.department || '',
        leaderId: group.leaderId,
        startTime: item.startTime,
        endTime: item.endTime,
        duration: item.duration,
        // 班次类型：优先使用后端返回的 shiftType，其次兼容可能的字段名
        shiftType: item.shiftType || item.shift || '',
        submittedAt: item.submittedAt
      }))
      console.log(`✅ 从后端获取到 ${remoteRecords.length} 条记录 (leaderId: ${group.leaderId})`)
      return remoteRecords
    } catch (error) {
      console.warn(`⚠️ 从后端获取组别数据失败，将使用本地缓存 (leaderId: ${group.leaderId})`, error)
      return localFiltered
    }
  }

  return localFiltered
}

// 获取组别数据（根据组别信息过滤）
const getGroupData = async (groupName, groupIndex, startDate, endDate) => {
  const currentGroup = groupList.value[groupIndex]
  if (!currentGroup) {
    console.error('❌ 未找到组别信息，groupIndex:', groupIndex)
    return []
  }

  console.log('📊 开始过滤组别数据:', {
    groupName,
    groupIndex,
    department: currentGroup.department,
    leaderId: currentGroup.leaderId,
    startDate,
    endDate
  })

  const sourceRecords = await retrieveRecordsForGroup(currentGroup)
  const dateFiltered = filterRecordsByDate(sourceRecords, startDate, endDate)

  console.log('✅ 过滤完成，找到', dateFiltered.length, '条记录')

  return convertToExcelRows(dateFiltered, currentGroup.department)
}

const handleExportGroupMembers = async (group) => {
  if (!group) {
    uni.showToast({
      title: '未找到组别',
      icon: 'none'
    })
    return
  }
  uni.showLoading({
    title: '导出中...',
    mask: true
  })
  try {
    const members = await ensureMembersForGroup(group)
    if (!members || members.length === 0) {
      uni.showToast({
        title: '暂无组员信息',
        icon: 'none'
      })
      return
    }
    const dataset = buildMemberExportRows(group, members)
    const summary = resolveGroupSummary(group)
    await generateExcel(dataset, `${summary.name || '组别'}_组员信息_${formatDate(new Date())}.xlsx`)
    uni.showToast({
      title: '导出成功',
      icon: 'success'
    })
  } catch (error) {
    console.error('导出组员信息失败:', error)
    uni.showToast({
      title: '导出失败',
      icon: 'none'
    })
  } finally {
    hideLoadingSilently()
  }
}

// 获取所有数据
const getAllData = async (startDate, endDate) => {
  const groups = groupList.value || []
  let aggregated = []

  if (groups.length > 0) {
    for (const group of groups) {
      const records = await retrieveRecordsForGroup(group)
      const dateFiltered = filterRecordsByDate(records, startDate, endDate)
      aggregated = aggregated.concat(dateFiltered)
    }
  }

  if (aggregated.length === 0) {
    const localRecords = loadLocalAttendanceRecords()
    aggregated = filterRecordsByDate(localRecords, startDate, endDate)
  }

  console.log('✅ 全量数据过滤完成，找到', aggregated.length, '条记录')

  return convertToExcelRows(aggregated)
}

const handleExportAllGroupMembers = async () => {
  if (!groupList.value.length) {
    uni.showToast({
      title: '暂无组别可导出',
      icon: 'none'
    })
    return
  }
  uni.showLoading({
    title: '导出中...',
    mask: true
  })
  try {
    await refreshLeaderMembersCache()
    let dataset = []
    for (const group of groupList.value) {
      const members = await ensureMembersForGroup(group)
      if (members && members.length) {
        dataset = dataset.concat(buildMemberExportRows(group, members))
      }
    }
    if (!dataset.length) {
      uni.showToast({
        title: '暂无组员信息',
        icon: 'none'
      })
      return
    }
    await generateExcel(dataset, `全部组员信息_${formatDate(new Date())}.xlsx`)
    uni.showToast({
      title: '导出成功',
      icon: 'success'
    })
  } catch (error) {
    console.error('导出全部组员信息失败:', error)
    uni.showToast({
      title: '导出失败',
      icon: 'none'
    })
  } finally {
    hideLoadingSilently()
  }
}

const buildSpreadsheetXml = (data) => {
  if (!data || data.length === 0) {
    return ''
  }

  const headers = Object.keys(data[0])
  const escapeXml = (value) => {
    if (value === null || value === undefined) return ''
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const headerRow = `<Row>${headers.map(header => `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`).join('')}</Row>`

  const dataRows = data.map(row => {
    const cells = headers.map(header => {
      const value = row[header]
      const type = typeof value === 'number' ? 'Number' : 'String'
      return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`
    }).join('')
    return `<Row>${cells}</Row>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ` +
    `xmlns:o="urn:schemas-microsoft-com:office:office" ` +
    `xmlns:x="urn:schemas-microsoft-com:office:excel" ` +
    `xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Worksheet ss:Name="出勤数据">` +
    `<Table>${headerRow}${dataRows}</Table>` +
    `</Worksheet>` +
    `</Workbook>`
}

// 生成Excel文件
const generateExcel = async (data, fileName) => {
  // #ifdef H5
  // H5模式下使用xlsx库
  const XLSX = await loadXLSX()
  // 创建工作簿
  const wb = XLSX.utils.book_new()
  
  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(data)
  
  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '出勤数据')
  
  // 导出文件
  XLSX.writeFile(wb, fileName)
  console.log(`✅ Excel文件已下载: ${fileName}`)
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序使用SpreadsheetML写入xls文件
  try {
    if (!data || data.length === 0) {
      throw new Error('没有可以导出的数据')
    }

    const xmlContent = buildSpreadsheetXml(data)
    if (!xmlContent) {
      throw new Error('生成文件内容失败')
    }

    // 使用带时间戳和随机码的文件名，避免同名文件被系统锁定导致 EBUSY
    const safeName = fileName.replace(/\.xlsx$/i, '.xls')
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const filePath = `${wx.env.USER_DATA_PATH}/${uniqueSuffix}_${safeName}`

    const fs = wx.getFileSystemManager()
    fs.writeFileSync(filePath, xmlContent, 'utf8')

    console.log(`✅ XLS文件已保存: ${filePath}`)

    uni.showModal({
      title: '导出成功',
      content: `Excel文件已保存到：${filePath}\n是否打开文件？`,
      showCancel: true,
      confirmText: '打开',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openDocument({
            filePath,
            success: () => {
              console.log('打开文件成功')
            },
            fail: (err) => {
              console.error('打开文件失败:', err)
              uni.showToast({
                title: '打开文件失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  } catch (error) {
    console.error('❌ 小程序导出Excel失败:', error)
    throw new Error('导出失败: ' + (error.message || '未知错误'))
  }
  // #endif
}

// 上传打卡机数据
const handleUploadData = async () => {
  showUploadModal.value = true
  selectedFile.value = null
  selectedFileName.value = ''
}

// 关闭上传弹窗
const handleCloseUploadModal = () => {
  showUploadModal.value = false
  selectedFile.value = null
  selectedFileName.value = ''
  uploadStartDate.value = ''
  uploadEndDate.value = ''
}

// 选择文件
const handleSelectFile = () => {
  // #ifdef H5
  // H5模式下使用input file
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      selectedFile.value = file
      selectedFileName.value = file.name
    }
  }
  input.click()
  // #endif
  
  // #ifdef MP-WEIXIN
  // 当前小程序端暂不支持解析本地 Excel，请引导用户使用 H5 端上传
  uni.showModal({
    title: '暂不支持',
    content: '小程序端暂不支持上传并解析打卡机 Excel 文件，请在电脑浏览器打开 H5 页面，在设置页进行上传。',
    showCancel: false,
    confirmText: '我知道了'
  })
  // #endif
}

// 确认上传
const handleConfirmUpload = async () => {
  if (!selectedFile.value) {
    uni.showToast({
      title: '请选择文件',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  // 验证日期范围
  if (!uploadStartDate.value || !uploadEndDate.value) {
    uni.showToast({
      title: '请选择日期范围',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  if (uploadStartDate.value > uploadEndDate.value) {
    uni.showToast({
      title: '开始日期不能晚于结束日期',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  uni.showLoading({
    title: '上传中...',
    mask: true
  })
  
  try {
    console.log('开始读取Excel文件...')
    // 读取Excel文件
    const uploadData = await readExcelFile(selectedFile.value)
    console.log('Excel文件读取成功，数据条数:', uploadData.length)
    console.log('数据示例:', uploadData[0])
    
    if (!uploadData || uploadData.length === 0) {
      throw new Error('Excel文件中没有数据')
    }
    
    // 比对数据并检测异常（传递日期范围）
    const { anomalies, stats } = await compareData(uploadData, uploadStartDate.value, uploadEndDate.value)
    
    // 生成检测记录文件并下载
    await generateAndDownloadAnomalyReport(uploadData, anomalies)
    
    hideLoadingSilently()
    handleCloseUploadModal()
    
    // 显示异常数据结果
    anomalyList.value = anomalies
    showAnomalyModal.value = true
    
    if (anomalies.length === 0) {
      uni.showToast({
        title: '未发现异常数据，检测记录已下载',
        icon: 'success',
        duration: 2000
      })
    } else {
      uni.showToast({
        title: `发现 ${anomalies.length} 条异常，已生成报告`,
        icon: 'none',
        duration: 2500
      })
    }
    
  } catch (error) {
    console.error('上传失败:', error)
    hideLoadingSilently()
    uni.showToast({
      title: '上传失败：' + (error.message || '未知错误'),
      icon: 'none',
      duration: 3000
    })
  }
}

// 读取Excel文件
const readExcelFile = async (file) => {
  // #ifdef H5
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const XLSX = await loadXLSX()
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('Excel文件中没有工作表'))
          return
        }
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        
        // 使用 defval: '' 确保空单元格也有值，避免数据丢失
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
          defval: '',
          raw: false // 将数字转换为字符串，便于处理
        })
        
        console.log('Excel解析成功，数据条数:', jsonData.length)
        console.log('Excel列名:', Object.keys(jsonData[0] || {}))
        
        if (jsonData.length === 0) {
          reject(new Error('Excel文件中没有数据'))
          return
        }
        
        resolve(jsonData)
      } catch (error) {
        console.error('Excel解析错误:', error)
        const fallbackData = parseSpreadsheetMLBuffer(e.target.result)
        if (fallbackData && fallbackData.length > 0) {
          console.log('使用SpreadsheetML解析成功，数据条数:', fallbackData.length)
          resolve(fallbackData)
          return
        }
        reject(new Error('文件格式错误: ' + error.message))
      }
    }
    reader.onerror = () => {
      console.error('文件读取失败')
      reject(new Error('文件读取失败'))
    }
    reader.readAsArrayBuffer(file)
  })
  // #endif
  
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: file.path,
      success: async (res) => {
        try {
          const XLSX = await loadXLSX()
          const data = new Uint8Array(res.data)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false })
          if (!jsonData || jsonData.length === 0) {
            throw new Error('Excel文件中没有数据')
          }
          resolve(jsonData)
        } catch (error) {
          console.warn('xlsx解析失败，尝试解析SpreadsheetML:', error)
          const fallbackData = parseSpreadsheetMLBuffer(res.data)
          if (fallbackData && fallbackData.length > 0) {
            console.log('使用SpreadsheetML解析成功，数据条数:', fallbackData.length)
            resolve(fallbackData)
            return
          }
          reject(new Error('文件格式错误'))
        }
      },
      fail: () => reject(new Error('文件读取失败'))
    })
  })
  // #endif
}

// 比对数据并检测异常
const compareData = async (uploadData, startDate = '', endDate = '') => {
  console.log('开始比对数据，上传数据条数:', uploadData.length)
  console.log('上传数据示例:', uploadData[0])
  console.log('日期范围:', { startDate, endDate })
  
  const anomalies = []
  const stats = {
    teamName: detectTeamNameFromUpload(uploadData) || '',
    shouldCheckinCount: 0,
    actualCheckinCount: 0,
    lateCount: 0
  }
  
  // 辅助函数：从时间字符串中提取日期（YYYY-MM-DD格式）
  const extractDateFromTime = (timeStr) => {
    if (!timeStr) return ''
    // 如果是 "YYYY-MM-DD HH:mm" 格式
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(timeStr)) {
      return timeStr.split(' ')[0]
    }
    // 如果是 ISO 格式
    if (timeStr.includes('T')) {
      try {
        const date = new Date(timeStr)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } catch (e) {
        return ''
      }
    }
    return ''
  }
  
  // 辅助函数：判断日期是否在范围内
  const isDateInRange = (dateStr) => {
    if (!startDate || !endDate) return true // 如果没有日期范围，不过滤
    if (!dateStr) return false
    return dateStr >= startDate && dateStr <= endDate
  }
  
  // 1. 从本地存储获取手动填写记录
  const manualRecordsData = uni.getStorageSync('attendanceRecords') || {}
  let manualRecords = []
  if (Array.isArray(manualRecordsData)) {
    manualRecords = manualRecordsData
  } else if (typeof manualRecordsData === 'object') {
    manualRecords = Object.values(manualRecordsData)
  }
  console.log('本地手动填写记录条数:', manualRecords.length)
  
  // 2. 从后端获取所有组别的出勤记录
  let backendRecords = []
  try {
    const groups = groupList.value || []
    console.log('开始从后端获取出勤记录，组别数量:', groups.length)
    
    for (const group of groups) {
      if (group.leaderId && group.leaderId !== 'unknown_legacy') {
        try {
          const response = await getAttendanceRecords(group.leaderId)
          const records = (response?.records || [])
            .map(item => ({
              name: item.name || item.memberName || '',
              department: item.department || group.department || '',
              leaderId: group.leaderId,
              startTime: item.startTime,
              endTime: item.endTime,
              duration: item.duration,
              recordDate: item.recordDate || extractDateFromTime(item.startTime) // 使用recordDate字段，如果没有则从startTime提取
            }))
            // 根据日期范围过滤记录
            .filter(item => {
              const recordDate = item.recordDate || extractDateFromTime(item.startTime)
              return isDateInRange(recordDate)
            })
          backendRecords = backendRecords.concat(records)
          console.log(`✅ 从后端获取到 ${records.length} 条记录 (leaderId: ${group.leaderId})，日期范围: ${startDate} ~ ${endDate}`)
        } catch (error) {
          console.warn(`⚠️ 从后端获取组别数据失败 (leaderId: ${group.leaderId})`, error)
        }
      }
    }
    console.log('后端出勤记录总数（已过滤）:', backendRecords.length)
  } catch (error) {
    console.warn('⚠️ 从后端获取出勤记录失败，将仅使用本地记录', error)
  }
  
  // 3. 合并本地和后端记录（后端记录优先），并根据日期范围过滤本地记录
  const allRecords = [...backendRecords]
  // 添加本地记录中不在后端记录中的，且日期在范围内的
  manualRecords.forEach(localRecord => {
    if (!allRecords.find(r => r.name === localRecord.name)) {
      // 从本地记录的startTime中提取日期
      const recordDate = extractDateFromTime(localRecord.startTime)
      if (isDateInRange(recordDate)) {
        allRecords.push({
          ...localRecord,
          recordDate
        })
      }
    }
  })
  console.log('合并后的总记录数（已过滤）:', allRecords.length)
  
  uploadData.forEach((uploadItem, index) => {
    const name = uploadItem['姓名'] || uploadItem['name'] || uploadItem['Name']
    const uploadTime = uploadItem['出勤时间'] || uploadItem['attendanceTime'] || uploadItem['Attendance Time']
    // 尝试从上传数据中提取日期（可能有的字段：日期、date、Date、出勤日期等）
    const uploadDate = uploadItem['日期'] || uploadItem['date'] || uploadItem['Date'] || uploadItem['出勤日期'] || ''
    
    if (name) {
      stats.shouldCheckinCount++
    }
    
    console.log(`处理第 ${index + 1} 条数据:`, { name, uploadTime, uploadDate })
    
    if (!name) {
      console.warn(`第 ${index + 1} 条数据缺少姓名，跳过`)
      return
    }
    
    if (uploadTime === undefined || uploadTime === null || uploadTime === '') {
      console.warn(`第 ${index + 1} 条数据（${name}）缺少出勤时间，跳过`)
      return
    }
    
    // 查找对应的记录（优先从后端记录，再从本地记录）
    const record = allRecords.find(r => r.name === name)
    
    // 如果上传数据有日期字段，检查是否在范围内
    if (uploadDate) {
      const normalizedUploadDate = extractDateFromTime(uploadDate) || uploadDate.split(' ')[0] || uploadDate
      if (!isDateInRange(normalizedUploadDate)) {
        console.log(`第 ${index + 1} 条数据（${name}）日期 ${normalizedUploadDate} 不在范围内，跳过`)
        return
      }
    }
    
    if (!record) {
      console.warn(`未找到 ${name} 的出勤记录，跳过`)
      return
    }
    
    // 如果上传数据没有日期字段，使用匹配的出勤记录的日期来判断
    if (!uploadDate) {
      const recordDate = record.recordDate || extractDateFromTime(record.startTime)
      if (!isDateInRange(recordDate)) {
        console.log(`第 ${index + 1} 条数据（${name}）对应的记录日期 ${recordDate} 不在范围内，跳过`)
        return
      }
    }
    
    if (!record.startTime) {
      console.warn(`${name} 的出勤记录缺少上班时间，跳过`)
      return
    }
    
    // 解析上传的出勤时间（支持时长描述、HH:mm、纯数字/小数小时）
    const parsedUpload = normalizeUploadDuration(uploadTime)
    if (parsedUpload.minutes === null) {
      console.warn(`${name} 的出勤时间格式无法识别: ${uploadTime}`)
      return
    }
    const uploadDurationMinutes = parsedUpload.minutes
    console.log(`${name} 上传的出勤时间(${parsedUpload.source}): ${uploadTime} = ${uploadDurationMinutes}分钟`)
    
    // 解析记录中的出勤时长
    const recordDurationMinutes = parseDuration(record.duration)
    console.log(`${name} 记录中的出勤时长: ${record.duration} = ${recordDurationMinutes}分钟`)
    stats.actualCheckinCount++
    
    // 异常1：检查上班时间是否在早上8:00以后（仅白班检查）
    // 获取组员的班次类型
    const teamMembers = uni.getStorageSync('teamMembers') || []
    const memberInfo = Array.isArray(teamMembers) 
      ? teamMembers.find(m => m.name === name)
      : null
    const shiftType = memberInfo?.shiftType || record.shiftType || 'day' // 优先从组员信息获取，其次从记录获取，默认白班
    
    console.log(`${name} 的班次类型: ${shiftType}, 上班时间: ${record.startTime}`)
    
    // 只有白班才检查早上8:00以后的异常
    if (shiftType === 'day') {
      const recordStartTimeObj = parseTime(record.startTime)
      console.log(`${name} 解析后的上班时间:`, recordStartTimeObj)
      
      // 检查是否晚于8:00（hour > 8 或 hour == 8 && minute > 0）
      if (recordStartTimeObj) {
        const isLate = recordStartTimeObj.hour > 8 || 
                       (recordStartTimeObj.hour === 8 && recordStartTimeObj.minute > 0)
        
        if (isLate) {
          anomalies.push({
            name: name,
            reason: '上班时间晚于8:00',
            startTime: record.startTime, // 显示记录中的上班时间
            manualDuration: record.duration,
            uploadDuration: formatDuration(uploadDurationMinutes)
          })
          stats.lateCount++
          console.log(`✅ 检测到异常: ${name} 上班时间晚于8:00 (${record.startTime})`)
        } else {
          console.log(`${name} 上班时间正常 (${record.startTime})`)
        }
      } else {
        console.warn(`${name} 无法解析上班时间: ${record.startTime}`)
      }
    } else {
      console.log(`${name} 是夜班，跳过早上8:00检查`)
    }
    
    // 异常2：出勤时长相差一小时以上
    const diff = Math.abs(recordDurationMinutes - uploadDurationMinutes)
    if (diff >= 60) {
      anomalies.push({
        name: name,
        reason: '出勤时长差异超过1小时',
        startTime: record.startTime,
        manualDuration: record.duration,
        uploadDuration: formatDuration(uploadDurationMinutes)
      })
      console.log(`✅ 检测到异常: ${name} 出勤时长差异 ${diff}分钟（超过1小时）`)
    }
  })
  
  console.log(`比对完成，共检测到 ${anomalies.length} 条异常数据`)
  return {
    anomalies,
    stats
  }
}

// 解析时间字符串（支持多种格式：HH:mm、ISO格式等）
const parseTime = (timeStr) => {
  if (!timeStr) {
    return null
  }
  
  // 如果是字符串格式
  if (typeof timeStr === 'string') {
    // 1. 尝试解析为 ISO 格式（如 "2025-11-18T08:00:00.000Z"）
    if (timeStr.includes('T') || timeStr.includes('Z')) {
      try {
        const date = new Date(timeStr)
        if (!isNaN(date.getTime())) {
          return {
            hour: date.getHours(),
            minute: date.getMinutes()
          }
        }
      } catch (e) {
        console.warn('解析ISO时间格式失败:', timeStr, e)
      }
    }
    
    // 2. 尝试解析为 HH:mm 格式（如 "08:00"）
    const match = timeStr.match(/(\d{1,2}):(\d{2})/)
    if (match) {
      const hour = parseInt(match[1])
      const minute = parseInt(match[2])
      if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
        return {
          hour: hour,
          minute: minute
        }
      }
    }
  }
  
  // 如果是 Date 对象
  if (timeStr instanceof Date) {
    return {
      hour: timeStr.getHours(),
      minute: timeStr.getMinutes()
    }
  }
  
  console.warn('无法解析时间格式:', timeStr)
  return null
}

// 格式化时间
const formatTime = (timeObj) => {
  return `${String(timeObj.hour).padStart(2, '0')}:${String(timeObj.minute).padStart(2, '0')}`
}

// 计算出勤时长（分钟）
const calculateUploadDuration = (startTime) => {
  // 简化处理：假设标准下班时间为17:30
  const endHour = 17
  const endMinute = 30
  const startTotalMinutes = startTime.hour * 60 + startTime.minute
  const endTotalMinutes = endHour * 60 + endMinute
  
  if (endTotalMinutes <= startTotalMinutes) {
    // 夜班
    return (24 * 60 - startTotalMinutes) + endTotalMinutes
  }
  return endTotalMinutes - startTotalMinutes
}

// 解析时长为分钟数（支持字符串格式如"12小时"或数字格式如720）
const parseDuration = (duration) => {
  if (!duration && duration !== 0) return 0
  
  // 如果已经是数字，直接返回
  if (typeof duration === 'number') {
    return duration
  }
  
  // 如果是字符串，尝试解析
  if (typeof duration === 'string') {
    const match = duration.match(/(\d+)小时(?:(\d+)分钟)?/)
    if (match) {
      const hours = parseInt(match[1]) || 0
      const minutes = parseInt(match[2]) || 0
      return hours * 60 + minutes
    }
    // 如果字符串是纯数字，尝试转换为数字
    const numValue = parseInt(duration, 10)
    if (!isNaN(numValue)) {
      return numValue
    }
  }
  
  return 0
}

// 解析上传的出勤时间，返回分钟数（支持"9小时"、"08:00"、11.5等格式）
const normalizeUploadDuration = (value) => {
  if (value === undefined || value === null || value === '') {
    return { minutes: null, source: 'empty' }
  }
  
  // 如果是数字，视为小时，支持小数
  if (typeof value === 'number') {
    return {
      minutes: Math.round(value * 60),
      source: 'decimal-number'
    }
  }
  
  const text = String(value).trim()
  if (text === '') {
    return { minutes: null, source: 'empty-string' }
  }
  
  // 先尝试解析中文时长（X小时Y分钟）
  const durationMatch = text.match(/(\d+)小时(?:(\d+)分钟)?/)
  if (durationMatch) {
    const hours = parseInt(durationMatch[1]) || 0
    const minutes = parseInt(durationMatch[2]) || 0
    return {
      minutes: hours * 60 + minutes,
      source: 'text-duration'
    }
  }
  
  // 纯数字或带小数（例如 11.5、12、12.25）
  const decimalMatch = text.match(/^\d+(\.\d+)?$/)
  if (decimalMatch) {
    const decimalHours = parseFloat(text)
    if (!isNaN(decimalHours)) {
      return {
        minutes: Math.round(decimalHours * 60),
        source: 'decimal-string'
      }
    }
  }
  
  // HH:mm 或 ISO 等时间格式，按上班时间推算时长
  const timeObj = parseTime(text)
  if (timeObj && (timeObj.hour > 0 || timeObj.minute > 0)) {
    return {
      minutes: calculateUploadDuration(timeObj),
      source: 'start-time'
    }
  }
  
  return { minutes: null, source: 'invalid' }
}

// 格式化时长为字符串
const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}小时`
  }
  return `${hours}小时${mins}分钟`
}

// 生成并下载检测记录文件
const generateAndDownloadAnomalyReport = async (uploadData, anomalies) => {
  console.log('开始生成检测记录文件...')
  
  // 1. 从本地存储获取手动填写记录
  const manualRecordsData = uni.getStorageSync('attendanceRecords') || {}
  let manualRecords = []
  if (Array.isArray(manualRecordsData)) {
    manualRecords = manualRecordsData
  } else if (typeof manualRecordsData === 'object') {
    manualRecords = Object.values(manualRecordsData)
  }
  
  // 2. 从后端获取所有组别的出勤记录
  let backendRecords = []
  try {
    const groups = groupList.value || []
    for (const group of groups) {
      if (group.leaderId && group.leaderId !== 'unknown_legacy') {
        try {
          const response = await getAttendanceRecords(group.leaderId)
          const records = (response?.records || []).map(item => ({
            name: item.name || item.memberName || '',
            department: item.department || group.department || '',
            leaderId: group.leaderId,
            startTime: item.startTime,
            endTime: item.endTime,
            duration: item.duration
          }))
          backendRecords = backendRecords.concat(records)
        } catch (error) {
          console.warn(`⚠️ 从后端获取组别数据失败 (leaderId: ${group.leaderId})`, error)
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ 从后端获取出勤记录失败，将仅使用本地记录', error)
  }
  
  // 3. 合并本地和后端记录（后端记录优先）
  const allRecords = [...backendRecords]
  manualRecords.forEach(localRecord => {
    if (!allRecords.find(r => r.name === localRecord.name)) {
      allRecords.push(localRecord)
    }
  })
  
  // 创建检测记录数据
  const reportData = uploadData.map(uploadItem => {
    const name = uploadItem['姓名'] || uploadItem['name'] || uploadItem['Name']
    const uploadTime = uploadItem['出勤时间'] || uploadItem['attendanceTime'] || uploadItem['Attendance Time']
    const uploadDurationInfo = normalizeUploadDuration(uploadTime)
    
    // 查找对应的记录（优先从后端记录，再从本地记录）
    const record = allRecords.find(r => r.name === name)
    
    // 查找是否有异常
    const anomaly = anomalies.find(a => a.name === name)
    
    return {
      '姓名': name || '',
      '上传出勤时间（原始）': uploadTime ?? '',
      '上传出勤时长（换算）': uploadDurationInfo.minutes !== null ? formatDuration(uploadDurationInfo.minutes) : '无法识别',
      '记录上班时间': record?.startTime || '',
      '记录下班时间': record?.endTime || '',
      '记录出勤时长': record?.duration || '',
      '检测结果': anomaly ? '异常' : '正常',
      '异常原因': anomaly?.reason || ''
    }
  })
  
  // 如果有异常数据，在最后添加异常汇总
  if (anomalies.length > 0) {
    reportData.push({}) // 空行分隔
    reportData.push({
      '姓名': '异常汇总',
      '上传出勤时间（原始）': '',
      '上传出勤时长（换算）': '',
      '记录上班时间': '',
      '记录下班时间': '',
      '记录出勤时长': '',
      '检测结果': '',
      '异常原因': ''
    })
    anomalies.forEach((anomaly, index) => {
      reportData.push({
        '姓名': `${index + 1}. ${anomaly.name}`,
        '上传出勤时间（原始）': '',
        '上传出勤时长（换算）': anomaly.uploadDuration || '',
        '记录上班时间': anomaly.startTime || '',
        '记录下班时间': '',
        '记录出勤时长': anomaly.manualDuration || '',
        '检测结果': '异常',
        '异常原因': anomaly.reason || ''
      })
    })
  }
  
  // 生成文件名（包含时间戳）
  const now = new Date()
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  const fileName = `检测记录_${timestamp}.xlsx`
  
  // 生成并下载Excel文件
  await generateExcel(reportData, fileName)
  
  console.log(`✅ 检测记录文件已生成并下载: ${fileName}`)
  console.log(`文件包含 ${reportData.length} 条记录，其中 ${anomalies.length} 条异常`)
}

// 已取消上传打卡机后的自动通知推送，保留异常弹窗与本地提示即可

// 关闭异常数据弹窗
const handleCloseAnomalyModal = () => {
  showAnomalyModal.value = false
  anomalyList.value = []
}

// 检查微信绑定状态
const checkWechatBindStatus = async () => {
  // #ifdef MP-WEIXIN
  try {
    const user = await getCurrentUser()
    currentUserInfo.value = user
    
    // 更新用户角色
    if (user?.role) {
      currentUserRole.value = user.role
    }
    
    if (user?.wechatTemplateId) {
      cachedWechatTemplateId.value = user.wechatTemplateId
      uni.setStorageSync('wechatTemplateId', user.wechatTemplateId)
    } else if (!cachedWechatTemplateId.value) {
      cachedWechatTemplateId.value = uni.getStorageSync('wechatTemplateId') || ''
    }
    
    if (user?.wechatOpenId || user?.openId) {
      wechatBindStatus.value = '解绑微信'
      isWechatBound.value = true
      
      // 检查授权是否过期
      if (user?.wechatAuthExpired) {
        console.warn('⚠️ 微信订阅消息授权已过期')
        // 延迟提示，避免与其他提示冲突
        setTimeout(() => {
          checkWechatAuthExpired(user)
        }, 500)
      }
    } else {
      wechatBindStatus.value = '绑定微信'
      isWechatBound.value = false
    }
  } catch (error) {
    console.error('检查微信绑定状态失败:', error)
    wechatBindStatus.value = '绑定微信'
    isWechatBound.value = false
    // 从本地存储获取角色
    currentUserRole.value = uni.getStorageSync('userRole') || ''
  }
  // #endif
}

// 检查微信授权是否过期
const checkWechatAuthExpired = (user) => {
  // #ifdef MP-WEIXIN
  if (!user?.wechatAuthExpired) {
    return
  }
  
  const authExpiredAt = user?.authExpiredAt
  let expiredMessage = '您的订阅消息授权已过期，需要重新授权才能接收通知。'
  
  if (authExpiredAt) {
    try {
      const expiredDate = new Date(authExpiredAt)
      const dateStr = `${expiredDate.getFullYear()}-${String(expiredDate.getMonth() + 1).padStart(2, '0')}-${String(expiredDate.getDate()).padStart(2, '0')}`
      expiredMessage = `您的订阅消息授权已于 ${dateStr} 过期，需要重新授权才能接收通知。`
    } catch (e) {
      console.warn('解析授权过期时间失败:', e)
    }
  }
  
  uni.showModal({
    title: '订阅消息授权已过期',
    content: expiredMessage + '\n\n是否现在重新授权？',
    confirmText: '重新授权',
    cancelText: '稍后',
    success: async (res) => {
      if (res.confirm) {
        await handleReauthorizeWechat()
      }
    }
  })
  // #endif
}

// 重新授权微信订阅消息
const handleReauthorizeWechat = async () => {
  // #ifdef MP-WEIXIN
  try {
    const templateId = cachedWechatTemplateId.value || uni.getStorageSync('wechatTemplateId') || defaultWechatTemplateId
    
    if (!templateId) {
      uni.showToast({
        title: '模板ID缺失，无法重新授权',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    uni.showLoading({
      title: '请求授权中...',
      mask: true
    })
    
    // 请求订阅消息授权
    const subscribeResult = await new Promise((resolve) => {
      uni.requestSubscribeMessage({
        tmplIds: [templateId],
        success: (res) => {
          console.log('订阅消息授权结果:', res)
          resolve(res)
        },
        fail: (err) => {
          console.error('订阅消息授权失败:', err)
          resolve(null)
        }
      })
    })
    
    hideLoadingSilently()
    
    const subscribeState = subscribeResult ? subscribeResult[templateId] : null
    
    if (subscribeState === 'accept') {
      // 用户同意授权，通知后端清除授权过期标记
      try {
        await updateCurrentUser({
          wechatAuthExpired: false
        })
        
        // 重新检查绑定状态，更新本地状态
        await checkWechatBindStatus()
        
        uni.showToast({
          title: '授权成功',
          icon: 'success',
          duration: 2000
        })
      } catch (error) {
        console.error('清除授权过期标记失败:', error)
        uni.showToast({
          title: '授权成功，但更新状态失败',
          icon: 'none',
          duration: 2000
        })
      }
    } else if (subscribeState === 'reject') {
      uni.showToast({
        title: '您拒绝了授权，将无法接收通知',
        icon: 'none',
        duration: 3000
      })
    } else {
      uni.showToast({
        title: '授权失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  } catch (error) {
    hideLoadingSilently()
    console.error('重新授权失败:', error)
    uni.showToast({
      title: '授权失败，请重试',
      icon: 'none',
      duration: 2000
    })
  }
  // #endif
}

// 绑定微信
const handleBindWechat = async () => {
  // #ifdef MP-WEIXIN
  const loadingState = {
    visible: false
  }
  const safeShowLoading = (title) => {
    loadingState.visible = true
    uni.showLoading({
      title,
      mask: true
    })
  }
  const safeHideLoading = () => {
    if (loadingState.visible) {
      hideLoadingSilently()
      loadingState.visible = false
    }
  }
  
  try {
    const templateIdForSubscribe = cachedWechatTemplateId.value || uni.getStorageSync('wechatTemplateId') || defaultWechatTemplateId || ''
    
    // 优先触发订阅请求，保持在用户手势事件内
    const subscribeResult = await (templateIdForSubscribe
      ? new Promise((resolve) => {
          console.log('用户点击后优先请求订阅消息，模板ID:', templateIdForSubscribe)
          uni.requestSubscribeMessage({
            tmplIds: [templateIdForSubscribe],
            success: (res) => {
              console.log('订阅消息结果（预先）:', res)
              resolve(res)
            },
            fail: (err) => {
              console.error('订阅消息失败（预先）:', err)
              resolve(null)
            }
          })
        })
      : Promise.resolve(null))

    if (!templateIdForSubscribe) {
      console.warn('暂无模板ID，无法在绑定前触发订阅弹窗。请检查后端是否返回 wechatTemplateId。')
    }

    safeShowLoading('获取微信登录凭证中...')
    
    // 1. 获取微信登录凭证
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject
      })
    })
    
    if (!loginRes.code) {
      throw new Error('获取微信登录凭证失败')
    }
    
    console.log('获取到微信登录凭证:', loginRes.code)
    
    safeHideLoading()
    safeShowLoading('绑定中...')
    
    // 2. 调用后端API，通过code获取openId并绑定
    const bindResult = await updateCurrentUser({
      wechatCode: loginRes.code,
      wechatUserInfo: null
    })
    
    safeHideLoading()
    
    console.log('绑定微信结果:', bindResult)
    
    // 3. 更新本地用户信息
    if (bindResult?.wechatOpenId || bindResult?.openId) {
      await checkWechatBindStatus()
      
      const finalTemplateId = bindResult?.wechatTemplateId || cachedWechatTemplateId.value || templateIdForSubscribe || ''
      if (bindResult?.wechatTemplateId) {
        cachedWechatTemplateId.value = bindResult.wechatTemplateId
        uni.setStorageSync('wechatTemplateId', bindResult.wechatTemplateId)
      }
      
      if (finalTemplateId) {
        const subscribeState = subscribeResult ? subscribeResult[finalTemplateId] : null
        if (subscribeState === 'accept') {
          // 用户同意授权，清除授权过期标记
          try {
            await updateCurrentUser({
              wechatAuthExpired: false
            })
            console.log('✅ 已清除授权过期标记')
          } catch (error) {
            console.warn('清除授权过期标记失败:', error)
          }
          
          uni.showToast({
            title: '绑定成功，已订阅通知',
            icon: 'success',
            duration: 2000
          })
        } else if (subscribeState === 'reject') {
          uni.showModal({
            title: '绑定成功',
            content: '您拒绝了订阅消息。如需接收异常数据通知，请在设置页面重新订阅。',
            showCancel: false,
            confirmText: '我知道了'
          })
        } else if (subscribeResult === null && templateIdForSubscribe) {
          uni.showModal({
            title: '绑定成功',
            content: '订阅消息失败。如需接收异常数据通知，请在设置页面重新订阅。',
            showCancel: false,
            confirmText: '我知道了'
          })
        } else if (!templateIdForSubscribe && bindResult?.wechatTemplateId) {
          uni.showModal({
            title: '绑定成功',
            content: '已成功绑定，但由于绑定前未获取到模板ID，请重新点击“绑定微信”按钮或稍后使用“重新订阅”功能以完成订阅。',
            showCancel: false,
            confirmText: '我知道了'
          })
        } else {
          uni.showToast({
            title: '绑定成功',
            icon: 'success',
            duration: 2000
          })
        }
      } else {
        console.warn('后端未返回模板ID，无法引导用户订阅')
        uni.showModal({
          title: '绑定成功',
          content: '绑定成功！\n\n⚠️ 重要提示：需要订阅消息模板才能接收异常数据通知。\n\n请联系管理员在后端配置微信模板ID（WECHAT_TEMPLATE_ID），然后重新绑定微信以订阅消息。',
          showCancel: false,
          confirmText: '我知道了'
        })
      }
    } else {
      throw new Error('绑定失败：未返回微信OpenID')
    }
    
  } catch (error) {
    console.error('绑定微信失败:', error)
    safeHideLoading()
    
    let errorMsg = '绑定失败'
    if (error.message) {
      if (error.message.includes('getUserProfile')) {
        errorMsg = '需要授权才能绑定微信，请重试'
      } else if (error.message.includes('login')) {
        errorMsg = '获取微信登录信息失败'
      } else if (error.message.includes('OpenID')) {
        errorMsg = '绑定失败：服务器未返回微信OpenID，请检查后端接口'
      } else {
        errorMsg = error.message
      }
    }
    
    uni.showModal({
      title: '绑定失败',
      content: errorMsg,
      showCancel: false,
      confirmText: '我知道了'
    })
  }
  // #endif
  
  // #ifndef MP-WEIXIN
  uni.showToast({
    title: '仅支持小程序环境',
    icon: 'none',
    duration: 2000
  })
  // #endif
}

// 解绑微信
const handleUnbindWechat = async () => {
  // #ifdef MP-WEIXIN
  try {
    // 确认解绑
    const confirmRes = await new Promise((resolve) => {
      uni.showModal({
        title: '确认解绑',
        content: '解绑后将无法接收微信通知，确定要解绑吗？',
        success: (res) => {
          resolve(res.confirm)
        },
        fail: () => {
          resolve(false)
        }
      })
    })
    
    if (!confirmRes) {
      return // 用户取消
    }
    
    uni.showLoading({
      title: '解绑中...',
      mask: true
    })
    
    // 调用后端API解绑微信（将wechatOpenId设置为null或空字符串）
    const unbindResult = await updateCurrentUser({
      wechatOpenId: null // 或者设置为空字符串 ''
    })
    
    hideLoadingSilently()
    
    console.log('解绑微信结果:', unbindResult)
    
    // 更新本地状态
    await checkWechatBindStatus()
    
    uni.showToast({
      title: '解绑成功',
      icon: 'success',
      duration: 2000
    })
    
  } catch (error) {
    console.error('解绑微信失败:', error)
    hideLoadingSilently()
    
    let errorMsg = '解绑失败'
    if (error.message) {
      errorMsg = error.message
    }
    
    uni.showModal({
      title: '解绑失败',
      content: errorMsg,
      showCancel: false,
      confirmText: '我知道了'
    })
  }
  // #endif
  
  // #ifndef MP-WEIXIN
  uni.showToast({
    title: '仅支持小程序环境',
    icon: 'none',
    duration: 2000
  })
  // #endif
}

// 查看历史记录
const handleViewHistory = async () => {
  showHistoryModal.value = true
  // 默认设置为最近7天
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  historyStartDate.value = formatDateOnly(sevenDaysAgo)
  historyEndDate.value = formatDateOnly(today)
  // 自动查询
  handleQueryHistory()
}

// 关闭历史记录弹窗
const handleCloseHistoryModal = () => {
  showHistoryModal.value = false
  historyList.value = []
  historyDisplayList.value = []
  historyStartDate.value = ''
  historyEndDate.value = ''
  allHistoryData.value = []
  historyCurrentPage.value = 1
  historyTotalPages.value = 1
}

// 历史记录日期选择器处理
const handleHistoryStartDateChange = (e) => {
  historyStartDate.value = e.detail.value
}

const handleHistoryEndDateChange = (e) => {
  historyEndDate.value = e.detail.value
}

// 查询历史记录
const handleQueryHistory = async () => {
  if (!historyStartDate.value || !historyEndDate.value) {
    uni.showToast({
      title: '请选择日期范围',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  if (historyStartDate.value > historyEndDate.value) {
    uni.showToast({
      title: '开始日期不能晚于结束日期',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  isLoadingHistory.value = true
  historyList.value = []
  historyDisplayList.value = []
  
  try {
    // 如果还没有加载过数据，先从后端获取
    if (allHistoryData.value.length === 0) {
      await loadHistoryData()
    }
    
    // 根据日期范围过滤历史记录
    const filteredHistory = filterHistoryByDateRange(allHistoryData.value, historyStartDate.value, historyEndDate.value)
    historyList.value = filteredHistory
    
    // 重置分页
    historyCurrentPage.value = 1
    historyTotalPages.value = Math.ceil(historyList.value.length / historyPageSize.value) || 1
    
    // 更新显示列表（只显示第一页）
    updateHistoryDisplayList()
    
    console.log(`查询到 ${filteredHistory.length} 条历史记录，分 ${historyTotalPages.value} 页显示`)
  } catch (error) {
    console.error('查询历史记录失败:', error)
    uni.showToast({
      title: '查询失败：' + (error.message || '未知错误'),
      icon: 'none',
      duration: 3000
    })
  } finally {
    isLoadingHistory.value = false
  }
}

// 重置历史记录筛选
const handleResetHistoryFilter = () => {
  historyStartDate.value = ''
  historyEndDate.value = ''
  historyList.value = []
  historyDisplayList.value = []
  historyCurrentPage.value = 1
  historyTotalPages.value = 1
}

// 更新历史记录显示列表（分页）
const updateHistoryDisplayList = () => {
  const start = (historyCurrentPage.value - 1) * historyPageSize.value
  const end = start + historyPageSize.value
  historyDisplayList.value = historyList.value.slice(start, end)
}

// 上一页
const handlePrevPageHistory = () => {
  if (historyCurrentPage.value > 1) {
    historyCurrentPage.value--
    updateHistoryDisplayList()
  }
}

// 下一页
const handleNextPageHistory = () => {
  if (historyCurrentPage.value < historyTotalPages.value) {
    historyCurrentPage.value++
    updateHistoryDisplayList()
  }
}

// 滚动加载更多
const handleLoadMoreHistory = () => {
  if (historyCurrentPage.value < historyTotalPages.value) {
    historyCurrentPage.value++
    const start = (historyCurrentPage.value - 1) * historyPageSize.value
    const end = start + historyPageSize.value
    const moreData = historyList.value.slice(start, end)
    historyDisplayList.value = [...historyDisplayList.value, ...moreData]
  }
}

// 根据日期范围过滤历史记录
const filterHistoryByDateRange = (history, startDate, endDate) => {
  if (!startDate || !endDate) return history
  
  return history.filter(item => {
    const changedAt = item.timestamp || item.changedAt
    if (!changedAt) return false
    
    try {
      const changeDate = formatDateOnly(changedAt)
      return changeDate >= startDate && changeDate <= endDate
    } catch (e) {
      console.warn('解析历史记录日期失败:', changedAt, e)
      return false
    }
  })
}

// 格式化日期（仅日期部分）
const formatDateOnly = (date) => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  const pad = (num) => num.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 从后端加载历史记录数据
const loadHistoryData = async () => {
  try {
    // 从后端API获取历史记录（管理员可以看到所有组长的记录）
    let history = []
    try {
      // 管理员不传leaderId参数，获取所有组长的历史记录
      console.log('📥 开始从后端获取历史记录...')
      const historyData = await getHistory()
      console.log('📥 后端返回的原始数据:', historyData)
      console.log('📥 数据类型:', typeof historyData)
      console.log('📥 是否为数组:', Array.isArray(historyData))
      
      if (historyData && Array.isArray(historyData)) {
        history = historyData
        console.log('✅ 从后端加载历史记录成功:', history.length, '条')
      } else {
        history = []
        console.warn('⚠️ 后端返回的历史记录格式不正确，期望数组，实际:', typeof historyData, historyData)
      }
    } catch (error) {
      console.error('❌ 从后端加载历史记录失败:', error)
      history = []
      uni.showToast({
        title: '加载历史记录失败: ' + (error?.message || '请检查网络'),
        icon: 'none',
        duration: 3000
      })
      throw error
    }
    
    // 确保是数组格式
    if (!Array.isArray(history)) {
      allHistoryData.value = []
      console.warn('❌ 历史记录格式错误，期望数组格式，实际类型:', typeof history)
      return
    }
    
    if (!history || history.length === 0) {
      allHistoryData.value = []
      console.log('⚠️ 没有历史记录')
      return
    }
    
    // 深度比较两个值是否相等
    const deepEqual = (a, b) => {
      if (typeof a !== typeof b) return false
      if (a === null || b === null || typeof a !== 'object') return a === b
      if (Array.isArray(a) !== Array.isArray(b)) return false
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) return false
      for (const key of keysA) {
        if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false
      }
      return true
    }
    
    // 判断两个值是否相同（支持对象和基本类型）
    const isValueEqual = (oldVal, newVal) => {
      // 如果都是对象，深度比较
      if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null) {
        return deepEqual(oldVal, newVal)
      }
      // 其他情况，转换为字符串比较
      const oldStr = typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal || '')
      const newStr = typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal || '')
      return oldStr === newStr
    }
    
    // 过滤掉无效的记录和值相同的记录
    // 只显示出勤时间相关的修改记录（排除每日报告）
    const validHistory = history.filter(item => {
      // 基本有效性检查
      const isValid = item && 
             item.memberName && 
             item.field && 
             item.oldValue !== undefined && 
             item.newValue !== undefined &&
             (item.timestamp || item.changedAt)
      
      if (!isValid) {
        console.warn('无效的历史记录项:', item)
        return false
      }
      
      // 只显示出勤时间相关的字段：上班时间、下班时间、出勤时长、出勤记录
      // 同时支持后端可能返回的英文字段名：startTime, endTime, duration
      // 排除每日报告（daily_report）
      const attendanceFields = ['上班时间', '下班时间', '出勤时长', 'record', 'startTime', 'endTime', 'duration']
      if (!attendanceFields.includes(item.field)) {
        console.log('过滤掉非出勤时间相关的历史记录:', item.memberName, item.field)
        return false
      }
      
      // 检查旧值和新值是否相同（如果相同，说明没有实际修改，不显示）
      if (isValueEqual(item.oldValue, item.newValue)) {
        console.log('过滤掉值相同的历史记录:', item.memberName, item.field, item.oldValue, item.newValue)
        return false
      }
      
      console.log('✅ 保留历史记录:', item.memberName, item.field)
      return true
    })
    
    console.log(`✅ 过滤后有效记录: ${validHistory.length} 条`)
    
    // 按时间倒序排列（最新的在前）
    allHistoryData.value = validHistory.sort((a, b) => {
      try {
        // 优先使用 timestamp，如果没有则使用 changedAt
        const timeA = new Date(a.timestamp || a.changedAt).getTime()
        const timeB = new Date(b.timestamp || b.changedAt).getTime()
        return timeB - timeA
      } catch (e) {
        return 0
      }
    })
    
    console.log(`✅ 最终加载了 ${allHistoryData.value.length} 条历史记录`)
  } catch (error) {
    console.error('加载历史记录数据失败:', error)
    allHistoryData.value = []
    throw error
  }
}

const parseDailyReportPayload = (value) => {
  if (!value) return {}
  if (typeof value === 'object') {
    return value
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (error) {
      return {}
    }
  }
  return {}
}

const transformDailyReportHistory = (history = [], allLeadersData = []) => {
  if (!Array.isArray(history)) return []
  
  // 提取所有每日报告记录，按组长和日期分组
  const dailyReports = history
    .filter(item => item?.field === 'daily_report')
    .map(item => {
      const extra = parseDailyReportPayload(item.newValue)
      const department = extra.department || item.department || item.group || '未分组'
      const leaderName = extra.leaderName || item.leaderName || item.changedBy || '未知组长'
      const leaderId = item.leaderId || item.changedBy || ''
      const memberName = item.memberName || extra.memberName || '未知成员'
      const date = extra.reportDate || formatDate(new Date(item.changedAt || item.timestamp || item.createdAt || Date.now()))
      const shiftType = extra.shiftType || item.shiftType || ''
      // 从 oldValue 中读取状态：'缺勤' 或 '请假' 或 '请假-事假' 等
      const status = item.oldValue || '缺勤'
      // 解析请假类型：如果 status 是 '请假-事假' 格式，提取请假类型
      let leaveType = null
      let finalStatus = status
      if (status.startsWith('请假-')) {
        leaveType = status.substring(3) // 提取 '请假-' 后面的部分
        finalStatus = '请假'
      } else if (status === '请假' && extra.leaveType) {
        // 兼容从 newValue 中读取请假类型
        leaveType = extra.leaveType
      }
      return {
        department,
        leaderName,
        leaderId,
        memberName,
        date,
        shiftType,
        status: finalStatus, // '缺勤' 或 '请假'
        leaveType, // 请假类型：'事假'、'调休'、'旷工'、'年假'、'病假' 或 null
        submittedAt: extra.submittedAt || item.changedAt || item.timestamp || item.createdAt
      }
    })
  
  // 按组长ID和日期分组，找出每个组长在某个日期提交的未出勤和请假人员
  const absentByLeaderAndDate = new Map()
  dailyReports.forEach(report => {
    const key = `${report.leaderId || report.leaderName}__${report.date}`
    if (!absentByLeaderAndDate.has(key)) {
      absentByLeaderAndDate.set(key, {
        leaderId: report.leaderId,
        leaderName: report.leaderName,
        department: report.department,
        date: report.date,
        shiftType: report.shiftType,
        absentMembers: new Set(), // 未出勤成员
        leaveMembers: new Map(), // 请假成员（Map，key为成员名，value为请假类型）
        submittedAt: report.submittedAt
      })
    }
    // 根据状态分别添加到不同的集合
    if (report.status === '请假') {
      // 请假成员使用 Map 存储，key 为成员名，value 为请假类型
      absentByLeaderAndDate.get(key).leaveMembers.set(report.memberName, report.leaveType || '事假')
    } else if (report.status === '正常出勤') {
      // 正常出勤成员不需要添加到 absentMembers 或 leaveMembers
      // 在生成记录时，如果成员不在 absentMembers 和 leaveMembers 中，则显示为"正常出勤"
      // 这里不需要做任何操作，因为默认就是"正常出勤"
    } else {
      // 缺勤成员
      absentByLeaderAndDate.get(key).absentMembers.add(report.memberName)
    }
  })
  
  // 构建组长ID到组员列表的映射（同时支持通过ID和名称查找）
  const leaderToMembersMap = new Map()
  if (Array.isArray(allLeadersData)) {
    allLeadersData.forEach(leader => {
      const leaderId = leader.leaderId || leader.id || ''
      const leaderName = leader.nickName || leader.name || leader.username || ''
      const department = leader.department || '未分组'
      const members = Array.isArray(leader.members) 
        ? leader.members.map(m => ({
            name: m.name || m.memberName || '',
            shiftType: m.shiftType || 'day'
          }))
        : []
      const leaderInfo = {
        leaderId,
        leaderName,
        department,
        members
      }
      // 同时使用 leaderId 和 leaderName 作为 key，确保都能匹配到
      if (leaderId) {
        leaderToMembersMap.set(leaderId, leaderInfo)
      }
      if (leaderName && leaderName !== leaderId) {
        leaderToMembersMap.set(leaderName, leaderInfo)
      }
    })
  }
  
  // 生成所有组员的出勤记录
  const allRecords = []
  absentByLeaderAndDate.forEach((reportData, key) => {
    // 优先通过 leaderId 查找，如果找不到再通过 leaderName 查找
    let leaderInfo = reportData.leaderId ? leaderToMembersMap.get(reportData.leaderId) : null
    if (!leaderInfo && reportData.leaderName) {
      leaderInfo = leaderToMembersMap.get(reportData.leaderName)
    }
    const members = leaderInfo?.members || []
    
    // 如果找到了组员列表，为所有组员生成记录
    if (members.length > 0) {
      members.forEach(member => {
        const isAbsent = reportData.absentMembers.has(member.name)
        const leaveType = reportData.leaveMembers.get(member.name)
        const isLeave = leaveType !== undefined
        let attendanceStatus = '正常出勤'
        if (isLeave) {
          // 显示请假类型：'请假-事假'、'请假-调休' 等
          attendanceStatus = leaveType ? `请假-${leaveType}` : '请假'
        } else if (isAbsent) {
          attendanceStatus = '未出勤'
        }
        allRecords.push({
          department: reportData.department || leaderInfo?.department || '未分组',
          leaderName: reportData.leaderName || leaderInfo?.leaderName || '未知组长',
          memberName: member.name,
          date: reportData.date,
          shiftType: member.shiftType || reportData.shiftType || '',
          attendanceStatus,
          submittedAt: reportData.submittedAt
        })
      })
    } else {
      // 如果没有找到组员列表，只显示未出勤和请假的人员（兼容旧数据）
      reportData.absentMembers.forEach(memberName => {
        allRecords.push({
          department: reportData.department || '未分组',
          leaderName: reportData.leaderName || '未知组长',
          memberName: memberName,
          date: reportData.date,
          shiftType: reportData.shiftType || '',
          attendanceStatus: '未出勤',
          submittedAt: reportData.submittedAt
        })
      })
      reportData.leaveMembers.forEach((leaveType, memberName) => {
        allRecords.push({
          department: reportData.department || '未分组',
          leaderName: reportData.leaderName || '未知组长',
          memberName: memberName,
          date: reportData.date,
          shiftType: reportData.shiftType || '',
          attendanceStatus: leaveType ? `请假-${leaveType}` : '请假',
          submittedAt: reportData.submittedAt
        })
      })
    }
  })
  
  // 去重
  const seen = new Set()
  const deduped = []
  for (const row of allRecords) {
    const key = `${row.department}__${row.leaderName}__${row.memberName}__${row.date}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }
  
  return deduped
    .sort((a, b) => {
      const timeA = new Date(a.submittedAt || a.date).getTime()
      const timeB = new Date(b.submittedAt || b.date).getTime()
      return timeB - timeA
    })
}

// 获取今天的日期字符串（YYYY-MM-DD格式）
const getTodayDateString = () => {
  return formatDate(new Date())
}

// 打开开始日期选择器（出勤汇总）
const handleOpenStartDatePicker = () => {
  datePickerContext.value = 'attendance'
  currentDatePickerType.value = 'start'
  // 如果已有开始日期，设置为当前显示的月份
  if (attendanceSummaryStartDate.value) {
    const date = new Date(attendanceSummaryStartDate.value)
    currentYear.value = date.getFullYear()
    currentMonth.value = date.getMonth() + 1
  } else {
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
  }
  showDatePickerModal.value = true
}

// 打开结束日期选择器（出勤汇总）
const handleOpenEndDatePicker = () => {
  datePickerContext.value = 'attendance'
  currentDatePickerType.value = 'end'
  // 如果已有结束日期，设置为当前显示的月份
  if (attendanceSummaryEndDate.value) {
    const date = new Date(attendanceSummaryEndDate.value)
    currentYear.value = date.getFullYear()
    currentMonth.value = date.getMonth() + 1
  } else {
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
  }
  showDatePickerModal.value = true
}

// 关闭日期选择器
const handleCloseDatePickerModal = () => {
  showDatePickerModal.value = false
}

// 计算日历日期
const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(currentYear.value, currentMonth.value - 1, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value, 0)
  const firstDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const today = new Date()
  const todayStr = formatDate(today)
  
  // 获取当前选择的日期（根据上下文）
  let selectedDate = ''
  if (datePickerContext.value === 'attendance') {
    selectedDate = currentDatePickerType.value === 'start' 
      ? attendanceSummaryStartDate.value 
      : attendanceSummaryEndDate.value
  } else if (datePickerContext.value === 'exportAll') {
    selectedDate = currentDatePickerType.value === 'start' 
      ? exportAllStartDate.value 
      : exportAllEndDate.value
  } else if (datePickerContext.value === 'exportGroup' && currentExportGroup.value) {
    const dateInfo = exportGroupDateMap.value[currentExportGroup.value.name] || {}
    selectedDate = currentDatePickerType.value === 'start' 
      ? dateInfo.startDate || ''
      : dateInfo.endDate || ''
  } else if (datePickerContext.value === 'upload') {
    selectedDate = currentDatePickerType.value === 'start' 
      ? uploadStartDate.value 
      : uploadEndDate.value
  }
  
  // 上个月的日期
  const prevMonth = currentMonth.value === 1 ? 12 : currentMonth.value - 1
  const prevYear = currentMonth.value === 1 ? currentYear.value - 1 : currentYear.value
  const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate()
  
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    days.push({
      day,
      date: dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
      isDisabled: false
    })
  }
  
  // 当前月的日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dateObj = new Date(currentYear.value, currentMonth.value - 1, day)
    
    // 判断是否禁用
    let isDisabled = false
    // 不能超过今天
    if (dateStr > todayStr) {
      isDisabled = true
    }
    
    // 根据上下文判断日期范围限制
    if (currentDatePickerType.value === 'start') {
      // 开始日期不能超过结束日期
      if (datePickerContext.value === 'attendance' && attendanceSummaryEndDate.value && dateStr > attendanceSummaryEndDate.value) {
        isDisabled = true
      } else if (datePickerContext.value === 'exportAll' && exportAllEndDate.value && dateStr > exportAllEndDate.value) {
        isDisabled = true
      } else if (datePickerContext.value === 'exportGroup' && currentExportGroup.value) {
        const dateInfo = exportGroupDateMap.value[currentExportGroup.value.name] || {}
        if (dateInfo.endDate && dateStr > dateInfo.endDate) {
          isDisabled = true
        }
      } else if (datePickerContext.value === 'upload' && uploadEndDate.value && dateStr > uploadEndDate.value) {
        isDisabled = true
      }
    } else {
      // 结束日期不能早于开始日期
      if (datePickerContext.value === 'attendance' && attendanceSummaryStartDate.value && dateStr < attendanceSummaryStartDate.value) {
        isDisabled = true
      } else if (datePickerContext.value === 'exportAll' && exportAllStartDate.value && dateStr < exportAllStartDate.value) {
        isDisabled = true
      } else if (datePickerContext.value === 'exportGroup' && currentExportGroup.value) {
        const dateInfo = exportGroupDateMap.value[currentExportGroup.value.name] || {}
        if (dateInfo.startDate && dateStr < dateInfo.startDate) {
          isDisabled = true
        }
      } else if (datePickerContext.value === 'upload' && uploadStartDate.value && dateStr < uploadStartDate.value) {
        isDisabled = true
      }
    }
    
    days.push({
      day,
      date: dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
      isDisabled
    })
  }
  
  // 下个月的日期（填充到42个格子）
  const nextMonth = currentMonth.value === 12 ? 1 : currentMonth.value + 1
  const nextYear = currentMonth.value === 12 ? currentYear.value + 1 : currentYear.value
  const remainingDays = 42 - days.length
  
  for (let day = 1; day <= remainingDays; day++) {
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    days.push({
      day,
      date: dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
      isDisabled: true // 下个月的日期禁用
    })
  }
  
  return days
})

// 选择日期
const handleSelectDate = (date) => {
  if (date.isDisabled) return
  
  if (datePickerContext.value === 'attendance') {
    if (currentDatePickerType.value === 'start') {
      attendanceSummaryStartDate.value = date.date
      // 如果开始日期晚于结束日期，清空结束日期
      if (attendanceSummaryEndDate.value && date.date > attendanceSummaryEndDate.value) {
        attendanceSummaryEndDate.value = ''
      }
    } else {
      attendanceSummaryEndDate.value = date.date
    }
  } else if (datePickerContext.value === 'exportAll') {
    if (currentDatePickerType.value === 'start') {
      exportAllStartDate.value = date.date
      // 如果开始日期晚于结束日期，清空结束日期
      if (exportAllEndDate.value && date.date > exportAllEndDate.value) {
        exportAllEndDate.value = ''
      }
    } else {
      exportAllEndDate.value = date.date
    }
  } else if (datePickerContext.value === 'exportGroup' && currentExportGroup.value) {
    const groupName = currentExportGroup.value.name
    if (!exportGroupDateMap.value[groupName]) {
      exportGroupDateMap.value[groupName] = { startDate: '', endDate: '' }
    }
    if (currentDatePickerType.value === 'start') {
      exportGroupDateMap.value[groupName].startDate = date.date
      // 如果开始日期晚于结束日期，清空结束日期
      if (exportGroupDateMap.value[groupName].endDate && date.date > exportGroupDateMap.value[groupName].endDate) {
        exportGroupDateMap.value[groupName].endDate = ''
      }
    } else {
      exportGroupDateMap.value[groupName].endDate = date.date
    }
  } else if (datePickerContext.value === 'upload') {
    if (currentDatePickerType.value === 'start') {
      uploadStartDate.value = date.date
      // 如果开始日期晚于结束日期，清空结束日期
      if (uploadEndDate.value && date.date > uploadEndDate.value) {
        uploadEndDate.value = ''
      }
    } else {
      uploadEndDate.value = date.date
    }
  }
  
  handleCloseDatePickerModal()
}

// 选择今天
const handleSelectToday = () => {
  const today = formatDate(new Date())
  const todayDate = new Date()
  const day = todayDate.getDate()
  
  // 检查今天是否在当前显示的月份
  if (todayDate.getFullYear() === currentYear.value && todayDate.getMonth() + 1 === currentMonth.value) {
    // 找到今天的日期对象
    const todayDateObj = calendarDays.value.find(d => d.date === today && d.isCurrentMonth)
    if (todayDateObj && !todayDateObj.isDisabled) {
      handleSelectDate(todayDateObj)
    }
  } else {
    // 如果今天不在当前月份，切换到今天的月份
    currentYear.value = todayDate.getFullYear()
    currentMonth.value = todayDate.getMonth() + 1
    // 等待computed更新后选择
    setTimeout(() => {
      const todayDateObj = calendarDays.value.find(d => d.date === today && d.isCurrentMonth)
      if (todayDateObj && !todayDateObj.isDisabled) {
        handleSelectDate(todayDateObj)
      }
    }, 0)
  }
}

// 清除日期
const handleClearDate = () => {
  if (datePickerContext.value === 'attendance') {
    if (currentDatePickerType.value === 'start') {
      attendanceSummaryStartDate.value = ''
    } else {
      attendanceSummaryEndDate.value = ''
    }
  } else if (datePickerContext.value === 'exportAll') {
    if (currentDatePickerType.value === 'start') {
      exportAllStartDate.value = ''
    } else {
      exportAllEndDate.value = ''
    }
  } else if (datePickerContext.value === 'exportGroup' && currentExportGroup.value) {
    const groupName = currentExportGroup.value.name
    if (!exportGroupDateMap.value[groupName]) {
      exportGroupDateMap.value[groupName] = { startDate: '', endDate: '' }
    }
    if (currentDatePickerType.value === 'start') {
      exportGroupDateMap.value[groupName].startDate = ''
    } else {
      exportGroupDateMap.value[groupName].endDate = ''
    }
  } else if (datePickerContext.value === 'upload') {
    if (currentDatePickerType.value === 'start') {
      uploadStartDate.value = ''
    } else {
      uploadEndDate.value = ''
    }
  }
  handleCloseDatePickerModal()
}

// 月份/年份导航
const handlePrevMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const handleNextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const handlePrevYear = () => {
  currentYear.value--
}

const handleNextYear = () => {
  currentYear.value++
}

const handleShowYearMonthPicker = () => {
  // 可以扩展为年份月份选择器，暂时不做
}

// 重置出勤汇总时间筛选
const handleResetAttendanceSummaryFilter = () => {
  attendanceSummaryStartDate.value = ''
  attendanceSummaryEndDate.value = ''
}

// 查询出勤汇总（带时间筛选）
const handleQueryAttendanceSummary = async () => {
  if (isLoadingAttendanceSummary.value) return
  
  // 验证时间范围
  if (attendanceSummaryStartDate.value && attendanceSummaryEndDate.value) {
    if (attendanceSummaryStartDate.value > attendanceSummaryEndDate.value) {
      uni.showToast({
        title: '开始日期不能晚于结束日期',
        icon: 'none',
        duration: 2000
      })
      return
    }
  }
  
  // 至少需要选择一个日期
  if (!attendanceSummaryStartDate.value && !attendanceSummaryEndDate.value) {
    uni.showToast({
      title: '请至少选择一个日期',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  await loadAttendanceSummaryData()
}

// 打开出勤汇总弹窗（不加载数据）
const handleViewAttendanceSummary = () => {
  // 清空之前的数据
  attendanceSummaryList.value = []
  attendanceSummaryDisplayList.value = []
  attendanceSummaryCurrentPage.value = 1
  attendanceSummaryTotalPages.value = 1
  // 打开弹窗
  showAttendanceSummaryModal.value = true
}

// 实际加载出勤汇总数据
const loadAttendanceSummaryData = async () => {
  if (isLoadingAttendanceSummary.value) return
  isLoadingAttendanceSummary.value = true
  uni.showLoading({
    title: '加载中...',
    mask: true
  })
  try {
    // 从后端获取所有组长的历史记录（管理员可以看到所有数据）
    let history = []
    let allLeadersData = []
    
    try {
      // 构建查询参数，包含时间筛选
      const queryParams = {}
      if (attendanceSummaryStartDate.value) {
        queryParams.start = attendanceSummaryStartDate.value
      }
      if (attendanceSummaryEndDate.value) {
        // 将结束日期加一天，确保包含结束日期当天的数据
        // 后端可能使用 >= start AND < end 的逻辑，所以需要加一天
        const endDate = new Date(attendanceSummaryEndDate.value)
        endDate.setDate(endDate.getDate() + 1)
        queryParams.end = formatDate(endDate)
      }
      
      const remoteHistory = await getHistory(queryParams)
      if (Array.isArray(remoteHistory)) {
        history = remoteHistory
        console.log('从后端加载出勤汇总数据成功:', history.length, '条', queryParams)
      } else {
        history = []
        console.warn('后端返回的历史记录格式不正确')
      }
    } catch (error) {
      console.error('加载后端出勤记录失败:', error)
      history = []
      uni.showToast({
        title: '加载出勤数据失败，请检查网络',
        icon: 'none',
        duration: 2000
      })
    }
    
    // 获取所有组长和组员信息（用于生成完整出勤记录）
    try {
      allLeadersData = await getAllLeaders(true) // includeMembers=true
      if (!Array.isArray(allLeadersData)) {
        allLeadersData = []
        console.warn('后端返回的组长数据格式不正确')
      } else {
        console.log('获取所有组长和组员信息成功:', allLeadersData.length, '个组长')
        updateLeaderMembersCacheFromList(allLeadersData)
      }
    } catch (error) {
      console.warn('获取组长和组员信息失败，将只显示未出勤人员:', error)
      allLeadersData = []
    }
    
    // 使用 requestIdleCallback 或 setTimeout 分批处理数据，避免阻塞UI
    const processData = () => {
      try {
        attendanceSummaryList.value = transformDailyReportHistory(history, allLeadersData)
        
        // 重置分页
        attendanceSummaryCurrentPage.value = 1
        attendanceSummaryTotalPages.value = Math.ceil(attendanceSummaryList.value.length / attendanceSummaryPageSize.value) || 1
        
        // 更新显示列表（只显示第一页）
        updateAttendanceSummaryDisplayList()
        
        if (attendanceSummaryList.value.length === 0) {
          uni.showToast({
            title: '暂无出勤数据',
            icon: 'none'
          })
        } else {
          console.log(`✅ 出勤汇总数据加载完成: 共 ${attendanceSummaryList.value.length} 条，分 ${attendanceSummaryTotalPages.value} 页显示`)
        }
      } catch (error) {
        console.error('处理出勤汇总数据失败:', error)
        attendanceSummaryList.value = []
        attendanceSummaryDisplayList.value = []
        uni.showToast({
          title: '数据处理失败',
          icon: 'none'
        })
      }
    }
    
    // 如果数据量很大，使用异步处理避免阻塞
    if (history.length > 1000) {
      setTimeout(processData, 0)
    } else {
      processData()
    }
  } catch (error) {
    console.error('查看出勤信息失败:', error)
    uni.showToast({
      title: error?.message || '加载失败',
      icon: 'none'
    })
  } finally {
    isLoadingAttendanceSummary.value = false
    hideLoadingSilently()
  }
}

const handleCloseAttendanceSummaryModal = () => {
  showAttendanceSummaryModal.value = false
  attendanceSummaryList.value = []
  attendanceSummaryDisplayList.value = []
  attendanceSummaryCurrentPage.value = 1
  attendanceSummaryTotalPages.value = 1
  // 关闭时不清空时间筛选，保留用户的选择
}

// 更新出勤汇总显示列表（分页）
const updateAttendanceSummaryDisplayList = () => {
  const start = (attendanceSummaryCurrentPage.value - 1) * attendanceSummaryPageSize.value
  const end = start + attendanceSummaryPageSize.value
  attendanceSummaryDisplayList.value = attendanceSummaryList.value.slice(start, end)
}

// 上一页
const handlePrevPageAttendanceSummary = () => {
  if (attendanceSummaryCurrentPage.value > 1) {
    attendanceSummaryCurrentPage.value--
    updateAttendanceSummaryDisplayList()
  }
}

// 下一页
const handleNextPageAttendanceSummary = () => {
  if (attendanceSummaryCurrentPage.value < attendanceSummaryTotalPages.value) {
    attendanceSummaryCurrentPage.value++
    updateAttendanceSummaryDisplayList()
  }
}

// 滚动到底部加载更多（无限滚动）
const handleLoadMoreAttendanceSummary = () => {
  if (attendanceSummaryCurrentPage.value < attendanceSummaryTotalPages.value) {
    attendanceSummaryCurrentPage.value++
    const start = (attendanceSummaryCurrentPage.value - 1) * attendanceSummaryPageSize.value
    const end = start + attendanceSummaryPageSize.value
    const moreData = attendanceSummaryList.value.slice(start, end)
    attendanceSummaryDisplayList.value = [...attendanceSummaryDisplayList.value, ...moreData]
  }
}

// 月度统计表相关函数
const handleViewMonthlyStats = () => {
  // 默认选择当前月份
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  selectedMonth.value = `${year}-${month}`
  showMonthlyStatsModal.value = true
  // 加载当前月份的数据
  loadMonthlyStats(selectedMonth.value)
}

const handleCloseMonthlyStatsModal = () => {
  showMonthlyStatsModal.value = false
  selectedMonth.value = ''
  monthlyStatsList.value = []
  expandedDates.value.clear() // 清空展开状态
}

// 判断日期是否展开
const isDateExpanded = (date) => {
  return expandedDates.value.has(date)
}

// 切换日期的展开/折叠状态
const toggleDateExpand = (date) => {
  if (expandedDates.value.has(date)) {
    expandedDates.value.delete(date)
  } else {
    expandedDates.value.add(date)
  }
}

// 获取要显示的记录（根据展开状态）
const getDisplayRecords = (item) => {
  if (item.records.length === 0) {
    return []
  }
  // 如果展开或记录数<=2，显示所有记录
  if (isDateExpanded(item.date) || item.records.length <= 2) {
    return item.records
  }
  // 否则只显示前2条
  return item.records.slice(0, 2)
}

const handleMonthChange = (e) => {
  const value = e.detail.value
  if (value) {
    // 提取年月部分（YYYY-MM）
    const date = new Date(value)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    selectedMonth.value = `${year}-${month}`
    loadMonthlyStats(selectedMonth.value)
  }
}

// 加载月度统计表数据
const loadMonthlyStats = async (yearMonth) => {
  if (!yearMonth) {
    monthlyStatsList.value = []
    return
  }
  
  try {
    // 从后端获取月度统计表数据
    const response = await getMonthlyAttendance(yearMonth)
    
    if (!response || !response.data || !Array.isArray(response.data)) {
      console.warn('后端返回的月度统计表数据格式不正确')
      monthlyStatsList.value = []
      return
    }
    
    // 获取该月的所有日期（从1号到最后一天）
    const [year, month] = yearMonth.split('-').map(Number)
    const lastDay = new Date(year, month, 0) // 获取该月最后一天
    const daysInMonth = lastDay.getDate()
    
    // 按日期分组，生成月度统计表
    const statsByDate = {}
    let totalRecordsCount = 0 // 统计总记录数（所有组员的记录）
    let backendItemsCount = response.data.length // 后端返回的组长-日期组合数
    
    response.data.forEach(item => {
      const date = item.date
      if (!statsByDate[date]) {
        statsByDate[date] = []
      }
      
      // 转换记录格式
      if (item.records && Array.isArray(item.records) && item.records.length > 0) {
        item.records.forEach(record => {
          // 格式化时长
          const formatDuration = (minutes) => {
            if (!minutes || minutes <= 0) return ''
            const hours = Math.floor(minutes / 60)
            const mins = minutes % 60
            if (mins === 0) {
              return `${hours}小时`
            }
            return `${hours}小时${mins}分钟`
          }
          
          statsByDate[date].push({
            date: date,
            name: record.memberName || '',
            startTime: record.startTime || '',
            endTime: record.endTime || '',
            duration: formatDuration(record.duration),
            shiftType: record.shiftType || 'day',
            department: record.department || item.department || '',
            leaderName: item.leaderName || '',
            groupName: item.department || ''
          })
          totalRecordsCount++
        })
      }
    })
    
    // 生成完整的月度列表（包含所有日期，即使没有数据）
    const monthlyList = []
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      monthlyList.push({
        date: dateStr,
        records: statsByDate[dateStr] || []
      })
    }
    
    monthlyStatsList.value = monthlyList
    console.log(`✅ 已从后端加载月度统计表: ${yearMonth}`)
    console.log(`   - 后端返回: ${backendItemsCount} 条组长-日期组合（数据库记录数）`)
    console.log(`   - 前端展开: ${totalRecordsCount} 条组员记录（显示总数）`)
    console.log(`   - 月份天数: ${monthlyList.length} 天`)
    console.log(`   - 平均每条组合包含: ${backendItemsCount > 0 ? (totalRecordsCount / backendItemsCount).toFixed(1) : 0} 个组员记录`)
  } catch (error) {
    console.error('从后端加载月度统计表失败:', error)
    uni.showToast({
      title: '加载月度统计表失败',
      icon: 'none',
      duration: 2000
    })
    monthlyStatsList.value = []
  }
}

// 导出月度统计表
const handleExportMonthlyStats = async () => {
  if (monthlyStatsList.value.length === 0) {
    uni.showToast({
      title: '暂无可导出数据',
      icon: 'none'
    })
    return
  }
  
  // 班次文本映射
  const shiftTextMap = {
    day: '白班',
    night: '夜班'
  }
  
  // 生成导出数据（展开所有日期和记录）
  const dataset = []
  monthlyStatsList.value.forEach(dayItem => {
    if (dayItem.records && dayItem.records.length > 0) {
      dayItem.records.forEach(record => {
        dataset.push({
          '日期': dayItem.date,
          '姓名': record.name || '',
          '班次': shiftTextMap[record.shiftType] || '白班',
          '部门': record.department || '',
          '组长': record.leaderName || '',
          '组别': record.groupName || '',
          '上班时间（组长选择）': formatTimeDisplay(record.startTime),
          '下班时间（组长选择）': formatTimeDisplay(record.endTime),
          '出勤时长': record.duration || ''
        })
      })
    } else {
      // 即使没有数据，也添加一行空记录，显示日期
      dataset.push({
        '日期': dayItem.date,
        '姓名': '',
        '班次': '',
        '部门': '',
        '组长': '',
        '组别': '',
        '上班时间（组长选择）': '',
        '下班时间（组长选择）': '',
        '出勤时长': ''
      })
    }
  })
  
  // 生成文件名
  const fileName = `月度统计表_${selectedMonth.value || '未知月份'}.xlsx`
  
  try {
    await generateExcel(dataset, fileName)
    uni.showToast({
      title: '导出成功',
      icon: 'success',
      duration: 2000
    })
  } catch (error) {
    console.error('导出月度统计表失败:', error)
    uni.showToast({
      title: '导出失败',
      icon: 'none'
    })
  }
}

const handleExportAttendanceSummary = async () => {
  if (!attendanceSummaryList.value.length) {
    uni.showToast({
      title: '暂无可导出数据',
      icon: 'none'
    })
    return
  }
  // 班次文本映射
  const shiftTextMap = {
    day: '白班',
    night: '夜班'
  }
  const dataset = attendanceSummaryList.value.map(row => ({
    '部门': row.department || '',
    '组长': row.leaderName || '',
    '组员': row.memberName || '',
    '日期': row.date || '',
    '出勤情况': row.attendanceStatus || '正常出勤',
    '班次': shiftTextMap[row.shiftType] || ''
  }))
  
  // 生成文件名，包含查询的日期范围
  let fileName = '出勤汇总'
  if (attendanceSummaryStartDate.value && attendanceSummaryEndDate.value) {
    fileName = `出勤汇总_${attendanceSummaryStartDate.value}_至_${attendanceSummaryEndDate.value}`
  } else if (attendanceSummaryStartDate.value) {
    fileName = `出勤汇总_${attendanceSummaryStartDate.value}_起`
  } else if (attendanceSummaryEndDate.value) {
    fileName = `出勤汇总_至_${attendanceSummaryEndDate.value}`
  } else {
    fileName = `出勤汇总_全部数据_${formatDate(new Date())}`
  }
  
  try {
    await generateExcel(dataset, `${fileName}.xlsx`)
    uni.showToast({
      title: '导出成功',
      icon: 'success',
      duration: 2000
    })
  } catch (error) {
    console.error('导出出勤汇总失败:', error)
    uni.showToast({
      title: '导出失败',
      icon: 'none'
    })
  }
}

// 格式化历史记录时间
const formatHistoryTime = (timestamp) => {
  try {
    if (!timestamp) {
      return '未知时间'
    }
    
    const date = new Date(timestamp)
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '无效时间'
    }
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  } catch (error) {
    console.error('格式化时间失败:', error, timestamp)
    return '时间格式错误'
  }
}

// 格式化历史记录字段名
const formatHistoryField = (field) => {
  const fieldMap = {
    'record': '出勤记录',
    '上班时间': '上班时间',
    '下班时间': '下班时间',
    '出勤时长': '出勤时长'
  }
  return fieldMap[field] || field
}

// 格式化历史记录值
const formatHistoryValue = (field, value) => {
  if (value === null || value === undefined) {
    return '未设置'
  }
  
  // 如果是 record 字段，且值是对象，格式化显示
  if (field === 'record') {
    try {
      // 如果已经是对象
      if (typeof value === 'object') {
        return formatRecordValue(value)
      }
      // 如果是字符串，尝试解析为 JSON
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          if (typeof parsed === 'object') {
            return formatRecordValue(parsed)
          }
        } catch (e) {
          // 不是 JSON，直接返回字符串
          return value
        }
      }
    } catch (error) {
      console.error('格式化 record 值失败:', error, value)
      return String(value)
    }
  }
  
  // 其他字段直接返回字符串
  return String(value)
}

// 格式化每日报告信息（专门用于显示）
const formatDailyReportInfo = (value) => {
  if (value === null || value === undefined) {
    return '缺勤'
  }
  
  try {
    // 解析 JSON 字符串
    let parsed = value
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value)
      } catch (e) {
        // 不是 JSON，返回缺勤
        return '缺勤'
      }
    }
    
    // 如果是对象，提取关键信息
    if (typeof parsed === 'object' && parsed !== null) {
      const parts = []
      
      // 报告日期
      if (parsed.reportDate) {
        parts.push(`日期：${parsed.reportDate}`)
      }
      
      // 组长名称
      if (parsed.leaderName) {
        parts.push(`组长：${parsed.leaderName}`)
      }
      
      // 部门
      if (parsed.department) {
        parts.push(`部门：${parsed.department}`)
      }
      
      if (parts.length > 0) {
        return parts.join(' | ')
      }
      
      return '缺勤报告'
    }
    
    return '缺勤'
  } catch (error) {
    console.error('格式化每日报告信息失败:', error, value)
    return '缺勤'
  }
}

// 格式化出勤记录对象为友好显示
const formatRecordValue = (record) => {
  if (!record || typeof record !== 'object') {
    return '无效记录'
  }
  
  const parts = []
  
  // 格式化上班时间
  if (record.startTime) {
    try {
      const startDate = new Date(record.startTime)
      if (!isNaN(startDate.getTime())) {
        const hour = String(startDate.getHours()).padStart(2, '0')
        const minute = String(startDate.getMinutes()).padStart(2, '0')
        parts.push(`上班: ${hour}:${minute}`)
      } else {
        parts.push(`上班: ${record.startTime}`)
      }
    } catch (e) {
      parts.push(`上班: ${record.startTime}`)
    }
  }
  
  // 格式化下班时间
  if (record.endTime) {
    try {
      const endDate = new Date(record.endTime)
      if (!isNaN(endDate.getTime())) {
        const hour = String(endDate.getHours()).padStart(2, '0')
        const minute = String(endDate.getMinutes()).padStart(2, '0')
        parts.push(`下班: ${hour}:${minute}`)
      } else {
        parts.push(`下班: ${record.endTime}`)
      }
    } catch (e) {
      parts.push(`下班: ${record.endTime}`)
    }
  }
  
  // 格式化出勤时长
  if (record.duration !== undefined && record.duration !== null) {
    let durationStr = ''
    if (typeof record.duration === 'number') {
      // 数字格式（分钟数）
      const hours = Math.floor(record.duration / 60)
      const minutes = record.duration % 60
      durationStr = minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
    } else {
      // 字符串格式
      durationStr = String(record.duration)
    }
    parts.push(`时长: ${durationStr}`)
  }
  
  // 班次类型
  if (record.shiftType) {
    const shiftMap = {
      'day': '白班',
      'night': '夜班'
    }
    parts.push(`班次: ${shiftMap[record.shiftType] || record.shiftType}`)
  }
  
  return parts.length > 0 ? parts.join(' | ') : '空记录'
}
</script>

<style lang="scss" scoped>
.settings-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 30%, #bae6fd 60%, #7dd3fc 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

/* 装饰元素 */
.settings-container::before {
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

.settings-container::after {
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
  padding: 60rpx 40rpx 40rpx;
  position: relative;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;
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
}

.header-placeholder {
  width: 80rpx;
}

/* 日期选择区域 */
.date-section {
  padding: 40rpx 40rpx;
  display: flex;
  gap: 24rpx;
  position: relative;
  z-index: 1;
}

.date-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.date-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.date-picker {
  height: 80rpx;
  background: white;
  border-radius: 16rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #1a1a1a;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

/* 内容列表 */
.content-list {
  flex: 1;
  padding: 0 40rpx 40rpx;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
}

.group-item {
  background: white;
  border-radius: 24rpx;
  padding: 32rpx 30rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.1),
              0 2rpx 6rpx rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  width: 100%;
}

.group-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.group-label {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.group-leader {
  font-size: 24rpx;
  color: #666;
  font-weight: 500;
}

.group-member-count {
  font-size: 24rpx;
  color: #888;
  font-weight: 500;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.info-btn {
  height: 72rpx;
  padding: 0 28rpx;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(79, 172, 254, 0.3);
  transition: all 0.3s ease;
  flex-shrink: 0;
  white-space: nowrap;
}

.info-btn.btn-hover {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(79, 172, 254, 0.2);
}

.info-text {
  color: white;
  font-size: 28rpx;
  font-weight: 600;
}

.member-export-btn {
  height: 72rpx;
  padding: 0 28rpx;
  background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(255, 154, 158, 0.3);
  transition: all 0.3s ease;
  flex-shrink: 0;
  white-space: nowrap;
}

.member-export-btn.btn-hover {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(255, 154, 158, 0.2);
}

.member-export-text {
  color: white;
  font-size: 28rpx;
  font-weight: 600;
}

.export-btn {
  height: 72rpx;
  padding: 0 28rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
  flex-shrink: 0;
  white-space: nowrap;
}

.export-btn.btn-hover {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(102, 126, 234, 0.2);
}

.export-text {
  color: white;
  font-size: 28rpx;
  font-weight: 600;
}

/* 操作按钮区域 */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 40rpx;
}

.export-all-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 25rpx rgba(102, 126, 234, 0.4),
              0 4rpx 12rpx rgba(102, 126, 234, 0.2);
  transition: all 0.3s ease;
}

.export-all-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(102, 126, 234, 0.3),
              0 2rpx 8rpx rgba(102, 126, 234, 0.15);
}

.export-members-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 25rpx rgba(255, 154, 158, 0.35),
              0 4rpx 12rpx rgba(255, 154, 158, 0.2);
  transition: all 0.3s ease;
}

.export-members-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(255, 154, 158, 0.25),
              0 2rpx 8rpx rgba(255, 154, 158, 0.15);
}

.upload-btn {
  width: 100%;
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

.upload-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(7, 193, 96, 0.3),
              0 2rpx 8rpx rgba(7, 193, 96, 0.15);
}

.upload-text {
  color: white;
  font-size: 32rpx;
  font-weight: 600;
}

.history-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 25rpx rgba(245, 87, 108, 0.4),
              0 4rpx 12rpx rgba(245, 87, 108, 0.2);
  transition: all 0.3s ease;
}

.history-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(245, 87, 108, 0.3),
              0 2rpx 8rpx rgba(245, 87, 108, 0.15);
}

.history-text {
  color: white;
  font-size: 32rpx;
  font-weight: 600;
}

.attendance-summary-btn {
  width: 100%;
  height: 100rpx;
  margin-top: 24rpx;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 25rpx rgba(79, 172, 254, 0.35),
              0 4rpx 12rpx rgba(79, 172, 254, 0.18);
  transition: all 0.3s ease;
}

.attendance-summary-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(79, 172, 254, 0.28),
              0 2rpx 8rpx rgba(79, 172, 254, 0.12);
}

.attendance-summary-text {
  color: white;
  font-size: 32rpx;
  font-weight: 600;
}

.monthly-stats-btn {
  width: 100%;
  height: 100rpx;
  margin-top: 24rpx;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 25rpx rgba(245, 87, 108, 0.35),
              0 4rpx 12rpx rgba(245, 87, 108, 0.18);
  transition: all 0.3s ease;
}

.monthly-stats-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(245, 87, 108, 0.28),
              0 2rpx 8rpx rgba(245, 87, 108, 0.12);
}

.monthly-stats-text {
  color: white;
  font-size: 32rpx;
  font-weight: 600;
}

.bind-wechat-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 25rpx rgba(79, 172, 254, 0.4),
              0 4rpx 12rpx rgba(79, 172, 254, 0.2);
  transition: all 0.3s ease;
  margin-top: 30rpx;
}

.bind-wechat-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(79, 172, 254, 0.3),
              0 2rpx 8rpx rgba(79, 172, 254, 0.15);
}

.bind-wechat-text {
  color: white;
  font-size: 32rpx;
  font-weight: 600;
}

.bind-wechat-btn.unbind-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  box-shadow: 0 8rpx 25rpx rgba(255, 107, 107, 0.4),
              0 4rpx 12rpx rgba(255, 107, 107, 0.2);
}

.bind-wechat-btn.unbind-btn.btn-hover {
  box-shadow: 0 6rpx 20rpx rgba(255, 107, 107, 0.3),
              0 2rpx 8rpx rgba(255, 107, 107, 0.15);
}

/* 导出进度弹窗 */
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
  animation: fadeIn 0.3s ease;
}

/* 月度统计表弹窗样式 */
.monthly-stats-modal {
  width: 720rpx;
  max-height: 85vh;
  background: white;
  border-radius: 28rpx;
  /* #ifndef H5 */
  overflow: hidden;
  /* #endif */
  /* #ifdef H5 */
  overflow: visible;
  /* #endif */
  display: flex;
  flex-direction: column;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
  position: relative;
  z-index: 1000;
}

.monthly-stats-modal .modal-body.monthly-stats-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* #ifndef H5 */
  overflow: hidden;
  /* #endif */
  /* #ifdef H5 */
  overflow: visible !important;
  /* #endif */
  min-height: 0;
  padding: 0;
}

.monthly-stats-filter {
  padding: 30rpx 40rpx;
  background: #f8fafc;
  border-bottom: 2rpx solid #e2e8f0;
  position: relative;
  flex-shrink: 0;
  /* #ifdef H5 */
  z-index: 1001;
  /* #endif */
  /* #ifndef H5 */
  z-index: 1;
  /* #endif */
}

.monthly-stats-filter .filter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.monthly-stats-filter .filter-label {
  font-size: 26rpx;
  color: #64748b;
  font-weight: 500;
}

.monthly-stats-filter .filter-picker {
  height: 80rpx;
  padding: 0 24rpx;
  background: white;
  border: 2rpx solid #e2e8f0;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #1e293b;
  min-width: 200rpx;
  text-align: center;
  transition: all 0.2s ease;
  position: relative;
  /* #ifdef H5 */
  z-index: 1002;
  /* #endif */
  /* #ifndef H5 */
  z-index: 10;
  /* #endif */
  cursor: pointer;
  user-select: none;
}

.monthly-stats-filter .filter-picker:active {
  border-color: #07c160;
  background: #f0fdf4;
}

/* H5环境下确保picker弹出层可见 */
/* #ifdef H5 */
.monthly-stats-modal {
  overflow: visible !important;
}

.monthly-stats-filter {
  overflow: visible !important;
}

.monthly-stats-filter picker {
  position: relative;
  z-index: 1003;
  overflow: visible !important;
}

.monthly-stats-filter .filter-picker {
  position: relative;
  z-index: 1002;
}

/* 确保picker弹出层显示在最上层 */
.monthly-stats-filter picker .uni-picker-view,
.monthly-stats-filter picker .uni-picker-view-column,
.monthly-stats-filter picker .uni-picker-view-mask,
.monthly-stats-filter picker .uni-picker-view-content {
  z-index: 10000 !important;
}

/* 针对H5的date picker特殊处理 */
.monthly-stats-filter picker .uni-date-editor,
.monthly-stats-filter picker .uni-date-editor__picker {
  z-index: 10000 !important;
  position: relative;
}

/* 确保picker的弹出层不被遮挡 */
.monthly-stats-modal .uni-picker-view,
.monthly-stats-modal .uni-date-editor__picker {
  z-index: 10000 !important;
}
/* #endif */

.monthly-stats-list {
  flex: 1;
  padding: 24rpx;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  box-sizing: border-box;
  max-height: calc(85vh - 200rpx);
}

.monthly-stats-item {
  margin-bottom: 32rpx;
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
  border: 2rpx solid #e9ecef;
}

.monthly-stats-date {
  font-size: 32rpx;
  font-weight: 700;
  color: #212529;
  margin-bottom: 16rpx;
  padding-bottom: 12rpx;
  border-bottom: 2rpx solid #dee2e6;
}

.monthly-stats-records {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.monthly-stats-record {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx;
  background: white;
  border-radius: 12rpx;
  border: 1rpx solid #dee2e6;
}

.record-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #212529;
  flex: 1;
}

.record-time {
  font-size: 24rpx;
  color: #6c757d;
  margin: 0 16rpx;
}

.record-duration {
  font-size: 24rpx;
  color: #28a745;
  font-weight: 600;
}

.no-data-tip {
  padding: 24rpx;
  text-align: center;
}

.no-data-text {
  font-size: 24rpx;
  color: #6c757d;
  font-style: italic;
}

.empty-tip {
  padding: 60rpx 24rpx;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #6c757d;
}

.expand-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 16rpx;
  margin-top: 12rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  cursor: pointer;
  transition: all 0.2s ease;
}

.expand-toggle:active {
  background: #e0e0e0;
}

.expand-text {
  font-size: 24rpx;
  color: #666;
}

.expand-icon {
  font-size: 20rpx;
  color: #666;
}

.expand-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 16rpx;
  margin-top: 12rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  cursor: pointer;
  transition: all 0.2s ease;
}

.expand-toggle:active {
  background: #e0e0e0;
}

.expand-text {
  font-size: 24rpx;
  color: #666;
}

.expand-icon {
  font-size: 20rpx;
  color: #666;
}

/* H5环境下，出勤汇总弹窗的遮罩层需要允许picker弹出层显示 */
/* #ifdef H5 */
.attendance-summary-overlay {
  overflow: visible;
}
/* #endif */

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.progress-modal {
  width: 500rpx;
  background: white;
  border-radius: 32rpx;
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
}

.progress-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.progress-bar {
  width: 100%;
  height: 16rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #07c160 0%, #06ad56 100%);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 28rpx;
  color: #07c160;
  font-weight: 600;
}

/* 上传弹窗 */
.upload-modal {
  width: 600rpx;
  background: white;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40rpx;
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
  font-size: 48rpx;
  color: #999;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.modal-close:active {
  background: #f0f0f0;
  color: #666;
}

.modal-body {
  padding: 40rpx;
}

.upload-tips {
  margin-bottom: 30rpx;
  text-align: center;
}

.tips-text {
  display: block;
  font-size: 28rpx;
  color: #1a1a1a;
  margin-bottom: 12rpx;
  font-weight: 600;
}

.tips-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.upload-warning {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 30rpx;
  background: #fff7e6;
  border: 2rpx solid #ffd591;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(255, 193, 7, 0.15);
}

.warning-icon {
  font-size: 32rpx;
  flex-shrink: 0;
}

.warning-text {
  flex: 1;
  font-size: 26rpx;
  color: #d46b08;
  font-weight: 600;
  line-height: 1.5;
}

.warning-text-group {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.warning-text-sub {
  font-size: 24rpx;
  color: #ad6800;
  font-weight: 500;
}

.file-select-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 16rpx;
  color: white;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  margin-bottom: 20rpx;
  
  &::after {
    border: none;
  }
}

.file-name {
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.file-name-text {
  font-size: 24rpx;
  color: #666;
}

.date-filter-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.date-filter-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.date-filter-label {
  font-size: 26rpx;
  color: #333;
  font-weight: 600;
}

.upload-date-picker {
  height: 88rpx;
  padding: 0 24rpx;
  background: #ffffff;
  border: 2rpx solid #07c160;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2rpx 8rpx rgba(7, 193, 96, 0.1);
}

.upload-date-picker:active {
  background: #f0fdf4;
  border-color: #06ad56;
  box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.2);
  transform: scale(0.98);
}

.date-picker-text {
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 500;
  flex: 1;
}

.date-picker-text.placeholder-text {
  color: #999;
  font-weight: 400;
}

.date-picker-icon {
  font-size: 32rpx;
  margin-left: 12rpx;
  opacity: 0.8;
}

.modal-footer {
  display: flex;
  border-top: 2rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.modal-btn:active {
  opacity: 0.8;
}

.cancel-btn {
  border-right: 1rpx solid #f0f0f0;
}

.cancel-btn .btn-text {
  color: #666;
  font-size: 32rpx;
  font-weight: 600;
}

.confirm-btn {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
}

.confirm-btn.btn-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.confirm-btn .btn-text {
  color: white;
  font-size: 32rpx;
  font-weight: 600;
}

/* 异常数据弹窗 */
.anomaly-modal {
  width: 700rpx;
  max-height: 80vh;
  background: white;
  border-radius: 32rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.anomaly-content {
  flex: 1;
  padding: 40rpx;
  max-height: 60vh;
}

.no-anomaly {
  padding: 60rpx 0;
  text-align: center;
}

.no-anomaly-text {
  font-size: 32rpx;
  color: #07c160;
  font-weight: 600;
}

.anomaly-item {
  padding: 24rpx;
  margin-bottom: 20rpx;
  background: #fff3cd;
  border: 2rpx solid #ffc107;
  border-radius: 16rpx;
}

.anomaly-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #856404;
  margin-bottom: 12rpx;
}

.anomaly-reason {
  font-size: 28rpx;
  color: #856404;
  margin-bottom: 12rpx;
  font-weight: 600;
}

.anomaly-detail {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.anomaly-detail text {
  font-size: 24rpx;
  color: #856404;
}

/* 历史记录弹窗 */
.history-modal {
  width: 700rpx;
  max-height: 80vh;
  background: white;
  border-radius: 32rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.group-members-modal {
  width: 700rpx;
  max-height: 80vh;
  background: white;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
  padding: 32rpx;
  box-sizing: border-box;
}

.group-members-summary {
  margin: 8rpx 0 20rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  font-size: 26rpx;
  color: #4a4a4a;
}

.summary-line {
  line-height: 1.4;
}

.group-change-section {
  margin-bottom: 20rpx;
  padding: 20rpx;
  border-radius: 20rpx;
  background: #f7fafc;
  border: 2rpx solid #e2e8f0;
}

.group-change-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.group-change-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.group-change-tip {
  font-size: 22rpx;
  color: #9ca3af;
}

.group-change-placeholder {
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 26rpx;
}

.group-change-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  max-height: 400rpx;
  overflow-y: auto;
}

.group-change-item {
  background: white;
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
  border: 2rpx solid #e2e8f0;
  box-shadow: 0 4rpx 12rpx rgba(15, 23, 42, 0.05);
}

.change-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.change-type {
  font-size: 26rpx;
  font-weight: 600;
  color: #334155;
}

.change-type.add {
  color: #0f9d58;
}

.change-type.remove {
  color: #dc2626;
}

.change-time {
  font-size: 22rpx;
  color: #94a3b8;
}

.change-item-body {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  font-size: 24rpx;
  color: #475569;
}

.change-member {
  font-weight: 600;
  color: #1f2937;
}

.change-meta {
  font-size: 22rpx;
  color: #94a3b8;
}

.group-members-list {
  flex: 1;
  max-height: 600rpx;
}

.group-members-loading,
.group-members-empty {
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 28rpx;
}

.group-member-item {
  padding: 20rpx;
  border-radius: 18rpx;
  background: #f8f9ff;
  margin-bottom: 16rpx;
  border: 2rpx solid transparent;
}

.member-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.member-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.member-meta {
  font-size: 24rpx;
  color: #666;
  margin-top: 10rpx;
}

.member-shift-badge {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #fff;
}

.member-shift-badge.day-shift {
  background: #07c160;
}

.member-shift-badge.night-shift {
  background: #5a67d8;
}

.attendance-summary-modal {
  width: 720rpx;
  max-height: 85vh;
  background: white;
  border-radius: 28rpx;
  /* #ifndef H5 */
  overflow: hidden;
  /* #endif */
  /* #ifdef H5 */
  overflow: visible;
  /* #endif */
  display: flex;
  flex-direction: column;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
  position: relative;
  z-index: 1000;
}

/* H5环境下确保picker弹出层可见 */
/* #ifdef H5 */
.attendance-summary-modal .summary-table {
  overflow-y: auto;
  overflow-x: hidden;
}
/* #endif */

.modal-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.export-mini-btn {
  height: 70rpx;
  padding: 0 30rpx;
  border-radius: 35rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.25);
}

.export-mini-btn.btn-disabled {
  opacity: 0.6;
  box-shadow: none;
  pointer-events: none;
}

/* 出勤汇总时间筛选区域 */
.attendance-summary-filter {
  padding: 30rpx 40rpx;
  background: #f8fafc;
  border-bottom: 2rpx solid #e2e8f0;
  position: relative;
  z-index: 1;
}

.filter-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.filter-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.filter-label {
  font-size: 26rpx;
  color: #64748b;
  font-weight: 500;
}

.filter-picker {
  height: 80rpx;
  padding: 0 24rpx;
  background: white;
  border: 2rpx solid #e2e8f0;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #1e293b;
  transition: all 0.2s ease;
  position: relative;
  z-index: 10;
  cursor: pointer;
  user-select: none;
}

.filter-picker:active {
  border-color: #07c160;
  background: #f0fdf4;
  transform: scale(0.98);
}

/* 弹窗内容区域保持滚动 */
.attendance-summary-modal .summary-table {
  overflow-y: auto;
  overflow-x: hidden;
}

/* 自定义日期选择器弹窗 */
.date-picker-overlay {
  z-index: 2000;
}

.date-picker-modal {
  width: 600rpx;
  background: white;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.date-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 40rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.date-picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.date-picker-close {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: #999;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.date-picker-close:active {
  background: #f0f0f0;
  color: #666;
}

.date-picker-body {
  padding: 30rpx 40rpx;
}

.date-picker-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30rpx;
}

.nav-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #666;
  border-radius: 12rpx;
  transition: all 0.2s ease;
  background: #f8f9fa;
}

.nav-btn:active {
  background: #e9ecef;
  color: #333;
}

.date-picker-month-year {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  padding: 0 20rpx;
}

.date-picker-weekdays {
  display: flex;
  margin-bottom: 20rpx;
}

.weekday {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #666;
  font-weight: 500;
  padding: 10rpx 0;
}

.date-picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.date-cell {
  width: calc((100% - 48rpx) / 7);
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  transition: all 0.2s ease;
  background: #f8f9fa;
}

.date-cell.other-month {
  color: #ccc;
  background: transparent;
}

.date-cell.today {
  background: #e3f2fd;
  color: #1976d2;
  font-weight: 600;
}

.date-cell.selected {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.3);
}

.date-cell.disabled {
  color: #ccc;
  background: #f5f5f5;
  pointer-events: none;
}

.date-cell:not(.disabled):not(.other-month):active {
  background: #e9ecef;
  transform: scale(0.95);
}

.date-picker-footer {
  display: flex;
  gap: 20rpx;
  padding: 30rpx 40rpx;
  border-top: 2rpx solid #f0f0f0;
}

.date-picker-action-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  transition: all 0.2s ease;
}

.clear-btn {
  background: #f8f9fa;
  color: #666;
  border: 2rpx solid #e2e8f0;
}

.clear-btn:active {
  background: #e9ecef;
}

.today-btn {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.25);
}

.today-btn:active {
  opacity: 0.9;
}

.filter-actions {
  display: flex;
  gap: 20rpx;
}

.filter-btn {
  flex: 1;
  height: 70rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  transition: all 0.2s ease;
}

.reset-btn {
  background: #f1f5f9;
  color: #64748b;
  border: 2rpx solid #e2e8f0;
}

.reset-btn:active {
  background: #e2e8f0;
}

.query-btn {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.25);
}

.query-btn.btn-disabled {
  opacity: 0.6;
  box-shadow: none;
  pointer-events: none;
}

.query-btn:active {
  opacity: 0.9;
}

.filter-btn-text {
  font-size: 28rpx;
  font-weight: 600;
}

.summary-table-header {
  display: flex;
  padding: 24rpx 40rpx;
  background: #f8fafc;
  border-bottom: 2rpx solid #e2e8f0;
  font-weight: 600;
  color: #0f172a;
}

.summary-table {
  flex: 1;
  padding: 0 40rpx 30rpx;
  min-height: 0;
  max-height: calc(85vh - 320rpx);
}

.summary-row {
  display: flex;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f1f5f9;
  font-size: 28rpx;
  color: #1e293b;
}

.summary-row .col {
  text-decoration: underline;
  text-decoration-color: #cbd5e1;
  text-underline-offset: 4rpx;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-table-header .col,
.summary-row .col {
  flex: 1;
  text-align: left;
  padding-right: 16rpx;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-table-header .department,
.summary-row .department {
  flex: 1.1;
}

.summary-table-header .leader,
.summary-row .leader {
  flex: 0.9;
}

.summary-table-header .member,
.summary-row .member {
  flex: 1.1;
}

.summary-table-header .date,
.summary-row .date {
  flex: 1.3;
  padding-right: 16rpx;
  min-width: 160rpx;
  white-space: nowrap;
}

.summary-table-header .status,
.summary-row .status {
  flex: 1.1;
  padding-right: 0;
  min-width: 120rpx;
}

/* 出勤汇总分页相关样式 */
.summary-pagination-info {
  padding: 16rpx 24rpx;
  background: #f8f9fa;
  border-bottom: 1rpx solid #dee2e6;
  text-align: center;
}

.pagination-text {
  font-size: 24rpx;
  color: #6c757d;
}

.summary-pagination-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: #f8f9fa;
  border-top: 1rpx solid #dee2e6;
}

.pagination-btn {
  flex: 1;
  padding: 16rpx 24rpx;
  background: #07c160;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 12rpx;
  transition: all 0.2s ease;
}

.pagination-btn.btn-disabled {
  background: #ccc;
  pointer-events: none;
  opacity: 0.6;
}

.pagination-btn:active {
  background: #06ad56;
  transform: scale(0.98);
}

.pagination-btn-text {
  color: white;
  font-size: 28rpx;
  font-weight: 600;
}

.pagination-info {
  flex: 0 0 auto;
  padding: 0 24rpx;
}

.pagination-info-text {
  font-size: 26rpx;
  color: #495057;
  font-weight: 600;
}

.load-more-tip {
  padding: 24rpx;
  text-align: center;
}

.load-more-text {
  font-size: 24rpx;
  color: #6c757d;
  font-style: italic;
}

/* 出勤汇总分页相关样式 */
.summary-pagination-info {
  padding: 16rpx 24rpx;
  background: #f8f9fa;
  border-bottom: 1rpx solid #dee2e6;
  text-align: center;
}

.pagination-text {
  font-size: 24rpx;
  color: #6c757d;
}

.summary-pagination-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: #f8f9fa;
  border-top: 1rpx solid #dee2e6;
}

.pagination-btn {
  flex: 1;
  padding: 16rpx 24rpx;
  background: #07c160;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 12rpx;
  transition: all 0.2s ease;
}

.pagination-btn.btn-disabled {
  background: #ccc;
  pointer-events: none;
  opacity: 0.6;
}

.pagination-btn:active {
  background: #06ad56;
  transform: scale(0.98);
}

.pagination-btn-text {
  color: white;
  font-size: 28rpx;
  font-weight: 600;
}

.pagination-info {
  flex: 0 0 auto;
  padding: 0 24rpx;
}

.pagination-info-text {
  font-size: 26rpx;
  color: #495057;
  font-weight: 600;
}

.load-more-tip {
  padding: 24rpx;
  text-align: center;
}

.load-more-text {
  font-size: 24rpx;
  color: #6c757d;
  font-style: italic;
}

.empty-summary {
  padding: 60rpx 0;
  text-align: center;
  color: #94a3b8;
}

.empty-summary-text {
  font-size: 28rpx;
}

.history-content {
  flex: 1;
  padding: 40rpx 40rpx 60rpx 40rpx;
  max-height: 50vh;
  box-sizing: border-box;
}

/* 历史记录分页相关样式 */
.history-count-info {
  padding: 16rpx 30rpx;
  background: #f8f9fa;
  border-bottom: 1rpx solid #dee2e6;
  text-align: center;
}

.history-count-text {
  font-size: 24rpx;
  color: #6c757d;
}

.history-pagination-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: #f8f9fa;
  border-top: 1rpx solid #dee2e6;
}

.history-pagination-controls .pagination-btn {
  flex: 1;
  padding: 16rpx 24rpx;
  background: #07c160;
  border-radius: 8rpx;
  text-align: center;
  color: white;
  font-size: 28rpx;
  font-weight: 600;
}

.history-pagination-controls .pagination-btn.btn-disabled {
  background: #ccc;
  color: #999;
}

.history-pagination-controls .pagination-info {
  flex: 1;
  text-align: center;
}

.history-pagination-controls .pagination-info-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}

.load-more-tip {
  padding: 30rpx 0;
  text-align: center;
}

.load-more-text {
  font-size: 24rpx;
  color: #999;
}

/* 历史记录日期筛选样式 */
.history-modal .date-filter-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
  padding: 0 30rpx;
}

.history-modal .date-filter-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.history-modal .date-filter-label {
  font-size: 26rpx;
  color: #666;
}

.history-modal .date-filter-picker {
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  text-align: center;
  border: 2rpx solid #e9ecef;
  transition: all 0.3s ease;
}

.history-modal .date-filter-picker:active {
  background: #e9ecef;
  border-color: #07c160;
}

.history-modal .filter-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
  padding: 0 30rpx;
}

.history-modal .filter-btn {
  flex: 1;
  height: 70rpx;
  border-radius: 35rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.history-modal .query-btn {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
}

.history-modal .query-btn.btn-disabled {
  background: #ccc;
  color: #999;
}

.history-modal .reset-btn {
  background: #f8f9fa;
  color: #666;
  border: 2rpx solid #e9ecef;
}

.history-modal .reset-btn:active {
  background: #e9ecef;
}

.no-history {
  padding: 60rpx 0;
  text-align: center;
}

.no-history-text {
  font-size: 32rpx;
  color: #999;
}

.history-item {
  padding: 24rpx 28rpx;
  margin-bottom: 20rpx;
  background: #f8f9fa;
  border: 2rpx solid #e9ecef;
  border-radius: 16rpx;
  box-sizing: border-box;
}

.history-item:last-child {
  margin-bottom: 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.history-time {
  font-size: 24rpx;
  color: #666;
}

.history-group {
  font-size: 24rpx;
  color: #07c160;
  font-weight: 600;
  background: #e7f5ff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.history-member {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}

.history-change {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  word-break: break-all;
  overflow-wrap: break-word;
}

.change-label {
  font-size: 28rpx;
  color: #666;
  font-weight: 600;
}

.change-old {
  font-size: 28rpx;
  color: #f5576c;
  text-decoration: line-through;
  padding: 4rpx 8rpx;
  background: #ffeef0;
  border-radius: 6rpx;
}

.change-arrow {
  font-size: 28rpx;
  color: #07c160;
  font-weight: bold;
}

.change-new {
  font-size: 28rpx;
  color: #07c160;
  font-weight: 600;
  padding: 4rpx 8rpx;
  background: #e7f5ff;
  border-radius: 6rpx;
}

.daily-report-info {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  padding: 8rpx 12rpx;
  background: #f0f9ff;
  border-radius: 8rpx;
  line-height: 1.6;
  display: inline-block;
  max-width: 100%;
  word-break: break-all;
  overflow-wrap: break-word;
  box-sizing: border-box;
}

/* 提取所有信息和提取表格的日期选择弹窗样式 */
.export-date-modal {
  width: 90%;
  max-width: 600rpx;
  background: white;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

.export-date-modal .date-filter-row {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx;
}

.export-date-modal .date-filter-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.export-date-modal .date-filter-label {
  font-size: 28rpx;
  color: #1e293b;
  font-weight: 600;
}

.export-date-modal .date-filter-picker {
  height: 80rpx;
  padding: 0 24rpx;
  background: #f8f9fa;
  border: 2rpx solid #e2e8f0;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #1e293b;
  transition: all 0.2s ease;
}

.export-date-modal .date-filter-picker:active {
  border-color: #07c160;
  background: #f0fdf4;
}
</style>
