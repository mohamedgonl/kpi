/**
 * Reports Component
 * Department overview + Individual detail reports with 14-column table
 * Supports: Weekly / Monthly / Quarterly / Semi-annual / Annual periods
 */
import { getUsers, getTasksByUserAndDateRange, computeTaskColumns } from '../data/store.js';
import { computeKPIBreakdown } from '../logic/kpi.js';
import { renderSummaryRows } from './dailyTable.js';
import { getGroupById, getItemById } from '../data/workGroups.js';
import * as XLSX from 'xlsx';

export function renderReports(container) {
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  container.innerHTML = `
    <div class="dashboard-header">
      <h1 class="dashboard-title">📈 <span>Báo cáo</span></h1>
      <div class="date-picker-wrap">
        <label>📅 Ngày báo cáo:</label>
        <input type="date" class="date-input" id="reportDate" value="${today}" />
      </div>
    </div>

    <div class="report-tabs">
      <button class="report-tab active" data-period="daily">Ngày</button>
      <button class="report-tab" data-period="weekly">Tuần</button>
      <button class="report-tab" data-period="monthly">Tháng</button>
      <button class="report-tab" data-period="quarterly">Quý</button>
      <button class="report-tab" data-period="halfyear">6 tháng</button>
      <button class="report-tab" data-period="yearly">Năm</button>
      <button class="btn btn-secondary" id="exportExcelBtn" style="margin-left: auto; padding: 6px 12px; font-size: 13px;">📥 Xuất Excel</button>
    </div>

    <!-- Department Overview Table -->
    <div class="report-table-wrap">
      <table class="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tên</th>
            <th>Tổng CV</th>
            <th>Hoàn thành</th>
            <th>a (SL%)</th>
            <th>b (CL%)</th>
            <th>c (TĐ%)</th>
            <th>KPI</th>
          </tr>
        </thead>
        <tbody id="reportTableBody"></tbody>
      </table>
    </div>

    <!-- Individual Detail Panel (hidden by default) -->
    <div id="individualReportPanel" class="individual-report-panel" style="display:none;">
      <div class="individual-report-header">
        <h2 class="section-title" id="individualReportTitle">📋 Chi tiết cá nhân</h2>
        <button class="btn btn-secondary" id="closeIndividualBtn" style="padding:4px 12px; font-size:12px;">✕ Đóng</button>
      </div>
      <div id="individualReportContent"></div>
    </div>

    <div class="report-chart-section">
      <h2 class="section-title" style="margin-bottom:14px;">📊 Biểu đồ KPI</h2>
      <div class="chart-container">
        <canvas id="kpiChart"></canvas>
      </div>
    </div>
  `;

  let currentPeriod = 'daily';
  let reportDate = today;

  function formatDateAsYYYYMMDD(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getDateRange(period, baseDate) {
    const d = new Date(baseDate);
    let start, end;
    if (period === 'daily') {
      start = end = baseDate;
    } else if (period === 'weekly') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      start = formatDateAsYYYYMMDD(monday);
      end = formatDateAsYYYYMMDD(sunday);
    } else if (period === 'monthly') {
      start = `${baseDate.substring(0, 7)}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      end = formatDateAsYYYYMMDD(lastDay);
    } else if (period === 'quarterly') {
      const qm = Math.floor(d.getMonth() / 3) * 3;
      const startDate = new Date(d.getFullYear(), qm, 1);
      const endDate = new Date(d.getFullYear(), qm + 3, 0);
      start = formatDateAsYYYYMMDD(startDate);
      end = formatDateAsYYYYMMDD(endDate);
    } else if (period === 'halfyear') {
      if (d.getMonth() < 6) {
        start = `${d.getFullYear()}-01-01`;
        end = `${d.getFullYear()}-06-30`;
      } else {
        start = `${d.getFullYear()}-07-01`;
        end = `${d.getFullYear()}-12-31`;
      }
    } else if (period === 'yearly') {
      start = `${d.getFullYear()}-01-01`;
      end = `${d.getFullYear()}-12-31`;
    }
    return { start, end };
  }

  function refreshReport() {
    const users = getUsers();
    const { start, end } = getDateRange(currentPeriod, reportDate);
    const tbody = document.getElementById('reportTableBody');
    const rows = [];
    const chartData = [];

    users.forEach((user, idx) => {
      const tasks = getTasksByUserAndDateRange(user.id, start, end);
      const kpi = computeKPIBreakdown(tasks);

      let kpiClass = 'poor';
      if (kpi.kpi >= 90) kpiClass = 'excellent';
      else if (kpi.kpi >= 75) kpiClass = 'good';
      else if (kpi.kpi >= 50) kpiClass = 'average';

      chartData.push({ name: user.name, kpi: kpi.kpi });

      rows.push(`
        <tr class="report-user-row" data-user-id="${user.id}" style="cursor:pointer;" title="Nhấn để xem chi tiết">
          <td>${idx + 1}</td>
          <td style="font-weight:600">${escapeHtml(user.name)}</td>
          <td>${kpi.totalTasks}</td>
          <td>${kpi.completedTasks}</td>
          <td>${kpi.a.toFixed(1)}%</td>
          <td>${kpi.b.toFixed(1)}%</td>
          <td>${kpi.c.toFixed(1)}%</td>
          <td><span class="kpi-value ${kpiClass}">${kpi.kpi.toFixed(1)}%</span></td>
        </tr>
      `);
    });

    tbody.innerHTML = rows.join('');
    drawChart(chartData);

    // Bind row click for individual detail
    tbody.querySelectorAll('.report-user-row').forEach(row => {
      row.addEventListener('click', () => {
        const uid = parseInt(row.dataset.userId);
        showIndividualReport(uid, start, end);
      });
    });
  }

  function showIndividualReport(userId, startDate, endDate) {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    const tasks = getTasksByUserAndDateRange(userId, startDate, endDate);
    const panel = document.getElementById('individualReportPanel');
    const title = document.getElementById('individualReportTitle');
    const content = document.getElementById('individualReportContent');

    title.textContent = `📋 Chi tiết: ${user ? user.name : 'User ' + userId}`;
    panel.style.display = 'block';

    // Render full 14-column table with summary
    content.innerHTML = `
      <div class="daily-table-wrap">
        <table class="daily-table report-detail-table">
          <thead>
            <tr>
              <th rowspan="3" class="col-stt">STT</th>
              <th rowspan="3" class="col-content">Nội dung nhiệm vụ</th>
              <th colspan="5" class="col-group-header assign-header">GIAO NHIỆM VỤ</th>
              <th colspan="7" class="col-group-header eval-header">ĐÁNH GIÁ</th>
            </tr>
            <tr>
              <th rowspan="2">Ngày hết hạn</th>
              <th rowspan="2">Sản phẩm CV</th>
              <th rowspan="2">Hệ số QĐ</th>
              <th rowspan="2">SL giao</th>
              <th rowspan="2">SL giao QĐ</th>
              <th colspan="2">Đánh giá số lượng</th>
              <th colspan="3">Đánh giá tiến độ</th>
              <th colspan="2">Đánh giá chất lượng</th>
            </tr>
            <tr>
              <th>SL HT thực tế</th>
              <th>SL HT QĐ</th>
              <th>Ngày HT</th>
              <th>Ngày chậm</th>
              <th>SL đạt TĐ QĐ</th>
              <th>Số lần làm lại</th>
              <th>SL đạt CL QĐ</th>
            </tr>
            <tr class="col-numbers-row">
              <td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td>
              <td>(7)</td><td>(8)</td><td>(9)</td><td>(10)</td><td>(11)</td><td>(12)</td><td>(13)</td><td>(14)</td>
            </tr>
          </thead>
          <tbody>
            ${tasks.length === 0 ? '<tr><td colspan="14" class="empty-row">Chưa có dữ liệu</td></tr>' :
        tasks.map((task, idx) => {
          const cols = computeTaskColumns(task);
          const group = getGroupById(task.groupId);
          const isLate = cols.delayDays > 0;
          return `
                  <tr class="${isLate ? 'row-late' : ''}">
                    <td class="cell-center">${idx + 1}</td>
                    <td class="cell-left">${escapeHtml(task.name)}</td>
                    <td class="cell-center">${task.deadline ? formatDate(task.deadline) : '—'}</td>
                    <td class="cell-center">${escapeHtml(task.productType) || '—'}</td>
                    <td class="cell-center">${fmt(task.coefficient)}</td>
                    <td class="cell-center">${fmt(task.assignedQty)}</td>
                    <td class="cell-center">${fmt(cols.assignedQtyConverted)}</td>
                    <td class="cell-center">${fmt(task.actualQty)}</td>
                    <td class="cell-center">${fmt(cols.actualQtyConverted)}</td>
                    <td class="cell-center">${task.completionDate ? formatDate(task.completionDate) : '—'}</td>
                    <td class="cell-center ${isLate ? 'cell-warning' : ''}">${fmt(cols.delayDays)}</td>
                    <td class="cell-center">${fmt(cols.progressQtyConverted)}</td>
                    <td class="cell-center">${task.reworkCount || 0}</td>
                    <td class="cell-center">${fmt(cols.qualityQtyConverted)}</td>
                  </tr>
                `;
        }).join('')}
            ${renderSummaryRows(tasks)}
          </tbody>
        </table>
      </div>
    `;

    // Scroll to panel
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Bind period tabs
  container.querySelectorAll('.report-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentPeriod = tab.dataset.period;
      document.getElementById('individualReportPanel').style.display = 'none';
      refreshReport();
    });
  });

  // Bind date change
  document.getElementById('reportDate').addEventListener('change', (e) => {
    reportDate = e.target.value;
    document.getElementById('individualReportPanel').style.display = 'none';
    refreshReport();
  });

  // Close individual report
  document.getElementById('closeIndividualBtn').addEventListener('click', () => {
    document.getElementById('individualReportPanel').style.display = 'none';
  });

  // Bind export button
  document.getElementById('exportExcelBtn').addEventListener('click', () => {
    showReportExportModal(reportDate, currentPeriod);
  });

  refreshReport();
}

// ===================== HELPER FUNCTIONS =====================

function fmt(n) {
  if (n === null || n === undefined || n === '') return '';
  const val = Math.round(n * 10) / 10;
  return val.toFixed(1).replace('.', ',');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// ===================== REPORT EXPORT MODAL =====================

function showReportExportModal(baseDate, activePeriod) {
  const modalContainer = document.getElementById('modal-container');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="reportExportOverlay">
      <div class="modal">
        <div class="modal-title">📥 Xuất báo cáo Excel</div>

        <div class="form-group">
          <label>Chọn loại thời gian</label>
          <div class="report-tabs" style="margin-bottom:0; width:100%;">
            <button class="report-tab export-period-tab ${activePeriod === 'daily' ? 'active' : ''}" data-period="daily">Ngày</button>
            <button class="report-tab export-period-tab ${activePeriod === 'weekly' ? 'active' : ''}" data-period="weekly">Tuần</button>
            <button class="report-tab export-period-tab ${activePeriod === 'monthly' ? 'active' : ''}" data-period="monthly">Tháng</button>
            <button class="report-tab export-period-tab ${activePeriod === 'quarterly' ? 'active' : ''}" data-period="quarterly">Quý</button>
            <button class="report-tab export-period-tab ${activePeriod === 'halfyear' ? 'active' : ''}" data-period="halfyear">6 tháng</button>
            <button class="report-tab export-period-tab ${activePeriod === 'yearly' ? 'active' : ''}" data-period="yearly">Năm</button>
          </div>
        </div>

        <div id="reportExportPickerArea"></div>

        <div class="form-actions" style="display:flex; gap:10px; margin-top:20px;">
          <button class="btn btn-primary" id="confirmReportExportBtn" style="flex:1;">📥 Xuất Excel</button>
          <button class="btn btn-secondary" id="cancelReportExportBtn" style="flex:1;">Hủy</button>
        </div>
      </div>
    </div>
  `;

  let selectedPeriod = activePeriod;

  function renderPicker(period) {
    const pickerArea = document.getElementById('reportExportPickerArea');
    switch (period) {
      case 'daily':
        pickerArea.innerHTML = `<div class="form-group"><label>Chọn ngày</label><input type="date" id="rptExportDate" class="date-input" value="${baseDate}" style="width:100%;" /></div>`;
        break;
      case 'weekly':
        pickerArea.innerHTML = `<div class="form-group"><label>Chọn ngày trong tuần</label><input type="date" id="rptExportDate" class="date-input" value="${baseDate}" style="width:100%;" /><p style="font-size:12px; color:var(--text-muted); margin-top:6px;">Tự động tính tuần Thứ 2 – Chủ nhật.</p></div>`;
        break;
      case 'monthly':
        pickerArea.innerHTML = `<div class="form-group"><label>Chọn tháng</label><input type="month" id="rptExportMonth" class="date-input" value="${baseDate.substring(0, 7)}" style="width:100%;" /></div>`;
        break;
      case 'quarterly':
        pickerArea.innerHTML = `
          <div class="form-group"><label>Chọn quý</label>
            <select id="rptExportQuarter" style="width:100%; padding:10px 14px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-family); font-size:14px;">
              <option value="1" ${currentMonth < 3 ? 'selected' : ''}>Quý 1</option>
              <option value="2" ${currentMonth >= 3 && currentMonth < 6 ? 'selected' : ''}>Quý 2</option>
              <option value="3" ${currentMonth >= 6 && currentMonth < 9 ? 'selected' : ''}>Quý 3</option>
              <option value="4" ${currentMonth >= 9 ? 'selected' : ''}>Quý 4</option>
            </select>
          </div>
          <div class="form-group"><label>Năm</label><input type="number" id="rptExportYear" value="${currentYear}" min="2020" max="2100" style="width:100%; padding:10px 14px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-family); font-size:14px;" /></div>`;
        break;
      case 'halfyear':
        pickerArea.innerHTML = `
          <div class="form-group"><label>Chọn kỳ</label>
            <select id="rptExportHalf" style="width:100%; padding:10px 14px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-family); font-size:14px;">
              <option value="1" ${currentMonth < 6 ? 'selected' : ''}>6 tháng đầu</option>
              <option value="2" ${currentMonth >= 6 ? 'selected' : ''}>6 tháng cuối</option>
            </select>
          </div>
          <div class="form-group"><label>Năm</label><input type="number" id="rptExportYear" value="${currentYear}" min="2020" max="2100" style="width:100%; padding:10px 14px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-family); font-size:14px;" /></div>`;
        break;
      case 'yearly':
        pickerArea.innerHTML = `<div class="form-group"><label>Chọn năm</label><input type="number" id="rptExportYear" value="${currentYear}" min="2020" max="2100" style="width:100%; padding:10px 14px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-family); font-size:14px;" /></div>`;
        break;
    }
  }

  renderPicker(selectedPeriod);

  modalContainer.querySelectorAll('.export-period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modalContainer.querySelectorAll('.export-period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedPeriod = tab.dataset.period;
      renderPicker(selectedPeriod);
    });
  });

  document.getElementById('cancelReportExportBtn').addEventListener('click', () => { modalContainer.innerHTML = ''; });
  document.getElementById('reportExportOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) modalContainer.innerHTML = ''; });

  document.getElementById('confirmReportExportBtn').addEventListener('click', () => {
    const range = getReportExportRange(selectedPeriod);
    if (range) {
      exportReportToExcel(range.start, range.end, selectedPeriod, range.label);
      modalContainer.innerHTML = '';
    }
  });
}

function getReportExportRange(period) {
  let start, end, label;
  const currentYear = new Date().getFullYear();

  switch (period) {
    case 'daily': {
      const d = document.getElementById('rptExportDate').value;
      start = end = d; label = `Ngay_${d}`; break;
    }
    case 'weekly': {
      const d = new Date(document.getElementById('rptExportDate').value);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d); monday.setDate(diff);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      start = monday.toISOString().split('T')[0]; end = sunday.toISOString().split('T')[0];
      label = `Tuan_${start}_den_${end}`; break;
    }
    case 'monthly': {
      const monthVal = document.getElementById('rptExportMonth').value;
      const [y, m] = monthVal.split('-').map(Number);
      start = `${monthVal}-01`; end = new Date(y, m, 0).toISOString().split('T')[0];
      label = `Thang_${m}_${y}`; break;
    }
    case 'quarterly': {
      const q = parseInt(document.getElementById('rptExportQuarter').value);
      const y = parseInt(document.getElementById('rptExportYear').value);
      const sm = (q - 1) * 3;
      start = new Date(y, sm, 1).toISOString().split('T')[0]; end = new Date(y, sm + 3, 0).toISOString().split('T')[0];
      label = `Quy${q}_${y}`; break;
    }
    case 'halfyear': {
      const half = parseInt(document.getElementById('rptExportHalf').value);
      const y = parseInt(document.getElementById('rptExportYear').value);
      if (half === 1) { start = `${y}-01-01`; end = `${y}-06-30`; label = `6thang_dau_${y}`; }
      else { start = `${y}-07-01`; end = `${y}-12-31`; label = `6thang_cuoi_${y}`; }
      break;
    }
    case 'yearly': {
      const y = parseInt(document.getElementById('rptExportYear').value);
      start = `${y}-01-01`; end = `${y}-12-31`; label = `Nam_${y}`; break;
    }
    default: return null;
  }
  return { start, end, label };
}

function exportReportToExcel(startDate, endDate, period, label) {
  const users = getUsers();
  const periodLabels = { daily: 'Ngày', weekly: 'Tuần', monthly: 'Tháng', quarterly: 'Quý', halfyear: '6 tháng', yearly: 'Năm' };

  // Overview sheet
  const overviewData = [
    ['BÁO CÁO KPI TỔNG HỢP'],
    ['Loại báo cáo:', periodLabels[period] || period],
    ['Khoảng thời gian:', `${startDate} đến ${endDate}`],
    ['Ngày xuất:', new Date().toISOString().split('T')[0]],
    [],
    ['#', 'Tên', 'Tổng CV', 'Hoàn thành', 'a (SL%)', 'b (CL%)', 'c (TĐ%)', 'KPI'],
  ];

  users.forEach((user, idx) => {
    const tasks = getTasksByUserAndDateRange(user.id, startDate, endDate);
    const kpi = computeKPIBreakdown(tasks);
    overviewData.push([idx + 1, user.name, kpi.totalTasks, kpi.completedTasks,
    `${kpi.a.toFixed(1)}%`, `${kpi.b.toFixed(1)}%`, `${kpi.c.toFixed(1)}%`, `${kpi.kpi.toFixed(1)}%`]);
  });

  const wb = XLSX.utils.book_new();
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Tổng hợp');

  // Individual detail sheets
  users.forEach(user => {
    const tasks = getTasksByUserAndDateRange(user.id, startDate, endDate);

    const userData = [
      [`BÁO CÁO CÁ NHÂN: ${user.name}`],
      ['Khoảng thời gian:', `${startDate} đến ${endDate}`],
      [],
      ['STT', 'Nhóm', 'Nội dung nhiệm vụ', 'Ngày hết hạn', 'Sản phẩm CV', 'Hệ số QĐ', 'SL giao', 'SL giao QĐ',
        'SL HT thực tế', 'SL HT QĐ', 'Ngày HT', 'Ngày chậm', 'SL đạt TĐ QĐ', 'Số lần làm lại', 'SL đạt CL QĐ'],
    ];

    const excelGroupNames = {
      1: 'Group 1 (Nhóm 1, 2, 3)',
      2: 'Group 2 (Nhóm 4)',
      3: 'Group 3 (Nhóm 5)',
      4: 'Group 4 (Nhóm 6)',
      5: 'Group 5 (Nhóm 7)',
    };

    const groupedTasks = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    tasks.forEach(task => {
      let eg = 5;
      if (task.itemId) {
        const item = getItemById(task.itemId);
        if (item && item.excelGroup) {
          eg = item.excelGroup;
        } else {
          const gId = parseInt(task.groupId);
          if (gId === 1) eg = 5;
          else if (gId === 2 || gId === 3) eg = 2;
          else if (gId === 5 || gId === 6) eg = 3;
          else if (gId === 7) eg = 1;
        }
      } else {
        const gId = parseInt(task.groupId);
        if (gId === 1) eg = 5;
        else if (gId === 2 || gId === 3) eg = 2;
        else if (gId === 5 || gId === 6) eg = 3;
        else if (gId === 7) eg = 1;
      }
      groupedTasks[eg].push(task);
    });

    let tCol7 = 0, tCol9 = 0, tCol12 = 0, tCol14 = 0;
    let globalStt = 1;

    for (let eg = 1; eg <= 5; eg++) {
      const groupTasks = groupedTasks[eg];
      if (groupTasks.length > 0) {
        groupTasks.forEach((task) => {
          const cols = computeTaskColumns(task);
          tCol7 += cols.assignedQtyConverted;
          tCol9 += cols.actualQtyConverted;
          tCol12 += cols.progressQtyConverted;
          tCol14 += cols.qualityQtyConverted;

          userData.push([
            globalStt++, eg, task.name, task.deadline || '', task.productType || '',
            task.coefficient || 1.0, task.assignedQty || 0, cols.assignedQtyConverted,
            task.actualQty || 0, cols.actualQtyConverted, task.completionDate || '',
            cols.delayDays, cols.progressQtyConverted, task.reworkCount || 0, cols.qualityQtyConverted,
          ]);
        });
      }
    }

    // Summary rows
    const pctA = tCol7 > 0 ? (tCol9 / tCol7 * 100) : 0;
    const pctC = tCol7 > 0 ? (tCol12 / tCol7 * 100) : 0;
    const pctB = tCol7 > 0 ? (tCol14 / tCol7 * 100) : 0;
    const kpiVal = (pctA + pctB + pctC) / 3;

    userData.push([]);
    userData.push(['', '', '', '', '', '', 'Tổng cộng', tCol7, '', tCol9, '', '', tCol12, '', tCol14]);
    userData.push(['', '', '', '', '', '', '', '', 'Tỷ lệ %', `${pctA.toFixed(1)}%`, '', '', `${pctC.toFixed(1)}%`, '', `${pctB.toFixed(1)}%`]);
    userData.push(['', 'Điểm KPI =', '(a + b + c) / 3', '', '', '', '', '', '', `${kpiVal.toFixed(1)}%`]);

    let sheetName = user.name.length > 28 ? user.name.substring(0, 28) + '...' : user.name;
    sheetName = sheetName.replace(/[\\\/\?\*\[\]]/g, '_');
    const ws = XLSX.utils.aoa_to_sheet(userData);
    
    // Styling the 'Nhóm' column (column index 1 -> B) with yellow background and centered text
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let r = 3; r <= range.e.r; r++) {
      const cellAddress = XLSX.utils.encode_cell({ c: 1, r: r });
      const cell = ws[cellAddress];
      if (cell && cell.v) {
        cell.s = {
          fill: { fgColor: { rgb: "FFFF00" } },
          alignment: { horizontal: "center", vertical: "center" },
          font: { bold: r === 3 } // Make header bold
        };
      }
      const sttAddress = XLSX.utils.encode_cell({ c: 0, r: r });
      const sttCell = ws[sttAddress];
      if (sttCell && sttCell.v) {
         sttCell.s = { alignment: { horizontal: "center", vertical: "center" } };
      }
    }

    ws['!cols'] = [
      { wch: 5 }, { wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `Bao_cao_KPI_${label}.xlsx`);
}

// ===================== CHART =====================

function drawChart(data) {
  const canvas = document.getElementById('kpiChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = 300 * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = '300px';
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = 300;
  const padding = { top: 20, right: 20, bottom: 60, left: 50 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  ctx.clearRect(0, 0, w, h);

  if (data.length === 0) {
    ctx.fillStyle = '#9090b0';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Chưa có dữ liệu', w / 2, h / 2);
    return;
  }

  const barWidth = Math.min(30, (chartW / data.length) * 0.7);
  const gap = (chartW - barWidth * data.length) / (data.length + 1);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = '#606080';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText((100 - i * 25) + '%', padding.left - 8, y + 4);
  }

  // Bars
  data.forEach((d, i) => {
    const x = padding.left + gap + i * (barWidth + gap);
    const barH = (Math.min(d.kpi, 100) / 100) * chartH;
    const y = padding.top + chartH - barH;

    const gradient = ctx.createLinearGradient(x, y, x, y + barH);
    if (d.kpi >= 90) { gradient.addColorStop(0, '#10b981'); gradient.addColorStop(1, '#059669'); }
    else if (d.kpi >= 75) { gradient.addColorStop(0, '#06b6d4'); gradient.addColorStop(1, '#0891b2'); }
    else if (d.kpi >= 50) { gradient.addColorStop(0, '#f59e0b'); gradient.addColorStop(1, '#d97706'); }
    else { gradient.addColorStop(0, '#ef4444'); gradient.addColorStop(1, '#dc2626'); }

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, x + 2, y + 2, barWidth, barH, 4); ctx.fill();
    ctx.fillStyle = gradient;
    roundRect(ctx, x, y, barWidth, barH, 4); ctx.fill();

    ctx.fillStyle = '#e8e8f0';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.kpi.toFixed(0) + '%', x + barWidth / 2, y - 6);

    ctx.save();
    ctx.translate(x + barWidth / 2, h - padding.bottom + 14);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#9090b0';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    const lbl = d.name.length > 8 ? d.name.substring(0, 8) + '…' : d.name;
    ctx.fillText(lbl, 0, 0);
    ctx.restore();
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
