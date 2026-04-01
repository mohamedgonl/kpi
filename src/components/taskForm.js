/**
 * Task Form Modal
 * Creates new tasks with all fields from the enhanced 14-column data model
 * Supports selecting from the work group catalog
 */
import { getAllItems } from '../data/workGroups.js';
import { addTask, updateTask, getWorkGroups } from '../data/store.js';

function escapeAttr(text) {
  if (!text) return '';
  return text.toString().replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function showTaskForm(groupId, userId, date, existingTask = null) {
  const container = document.getElementById('modal-container');
  const allItems = getAllItems();
  const effectiveGroupId = existingTask ? existingTask.groupId : groupId;
  const filteredItems = effectiveGroupId ? allItems.filter(i => i.groupId === effectiveGroupId) : allItems;
  const WORK_GROUPS = getWorkGroups();
  const group = WORK_GROUPS.find(g => g.id === effectiveGroupId);

  container.innerHTML = `
    <div class="modal-overlay" id="taskFormOverlay">
      <div class="modal" style="max-width:600px;">
        <h2 class="modal-title">
          ${existingTask ? '✏️ Sửa công việc' : (group ? `${group.icon} Thêm công việc — ${group.shortName}` : '➕ Thêm công việc')}
        </h2>
        ${group ? `<p style="font-size:12px; color:var(--text-muted); margin-bottom:18px;">${group.name}</p>` : ''}

        <form id="taskForm">
          <div class="form-row">
            <div class="form-group" style="flex:2;">
              <label>Nội dung nhiệm vụ *</label>
              <select id="taskItemSelect" style="width:100%;">
                <option value="">— Chọn từ danh mục hoặc nhập tay —</option>
                ${filteredItems.map(item => `
                  <option value="${item.id}" data-coeff="${item.coefficient}" data-group="${item.groupId}" ${existingTask && existingTask.itemId === item.id ? 'selected' : ''}>
                    [${item.subGroupId}] ${item.name} (×${item.coefficient})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Hoặc nhập tên công việc thủ công</label>
            <input type="text" id="taskNameInput" placeholder="Nhập tên công việc..." value="${existingTask ? escapeAttr(existingTask.name) : ''}" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Nhóm công việc</label>
              <select id="taskGroupSelect">
                ${WORK_GROUPS.map(g => `
                  <option value="${g.id}" ${g.id === effectiveGroupId ? 'selected' : ''}>
                    ${g.icon} ${g.shortName} — ${g.name.substring(0, 40)}...
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Hệ số quy đổi</label>
              <input type="number" id="taskCoeffInput" value="${existingTask ? existingTask.coefficient : '1.0'}" min="0.1" max="100" step="0.1" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Sản phẩm công việc</label>
              <input type="text" id="taskProductInput" placeholder="VD: Công văn, Báo cáo..." value="${existingTask ? escapeAttr(existingTask.productType) : ''}" />
            </div>
            <div class="form-group">
              <label>Ngày hết hạn</label>
              <input type="date" id="taskDeadlineInput" value="${existingTask ? existingTask.deadline : date}" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Số lượng giao</label>
              <input type="number" id="taskAssignedQtyInput" value="${existingTask ? existingTask.assignedQty : '1'}" min="0" step="0.1" />
            </div>
            ${!existingTask ? `
            <div class="form-group">
              <label>Lãnh đạo chỉ đạo (Tùy chọn)</label>
              <select id="taskLeaderSelect">
                <option value="">— Không có —</option>
                <option value="1">Ngô Đức Minh</option>
                <option value="2">Bùi Thị Bình Giang</option>
                <option value="3">Phạm Thành Trung</option>
              </select>
            </div>
            ` : ''}
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancelTaskBtn">Hủy</button>
            <button type="submit" class="btn btn-primary">${existingTask ? '✓ Lưu thay đổi' : '✓ Thêm công việc'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Auto-fill from catalog selection
  document.getElementById('taskItemSelect').addEventListener('change', (e) => {
    const option = e.target.selectedOptions[0];
    if (option && option.value) {
      const coeff = parseFloat(option.dataset.coeff) || 1.0;
      const gId = parseInt(option.dataset.group);
      document.getElementById('taskCoeffInput').value = coeff;
      document.getElementById('taskGroupSelect').value = gId;
      document.getElementById('taskNameInput').value = '';
      document.getElementById('taskNameInput').placeholder = option.textContent.trim();
    }
  });

  // Close modal
  const close = () => { container.innerHTML = ''; };
  document.getElementById('cancelTaskBtn').addEventListener('click', close);
  document.getElementById('taskFormOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) close();
  });

  // Submit form
  document.getElementById('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const itemSelect = document.getElementById('taskItemSelect');
    const selectedItem = itemSelect.value;
    let name = document.getElementById('taskNameInput').value.trim();

    if (!name && selectedItem) {
      // Use catalog item name
      const option = itemSelect.selectedOptions[0];
      name = option.textContent.trim().replace(/^\[[\d.]+\]\s*/, '').replace(/\s*\(×[\d.]+\)$/, '');
    }

    if (!name) {
      document.getElementById('taskNameInput').focus();
      return;
    }

    const gId = parseInt(document.getElementById('taskGroupSelect').value);
    const coeff = parseFloat(document.getElementById('taskCoeffInput').value) || 1.0;
    const productType = document.getElementById('taskProductInput').value.trim();
    const deadline = document.getElementById('taskDeadlineInput').value;
    const assignedQty = parseFloat(document.getElementById('taskAssignedQtyInput').value) || 1;

    const taskData = {
      name,
      groupId: gId,
      itemId: selectedItem || '',
      coefficient: coeff,
      productType,
      deadline,
      assignedQty,
      assignedBy: userId,
    };

    if (existingTask) {
      updateTask(existingTask.id, taskData);
    } else {
      // 1. Add task for current user
      const specialistTask = addTask({
        ...taskData,
        userId,
        date,
      });

      // 2. Auto-assign to leader if selected, and link both tasks
      const leaderSelect = document.getElementById('taskLeaderSelect');
      if (leaderSelect && leaderSelect.value) {
        const leaderId = parseInt(leaderSelect.value);
        if (leaderId !== userId && specialistTask) {
          const leaderTask = addTask({
            ...taskData,
            userId: leaderId,
            date,
            linkedTaskId: specialistTask.id,
          }, true); // isAutoAssign = true

          // Link specialist task back to leader task
          if (leaderTask) {
            updateTask(specialistTask.id, { linkedTaskId: leaderTask.id });
          }
        }
      }
    }

    close();
    window.dispatchEvent(new CustomEvent('refreshDashboard'));
  });

  // Focus
  setTimeout(() => {
    document.getElementById('taskItemSelect')?.focus();
  }, 100);
}
