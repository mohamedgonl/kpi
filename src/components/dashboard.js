/**
 * Dashboard Component
 * Main view with KPI cards, work group catalog, daily task table, and Excel export
 */
import { getWorkGroups, getTasksByUserAndDate, getTasksByUserAndDateRange, getLoggedInUser, getUserById } from '../data/store.js';
import { computeKPIBreakdown } from '../logic/kpi.js';
import { renderDailyTable } from './dailyTable.js';
import { renderWorkGroupCatalog } from './workGroupCatalog.js';
import { showTaskForm } from './taskForm.js';
import { getItemById } from '../data/workGroups.js';
import * as XLSX from 'xlsx';

export function renderDashboard(container, userId, date) {
  const tasks = getTasksByUserAndDate(userId, date);
  const kpi = computeKPIBreakdown(tasks);
  const loggedInId = getLoggedInUser();
  const canEdit = userId === loggedInId;
  const WORK_GROUPS = getWorkGroups();

  container.innerHTML = `
    <div class="dashboard-header">
      <h1 class="dashboard-title">📊 <span>Dashboard</span></h1>
      <div class="date-picker-wrap">
        <label>📅 Ngày:</label>
        <input type="date" class="date-input" id="dashboardDate" value="${date}" />
      </div>
    </div>

    <!-- KPI Score Cards -->
    <div class="kpi-cards">
      <div class="kpi-card quantity">
        <div class="kpi-card-label">Số lượng (a)</div>
        <div class="kpi-card-value">${kpi.a.toFixed(1)}%</div>
        <div class="kpi-card-sub">${kpi.completedTasks}/${kpi.totalTasks} hoàn thành</div>
      </div>
      <div class="kpi-card quality">
        <div class="kpi-card-label">Chất lượng (b)</div>
        <div class="kpi-card-value">${kpi.b.toFixed(1)}%</div>
        <div class="kpi-card-sub">Đánh giá chất lượng</div>
      </div>
      <div class="kpi-card progress-card">
        <div class="kpi-card-label">Tiến độ (c)</div>
        <div class="kpi-card-value">${kpi.c.toFixed(1)}%</div>
        <div class="kpi-card-sub">Đánh giá tiến độ</div>
      </div>
      <div class="kpi-card final">
        <div class="kpi-card-label">KPI Final</div>
        <div class="kpi-card-value">${kpi.kpi.toFixed(1)}%</div>
        <div class="kpi-card-sub">(a + b + c) ÷ 3</div>
      </div>
    </div>

    <!-- Excel Export Section -->
    <div class="export-section">
      <h2 class="section-title">📥 Xuất dữ liệu Excel</h2>
      <div class="export-btn-grid">
        <button class="btn btn-export" data-export-period="daily">📅 Theo ngày</button>
        <button class="btn btn-export" data-export-period="weekly">📆 Theo tuần</button>
        <button class="btn btn-export" data-export-period="monthly">🗓️ Theo tháng</button>
        <button class="btn btn-export" data-export-period="quarterly">📊 Theo quý</button>
        <button class="btn btn-export" data-export-period="halfyear">📈 6 tháng</button>
        <button class="btn btn-export" data-export-period="yearly">🗂️ 1 năm</button>
      </div>
    </div>

    <!-- Work Group Catalog (read-only reference) -->
    <div id="workGroupCatalogContainer"></div>

    <!-- Add Task Button -->
    ${canEdit ? `
    <div class="add-task-section">
      <h2 class="section-title">➕ Thêm công việc</h2>
      <div class="work-group-grid">
        ${WORK_GROUPS.map(g => `
          <button class="work-group-btn" data-group-id="${g.id}"
            style="border-color: ${g.color}20; --group-color: ${g.color};">
            <span style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${g.color};border-radius:var(--radius-md) 0 0 var(--radius-md);"></span>
            <span class="group-icon">${g.icon}</span>
            <span class="group-label">
              <span class="group-name">${g.shortName}</span>
              <span class="group-tag" style="color:${g.color}">${g.name.substring(0, 30)}...</span>
            </span>
          </button>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Daily Task Table -->
    <div class="task-section">
      <div class="task-list-header">
        <h2 class="section-title">📝 Bảng công việc hàng ngày</h2>
        <span class="task-count">${kpi.totalTasks} công việc · ${kpi.completedTasks} hoàn thành · ${kpi.pendingTasks} đang chờ</span>
      </div>
      <div id="dailyTableContainer"></div>
    </div>
  `;

  // Render work group catalog
  renderWorkGroupCatalog(document.getElementById('workGroupCatalogContainer'));

  // Render daily table
  renderDailyTable(document.getElementById('dailyTableContainer'), tasks, userId, canEdit);

  // Bind work group button clicks
  container.querySelectorAll('.work-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const groupId = parseInt(btn.dataset.groupId);
      showTaskForm(groupId, userId, date);
    });
  });

  // Bind date change
  document.getElementById('dashboardDate').addEventListener('change', (e) => {
    window.dispatchEvent(new CustomEvent('dateChange', { detail: e.target.value }));
  });

  // Bind export buttons
  container.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', () => {
      const period = btn.dataset.exportPeriod;
      showExportModal(period, userId, date);
    });
  });
}

// ===================== EXPORT MODAL =====================

function showExportModal(period, userId, baseDate) {
  const modalContainer = document.getElementById('modal-container');
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  let pickerHTML = '';
  let title = '';

  switch (period) {
    case 'daily':
      title = '📅 Xuất theo ngày';
      pickerHTML = `
        <div class="form-group">
          <label>Chọn ngày</label>
          <input type="date" id="exportDatePicker" class="date-input" value="${baseDate}" style="width:100%;" />
        </div>
      `;
      break;
    case 'weekly':
      title = '📆 Xuất theo tuần';
      pickerHTML = `
        <div class="form-group">
          <label>Chọn một ngày trong tuần cần xuất</label>
          <input type="date" id="exportDatePicker" class="date-input" value="${baseDate}" style="width:100%;" />
          <p style="font-size:12px; color:var(--text-muted); margin-top:6px;">Hệ thống sẽ tự động tính tuần (Thứ 2 – Chủ nhật) chứa ngày đã chọn.</p>
        </div>
      `;
      break;
    case 'monthly':
      title = '🗓️ Xuất theo tháng';
      pickerHTML = `
        <div class="form-group">
          <label>Chọn tháng</label>
          <input type="month" id="exportMonthPicker" class="date-input" value="${baseDate.substring(0, 7)}" style="width:100%;" />
        </div>
      `;
      break;
    case 'quarterly':
      title = '📊 Xuất theo quý';
      pickerHTML = `
        <div class="form-group">
          <label>Chọn quý</label>
          <select id="exportQuarterSelect" style="width:100%; padding:10px 14px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-family); font-size:14px;">
            <option value="1" ${currentMonth < 3 ? 'selected' : ''}>Quý 1 (Tháng 1 – 3)</option>
            <option value="2" ${currentMonth >= 3 && currentMonth < 6 ? 'selected' : ''}>Quý 2 (Tháng 4 – 6)</option>
            <option value="3" ${currentMonth >= 6 && currentMonth < 9 ? 'selected' : ''}>Quý 3 (Tháng 7 – 9)</option>
            <option value="4" ${currentMonth >= 9 ? 'selected' : ''}>Quý 4 (Tháng 10 – 12)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Năm</label>
          <input type="number" id="exportYearInput" value="${currentYear}" min="2020" max="2100" style="width:100%; padding:10px 14px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-family); font-size:14px;" />
        </div>
      `;
      break;
    case 'halfyear':
      title = '📈 Xuất 6 tháng';
      pickerHTML = `
        <div class="form-group">
          <label>Chọn kỳ 6 tháng</label>
          <select id="exportHalfSelect" style="width:100%; padding:10px 14px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-family); font-size:14px;">
            <option value="1" ${currentMonth < 6 ? 'selected' : ''}>6 tháng đầu (Tháng 1 – 6)</option>
            <option value="2" ${currentMonth >= 6 ? 'selected' : ''}>6 tháng cuối (Tháng 7 – 12)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Năm</label>
          <input type="number" id="exportYearInput" value="${currentYear}" min="2020" max="2100" style="width:100%; padding:10px 14px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-family); font-size:14px;" />
        </div>
      `;
      break;
    case 'yearly':
      title = '🗂️ Xuất 1 năm';
      pickerHTML = `
        <div class="form-group">
          <label>Chọn năm</label>
          <input type="number" id="exportYearInput" value="${currentYear}" min="2020" max="2100" style="width:100%; padding:10px 14px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-family); font-size:14px;" />
        </div>
      `;
      break;
  }

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="exportModalOverlay">
      <div class="modal">
        <div class="modal-title">${title}</div>
        ${pickerHTML}
        <div class="form-actions" style="display:flex; gap:10px; margin-top:20px;">
          <button class="btn btn-primary" id="confirmExportBtn" style="flex:1;">📥 Xuất Excel</button>
          <button class="btn btn-secondary" id="cancelExportBtn" style="flex:1;">Hủy</button>
        </div>
      </div>
    </div>
  `;

  // Close modal
  document.getElementById('cancelExportBtn').addEventListener('click', () => {
    modalContainer.innerHTML = '';
  });
  document.getElementById('exportModalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) modalContainer.innerHTML = '';
  });

  // Confirm export
  document.getElementById('confirmExportBtn').addEventListener('click', () => {
    const range = getExportDateRange(period);
    if (range) {
      exportUserExcel(userId, range.start, range.end, range.label);
      modalContainer.innerHTML = '';
    }
  });
}

function getExportDateRange(period) {
  let start, end, label;

  switch (period) {
    case 'daily': {
      const d = document.getElementById('exportDatePicker').value;
      start = end = d;
      label = `Ngay_${d}`;
      break;
    }
    case 'weekly': {
      const d = new Date(document.getElementById('exportDatePicker').value);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      start = monday.toISOString().split('T')[0];
      end = sunday.toISOString().split('T')[0];
      label = `Tuan_${start}_den_${end}`;
      break;
    }
    case 'monthly': {
      const monthVal = document.getElementById('exportMonthPicker').value;
      const [y, m] = monthVal.split('-').map(Number);
      start = `${monthVal}-01`;
      const lastDay = new Date(y, m, 0);
      end = lastDay.toISOString().split('T')[0];
      label = `Thang_${m}_${y}`;
      break;
    }
    case 'quarterly': {
      const q = parseInt(document.getElementById('exportQuarterSelect').value);
      const y = parseInt(document.getElementById('exportYearInput').value);
      const startMonth = (q - 1) * 3;
      start = new Date(y, startMonth, 1).toISOString().split('T')[0];
      end = new Date(y, startMonth + 3, 0).toISOString().split('T')[0];
      label = `Quy${q}_${y}`;
      break;
    }
    case 'halfyear': {
      const half = parseInt(document.getElementById('exportHalfSelect').value);
      const y = parseInt(document.getElementById('exportYearInput').value);
      if (half === 1) {
        start = `${y}-01-01`;
        end = `${y}-06-30`;
        label = `6thang_dau_${y}`;
      } else {
        start = `${y}-07-01`;
        end = `${y}-12-31`;
        label = `6thang_cuoi_${y}`;
      }
      break;
    }
    case 'yearly': {
      const y = parseInt(document.getElementById('exportYearInput').value);
      start = `${y}-01-01`;
      end = `${y}-12-31`;
      label = `Nam_${y}`;
      break;
    }
    default:
      return null;
  }

  return { start, end, label };
}

function exportUserExcel(userId, startDate, endDate, label) {
  const user = getUserById(userId);
  const tasks = getTasksByUserAndDateRange(userId, startDate, endDate);

  // Helper to assign Excel Group (1-5) based on internal Group ID (1-7)
  const getTaskExcelGroup = (task) => {
    if (task.itemId) {
      const item = getItemById(task.itemId);
      if (item && item.excelGroup) return item.excelGroup;
    }
    const gId = parseInt(task.groupId);
    if (gId === 1) return 5;
    if (gId === 2 || gId === 3) return 2;
    if (gId === 5 || gId === 6) return 3;
    if (gId === 7) return 1;
    return 5;
  };

  const excelGroupNames = {
    1: 'Group 1 (Nhóm 1, 2, 3)',
    2: 'Group 2 (Nhóm 4)',
    3: 'Group 3 (Nhóm 5)',
    4: 'Group 4 (Nhóm 6)',
    5: 'Group 5 (Nhóm 7)',
  };

  const groupedTasks = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  tasks.forEach(t => {
    const eg = getTaskExcelGroup(t);
    if (groupedTasks[eg]) groupedTasks[eg].push(t);
  });

  // Build 14-column sheet -> now 15 column with 'Nhóm'
  const sheetData = [
    ['BÁO CÁO KPI CÁ NHÂN'],
    ['Họ tên:', user ? user.name : `User ${userId}`],
    ['Khoảng thời gian:', `${startDate} đến ${endDate}`],
    ['Ngày xuất:', new Date().toISOString().split('T')[0]],
    [],
    // Multi-level headers
    ['STT', 'Nhóm', 'Nội dung nhiệm vụ', 'Ngày hết hạn', 'Sản phẩm CV', 'Hệ số QĐ', 'SL giao', 'SL giao QĐ',
      'SL HT thực tế', 'SL HT QĐ', 'Ngày HT', 'Ngày chậm', 'SL đạt TĐ QĐ', 'Số lần làm lại', 'SL đạt CL QĐ'],
  ];

  let totalCol7 = 0, totalCol9 = 0, totalCol12 = 0, totalCol14 = 0;
  let globalStt = 1;

  for (let eg = 1; eg <= 5; eg++) {
    const groupTasks = groupedTasks[eg];
    if (groupTasks.length > 0) {
      groupTasks.forEach((task) => {
        const cols = computeTaskColumnsLocal(task);
        totalCol7 += cols.assignedQtyConverted;
        totalCol9 += cols.actualQtyConverted;
        totalCol12 += cols.progressQtyConverted;
        totalCol14 += cols.qualityQtyConverted;

        sheetData.push([
          globalStt++,
          eg,
          task.name,
          task.deadline || '',
          task.productType || '',
          task.coefficient || 1.0,
          task.assignedQty || 0,
          cols.assignedQtyConverted,
          task.actualQty || 0,
          cols.actualQtyConverted,
          task.completionDate || '',
          cols.delayDays,
          cols.progressQtyConverted,
          task.reworkCount || 0,
          cols.qualityQtyConverted,
        ]);
      });
    }
  }

  // Summary rows
  const pctQty = totalCol7 > 0 ? (totalCol9 / totalCol7 * 100) : 0;
  const pctProgress = totalCol7 > 0 ? (totalCol12 / totalCol7 * 100) : 0;
  const pctQuality = totalCol7 > 0 ? (totalCol14 / totalCol7 * 100) : 0;
  const kpiScore = (pctQty + pctProgress + pctQuality) / 3;

  sheetData.push([]);
  sheetData.push(['', '', '', '', '', '', 'Tổng cộng', totalCol7, '', totalCol9, '', '', totalCol12, '', totalCol14]);
  sheetData.push(['', '', '', '', '', '', '', '', 'Tỷ lệ %', `${pctQty.toFixed(1)}%`, '', '', `${pctProgress.toFixed(1)}%`, '', `${pctQuality.toFixed(1)}%`]);
  sheetData.push(['', 'Điểm KPI =', '(a + b + c) / 3', '', '', '', '', '', '', `${kpiScore.toFixed(1)}%`]);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Styling the 'Nhóm' column (column index 1 -> B) with yellow background and centered text
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = 5; r <= range.e.r; r++) {
    const cellAddress = XLSX.utils.encode_cell({ c: 1, r: r });
    const cell = ws[cellAddress];
    if (cell && cell.v) {
      cell.s = {
        fill: { fgColor: { rgb: "FFFF00" } },
        alignment: { horizontal: "center", vertical: "center" },
        font: { bold: r === 5 } // Make header bold
      };
    }
    const sttAddress = XLSX.utils.encode_cell({ c: 0, r: r });
    const sttCell = ws[sttAddress];
    if (sttCell && sttCell.v) {
       sttCell.s = { alignment: { horizontal: "center", vertical: "center" } };
    }
  }

  ws['!cols'] = [
    { wch: 5 }, { wch: 8 }, { wch: 35 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'KPI Report');

  const userName = user ? user.name.replace(/\s+/g, '_') : `User_${userId}`;
  XLSX.writeFile(wb, `KPI_${userName}_${label}.xlsx`);
}

// Inline helper to compute task columns (avoid circular import)
function computeTaskColumnsLocal(task) {
  const coeff = task.coefficient || 1.0;
  const assignedQty = task.assignedQty || 0;
  const actualQty = task.actualQty || 0;
  const col7 = coeff * assignedQty;
  const col9 = coeff * actualQty;
  let col11 = 0;
  if (task.completionDate && task.deadline) {
    const completion = new Date(task.completionDate);
    const deadline = new Date(task.deadline);
    col11 = Math.max(0, Math.ceil((completion - deadline) / (1000 * 60 * 60 * 24)));
  }
  const col12 = col11 > 0 ? Math.max(0, col9 - 0.25 * col9) : col9;
  const reworkCount = task.reworkCount || 0;
  const col14 = reworkCount > 0 ? Math.max(0, col9 - 0.25 * col9) : col9;
  return {
    assignedQtyConverted: Math.round(col7 * 10) / 10,
    actualQtyConverted: Math.round(col9 * 10) / 10,
    delayDays: col11,
    progressQtyConverted: Math.round(col12 * 10) / 10,
    qualityQtyConverted: Math.round(col14 * 10) / 10,
  };
}

// Workaround stub - not actually used
function await_import_workaround() {
  return { computeTaskColumns: computeTaskColumnsLocal };
}
