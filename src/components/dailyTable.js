/**
 * Daily Table Component
 * Renders the 14-column multi-level header table for task management
 * Supports inline editing for editable columns
 */
import { computeTaskColumns, updateTask, deleteTask, getLoggedInUser, syncLinkedTask } from '../data/store.js';
import { getGroupById } from '../data/workGroups.js';

/**
 * Format a number with 1 decimal place, using comma as decimal separator (Vietnamese style)
 */
function fmt(n) {
    if (n === null || n === undefined || n === '') return '';
    const val = Math.round(n * 100) / 100;
    return val.toFixed(2).replace('.', ',');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

/**
 * Render the full 14-column daily task table
 */
export function renderDailyTable(container, tasks, userId, canEdit) {
    const loggedInId = getLoggedInUser();
    const isAdmin = loggedInId && loggedInId <= 5;

    container.innerHTML = `
    <div class="daily-table-wrap">
      <table class="daily-table" id="dailyTaskTable">
        <thead>
          <tr>
            <th rowspan="3" class="col-stt">STT</th>
            <th rowspan="3" class="col-content">Nội dung nhiệm vụ</th>
            <th colspan="5" class="col-group-header assign-header">GIAO NHIỆM VỤ</th>
            <th colspan="7" class="col-group-header eval-header">ĐÁNH GIÁ</th>
          </tr>
          <tr>
            <th rowspan="2" class="col-deadline">Ngày hết hạn</th>
            <th rowspan="2" class="col-product">Sản phẩm công việc</th>
            <th rowspan="2" class="col-coeff">Hệ số quy đổi</th>
            <th rowspan="2" class="col-assigned">Số lượng giao</th>
            <th rowspan="2" class="col-assigned-conv">Số lượng giao quy đổi</th>
            <th colspan="2" class="col-qty-header">Đánh giá số lượng</th>
            <th colspan="3" class="col-progress-header">Đánh giá tiến độ</th>
            <th colspan="2" class="col-quality-header">Đánh giá chất lượng</th>
          </tr>
          <tr>
            <th class="col-actual">SL hoàn thành thực tế</th>
            <th class="col-actual-conv">SL HT thực tế quy đổi</th>
            <th class="col-completion">Ngày hoàn thành</th>
            <th class="col-delay">Số ngày chậm</th>
            <th class="col-progress-conv">SL đạt tiến độ QĐ</th>
            <th class="col-rework">Số lần làm lại</th>
            <th class="col-quality-conv">SL đạt chất lượng QĐ</th>
          </tr>
          <tr class="col-numbers-row">
            <td>(1)</td>
            <td>(2)</td>
            <td>(3)</td>
            <td>(4)</td>
            <td>(5)</td>
            <td>(6)</td>
            <td>(7)=(5)×(6)</td>
            <td>(8)</td>
            <td>(9)=(5)×(8)</td>
            <td>(10)</td>
            <td>(11)=(10)-(3)</td>
            <td>(12)=(9)×75% (nếu trễ)</td>
            <td>(13)</td>
            <td>(14)=(9)×75% (nếu làm lại)</td>
          </tr>
        </thead>
        <tbody id="dailyTableBody">
          ${tasks.length === 0 ? `
            <tr><td colspan="14" class="empty-row">Chưa có công việc nào</td></tr>
          ` : tasks.map((task, idx) => renderTaskRow(task, idx, canEdit, isAdmin)).join('')}
        </tbody>
      </table>
    </div>
  `;

    if (tasks.length > 0) {
        bindTableEvents(container, tasks, canEdit, isAdmin, userId);
    }
}

function renderTaskRow(task, idx, canEdit, isAdmin) {
    const cols = computeTaskColumns(task);
    const group = getGroupById(task.groupId);
    const isLate = cols.delayDays > 0;
    const hasRework = (task.reworkCount || 0) > 0;
    const rowClass = isLate ? 'row-late' : (hasRework ? 'row-rework' : '');

    return `
    <tr class="task-row ${rowClass}" data-task-id="${task.id}">
      <td class="cell-center">${idx + 1}</td>
      <td class="cell-left">
        <div class="cell-task-name" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <div>
            ${group ? `<span class="mini-tag" style="background:${group.bgColor};color:${group.color}">${group.icon}</span>` : ''}
            <span>${escapeHtml(task.name)}</span>
          </div>
          ${canEdit ? `
          <div class="row-actions" style="white-space:nowrap; margin-left:8px;">
            <button type="button" class="btn-icon edit-task-btn" data-id="${task.id}" title="Sửa công việc" style="background:none; border:none; cursor:pointer; font-size:14px; padding:2px;">✏️</button>
            <button type="button" class="btn-icon delete-task-btn" data-id="${task.id}" title="Xóa công việc" style="background:none; border:none; cursor:pointer; font-size:14px; padding:2px;">🗑️</button>
          </div>
          ` : ''}
        </div>
      </td>
      <td class="cell-center ${canEdit && isAdmin ? 'editable' : ''}" data-field="deadline" data-task-id="${task.id}">
        ${task.deadline ? formatDate(task.deadline) : '—'}
      </td>
      <td class="cell-center">${escapeHtml(task.productType) || '—'}</td>
      <td class="cell-center">${fmt(task.coefficient)}</td>
      <td class="cell-center ${canEdit && isAdmin ? 'editable' : ''}" data-field="assignedQty" data-task-id="${task.id}">
        ${fmt(task.assignedQty)}
      </td>
      <td class="cell-center computed">${fmt(cols.assignedQtyConverted)}</td>
      <td class="cell-center ${canEdit ? 'editable' : ''}" data-field="actualQty" data-task-id="${task.id}">
        ${fmt(task.actualQty)}
      </td>
      <td class="cell-center computed">${fmt(cols.actualQtyConverted)}</td>
      <td class="cell-center ${canEdit ? 'editable' : ''}" data-field="completionDate" data-task-id="${task.id}">
        ${task.completionDate ? formatDate(task.completionDate) : '—'}
      </td>
      <td class="cell-center ${isLate ? 'cell-warning' : ''}">${fmt(cols.delayDays)}</td>
      <td class="cell-center computed">${fmt(cols.progressQtyConverted)}</td>
      <td class="cell-center ${canEdit ? 'editable' : ''}" data-field="reworkCount" data-task-id="${task.id}">
        ${task.reworkCount || 0}
      </td>
      <td class="cell-center computed">${fmt(cols.qualityQtyConverted)}</td>
    </tr>
  `;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function bindTableEvents(container, tasks, canEdit, isAdmin, userId) {
    if (canEdit) {
        // Edit Task button
        container.querySelectorAll('.edit-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = parseInt(btn.dataset.id);
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    import('./taskForm.js').then(module => {
                        module.showTaskForm(task.groupId, userId, task.date, task);
                    });
                }
            });
        });

        // Delete Task button
        container.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = parseInt(btn.dataset.id);
                if (confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
                    deleteTask(taskId);
                    window.dispatchEvent(new CustomEvent('refreshDashboard'));
                }
            });
        });
    }

    // Inline editing for editable cells
    container.querySelectorAll('.editable').forEach(cell => {
        cell.addEventListener('click', () => {
            if (cell.querySelector('input, select')) return;  // already editing

            const field = cell.dataset.field;
            const taskId = parseInt(cell.dataset.taskId);
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            if (field === 'deadline' || field === 'completionDate') {
                const input = document.createElement('input');
                input.type = 'date';
                input.value = task[field] || '';
                input.className = 'inline-input';
                cell.innerHTML = '';
                cell.appendChild(input);
                input.focus();

                const save = () => {
                    const newVal = input.value;
                    updateTask(taskId, { [field]: newVal });
                    if (field === 'completionDate' && newVal) {
                        updateTask(taskId, { status: 'completed' });
                    }
                    syncLinkedTask(taskId);
                    window.dispatchEvent(new CustomEvent('refreshDashboard'));
                };
                input.addEventListener('change', save);
                input.addEventListener('blur', save);
            } else if (field === 'assignedQty' || field === 'actualQty' || field === 'reworkCount') {
                const currentVal = task[field] || 0;
                const input = document.createElement('input');
                input.type = 'number';
                input.value = currentVal;
                input.min = '0';
                input.step = field === 'reworkCount' ? '1' : '0.1';
                input.className = 'inline-input';
                cell.innerHTML = '';
                cell.appendChild(input);
                input.focus();
                input.select();

                const save = () => {
                    const newVal = parseFloat(input.value) || 0;
                    updateTask(taskId, { [field]: newVal });
                    if (field === 'actualQty' && newVal > 0 && !task.completionDate) {
                        // Auto-set completion date if not set
                        updateTask(taskId, {
                            status: 'completed',
                            completionDate: new Date().toISOString().split('T')[0]
                        });
                    }
                    syncLinkedTask(taskId);
                    window.dispatchEvent(new CustomEvent('refreshDashboard'));
                };
                input.addEventListener('blur', save);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') save();
                    if (e.key === 'Escape') window.dispatchEvent(new CustomEvent('refreshDashboard'));
                });
            }
        });
    });
}

/**
 * Render summary rows for report view
 */
export function renderSummaryRows(tasks) {
    if (tasks.length === 0) return '';

    let totalCol7 = 0, totalCol9 = 0, totalCol12 = 0, totalCol14 = 0;
    tasks.forEach(task => {
        const cols = computeTaskColumns(task);
        totalCol7 += cols.assignedQtyConverted;
        totalCol9 += cols.actualQtyConverted;
        totalCol12 += cols.progressQtyConverted;
        totalCol14 += cols.qualityQtyConverted;
    });

    const pctQty = totalCol7 > 0 ? ((totalCol9 / totalCol7) * 100) : 0;
    const pctProgress = totalCol7 > 0 ? ((totalCol12 / totalCol7) * 100) : 0;
    const pctQuality = totalCol7 > 0 ? ((totalCol14 / totalCol7) * 100) : 0;
    const kpiScore = (pctQty + pctProgress + pctQuality) / 3;

    return `
    <tr class="summary-row">
      <td colspan="6" class="cell-right summary-label">Tổng cộng</td>
      <td class="cell-center summary-val">${fmt(totalCol7)}</td>
      <td class="cell-center"></td>
      <td class="cell-center summary-val">${fmt(totalCol9)}</td>
      <td class="cell-center"></td>
      <td class="cell-center"></td>
      <td class="cell-center summary-val">${fmt(totalCol12)}</td>
      <td class="cell-center"></td>
      <td class="cell-center summary-val">${fmt(totalCol14)}</td>
    </tr>
    <tr class="pct-row">
      <td colspan="8" class="cell-right pct-label">Điểm tỷ lệ phần trăm (%)</td>
      <td class="cell-center pct-val">${pctQty.toFixed(2)}%</td>
      <td colspan="2" class="cell-center"></td>
      <td class="cell-center pct-val">${pctProgress.toFixed(2)}%</td>
      <td class="cell-center"></td>
      <td class="cell-center pct-val">${pctQuality.toFixed(2)}%</td>
    </tr>
    <tr class="kpi-row">
      <td colspan="2" class="cell-right kpi-formula-label">Điểm đánh giá KPI =</td>
      <td colspan="4" class="cell-center kpi-formula">(a + b + c) / 3</td>
      <td colspan="8" class="cell-left kpi-final-val">${kpiScore.toFixed(2)}%</td>
    </tr>
  `;
}
