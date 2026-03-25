/**
 * Task List Component
 * Displays tasks with group tags, status badges, and action buttons
 */
import { getGroupById } from '../data/workGroups.js';
import { deleteTask } from '../data/store.js';
import { showAssessmentPopup } from './assessmentPopup.js';

export function renderTaskList(container, tasks) {
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>Chưa có công việc nào. Hãy chọn nhóm công việc ở trên để bắt đầu!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map(task => {
    const group = getGroupById(task.groupId);
    const isCompleted = task.status === 'completed';

    return `
      <div class="task-item" data-task-id="${task.id}">
        <span class="task-group-tag" style="background:${group.bgColor}; color:${group.color}">
          ${group.icon} ${group.shortName}
        </span>
        <span class="task-name">${escapeHtml(task.name)}</span>
        <span class="task-coeff">×${task.coefficient}</span>
        ${isCompleted ? `
          <div class="task-scores">
            <span class="score-badge ${task.qualityScore === 100 ? 'quality-ok' : 'quality-err'}">
              CL: ${task.qualityScore}
            </span>
            <span class="score-badge ${task.progressScore === 100 ? 'progress-ok' : 'progress-err'}">
              TĐ: ${task.progressScore}
            </span>
          </div>
        ` : ''}
        <span class="task-status-badge ${task.status}">${isCompleted ? '✓ Hoàn thành' : '⏳ Đang chờ'}</span>
        <div class="task-actions">
          ${!isCompleted ? `
            <button class="btn-complete" data-task-id="${task.id}">✓ Hoàn thành</button>
          ` : ''}
          <button class="btn-delete" data-task-id="${task.id}">✕</button>
        </div>
      </div>
    `;
  }).join('');

  // Bind complete buttons
  container.querySelectorAll('.btn-complete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = parseInt(btn.dataset.taskId);
      showAssessmentPopup(taskId);
    });
  });

  // Bind delete buttons
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = parseInt(btn.dataset.taskId);
      showDeleteConfirm(taskId);
    });
  });
}

function showDeleteConfirm(taskId) {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
      <div class="modal-overlay" id="deleteOverlay">
        <div class="modal" style="max-width:400px; text-align:center;">
          <div style="font-size:40px; margin-bottom:12px;">🗑️</div>
          <h2 class="modal-title" style="text-align:center;">Xác nhận xóa</h2>
          <p style="color:var(--text-secondary); font-size:14px; margin-bottom:24px;">
            Bạn có chắc chắn muốn xóa công việc này?<br>Hành động này không thể hoàn tác.
          </p>
          <div class="form-actions" style="justify-content:center;">
            <button class="btn btn-secondary" id="deleteCancelBtn">Hủy</button>
            <button class="btn" id="deleteConfirmBtn" style="background:var(--gradient-danger); color:white;">Xóa</button>
          </div>
        </div>
      </div>
    `;

  document.getElementById('deleteCancelBtn').addEventListener('click', () => {
    modal.innerHTML = '';
  });
  document.getElementById('deleteOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) modal.innerHTML = '';
  });
  document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
    deleteTask(taskId);
    modal.innerHTML = '';
    window.dispatchEvent(new CustomEvent('refreshDashboard'));
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
