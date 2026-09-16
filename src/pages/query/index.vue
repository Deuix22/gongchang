<template>
  <view class="query-page">
    <!-- 顶部标题 -->
    <view class="header">
      <view class="header-back" @tap="handleBack">
        <text class="header-back-icon">←</text>
      </view>
      <view class="header-title">数据查询</view>
      <view class="header-placeholder"></view>
    </view>

    <!-- 功能切换标签 -->
    <view class="tab-bar">
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'member' }"
        @tap="activeTab = 'member'"
      >
        组员信息
      </view>
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'attendance' }"
        @tap="activeTab = 'attendance'"
      >
        出勤信息
      </view>
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'duration' }"
        @tap="activeTab = 'duration'"
      >
        出勤时长
      </view>
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'summary' }"
        @tap="activeTab = 'summary'"
      >
        汇总查询
      </view>
    </view>

    <!-- 组员信息查询 -->
    <scroll-view 
      v-if="activeTab === 'member'" 
      class="content" 
      scroll-y="true"
    >
      <view class="section">
        <view class="section-title-row" @tap="filterExpanded.member = !filterExpanded.member">
          <text class="section-title">组员信息查询</text>
          <text class="section-toggle">{{ filterExpanded.member ? '收起 ▲' : '展开 ▼' }}</text>
        </view>

        <view v-if="!filterExpanded.member" class="filter-summary-chips">
          <text v-if="memberKeyword" class="filter-chip">姓名: {{ memberKeyword }}</text>
          <text v-if="memberDepartment" class="filter-chip">{{ memberDepartment }}</text>
          <text v-if="memberShift" class="filter-chip">{{ memberShift === 'night' ? '夜班' : '白班' }}</text>
          <text v-if="!memberKeyword && !memberDepartment && !memberShift" class="filter-chip">全部组员</text>
        </view>

        <view v-show="filterExpanded.member">
        <!-- 筛选条件 -->
        <view class="filter-row">
          <view class="filter-item filter-item-flex">
            <text class="filter-label">姓名</text>
            <input 
              class="filter-input" 
              v-model="memberKeyword" 
              placeholder="请输入组员姓名关键字"
              confirm-type="search"
            />
          </view>
        </view>
        <view class="filter-row">
          <view class="filter-item">
            <text class="filter-label">部门</text>
            <picker 
              mode="selector" 
              :range="memberDepartmentOptions" 
              @change="e => memberDepartment = memberDepartmentOptions[e.detail.value]"
            >
              <view class="filter-picker">
                {{ memberDepartment || '全部部门' }}
              </view>
            </picker>
          </view>
          <view class="filter-item">
            <text class="filter-label">班次</text>
            <picker 
              mode="selector" 
              :range="['', 'day', 'night']" 
              :range-key="undefined"
              @change="e => memberShift = ['','day','night'][e.detail.value]"
            >
              <view class="filter-picker">
                {{ memberShift === 'day' ? '白班' : memberShift === 'night' ? '夜班' : '全部班次' }}
              </view>
            </picker>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="filter-actions">
          <button class="filter-btn reset-btn" @tap="handleResetMemberFilter">重置</button>
          <button 
            class="filter-btn query-btn" 
            :disabled="isLoadingMembers"
            @tap="handleQueryMembers"
          >
            {{ isLoadingMembers ? '查询中...' : '查询' }}
          </button>
          <button 
            class="filter-btn export-btn" 
            :disabled="isLoadingMembers || filteredMembersAll.length === 0"
            @tap="handleExportMembers"
          >
            导出表格
          </button>
        </view>
        </view>

        <view v-if="memberListSummary" class="summary-board">
          <view class="summary-item">
            <text class="summary-value">{{ memberListSummary.total }}</text>
            <text class="summary-label">组员总数</text>
          </view>
          <view class="summary-item">
            <text class="summary-value summary-value-accent">{{ memberListSummary.dayCount }}</text>
            <text class="summary-label">白班</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">{{ memberListSummary.nightCount }}</text>
            <text class="summary-label">夜班</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">{{ memberListSummary.deptCount }}</text>
            <text class="summary-label">涉及部门</text>
          </view>
        </view>

        <!-- 列表 -->
        <view class="record-list">
          <view 
            v-for="(member, index) in filteredMembers" 
            :key="index"
            class="record-item"
          >
            <view class="record-top">
              <view class="record-tags">
                <text v-if="member.department" class="tag tag-dept">{{ member.department }}</text>
                <text class="tag" :class="getShiftTagClass(member.shiftType)">{{ getShiftLabel(member.shiftType) }}</text>
              </view>
            </view>
            <view class="record-title-row">
              <text class="record-name">{{ member.memberName }}</text>
            </view>
            <view class="record-meta">
              <text class="meta-item">组长 {{ member.leaderName || '—' }}</text>
              <text class="meta-divider">|</text>
              <text class="meta-item">加入 {{ formatJoinDate(member.joinDate) || '—' }}</text>
            </view>
          </view>

          <view v-if="!isLoadingMembers && filteredMembers.length === 0" class="empty-tip">
            <text class="empty-text">暂无符合条件的组员</text>
          </view>
          <view v-if="isLoadingMembers" class="loading-tip">
            <text class="loading-text">加载中...</text>
          </view>

          <!-- 分页信息 -->
          <view v-if="filteredMembersAll.length > 0" class="member-pagination-info">
            <text class="pagination-text">
              共 {{ filteredMembersAll.length }} 个，第 {{ memberCurrentPage }} / {{ memberTotalPages }} 页
            </text>
          </view>
          <view v-if="filteredMembersAll.length > 0 && memberTotalPages > 1" class="member-pagination-controls">
            <view 
              class="pagination-btn"
              :class="{ 'btn-disabled': memberCurrentPage === 1 }"
              @tap="handlePrevMemberPage"
            >
              <text class="pagination-btn-text">上一页</text>
            </view>
            <view class="pagination-info">
              <text class="pagination-info-text">{{ memberCurrentPage }} / {{ memberTotalPages }}</text>
            </view>
            <view 
              class="pagination-btn"
              :class="{ 'btn-disabled': memberCurrentPage >= memberTotalPages }"
              @tap="handleNextMemberPage"
            >
              <text class="pagination-btn-text">下一页</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 出勤信息查询 -->
    <scroll-view 
      v-else-if="activeTab === 'attendance'" 
      class="content" 
      scroll-y="true"
    >
      <view class="section">
        <view class="section-title-row" @tap="filterExpanded.attendance = !filterExpanded.attendance">
          <text class="section-title">出勤信息查询</text>
          <text class="section-toggle">{{ filterExpanded.attendance ? '收起 ▲' : '展开 ▼' }}</text>
        </view>

        <view v-if="!filterExpanded.attendance" class="filter-summary-chips">
          <text class="filter-chip">{{ attendanceStartDate || '—' }} ~ {{ attendanceEndDate || '—' }}</text>
          <text v-if="attendanceMemberName" class="filter-chip">姓名: {{ attendanceMemberName }}</text>
          <text v-if="attendanceDepartment" class="filter-chip">{{ attendanceDepartment }}</text>
        </view>

        <view v-show="filterExpanded.attendance">
        <!-- 筛选条件 -->
        <view class="filter-row">
          <view class="filter-item">
            <text class="filter-label">开始日期</text>
            <picker 
              mode="date" 
              :value="attendanceStartDate" 
              @change="e => attendanceStartDate = e.detail.value"
            >
              <view class="filter-picker">
                {{ attendanceStartDate || '请选择' }}
              </view>
            </picker>
          </view>
          <view class="filter-item">
            <text class="filter-label">结束日期</text>
            <picker 
              mode="date" 
              :value="attendanceEndDate" 
              @change="e => attendanceEndDate = e.detail.value"
            >
              <view class="filter-picker">
                {{ attendanceEndDate || '请选择' }}
              </view>
            </picker>
          </view>
        </view>
        <view class="filter-row">
          <view class="filter-item filter-item-flex">
            <text class="filter-label">姓名</text>
            <input 
              class="filter-input" 
              v-model="attendanceMemberName" 
              placeholder="请输入组员姓名关键字"
              confirm-type="search"
            />
          </view>
        </view>
        <view class="filter-row">
          <view class="filter-item">
            <text class="filter-label">部门</text>
            <picker
              mode="selector"
              :range="attendanceDepartmentOptions"
              @change="e => attendanceDepartment = attendanceDepartmentOptions[e.detail.value]"
            >
              <view class="filter-picker">
                {{ attendanceDepartment || '全部部门' }}
              </view>
            </picker>
          </view>
        </view>

        <view class="filter-actions">
          <button class="filter-btn reset-btn" @tap="handleResetAttendanceFilter">重置</button>
          <button 
            class="filter-btn query-btn" 
            :disabled="isLoadingAttendance"
            @tap="handleQueryAttendance"
          >
            {{ isLoadingAttendance ? '查询中...' : '查询' }}
          </button>
          <button 
            class="filter-btn export-btn" 
            :disabled="isLoadingAttendance || attendanceFilteredAll.length === 0"
            @tap="handleExportAttendance"
          >
            导出表格
          </button>
        </view>
        </view>

        <view v-if="attendanceListSummary" class="summary-board">
          <view class="summary-item">
            <text class="summary-value">{{ attendanceListSummary.total }}</text>
            <text class="summary-label">记录条数</text>
          </view>
          <view class="summary-item">
            <text class="summary-value summary-value-accent">{{ attendanceListSummary.memberCount }}</text>
            <text class="summary-label">涉及人数</text>
          </view>
          <view class="summary-item">
            <text class="summary-value status-good">{{ attendanceListSummary.present }}</text>
            <text class="summary-label">正常出勤</text>
          </view>
          <view class="summary-item">
            <text class="summary-value status-bad">{{ attendanceListSummary.absent + attendanceListSummary.leave }}</text>
            <text class="summary-label">缺勤/请假</text>
          </view>
        </view>

        <!-- 出勤记录列表 -->
        <view class="record-list">
          <view 
            v-for="(item, index) in attendanceDisplayList" 
            :key="index"
            class="record-item"
          >
            <view class="record-top">
              <view class="record-tags">
                <text class="tag tag-date">{{ item.date }}</text>
                <text v-if="item.department" class="tag tag-dept">{{ item.department }}</text>
                <text class="tag" :class="getShiftTagClass(item.shiftType)">{{ getShiftLabel(item.shiftType) }}</text>
              </view>
              <view class="status-badge" :class="getAttendanceStatusClass(item.status)">
                <text class="status-badge-text">{{ item.status || '—' }}</text>
              </view>
            </view>
            <view class="record-title-row">
              <text class="record-name">{{ item.memberName }}</text>
            </view>
            <view class="record-meta">
              <text class="meta-item">组长 {{ item.leaderName || '—' }}</text>
            </view>
          </view>

          <view v-if="!isLoadingAttendance && attendanceFilteredAll.length === 0" class="empty-tip">
            <text class="empty-text">
              {{ attendanceStartDate || attendanceEndDate || attendanceMemberName ? '暂无符合条件的出勤记录' : '请选择日期或输入姓名后查询' }}
            </text>
          </view>
          <view v-if="isLoadingAttendance" class="loading-tip">
            <text class="loading-text">查询中...</text>
          </view>

          <!-- 分页信息 -->
          <view v-if="attendanceFilteredAll.length > 0" class="member-pagination-info">
            <text class="pagination-text">
              共 {{ attendanceFilteredAll.length }} 条，第 {{ attendanceCurrentPage }} / {{ attendanceTotalPages }} 页
            </text>
          </view>
          <view v-if="attendanceFilteredAll.length > 0 && attendanceTotalPages > 1" class="member-pagination-controls">
            <view 
              class="pagination-btn"
              :class="{ 'btn-disabled': attendanceCurrentPage === 1 }"
              @tap="handlePrevAttendancePage"
            >
              <text class="pagination-btn-text">上一页</text>
            </view>
            <view class="pagination-info">
              <text class="pagination-info-text">{{ attendanceCurrentPage }} / {{ attendanceTotalPages }}</text>
            </view>
            <view 
              class="pagination-btn"
              :class="{ 'btn-disabled': attendanceCurrentPage >= attendanceTotalPages }"
              @tap="handleNextAttendancePage"
            >
              <text class="pagination-btn-text">下一页</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 出勤时长查询（按月统计） -->
    <scroll-view 
      v-else-if="activeTab === 'duration'"
      class="content" 
      scroll-y="true"
    >
      <view class="section">
        <view class="section-title-row" @tap="filterExpanded.duration = !filterExpanded.duration">
          <text class="section-title">出勤时长查询</text>
          <text class="section-toggle">{{ filterExpanded.duration ? '收起 ▲' : '展开 ▼' }}</text>
        </view>

        <view v-if="!filterExpanded.duration" class="filter-summary-chips">
          <text class="filter-chip">{{ durationStartDate || '—' }} ~ {{ durationEndDate || '—' }}</text>
          <text v-if="durationMemberName" class="filter-chip">姓名: {{ durationMemberName }}</text>
          <text v-if="durationDepartment" class="filter-chip">{{ durationDepartment }}</text>
        </view>

        <view v-show="filterExpanded.duration">
        <!-- 筛选条件 -->
        <view class="filter-row">
          <view class="filter-item">
            <text class="filter-label">开始日期</text>
            <picker 
              mode="date" 
              :value="durationStartDate" 
              @change="e => durationStartDate = e.detail.value"
            >
              <view class="filter-picker">
                {{ durationStartDate || '请选择' }}
              </view>
            </picker>
          </view>
          <view class="filter-item">
            <text class="filter-label">结束日期</text>
            <picker 
              mode="date" 
              :value="durationEndDate" 
              @change="e => durationEndDate = e.detail.value"
            >
              <view class="filter-picker">
                {{ durationEndDate || '请选择' }}
              </view>
            </picker>
          </view>
        </view>
        <view class="filter-row">
          <view class="filter-item filter-item-flex">
            <text class="filter-label">姓名</text>
            <input 
              class="filter-input" 
              v-model="durationMemberName" 
              placeholder="请输入组员姓名关键字"
              confirm-type="search"
            />
          </view>
        </view>
        <view class="filter-row">
          <view class="filter-item">
            <text class="filter-label">部门</text>
            <picker
              mode="selector"
              :range="durationDepartmentOptions"
              @change="e => durationDepartment = durationDepartmentOptions[e.detail.value]"
            >
              <view class="filter-picker">
                {{ durationDepartment || '全部部门' }}
              </view>
            </picker>
          </view>
        </view>

        <view class="filter-actions">
          <button class="filter-btn reset-btn" @tap="handleResetDurationFilter">重置</button>
          <button 
            class="filter-btn query-btn" 
            :disabled="isLoadingDuration"
            @tap="handleQueryDuration"
          >
            {{ isLoadingDuration ? '查询中...' : '查询' }}
          </button>
          <button 
            class="filter-btn export-btn" 
            :disabled="isLoadingDuration || durationFilteredAll.length === 0"
            @tap="handleExportDuration"
          >
            导出表格
          </button>
        </view>
        </view>

        <view v-if="durationListSummary" class="summary-board">
          <view class="summary-item">
            <text class="summary-value">{{ durationListSummary.total }}</text>
            <text class="summary-label">记录条数</text>
          </view>
          <view class="summary-item">
            <text class="summary-value summary-value-accent">{{ durationListSummary.memberCount }}</text>
            <text class="summary-label">涉及人数</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">{{ formatHoursText(durationListSummary.totalMinutes) }}</text>
            <text class="summary-label">累计时长</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">{{ formatHoursText(durationListSummary.avgMinutes) }}</text>
            <text class="summary-label">人均时长</text>
          </view>
        </view>

        <!-- 出勤时长列表 -->
        <view class="record-list">
          <view 
            v-for="(item, index) in durationDisplayList" 
            :key="index"
            class="record-item"
          >
            <view class="record-top">
              <view class="record-tags">
                <text class="tag tag-date">{{ item.date }}</text>
                <text v-if="item.department" class="tag tag-dept">{{ item.department }}</text>
                <text class="tag" :class="getShiftTagClass(item.shiftType)">{{ getShiftLabel(item.shiftType) }}</text>
              </view>
            </view>
            <view class="record-title-row">
              <text class="record-name">{{ item.memberName }}</text>
              <text class="duration-highlight">{{ item.durationText || '—' }}</text>
            </view>
            <view class="record-meta">
              <text class="meta-item">组长 {{ item.leaderName || '—' }}</text>
            </view>
            <view class="kpi-grid">
              <view class="kpi-cell">
                <text class="kpi-num">{{ formatTimeDisplay(item.startTime) }}</text>
                <text class="kpi-name">上班</text>
              </view>
              <view class="kpi-cell">
                <text class="kpi-num">{{ formatTimeDisplay(item.endTime) }}</text>
                <text class="kpi-name">下班</text>
              </view>
            </view>
          </view>

          <view v-if="!isLoadingDuration && durationFilteredAll.length === 0" class="empty-tip">
            <text class="empty-text">
              {{ durationStartDate || durationEndDate || durationMemberName ? '暂无符合条件的出勤时长记录' : '请选择日期或输入姓名后查询' }}
            </text>
          </view>
          <view v-if="isLoadingDuration" class="loading-tip">
            <text class="loading-text">查询中...</text>
          </view>

          <!-- 分页信息 -->
          <view v-if="durationFilteredAll.length > 0" class="member-pagination-info">
            <text class="pagination-text">
              共 {{ durationFilteredAll.length }} 条，第 {{ durationCurrentPage }} / {{ durationTotalPages }} 页
            </text>
          </view>
          <view v-if="durationFilteredAll.length > 0 && durationTotalPages > 1" class="member-pagination-controls">
            <view 
              class="pagination-btn"
              :class="{ 'btn-disabled': durationCurrentPage === 1 }"
              @tap="handlePrevDurationPage"
            >
              <text class="pagination-btn-text">上一页</text>
            </view>
            <view class="pagination-info">
              <text class="pagination-info-text">{{ durationCurrentPage }} / {{ durationTotalPages }}</text>
            </view>
            <view 
              class="pagination-btn"
              :class="{ 'btn-disabled': durationCurrentPage >= durationTotalPages }"
              @tap="handleNextDurationPage"
            >
              <text class="pagination-btn-text">下一页</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 汇总查询 -->
    <scroll-view 
      v-else-if="activeTab === 'summary'"
      class="content" 
      scroll-y="true"
    >
      <view class="section">
        <view class="section-title-row" @tap="filterExpanded.summary = !filterExpanded.summary">
          <text class="section-title">汇总查询</text>
          <text class="section-toggle">{{ filterExpanded.summary ? '收起 ▲' : '展开 ▼' }}</text>
        </view>

        <view v-if="!filterExpanded.summary" class="filter-summary-chips">
          <text class="filter-chip">{{ summaryStartDate || '—' }} ~ {{ summaryEndDate || '—' }}</text>
          <text class="filter-chip">
            {{ summaryQueryType === 'member' ? '按组员' : summaryQueryType === 'department' ? '按部门' : '部门汇总' }}
          </text>
          <text v-if="summaryKeyword" class="filter-chip">{{ summaryKeyword }}</text>
          <text v-if="summaryDepartment" class="filter-chip">{{ summaryDepartment }}</text>
        </view>

        <view v-show="filterExpanded.summary">
        <!-- 筛选条件 -->
        <view class="filter-row">
          <view class="filter-item">
            <text class="filter-label">开始日期</text>
            <picker 
              mode="date" 
              :value="summaryStartDate" 
              @change="e => summaryStartDate = e.detail.value"
            >
              <view class="filter-picker">
                {{ summaryStartDate || '请选择' }}
              </view>
            </picker>
          </view>
          <view class="filter-item">
            <text class="filter-label">结束日期</text>
            <picker 
              mode="date" 
              :value="summaryEndDate" 
              @change="e => summaryEndDate = e.detail.value"
            >
              <view class="filter-picker">
                {{ summaryEndDate || '请选择' }}
              </view>
            </picker>
          </view>
        </view>
        <view class="filter-row">
          <view class="filter-item">
            <text class="filter-label">查询类型</text>
            <picker 
              mode="selector" 
              :range="['组员', '部门', '汇总']" 
              @change="e => {
                summaryQueryType = ['member', 'department', 'aggregate'][e.detail.value]
                summaryKeyword = ''
                summaryDepartment = ''
              }"
            >
              <view class="filter-picker">
                {{ summaryQueryType === 'member' ? '组员' : summaryQueryType === 'department' ? '部门' : summaryQueryType === 'aggregate' ? '汇总' : '请选择' }}
              </view>
            </picker>
          </view>
        </view>
        <view class="filter-row">
          <view class="filter-item filter-item-flex" v-if="summaryQueryType === 'member'">
            <text class="filter-label">组员姓名</text>
            <input 
              class="filter-input" 
              v-model="summaryKeyword" 
              placeholder="请输入组员姓名"
              confirm-type="search"
            />
          </view>
          <view class="filter-item" v-if="summaryQueryType === 'department' || summaryQueryType === 'aggregate'">
            <text class="filter-label">部门</text>
            <picker
              mode="selector"
              :range="summaryDepartmentOptions"
              @change="e => summaryDepartment = summaryDepartmentOptions[e.detail.value]"
            >
              <view class="filter-picker">
                {{ summaryDepartment || '全部部门' }}
              </view>
            </picker>
          </view>
        </view>

        <view class="filter-actions">
          <button class="filter-btn reset-btn" @tap="handleResetSummaryFilter">重置</button>
          <button 
            class="filter-btn query-btn" 
            :disabled="isLoadingSummary"
            @tap="handleQuerySummary"
          >
            {{ isLoadingSummary ? '查询中...' : '查询' }}
          </button>
          <button 
            class="filter-btn export-btn" 
            :disabled="isLoadingSummary || (summaryQueryType === 'aggregate' ? summaryMemberList.length === 0 : summaryDetailList.length === 0)"
            @tap="handleExportSummary"
          >
            导出表格
          </button>
          <button 
            class="filter-btn export-all-btn" 
            :disabled="isLoadingSummary || !summaryStartDate || !summaryEndDate || !summaryQueryType"
            @tap="handleExportSummaryAll"
          >
            全部导出
          </button>
        </view>
        </view>

        <!-- 汇总结果 -->
        <view class="summary-result" v-if="summaryResult && summaryQueryType !== 'aggregate'">
          <view class="summary-board summary-board--hero">
            <view class="summary-item summary-item--wide">
              <text class="summary-value summary-value-hero">{{ summaryResult.totalHours }}</text>
              <text class="summary-label">累计出勤工时（小时）</text>
            </view>
            <view class="summary-item">
              <text class="summary-value">{{ summaryResult.name || '—' }}</text>
              <text class="summary-label">{{ summaryQueryType === 'member' ? '组员' : '部门' }}</text>
            </view>
            <view class="summary-item">
              <text class="summary-value">{{ summaryStartDate }} ~ {{ summaryEndDate }}</text>
              <text class="summary-label">查询区间</text>
            </view>
          </view>
        </view>

        <!-- 成员汇总列表（aggregate类型） -->
        <view class="summary-result" v-if="summaryResult && summaryQueryType === 'aggregate' && summaryResult.members">
          <view class="summary-board summary-board--hero">
            <view class="summary-item summary-item--wide">
              <text class="summary-value summary-value-hero">{{ summaryResult.members.length }}</text>
              <text class="summary-label">部门成员数</text>
            </view>
            <view class="summary-item">
              <text class="summary-value">{{ summaryResult.department || '—' }}</text>
              <text class="summary-label">部门</text>
            </view>
            <view class="summary-item">
              <text class="summary-value">{{ summaryStartDate }} ~ {{ summaryEndDate }}</text>
              <text class="summary-label">查询区间</text>
            </view>
          </view>
          <view class="record-list">
            <view 
              v-for="(member, index) in summaryResult.members" 
              :key="index"
              class="record-item record-item--compact"
            >
              <view class="record-title-row">
                <text class="record-name">{{ member.name }}</text>
                <text class="duration-highlight">{{ member.totalHours }} 小时</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="!isLoadingSummary && !summaryResult && (summaryStartDate || summaryEndDate || summaryKeyword || summaryDepartment)" class="empty-tip">
          <text class="empty-text">暂无符合条件的汇总数据</text>
        </view>
        <view v-if="isLoadingSummary" class="loading-tip">
          <text class="loading-text">查询中...</text>
        </view>
        <view v-if="!isLoadingSummary && !summaryResult && !summaryStartDate && !summaryEndDate && !summaryKeyword && !summaryDepartment" class="empty-tip">
          <text class="empty-text">请选择日期范围、查询类型并{{ summaryQueryType === 'member' ? '输入组员姓名' : (summaryQueryType === 'department' || summaryQueryType === 'aggregate') ? '选择部门' : '完成查询条件' }}后查询</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getAllLeaders } from '@/utils/api/user.js'
import { getMembers } from '@/utils/api/member.js'
import { getHistory } from '@/utils/api/history.js'
import { getMonthlyAttendance, getAttendanceRecords } from '@/utils/api/attendance.js'

// 当前标签：member | attendance | duration | summary
const activeTab = ref('member')

const filterExpanded = ref({
  member: true,
  attendance: true,
  duration: true,
  summary: true
})

const collapseFilter = (tab) => {
  filterExpanded.value = { ...filterExpanded.value, [tab]: false }
}

const formatCompactNumber = (val) => {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

const formatHoursText = (minutes) => {
  const total = Number(minutes)
  if (!total || Number.isNaN(total) || total <= 0) return '0'
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins}分`
  return mins === 0 ? `${hours}时` : `${hours}时${mins}分`
}

const getAttendanceStatusClass = (status = '') => {
  const text = String(status)
  if (text.includes('缺勤')) return 'status-bad'
  if (text.includes('请假')) return 'status-warn'
  if (text.includes('出勤') || text.includes('正常') || text.includes('在岗')) return 'status-good'
  return 'status-neutral'
}

const getShiftLabel = (shiftType) => (shiftType === 'night' ? '夜班' : '白班')

const getShiftTagClass = (shiftType) =>
  shiftType === 'night' ? 'tag-shift-night' : 'tag-shift-day'

// 1. 组员信息
const allMembers = ref([])
const isLoadingMembers = ref(false)
const memberKeyword = ref('')
const memberDepartment = ref('')
const memberShift = ref('') // '', 'day', 'night'
const memberPageSize = 100
const memberCurrentPage = ref(1)

// 获取组长显示名称（优先显示真实名字，如果没有则显示ID）
// 逻辑与设置页保持一致：优先用 nickName / name / username，其次再用 leaderId 去 allUsers 里查
const getLeaderDisplayName = (leader = {}) => {
  // 先从当前 leader 对象里直接拿人类可读的名字
  const directName =
    leader.nickName ||
    leader.name ||
    leader.username ||
    leader.leaderName

  const idLike =
    leader.leaderId ||
    leader.id ||
    leader.userId ||
    leader.username ||
    ''

  let base = directName || idLike

  if (!base || base === '未知' || base === 'unknown_legacy') {
    return ''
  }

  // 如果是 leader_xxx 这种ID，再尝试从 allUsers 里映射成昵称
  if (typeof base === 'string' && base.startsWith('leader_')) {
    const allUsers = uni.getStorageSync('allUsers') || []
    const user = Array.isArray(allUsers)
      ? allUsers.find(u => u.userId === base)
      : null
    if (user && user.nickName) {
      return user.nickName
    }
    // 找不到映射时，去掉前缀显示后半段
    return base.replace(/^leader_/, '')
  }

  return base
}

// 解析组员变动历史 newValue
const parseMemberChangeDetail = (log) => {
  if (!log) return {}
  if (log.newValue && typeof log.newValue === 'object') {
    return log.newValue
  }
  if (typeof log.newValue === 'string') {
    try {
      return JSON.parse(log.newValue)
    } catch (e) {
      return {}
    }
  }
  return {}
}

// 组员记录去重键：同一组长、同一姓名、同一加入日视为同一条
const buildMemberRecordKey = (record = {}) => {
  const leaderId = record.leaderId || ''
  const name = (record.memberName || '').trim()
  const joinDate = formatJoinDate(record.joinDate) || ''
  return `${leaderId}|${name}|${joinDate}`
}

// 从 member_change 历史中补全曾加入其他组的记录（当前组员列表不含已离组成员）
const mergeMembersFromChangeHistory = (currentList, historyLogs = [], leaderInfoMap = new Map()) => {
  const merged = [...currentList]
  const existingKeys = new Set(currentList.map(buildMemberRecordKey))

  const isAddChange = (changeType = '') =>
    changeType.includes('新增')

  historyLogs.forEach(log => {
    const detail = parseMemberChangeDetail(log)
    const changeType = detail.changeType || log.oldValue || ''
    if (!isAddChange(changeType)) return

    const leaderId = log.leaderId || log.changedBy || ''
    const memberName = (detail.memberName || log.memberName || '').trim()
    if (!memberName) return

    const leaderMeta = leaderInfoMap.get(leaderId) || {}
    const department =
      detail.department ||
      log.department ||
      leaderMeta.department ||
      ''
    const leaderNameRaw =
      detail.leaderName ||
      log.leaderName ||
      leaderMeta.leaderName ||
      ''
    const leaderName =
      getLeaderDisplayName({ leaderId, nickName: leaderNameRaw }) || leaderNameRaw
    const joinDate =
      detail.timestamp ||
      log.changedAt ||
      log.createdAt ||
      log.timestamp ||
      ''

    const entry = {
      memberId: log.memberId || detail.memberId || '',
      memberName,
      leaderId,
      department,
      leaderName,
      groupName: leaderMeta.groupName || department,
      shiftType: detail.shiftType || log.shiftType || 'day',
      joinDate,
      fromHistory: true
    }

    const key = buildMemberRecordKey(entry)
    if (existingKeys.has(key)) return
    existingKeys.add(key)
    merged.push(entry)
  })

  return merged
}

// 按姓名关键字匹配历史记录（含编辑姓名时旧名）
const historyLogMatchesKeyword = (log, keyword) => {
  if (!keyword) return true
  const detail = parseMemberChangeDetail(log)
  const changeType = detail.changeType || log.oldValue || ''
  const memberName = detail.memberName || log.memberName || ''
  if (memberName && memberName.includes(keyword)) return true
  if (changeType && changeType.includes(keyword)) return true
  return false
}

const loadMembers = async (options = {}) => {
  const { includeHistory = false, keyword = '' } = options
  if (isLoadingMembers.value) return
  isLoadingMembers.value = true
  try {
    const leaders = await getAllLeaders(true) // includeMembers=true
    const list = []
    const leaderInfoMap = new Map()
    const usersFromLeaders = []
    if (Array.isArray(leaders)) {
      // 依次处理每个组长，按leaderId去 members 表里拿 createdAt 作为加入日期
      for (const leader of leaders) {
        const members = Array.isArray(leader.members) ? leader.members : []
        const leaderDisplayName = getLeaderDisplayName(leader)
        // 从组长信息里构造一个简易的 allUsers 缓存，供其他页面和本页使用
        const leaderId =
          leader.leaderId ||
          leader.id ||
          leader.userId ||
          leader.username ||
          ''
        const leaderName =
          leaderDisplayName ||
          leader.nickName ||
          leader.name ||
          leader.username ||
          ''
        const department = leader.department || ''
        const groupName = leader.groupName || leader.department || ''
        if (leaderId) {
          leaderInfoMap.set(leaderId, {
            department,
            groupName,
            leaderName: leaderName || leaderDisplayName
          })
        }
        if (leaderId && leaderName) {
          usersFromLeaders.push({
            userId: leaderId,
            nickName: leaderName
          })
        }

        // 从 /leaders/{leaderId}/members 接口获取更完整的组员信息（包含 createdAt）
        const joinDateMap = new Map()
        if (leaderId) {
          try {
            const remoteMembers = await getMembers(leaderId)
            if (Array.isArray(remoteMembers)) {
              remoteMembers.forEach(r => {
                const key = r.memberId || r.id || r._id || r.name
                if (!key) return
                const created =
                  r.createdAt ||
                  r.joinedAt ||
                  r.createdTime ||
                  r.created_at ||
                  ''
                if (created) {
                  joinDateMap.set(key, created)
                }
              })
            }
          } catch (e) {
            console.warn('获取组员加入日期失败（忽略，继续使用基础信息）:', leaderId, e)
          }
        }

        members.forEach(m => {
          const memberId = m.memberId || m.id || m._id || m.name
          const joinDateFromMember =
            m.createdAt || m.joinedAt || m.createdTime || m.created_at || ''
          const joinDateFromRemote = memberId ? joinDateMap.get(memberId) : ''

          list.push({
            memberId,
            memberName: m.name || m.memberName || '',
            leaderId,
            department,
            leaderName: leaderDisplayName || leader.name || leader.leaderName || '',
            groupName,
            shiftType: m.shiftType || 'day',
            // 加入日期：优先使用members表的createdAt，其次使用leaders接口里自带的时间字段
            joinDate: joinDateFromRemote || joinDateFromMember || ''
          })
        })
      }
    }

    let finalList = list
    if (includeHistory) {
      try {
        const historyParams = { field: 'member_change' }
        if (keyword) {
          historyParams.memberName = keyword
        }
        let historyLogs = await getHistory(historyParams)
        // 后端 memberName 可能是精确匹配；无结果时拉全量再前端过滤（支持模糊/曾用名）
        if (keyword && (!Array.isArray(historyLogs) || historyLogs.length === 0)) {
          historyLogs = await getHistory({ field: 'member_change' })
        }
        const filteredLogs = keyword
          ? (historyLogs || []).filter(log => historyLogMatchesKeyword(log, keyword))
          : (historyLogs || [])
        finalList = mergeMembersFromChangeHistory(list, filteredLogs, leaderInfoMap)
        console.log(
          `组员历史合并：当前 ${list.length} 条，历史新增 ${filteredLogs.length} 条，合并后 ${finalList.length} 条`
        )
      } catch (historyError) {
        console.warn('加载组员变动历史失败，仅展示当前组员:', historyError)
      }
    }

    allMembers.value = finalList

    // 如果本地还没有 allUsers 缓存，就用当前获取到的组长列表初始化一份
    const cachedAllUsers = uni.getStorageSync('allUsers') || []
    if (!Array.isArray(cachedAllUsers) || cachedAllUsers.length === 0) {
      if (usersFromLeaders.length > 0) {
        uni.setStorageSync('allUsers', usersFromLeaders)
        console.log('已在查询页面初始化 allUsers 缓存（来自组长列表）:', usersFromLeaders.length)
      }
    }
  } catch (error) {
    console.error('加载组员信息失败:', error)
    uni.showToast({
      title: '加载组员信息失败',
      icon: 'none'
    })
  } finally {
    isLoadingMembers.value = false
  }
}

// 组员信息：点击「查询」时重新加载，并按姓名合并历史组员变动记录
const handleQueryMembers = async () => {
  const keyword = memberKeyword.value.trim()
  await loadMembers({
    includeHistory: true,
    keyword
  })
  collapseFilter('member')
}

// 组员信息：重置所有筛选条件，并保留已加载的数据
const handleResetMemberFilter = () => {
  memberKeyword.value = ''
  memberDepartment.value = ''
  memberShift.value = ''
  memberCurrentPage.value = 1
}

// 组员信息：部门选项（去重）
const memberDepartmentOptions = computed(() => {
  const set = new Set()
  allMembers.value.forEach(m => {
    if (m.department) set.add(m.department)
  })
  return Array.from(set)
})

// 组员信息：按姓名/部门/班次做整体过滤
const filteredMembersAll = computed(() => {
  const keyword = memberKeyword.value.trim()
  return allMembers.value.filter(m => {
    if (memberDepartment.value && m.department !== memberDepartment.value) {
      return false
    }
    if (memberShift.value && m.shiftType !== memberShift.value) {
      return false
    }
    if (!keyword) return true
    return (
      (m.memberName && m.memberName.includes(keyword)) ||
      (m.department && m.department.includes(keyword)) ||
      (m.leaderName && m.leaderName.includes(keyword)) ||
      (m.groupName && m.groupName.includes(keyword))
    )
  })
})

// 组员信息：分页
const memberTotalPages = computed(() => {
  const total = filteredMembersAll.value.length
  if (!total) return 1
  return Math.ceil(total / memberPageSize)
})

const filteredMembers = computed(() => {
  const start = (memberCurrentPage.value - 1) * memberPageSize
  const end = start + memberPageSize
  return filteredMembersAll.value.slice(start, end)
})

const memberListSummary = computed(() => {
  const list = filteredMembersAll.value
  if (!list.length) return null
  let dayCount = 0
  let nightCount = 0
  const depts = new Set()
  list.forEach((m) => {
    if (m.shiftType === 'night') nightCount += 1
    else dayCount += 1
    if (m.department) depts.add(m.department)
  })
  return {
    total: list.length,
    dayCount,
    nightCount,
    deptCount: depts.size
  }
})

const handlePrevMemberPage = () => {
  if (memberCurrentPage.value > 1) {
    memberCurrentPage.value -= 1
  }
}

const handleNextMemberPage = () => {
  if (memberCurrentPage.value < memberTotalPages.value) {
    memberCurrentPage.value += 1
  }
}

// 任一筛选条件变化时，回到第一页
watch([memberKeyword, memberDepartment, memberShift], () => {
  memberCurrentPage.value = 1
})

// 2. 出勤信息（按历史记录查询）
const attendanceStartDate = ref('')
const attendanceEndDate = ref('')
const attendanceMemberName = ref('')
const attendanceDepartment = ref('')
const isLoadingAttendance = ref(false)
const attendanceList = ref([]) // 原始列表
const attendancePageSize = 100
const attendanceCurrentPage = ref(1)

const handleResetAttendanceFilter = () => {
  attendanceStartDate.value = ''
  attendanceEndDate.value = ''
  attendanceMemberName.value = ''
  attendanceDepartment.value = ''
  attendanceList.value = []
  attendanceCurrentPage.value = 1
}

const handleQueryAttendance = async () => {
  if (isLoadingAttendance.value) return

  if (!attendanceStartDate.value && !attendanceEndDate.value && !attendanceMemberName.value) {
    uni.showToast({
      title: '请至少选择日期或输入姓名',
      icon: 'none'
    })
    return
  }

  if (attendanceStartDate.value && attendanceEndDate.value && attendanceStartDate.value > attendanceEndDate.value) {
    uni.showToast({
      title: '开始日期不能晚于结束日期',
      icon: 'none'
    })
    return
  }

  isLoadingAttendance.value = true
  attendanceList.value = []
  try {
    const params = { field: 'daily_report' }
    if (attendanceStartDate.value) params.start = attendanceStartDate.value
    if (attendanceEndDate.value) {
      // 结束日期加一天，包含当天
      const end = new Date(attendanceEndDate.value)
      end.setDate(end.getDate() + 1)
      params.end = formatDate(end)
    }
    if (attendanceMemberName.value.trim()) params.memberName = attendanceMemberName.value.trim()

    const history = await getHistory(params)
    if (Array.isArray(history)) {
      const mapped = history
        .filter(item => item?.field === 'daily_report')
        .map(item => {
          const extra = parseDailyReportPayload(item.newValue)
          const department = extra.department || item.department || item.group || '未分组'
          const leaderId = item.leaderId || item.changedBy || ''
          const leaderNameRaw = extra.leaderName || item.leaderName || item.changedBy || ''
          const leaderDisplay =
            getLeaderDisplayName({ leaderId, nickName: leaderNameRaw }) || leaderNameRaw
          const memberName = item.memberName || extra.memberName || '未知成员'
          const date = extra.reportDate || formatDateOnly(item.changedAt || item.timestamp || item.createdAt || new Date())
          const shiftType = extra.shiftType || item.shiftType || ''
          // 从 oldValue 中读取状态：'缺勤' 或 '请假' 或 '请假-事假' 等
          const status = item.oldValue || '缺勤'
          let leaveType = null
          let finalStatus = status
          if (status.startsWith && status.startsWith('请假-')) {
            leaveType = status.substring(3)
            finalStatus = '请假'
          } else if (status === '请假' && extra.leaveType) {
            leaveType = extra.leaveType
          }
          const statusText =
            finalStatus === '请假' && leaveType ? `${finalStatus}（${leaveType}）` : finalStatus

          return {
            memberName,
            department,
            leaderName: leaderDisplay,
            date,
            shiftType,
            status: statusText
          }
        })
      attendanceList.value = mapped
      attendanceCurrentPage.value = 1
      collapseFilter('attendance')
    } else {
      attendanceList.value = []
    }
  } catch (error) {
    console.error('查询出勤信息失败:', error)
    uni.showToast({
      title: '查询出勤信息失败',
      icon: 'none'
    })
  } finally {
    isLoadingAttendance.value = false
  }
}

// 出勤信息：部门选项（基于当前查询结果去重）
const attendanceDepartmentOptions = computed(() => {
  const set = new Set()
  attendanceList.value.forEach(item => {
    if (item.department) set.add(item.department)
  })
  return Array.from(set)
})

// 出勤信息：按姓名/部门再次过滤（在当前查询结果内）
const attendanceFilteredAll = computed(() => {
  const keyword = attendanceMemberName.value.trim()
  return attendanceList.value.filter(item => {
    if (attendanceDepartment.value && item.department !== attendanceDepartment.value) {
      return false
    }
    if (!keyword) return true
    return (
      (item.memberName && item.memberName.includes(keyword)) ||
      (item.department && item.department.includes(keyword)) ||
      (item.leaderName && item.leaderName.includes(keyword))
    )
  })
})

const attendanceTotalPages = computed(() => {
  const total = attendanceFilteredAll.value.length
  if (!total) return 1
  return Math.ceil(total / attendancePageSize)
})

const attendanceDisplayList = computed(() => {
  const start = (attendanceCurrentPage.value - 1) * attendancePageSize
  const end = start + attendancePageSize
  return attendanceFilteredAll.value.slice(start, end)
})

const attendanceListSummary = computed(() => {
  const list = attendanceFilteredAll.value
  if (!list.length) return null
  let present = 0
  let absent = 0
  let leave = 0
  const members = new Set()
  list.forEach((item) => {
    if (item.memberName) members.add(item.memberName)
    const status = String(item.status || '')
    if (status.includes('缺勤')) absent += 1
    else if (status.includes('请假')) leave += 1
    else present += 1
  })
  return {
    total: list.length,
    memberCount: members.size,
    present,
    absent,
    leave
  }
})

const handlePrevAttendancePage = () => {
  if (attendanceCurrentPage.value > 1) {
    attendanceCurrentPage.value -= 1
  }
}

const handleNextAttendancePage = () => {
  if (attendanceCurrentPage.value < attendanceTotalPages.value) {
    attendanceCurrentPage.value += 1
  }
}

// 出勤筛选条件变化时，回到第一页
watch([attendanceMemberName, attendanceDepartment], () => {
  attendanceCurrentPage.value = 1
})

// 3. 出勤时长（按日期区间查询，内部仍按月份接口获取数据）
const durationStartDate = ref('')
const durationEndDate = ref('')
const durationMemberName = ref('')
const durationDepartment = ref('')
const isLoadingDuration = ref(false)
const durationList = ref([]) // 原始列表
const durationPageSize = 100
const durationCurrentPage = ref(1)

const handleResetDurationFilter = () => {
  durationStartDate.value = ''
  durationEndDate.value = ''
  durationMemberName.value = ''
  durationDepartment.value = ''
  durationList.value = []
  durationCurrentPage.value = 1
}

const handleQueryDuration = async () => {
  if (isLoadingDuration.value) return

  if (!durationStartDate.value && !durationEndDate.value && !durationMemberName.value) {
    uni.showToast({
      title: '请至少选择日期或输入姓名',
      icon: 'none'
    })
    return
  }

  if (durationStartDate.value && durationEndDate.value && durationStartDate.value > durationEndDate.value) {
    uni.showToast({
      title: '开始日期不能晚于结束日期',
      icon: 'none'
    })
    return
  }

  // 目前后端月度接口按月份查询，这里限制日期必须在同一月份内
  if (durationStartDate.value && durationEndDate.value) {
    const m1 = durationStartDate.value.slice(0, 7)
    const m2 = durationEndDate.value.slice(0, 7)
    if (m1 !== m2) {
      uni.showToast({
        title: '目前仅支持同一月份内的日期范围',
        icon: 'none'
      })
      return
    }
  }

  isLoadingDuration.value = true
  durationList.value = []

  try {
    // 计算要查询的月份：优先用开始日期，否则用结束日期
    const baseDateStr = durationStartDate.value || durationEndDate.value
    const baseDate = new Date(baseDateStr)
    const year = baseDate.getFullYear()
    const month = String(baseDate.getMonth() + 1).padStart(2, '0')
    const yearMonth = `${year}-${month}`

    const response = await getMonthlyAttendance(yearMonth)
    if (!response || !response.data || !Array.isArray(response.data)) {
      durationList.value = []
      return
    }

    const result = []
    response.data.forEach(item => {
      const date = item.date
      // 如果选择了日期范围，则按日期进一步过滤
      if (durationStartDate.value && date < durationStartDate.value) return
      if (durationEndDate.value && date > durationEndDate.value) return

      const records = Array.isArray(item.records) ? item.records : []
      records.forEach(record => {
        const memberName = record.memberName || ''
        if (durationMemberName.value.trim()) {
          if (!memberName.includes(durationMemberName.value.trim())) return
        }

        // 格式化时长
        const minutes = record.duration || 0
        let durationText = ''
        if (minutes > 0) {
          const hours = Math.floor(minutes / 60)
          const mins = minutes % 60
          durationText = mins === 0 ? `${hours}小时` : `${hours}小时${mins}分钟`
        }

        result.push({
          date,
          memberName,
          department: record.department || item.department || '',
          leaderName: item.leaderName || '',
          shiftType: record.shiftType || 'day',
          durationMinutes: minutes,
          durationText,
          startTime: record.startTime || '',
          endTime: record.endTime || ''
        })
      })
    })

    durationList.value = result
    durationCurrentPage.value = 1
    collapseFilter('duration')
  } catch (error) {
    console.error('查询出勤时长失败:', error)
    uni.showToast({
      title: '查询出勤时长失败',
      icon: 'none'
    })
  } finally {
    isLoadingDuration.value = false
  }
}

// 出勤时长：在当前结果里按部门 + 姓名再过滤 + 分页
const durationDepartmentOptions = computed(() => {
  const set = new Set()
  durationList.value.forEach(item => {
    if (item.department) set.add(item.department)
  })
  return Array.from(set)
})

const durationFilteredAll = computed(() => {
  const keyword = durationMemberName.value.trim()
  return durationList.value.filter(item => {
    if (durationDepartment.value && item.department !== durationDepartment.value) {
      return false
    }
    if (!keyword) return true
    return (
      (item.memberName && item.memberName.includes(keyword)) ||
      (item.department && item.department.includes(keyword)) ||
      (item.leaderName && item.leaderName.includes(keyword))
    )
  })
})

const durationTotalPages = computed(() => {
  const total = durationFilteredAll.value.length
  if (!total) return 1
  return Math.ceil(total / durationPageSize)
})

const durationDisplayList = computed(() => {
  const start = (durationCurrentPage.value - 1) * durationPageSize
  const end = start + durationPageSize
  return durationFilteredAll.value.slice(start, end)
})

const durationListSummary = computed(() => {
  const list = durationFilteredAll.value
  if (!list.length) return null
  let totalMinutes = 0
  const members = new Set()
  list.forEach((item) => {
    if (item.memberName) members.add(item.memberName)
    const minutes = Number(item.durationMinutes)
    if (!Number.isNaN(minutes) && minutes > 0) totalMinutes += minutes
  })
  return {
    total: list.length,
    memberCount: members.size,
    totalMinutes,
    avgMinutes: list.length ? Math.round(totalMinutes / list.length) : 0
  }
})

const handlePrevDurationPage = () => {
  if (durationCurrentPage.value > 1) {
    durationCurrentPage.value -= 1
  }
}

const handleNextDurationPage = () => {
  if (durationCurrentPage.value < durationTotalPages.value) {
    durationCurrentPage.value += 1
  }
}

// 出勤时长筛选条件变化时，回到第一页
watch([durationMemberName, durationDepartment], () => {
  durationCurrentPage.value = 1
})

// 解析每日报告负载（出勤信息用）
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

// 工具函数：格式化日期为 YYYY-MM-DD
const formatDateOnly = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 工具函数：加入日期展示（只要日期部分）
const formatJoinDate = (value) => {
  if (!value) return ''
  // 既兼容 ISO 时间，也兼容纯日期字符串
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  return formatDateOnly(value)
}

// 工具函数：格式化为 ISO 字符串（用于 end 加一天）
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`
}

// 工具函数：展示时间（只显示日期+时间，不显示秒）
const formatTimeDisplay = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

// ========== 导出表格相关函数 ==========

// 加载 XLSX 库
let cachedXLSX = null
const loadXLSX = async () => {
  if (cachedXLSX) return cachedXLSX
  // #ifdef MP-WEIXIN
  // 小程序环境需要特殊处理
  cachedXLSX = null
  return cachedXLSX
  // #endif

  // #ifndef MP-WEIXIN
  const XLSXModule = await import('xlsx')
  cachedXLSX = XLSXModule.default || XLSXModule
  return cachedXLSX
  // #endif
}

// 构建 SpreadsheetML XML（用于小程序）
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
    `<Worksheet ss:Name="数据">` +
    `<Table>${headerRow}${dataRows}</Table>` +
    `</Worksheet>` +
    `</Workbook>`
}

// 生成 Excel 文件
const generateExcel = async (data, fileName) => {
  // #ifdef H5
  // H5模式下使用xlsx库
  const XLSX = await loadXLSX()
  // 创建工作簿
  const wb = XLSX.utils.book_new()
  
  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(data)
  
  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '数据')
  
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

// 导出组员信息
const handleExportMembers = async () => {
  if (filteredMembersAll.value.length === 0) {
    uni.showToast({
      title: '暂无可导出数据',
      icon: 'none'
    })
    return
  }

  uni.showLoading({
    title: '导出中...',
    mask: true
  })

  try {
    const dataset = filteredMembersAll.value.map(member => ({
      '姓名': member.memberName || '',
      '部门': member.department || '',
      '班次': member.shiftType === 'night' ? '夜班' : member.shiftType === 'day' ? '白班' : '',
      '组长': member.leaderName || '',
      '加入日期': formatJoinDate(member.joinDate) || ''
    }))

    const fileName = `组员信息_${formatDateOnly(new Date())}.xlsx`
    await generateExcel(dataset, fileName)

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
    uni.hideLoading()
  }
}

// 导出出勤信息
const handleExportAttendance = async () => {
  if (attendanceFilteredAll.value.length === 0) {
    uni.showToast({
      title: '暂无可导出数据',
      icon: 'none'
    })
    return
  }

  uni.showLoading({
    title: '导出中...',
    mask: true
  })

  try {
    const dataset = attendanceFilteredAll.value.map(item => ({
      '日期': item.date || '',
      '姓名': item.memberName || '',
      '部门': item.department || '',
      '组长': item.leaderName || '',
      '出勤状态': item.status || '',
      '班次': item.shiftType === 'night' ? '夜班' : item.shiftType === 'day' ? '白班' : ''
    }))

    const dateRange = attendanceStartDate.value && attendanceEndDate.value
      ? `${attendanceStartDate.value}_${attendanceEndDate.value}`
      : formatDateOnly(new Date())
    const fileName = `出勤信息_${dateRange}.xlsx`
    await generateExcel(dataset, fileName)

    uni.showToast({
      title: '导出成功',
      icon: 'success'
    })
  } catch (error) {
    console.error('导出出勤信息失败:', error)
    uni.showToast({
      title: '导出失败',
      icon: 'none'
    })
  } finally {
    uni.hideLoading()
  }
}

// 导出出勤时长
const handleExportDuration = async () => {
  if (durationFilteredAll.value.length === 0) {
    uni.showToast({
      title: '暂无可导出数据',
      icon: 'none'
    })
    return
  }

  uni.showLoading({
    title: '导出中...',
    mask: true
  })

  try {
    const dataset = durationFilteredAll.value.map(item => ({
      '日期': item.date || '',
      '姓名': item.memberName || '',
      '部门': item.department || '',
      '组长': item.leaderName || '',
      '班次': item.shiftType === 'night' ? '夜班' : item.shiftType === 'day' ? '白班' : '',
      '上班时间': formatTimeDisplay(item.startTime) || '',
      '下班时间': formatTimeDisplay(item.endTime) || '',
      '出勤时长': item.durationText || ''
    }))

    const dateRange = durationStartDate.value && durationEndDate.value
      ? `${durationStartDate.value}_${durationEndDate.value}`
      : formatDateOnly(new Date())
    const fileName = `出勤时长_${dateRange}.xlsx`
    await generateExcel(dataset, fileName)

    uni.showToast({
      title: '导出成功',
      icon: 'success'
    })
  } catch (error) {
    console.error('导出出勤时长失败:', error)
    uni.showToast({
      title: '导出失败',
      icon: 'none'
    })
  } finally {
    uni.hideLoading()
  }
}

// 4. 汇总查询
const summaryStartDate = ref('')
const summaryEndDate = ref('')
const summaryQueryType = ref('') // 'member' | 'department' | 'aggregate'
const summaryKeyword = ref('') // 用于组员姓名
const summaryDepartment = ref('') // 用于部门选择
const isLoadingSummary = ref(false)
const summaryResult = ref(null) // { name: string, totalHours: number } 或 { members: Array<{name: string, totalHours: number}> }
const summaryDetailList = ref([]) // 明细数据列表，用于导出
const summaryMemberList = ref([]) // 成员汇总列表（用于aggregate类型）

// 汇总查询：部门选项（从所有组员中提取）
const summaryDepartmentOptions = computed(() => {
  const set = new Set()
  allMembers.value.forEach(m => {
    if (m.department) set.add(m.department)
  })
  return Array.from(set)
})

const handleResetSummaryFilter = () => {
  summaryStartDate.value = ''
  summaryEndDate.value = ''
  summaryQueryType.value = ''
  summaryKeyword.value = ''
  summaryDepartment.value = ''
  summaryResult.value = null
  summaryDetailList.value = []
  summaryMemberList.value = []
}

const handleQuerySummary = async () => {
  if (isLoadingSummary.value) return

  // 验证必填项
  if (!summaryStartDate.value || !summaryEndDate.value) {
    uni.showToast({
      title: '请选择开始日期和结束日期',
      icon: 'none'
    })
    return
  }

  if (summaryStartDate.value > summaryEndDate.value) {
    uni.showToast({
      title: '开始日期不能晚于结束日期',
      icon: 'none'
    })
    return
  }

  if (!summaryQueryType.value) {
    uni.showToast({
      title: '请选择查询类型',
      icon: 'none'
    })
    return
  }

  if (summaryQueryType.value === 'member' && !summaryKeyword.value.trim()) {
    uni.showToast({
      title: '请输入组员姓名',
      icon: 'none'
    })
    return
  }

  if ((summaryQueryType.value === 'department' || summaryQueryType.value === 'aggregate') && !summaryDepartment.value) {
    uni.showToast({
      title: '请选择部门',
      icon: 'none'
    })
    return
  }

  isLoadingSummary.value = true
  summaryResult.value = null
  summaryDetailList.value = []
  summaryMemberList.value = []

  try {
    // 获取所有组长列表
    let allLeaders = []
    try {
      allLeaders = await getAllLeaders()
      console.log(`✅ 获取到 ${allLeaders.length} 个组长`)
    } catch (error) {
      console.error('获取组长列表失败:', error)
      uni.showToast({
        title: '获取组长列表失败',
        icon: 'none'
      })
      return
    }

    // 从所有组员中提取部门信息（用于匹配）
    const departmentMap = new Map() // Map<leaderId, department>
    allMembers.value.forEach(member => {
      if (member.leaderId && member.department) {
        departmentMap.set(member.leaderId, member.department)
      }
    })

    // 查询所有组长的出勤记录（使用原始出勤记录API，而不是月度统计表）
    let allRecords = []
    for (const leader of allLeaders) {
      const leaderId = leader.id || leader.leaderId
      if (!leaderId) continue

      try {
        const response = await getAttendanceRecords(leaderId)
        const records = response?.records || []
        
        records.forEach(record => {
          const memberName = record.name || record.memberName || ''
          const department = record.department || departmentMap.get(leaderId) || ''
          const duration = record.duration || 0
          
          // 提取日期（从 recordDate 或 startTime）
          let recordDate = ''
          if (record.recordDate) {
            recordDate = record.recordDate
          } else if (record.startTime) {
            const date = new Date(record.startTime)
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              recordDate = `${year}-${month}-${day}`
            }
          }

          // 按日期范围过滤
          if (recordDate && (recordDate < summaryStartDate.value || recordDate > summaryEndDate.value)) {
            return
          }

          // 根据查询类型和关键词/部门过滤
          if (summaryQueryType.value === 'member') {
            if (!memberName.includes(summaryKeyword.value.trim())) {
              return
            }
          } else if (summaryQueryType.value === 'department' || summaryQueryType.value === 'aggregate') {
            if (department !== summaryDepartment.value) {
              return
            }
          }

          // 记录时长（分钟）
          if (duration > 0 && recordDate) {
            // 格式化时长
            const hours = Math.floor(duration / 60)
            const mins = duration % 60
            const durationText = mins === 0 ? `${hours}小时` : `${hours}小时${mins}分钟`

            allRecords.push({
              date: recordDate,
              memberName,
              department,
              leaderName: leader.name || leader.username || '',
              shiftType: record.shiftType || 'day',
              startTime: record.startTime || '',
              endTime: record.endTime || '',
              duration,
              durationText
            })
          }
        })
      } catch (error) {
        console.error(`查询组长 ${leaderId} 的出勤记录失败:`, error)
      }
    }

    // 汇总计算（allRecords已经按查询条件过滤过了）
    if (allRecords.length === 0) {
      const displayName = summaryQueryType.value === 'member' 
        ? summaryKeyword.value.trim() 
        : summaryDepartment.value
      summaryDetailList.value = []
      summaryMemberList.value = []
      if (summaryQueryType.value === 'aggregate') {
        summaryResult.value = {
          department: displayName || '',
          members: []
        }
      } else {
        summaryResult.value = {
          name: displayName || '',
          totalHours: 0
        }
      }
      return
    }

    // 如果是aggregate类型，按成员分组汇总
    if (summaryQueryType.value === 'aggregate') {
      const memberMap = new Map()
      
      allRecords.forEach(record => {
        const memberName = record.memberName || '未知'
        if (!memberMap.has(memberName)) {
          memberMap.set(memberName, {
            memberName,
            totalMinutes: 0
          })
        }
        const memberData = memberMap.get(memberName)
        memberData.totalMinutes += record.duration
      })

      // 转换为成员列表，按姓名排序
      const members = Array.from(memberMap.values())
        .map(m => ({
          name: m.memberName,
          totalHours: parseFloat((m.totalMinutes / 60).toFixed(2))
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      summaryMemberList.value = members
      summaryDetailList.value = allRecords // 保存明细数据用于导出
      summaryResult.value = {
        department: summaryDepartment.value || '',
        members
      }
      collapseFilter('summary')
      return
    }

    // 累加所有记录的时长（已经在前面的过滤中确保了匹配条件）
    let totalMinutes = 0
    const nameSet = new Set()
    const departmentSet = new Set()

    allRecords.forEach(record => {
      totalMinutes += record.duration
      if (record.memberName) {
        nameSet.add(record.memberName)
      }
      if (record.department) {
        departmentSet.add(record.department)
      }
    })

    // 转换为小时（保留2位小数）
    const totalHours = (totalMinutes / 60).toFixed(2)

    // 确定显示名称：如果是组员查询，显示组员名；如果是部门查询，显示部门名
    let displayName = ''
    if (summaryQueryType.value === 'member') {
      // 组员查询：如果只匹配到一个组员，显示该组员名；如果有多个，显示第一个匹配的组员名
      if (nameSet.size > 0) {
        displayName = Array.from(nameSet)[0]
      } else {
        displayName = summaryKeyword.value.trim()
      }
    } else if (summaryQueryType.value === 'department') {
      // 部门查询：显示选择的部门名称
      displayName = summaryDepartment.value || ''
    }

    // 保存明细数据用于导出
    summaryDetailList.value = allRecords

    summaryResult.value = {
      name: displayName,
      totalHours: parseFloat(totalHours)
    }
    collapseFilter('summary')
  } catch (error) {
    console.error('汇总查询失败:', error)
    uni.showToast({
      title: '汇总查询失败',
      icon: 'none'
    })
  } finally {
    isLoadingSummary.value = false
  }
}

// 导出汇总查询明细
const handleExportSummary = async () => {
  // aggregate类型导出成员汇总列表，其他类型导出明细
  if (summaryQueryType.value === 'aggregate') {
    if (summaryMemberList.value.length === 0) {
      uni.showToast({
        title: '暂无可导出数据',
        icon: 'none'
      })
      return
    }
  } else {
    if (summaryDetailList.value.length === 0) {
      uni.showToast({
        title: '暂无可导出数据',
        icon: 'none'
      })
      return
    }
  }

  uni.showLoading({
    title: '导出中...',
    mask: true
  })

  try {
    let dataset = []
    let fileName = ''

    if (summaryQueryType.value === 'aggregate') {
      // aggregate类型：导出成员汇总列表，包含每日出勤时长
      // 1. 提取所有日期（从开始日期到结束日期的所有日期）
      const allDates = []
      if (summaryStartDate.value && summaryEndDate.value) {
        const startDate = new Date(summaryStartDate.value)
        const endDate = new Date(summaryEndDate.value)
        let currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          const year = currentDate.getFullYear()
          const month = String(currentDate.getMonth() + 1).padStart(2, '0')
          const day = String(currentDate.getDate()).padStart(2, '0')
          allDates.push(`${year}-${month}-${day}`)
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }

      // 2. 按成员和日期组织数据
      const memberDateMap = new Map() // Map<memberName, Map<date, duration>>
      summaryDetailList.value.forEach(record => {
        const memberName = record.memberName || '未知'
        const date = record.date || ''
        const duration = record.duration || 0 // 分钟数
        
        if (!memberDateMap.has(memberName)) {
          memberDateMap.set(memberName, new Map())
        }
        const dateMap = memberDateMap.get(memberName)
        
        if (dateMap.has(date)) {
          dateMap.set(date, dateMap.get(date) + duration)
        } else {
          dateMap.set(date, duration)
        }
      })

      // 3. 生成数据行（对象的键会自动成为Excel表头）
      dataset = summaryMemberList.value.map(member => {
        // 先创建基础列
        const row = {
          '姓名': member.name || '',
          '累计出勤工时': `${member.totalHours} 小时`
        }
        
        // 然后按日期顺序添加每日出勤时长列
        const dateMap = memberDateMap.get(member.name) || new Map()
        allDates.forEach(date => {
          const minutes = dateMap.get(date) || 0
          if (minutes > 0) {
            const hours = Math.floor(minutes / 60)
            const mins = minutes % 60
            row[date] = mins === 0 ? `${hours}小时` : `${hours}小时${mins}分钟`
          } else {
            row[date] = ''
          }
        })
        
        return row
      })

      const dateRange = summaryStartDate.value && summaryEndDate.value
        ? `${summaryStartDate.value}_${summaryEndDate.value}`
        : formatDateOnly(new Date())
      fileName = `汇总查询_汇总_${summaryDepartment.value}_${dateRange}.xlsx`
    } else {
      // member和department类型：导出明细
      dataset = summaryDetailList.value.map(item => ({
        '日期': item.date || '',
        '姓名': item.memberName || '',
        '部门': item.department || '',
        '组长': item.leaderName || '',
        '班次': item.shiftType === 'night' ? '夜班' : item.shiftType === 'day' ? '白班' : '',
        '上班时间': formatTimeDisplay(item.startTime) || '',
        '下班时间': formatTimeDisplay(item.endTime) || '',
        '出勤时长': item.durationText || ''
      }))

      // 生成文件名
      const queryTypeText = summaryQueryType.value === 'member' ? '组员' : '部门'
      const queryName = summaryQueryType.value === 'member' 
        ? summaryKeyword.value.trim() 
        : summaryDepartment.value
      const dateRange = summaryStartDate.value && summaryEndDate.value
        ? `${summaryStartDate.value}_${summaryEndDate.value}`
        : formatDateOnly(new Date())
      fileName = `汇总查询_${queryTypeText}_${queryName}_${dateRange}.xlsx`
    }
    
    await generateExcel(dataset, fileName)

    uni.showToast({
      title: '导出成功',
      icon: 'success'
    })
  } catch (error) {
    console.error('导出汇总查询失败:', error)
    uni.showToast({
      title: '导出失败',
      icon: 'none'
    })
  } finally {
    uni.hideLoading()
  }
}

// 全部导出汇总查询数据（不应用筛选条件）
const handleExportSummaryAll = async () => {
  // 验证必填项（只验证日期和查询类型，不验证组员姓名或部门）
  if (!summaryStartDate.value || !summaryEndDate.value) {
    uni.showToast({
      title: '请选择开始日期和结束日期',
      icon: 'none'
    })
    return
  }

  if (summaryStartDate.value > summaryEndDate.value) {
    uni.showToast({
      title: '开始日期不能晚于结束日期',
      icon: 'none'
    })
    return
  }

  if (!summaryQueryType.value) {
    uni.showToast({
      title: '请选择查询类型',
      icon: 'none'
    })
    return
  }

  uni.showLoading({
    title: '导出中...',
    mask: true
  })

  try {
    // 获取所有组长列表
    let allLeaders = []
    try {
      allLeaders = await getAllLeaders()
      console.log(`✅ 获取到 ${allLeaders.length} 个组长`)
    } catch (error) {
      console.error('获取组长列表失败:', error)
      uni.hideLoading()
      uni.showToast({
        title: '获取组长列表失败',
        icon: 'none'
      })
      return
    }

    // 从所有组员中提取部门信息（用于匹配）
    const departmentMap = new Map() // Map<leaderId, department>
    allMembers.value.forEach(member => {
      if (member.leaderId && member.department) {
        departmentMap.set(member.leaderId, member.department)
      }
    })

    // 查询所有组长的出勤记录（使用原始出勤记录API，而不是月度统计表）
    let allRecords = []
    for (const leader of allLeaders) {
      const leaderId = leader.id || leader.leaderId
      if (!leaderId) continue

      try {
        const response = await getAttendanceRecords(leaderId)
        const records = response?.records || []
        
        records.forEach(record => {
          const memberName = record.name || record.memberName || ''
          const department = record.department || departmentMap.get(leaderId) || ''
          const duration = record.duration || 0
          
          // 提取日期（从 recordDate 或 startTime）
          let recordDate = ''
          if (record.recordDate) {
            recordDate = record.recordDate
          } else if (record.startTime) {
            const date = new Date(record.startTime)
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              recordDate = `${year}-${month}-${day}`
            }
          }

          // 按日期范围过滤
          if (recordDate && (recordDate < summaryStartDate.value || recordDate > summaryEndDate.value)) {
            return
          }

          // 不应用任何筛选条件，记录所有数据
          if (duration > 0 && recordDate) {
            // 格式化时长
            const hours = Math.floor(duration / 60)
            const mins = duration % 60
            const durationText = mins === 0 ? `${hours}小时` : `${hours}小时${mins}分钟`

            allRecords.push({
              date: recordDate,
              memberName,
              department,
              leaderName: leader.name || leader.username || '',
              shiftType: record.shiftType || 'day',
              startTime: record.startTime || '',
              endTime: record.endTime || '',
              duration,
              durationText
            })
          }
        })
        
        console.log(`✅ 从组长 ${leader.name || leaderId} 获取到 ${records.length} 条记录`)
      } catch (error) {
        console.error(`查询组长 ${leaderId} 的出勤记录失败:`, error)
      }
    }

    if (allRecords.length === 0) {
      uni.hideLoading()
      uni.showToast({
        title: '暂无可导出数据',
        icon: 'none'
      })
      return
    }

    let dataset = []
    let fileName = ''

    if (summaryQueryType.value === 'member') {
      // 组员类型：按组员分组汇总（每个组员一行，显示累计出勤工时）
      const memberMap = new Map() // Map<memberName, totalMinutes>
      
      allRecords.forEach(record => {
        const memberName = record.memberName || '未知'
        const duration = record.duration || 0
        
        if (!memberMap.has(memberName)) {
          memberMap.set(memberName, 0)
        }
        memberMap.set(memberName, memberMap.get(memberName) + duration)
      })

      // 生成数据行
      const memberList = Array.from(memberMap.keys()).sort()
      dataset = memberList.map(memberName => {
        const totalMinutes = memberMap.get(memberName) || 0
        const totalHours = parseFloat((totalMinutes / 60).toFixed(2))
        return {
          '姓名': memberName || '',
          '累计出勤工时': `${totalHours} 小时`
        }
      })

      const dateRange = summaryStartDate.value && summaryEndDate.value
        ? `${summaryStartDate.value}_${summaryEndDate.value}`
        : formatDateOnly(new Date())
      fileName = `汇总查询_组员_全部_${dateRange}.xlsx`
    } else if (summaryQueryType.value === 'department') {
      // 部门类型：按部门分组汇总（每个部门一行，显示累计出勤工时）
      const departmentMap = new Map() // Map<department, totalMinutes>
      
      allRecords.forEach(record => {
        const department = record.department || '未知'
        const duration = record.duration || 0
        
        if (!departmentMap.has(department)) {
          departmentMap.set(department, 0)
        }
        departmentMap.set(department, departmentMap.get(department) + duration)
      })

      // 生成数据行
      const departmentList = Array.from(departmentMap.keys()).sort()
      dataset = departmentList.map(department => {
        const totalMinutes = departmentMap.get(department) || 0
        const totalHours = parseFloat((totalMinutes / 60).toFixed(2))
        return {
          '部门': department || '',
          '累计出勤工时': `${totalHours} 小时`
        }
      })

      const dateRange = summaryStartDate.value && summaryEndDate.value
        ? `${summaryStartDate.value}_${summaryEndDate.value}`
        : formatDateOnly(new Date())
      fileName = `汇总查询_部门_全部_${dateRange}.xlsx`
    } else if (summaryQueryType.value === 'aggregate') {
      // 汇总类型：按成员分组，包含每日出勤时长（每个成员一行，显示累计出勤工时和每日出勤时长）
      // 1. 提取所有日期（从开始日期到结束日期的所有日期）
      const allDates = []
      if (summaryStartDate.value && summaryEndDate.value) {
        const startDate = new Date(summaryStartDate.value)
        const endDate = new Date(summaryEndDate.value)
        let currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          const year = currentDate.getFullYear()
          const month = String(currentDate.getMonth() + 1).padStart(2, '0')
          const day = String(currentDate.getDate()).padStart(2, '0')
          allDates.push(`${year}-${month}-${day}`)
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }

      // 2. 按成员和日期组织数据
      const memberDateMap = new Map() // Map<memberName, Map<date, duration>>
      const memberTotalMap = new Map() // Map<memberName, totalMinutes>
      
      allRecords.forEach(record => {
        const memberName = record.memberName || '未知'
        const date = record.date || ''
        const duration = record.duration || 0 // 分钟数
        
        // 累计总时长
        if (!memberTotalMap.has(memberName)) {
          memberTotalMap.set(memberName, 0)
        }
        memberTotalMap.set(memberName, memberTotalMap.get(memberName) + duration)
        
        // 按日期组织
        if (!memberDateMap.has(memberName)) {
          memberDateMap.set(memberName, new Map())
        }
        const dateMap = memberDateMap.get(memberName)
        
        if (dateMap.has(date)) {
          dateMap.set(date, dateMap.get(date) + duration)
        } else {
          dateMap.set(date, duration)
        }
      })

      // 3. 生成数据行（对象的键会自动成为Excel表头）
      const memberList = Array.from(memberTotalMap.keys()).sort()
      dataset = memberList.map(memberName => {
        // 先创建基础列
        const totalMinutes = memberTotalMap.get(memberName) || 0
        const totalHours = parseFloat((totalMinutes / 60).toFixed(2))
        const row = {
          '姓名': memberName || '',
          '累计出勤工时': `${totalHours} 小时`
        }
        
        // 然后按日期顺序添加每日出勤时长列
        const dateMap = memberDateMap.get(memberName) || new Map()
        allDates.forEach(date => {
          const minutes = dateMap.get(date) || 0
          if (minutes > 0) {
            const hours = Math.floor(minutes / 60)
            const mins = minutes % 60
            row[date] = mins === 0 ? `${hours}小时` : `${hours}小时${mins}分钟`
          } else {
            row[date] = ''
          }
        })
        
        return row
      })

      const dateRange = summaryStartDate.value && summaryEndDate.value
        ? `${summaryStartDate.value}_${summaryEndDate.value}`
        : formatDateOnly(new Date())
      fileName = `汇总查询_汇总_全部_${dateRange}.xlsx`
    }
    
    await generateExcel(dataset, fileName)

    uni.showToast({
      title: '导出成功',
      icon: 'success'
    })
  } catch (error) {
    console.error('全部导出汇总查询失败:', error)
    uni.showToast({
      title: '导出失败',
      icon: 'none'
    })
  } finally {
    uni.hideLoading()
  }
}

const handleBack = () => {
  const pages = getCurrentPages && getCurrentPages()
  const canGoBack = Array.isArray(pages) && pages.length > 1

  if (canGoBack) {
    uni.navigateBack()
  } else {
    // 如果没有历史栈，则直接回到首页
    uni.redirectTo({
      url: '/pages/index/index',
      fail: () => {
        // 兜底：在极端场景下用 reLaunch
        uni.reLaunch({
          url: '/pages/index/index'
        })
      }
    })
  }
}

onMounted(() => {
  // 如果未登录，记录当前页面路径并跳转到登录页
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.setStorageSync('loginRedirectPath', '/pages/query/index')
    uni.redirectTo({
      url: '/pages/login/login'
    })
    return
  }
  // 默认加载组员信息，方便直接搜索
  loadMembers()
})
</script>

<style scoped>
.query-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.header {
  padding: 24rpx 32rpx;
  background-color: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-back {
  width: 60rpx;
  height: 60rpx;
  border-radius: 999rpx;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-back-icon {
  font-size: 36rpx;
  color: #333;
}

.header-title {
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  flex: 1;
}

.header-placeholder {
  width: 60rpx;
  height: 60rpx;
}

.tab-bar {
  display: flex;
  background-color: #ffffff;
  padding: 16rpx 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  gap: 8rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #64748b;
  background-color: #f8fafc;
  border: 1rpx solid #e2e8f0;
}

.tab-item.active {
  background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
  color: #ffffff;
  font-weight: 600;
  border-color: transparent;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.content {
  flex: 1;
  height: 0;
  padding: 24rpx;
  box-sizing: border-box;
}

.section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.section-title-row {
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-toggle {
  font-size: 24rpx;
  color: #06b6d4;
}

.filter-summary-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.filter-chip {
  font-size: 22rpx;
  color: #475569;
  background: #f1f5f9;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
}

.filter-row {
  display: flex;
  margin-bottom: 16rpx;
}

.filter-item {
  flex: 1;
  margin-right: 16rpx;
}

.filter-item:last-child {
  margin-right: 0;
}

.filter-item-flex {
  flex-direction: row;
}

.filter-label {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
  display: block;
}

.filter-input {
  width: 100%;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
  font-size: 26rpx;
}

.filter-picker {
  width: 100%;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
  font-size: 26rpx;
  color: #333;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 16rpx;
  margin: 16rpx 0 24rpx;
}

.filter-btn {
  min-width: 160rpx;
  padding: 16rpx 24rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
}

.reset-btn {
  background-color: #f2f2f2;
  color: #333;
}

.query-btn {
  background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
  color: #ffffff;
}

.export-btn {
  background-color: #1890ff;
  color: #ffffff;
}

.export-btn:disabled {
  background-color: #d9d9d9;
  color: #999;
}

.export-all-btn {
  background-color: #722ed1;
  color: #ffffff;
}

.export-all-btn:disabled {
  background-color: #d9d9d9;
  color: #999;
}

.summary-board {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #ecfeff 0%, #f0fdf4 100%);
  border: 1rpx solid #a7f3d0;
}

.summary-board--hero {
  background: linear-gradient(135deg, #e0f2fe 0%, #ecfdf5 100%);
}

.summary-item {
  flex: 1;
  min-width: 140rpx;
  text-align: center;
}

.summary-item--wide {
  min-width: 100%;
  margin-bottom: 8rpx;
}

.summary-value {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #0f766e;
  line-height: 1.2;
  word-break: break-all;
}

.summary-value-accent {
  color: #0369a1;
}

.summary-value-hero {
  font-size: 48rpx;
  color: #0369a1;
}

.summary-label {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #64748b;
}

.status-good {
  color: #059669 !important;
}

.status-warn {
  color: #d97706 !important;
}

.status-bad {
  color: #dc2626 !important;
}

.status-neutral {
  color: #64748b !important;
}

.record-list {
  margin-top: 8rpx;
}

.record-item {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid #e2e8f0;
  box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.06);
}

.record-item--compact {
  padding: 20rpx 24rpx;
}

.record-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.record-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
}

.tag {
  font-size: 22rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
}

.tag-date {
  background: #f1f5f9;
  color: #334155;
  font-weight: 600;
}

.tag-dept {
  background: #ecfeff;
  color: #0891b2;
}

.tag-shift-day {
  background: #e0f2fe;
  color: #0369a1;
}

.tag-shift-night {
  background: #fef3c7;
  color: #b45309;
}

.status-badge {
  flex-shrink: 0;
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  background: #f8fafc;
}

.status-badge.status-good {
  background: #ecfdf5;
}

.status-badge.status-warn {
  background: #fffbeb;
}

.status-badge.status-bad {
  background: #fef2f2;
}

.status-badge-text {
  font-size: 24rpx;
  font-weight: 600;
}

.status-badge.status-good .status-badge-text {
  color: #059669;
}

.status-badge.status-warn .status-badge-text {
  color: #d97706;
}

.status-badge.status-bad .status-badge-text {
  color: #dc2626;
}

.status-badge.status-neutral .status-badge-text {
  color: #64748b;
}

.record-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

.record-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
  flex: 1;
  min-width: 0;
}

.duration-highlight {
  flex-shrink: 0;
  font-size: 30rpx;
  font-weight: 700;
  color: #0369a1;
}

.record-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #475569;
}

.meta-divider {
  font-size: 22rpx;
  color: #cbd5e1;
}

.kpi-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed #e2e8f0;
}

.kpi-cell {
  width: 50%;
  box-sizing: border-box;
  padding: 8rpx 4rpx;
  text-align: center;
}

.kpi-num {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #0f766e;
}

.kpi-name {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #64748b;
}

.member-list {
  margin-top: 8rpx;
}

.empty-tip,
.loading-tip {
  padding: 40rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 24rpx;
  color: #999;
}

.loading-text {
  font-size: 24rpx;
  color: #06b6d4;
}

.summary-result {
  margin-top: 8rpx;
}

.member-pagination-info,
.pagination-text {
  font-size: 24rpx;
  color: #64748b;
  text-align: center;
}

.member-pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  margin-top: 16rpx;
  padding-bottom: 16rpx;
}

.pagination-btn {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
}

.pagination-btn.btn-disabled {
  opacity: 0.45;
}

.pagination-btn-text,
.pagination-info-text {
  font-size: 26rpx;
  color: #334155;
}
</style>


