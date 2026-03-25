/**
 * Settings Component
 * Edit user names, toggle theme, export/import data
 * Shows cloud sync and encryption status
 */
import { getUsers, saveUsers, exportAllData, importAllData, getLoggedInUser, updateUserPassword, isCloudSyncActive, getWorkGroups, saveWorkGroups, getTasks, saveTasks } from '../data/store.js';
import { getEncryptionStatus } from '../data/encryption.js';

export function renderSettings(container) {
  const users = getUsers();
  const loggedInId = getLoggedInUser();
  const currentUser = users.find(u => u.id === loggedInId);
  const isAdmin = currentUser && currentUser.role === 'admin';
  const cloudActive = isCloudSyncActive();
  const encStatus = getEncryptionStatus();

  container.innerHTML = `
    <div class="dashboard-header">
      <h1 class="dashboard-title">⚙️ <span>Cài đặt</span></h1>
    </div>

    <div class="settings-grid">
      <!-- User Names -->
      <div class="settings-card">
        <div class="settings-card-title">👥 ${isAdmin ? 'Danh sách 24 người dùng' : 'Thông tin cá nhân'}</div>
        <div class="user-list-edit" id="userListEdit">
          ${(isAdmin ? users : [currentUser]).map(u => `
            <div class="user-edit-row">
              <span class="user-num">${u.id}</span>
              <input type="text" value="${escapeAttr(u.name)}" data-user-id="${u.id}" class="user-name-input" />
            </div>
          `).join('')}
        </div>
        <div class="form-actions" style="margin-top: 16px;">
          <button class="btn btn-primary" id="saveUsersBtn">💾 Lưu thay đổi</button>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-card-title">🔐 Thay đổi Mật khẩu</div>
        ${(() => {
      let html = '<div class="form-group">';
      if (isAdmin) {
        html += `
                  <label>Chọn người dùng</label>
                  <select id="pwdUserSelect" style="margin-bottom: 12px; width: 100%;">
                    ${users.map(u => `<option value="${u.id}" ${u.id === loggedInId ? 'selected' : ''}>${u.name}</option>`).join('')}
                  </select>
                `;
      } else {
        html += `
                  <label>Tài khoản hiện tại</label>
                  <input type="text" value="${escapeAttr(currentUser?.name || '')}" disabled style="margin-bottom: 12px; width: 100%; opacity: 0.7;" />
                  <input type="hidden" id="pwdUserSelect" value="${loggedInId}" />
                `;
      }
      html += `
              <label>Mật khẩu mới</label>
              <input type="password" id="newPasswordInput" placeholder="Nhập mật khẩu mới..." style="width: 100%;" />
            </div>
            <div class="form-actions" style="margin-top: 16px;">
              <button class="btn btn-primary btn-full" id="savePwdBtn">Cập nhật Mật khẩu</button>
            </div>`;
      return html;
    })()}
      </div>

      <!-- Cloud & Security Status -->
      <div class="settings-card">
        <div class="settings-card-title">☁️ Trạng thái đồng bộ & Bảo mật</div>
        <div class="status-list">
          <div class="status-item">
            <span class="status-icon">${cloudActive ? '✅' : '⚠️'}</span>
            <div class="status-info">
              <span class="status-label">Đồng bộ đám mây (Cloud Sync)</span>
              <span class="status-value">${cloudActive
      ? '🟢 Đang hoạt động — Dữ liệu được đồng bộ qua Firebase'
      : '🟡 Chưa kích hoạt — Đang sử dụng lưu trữ cục bộ (localStorage). Cần cấu hình Firebase trong firebase.js'}</span>
            </div>
          </div>
          <div class="status-item">
            <span class="status-icon">${encStatus.webCryptoAvailable ? '✅' : '❌'}</span>
            <div class="status-info">
              <span class="status-label">Mã hóa End-to-End (E2E Encryption)</span>
              <span class="status-value">${encStatus.summary}</span>
            </div>
          </div>
          <div class="status-item">
            <span class="status-icon">${encStatus.httpsActive ? '✅' : '⚠️'}</span>
            <div class="status-info">
              <span class="status-label">Kết nối bảo mật (HTTPS)</span>
              <span class="status-value">${encStatus.httpsActive
      ? '🔒 Kết nối được mã hóa SSL/TLS'
      : '⚠️ Đang kết nối qua HTTP — Cần HTTPS cho bảo mật đầy đủ'}</span>
            </div>
          </div>
        </div>
      </div>

      ${isAdmin ? `
      <!-- Data Management -->
      <div class="settings-card">
        <div class="settings-card-title">📦 Quản lý dữ liệu</div>
        <div class="data-actions">
          <button class="btn btn-primary btn-full" id="exportBtn">📤 Xuất dữ liệu (JSON)</button>
          <button class="btn btn-secondary btn-full" id="importBtn">📥 Nhập dữ liệu (JSON)</button>
          <input type="file" id="importFileInput" accept=".json" style="display:none" />
          <button class="btn btn-secondary btn-full" id="resetBtn" style="color: #ef4444;">🗑️ Xóa dữ liệu công việc (Reset Data)</button>
        </div>
      </div>

      <!-- Work Groups Management -->
      <div class="settings-card" style="grid-column: 1 / -1;">
        <div class="settings-card-title">📋 Quản lý Danh mục Nhóm Công việc</div>
        <div class="status-info" style="margin-bottom: 16px; font-size:13px; color:var(--text-secondary);">
          Bạn có thể thay đổi danh mục 7 nhóm công việc và các mục chi tiết dưới định dạng JSON.<br>
          <i>Thêm thuộc tính <code>excelGroup: 1</code> (từ 1 đến 5) vào từng nhóm/mục để phần mềm biết cột nào sẽ được xuất ra trong file Excel.</i>
        </div>
        <textarea id="workGroupsJsonEditor" style="width:100%; height: 350px; font-family: monospace; font-size: 12px; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; resize: vertical;"></textarea>
        <div class="form-actions" style="margin-top: 16px; justify-content: space-between;">
           <button class="btn btn-secondary" id="resetWorkGroupsBtn">Khôi phục Mặc định</button>
           <button class="btn btn-primary" id="saveWorkGroupsBtn">💾 Lưu cấu hình Danh mục</button>
        </div>
      </div>
      ` : ''}

      <div class="settings-card">
        <div class="settings-card-title">🎨 Giao diện</div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary" id="themeDarkBtn">🌙 Tối</button>
          <button class="btn btn-secondary" id="themeLightBtn">☀️ Sáng</button>
        </div>

        <div style="margin-top: 24px;">
          <div class="settings-card-title">ℹ️ Thông tin</div>
          <p style="font-size:13px; color:var(--text-secondary); line-height:1.8;">
            <strong>KPI Tracker v2.0</strong><br>
            Hệ thống theo dõi KPI cho 24 người dùng<br>
            VỤ PHÁP CHẾ - BỘ CÔNG THƯƠNG<br>
            Công thức: KPI = (a + b + c) ÷ 3<br>
            • a = Số lượng % = Σcol9 / Σcol7<br>
            • b = Chất lượng % = Σcol14 / Σcol7<br>
            • c = Tiến độ % = Σcol12 / Σcol7<br>
            • Bảng 14 cột đa cấp với hệ số quy đổi<br>
            ${cloudActive ? '• ☁️ Đồng bộ đám mây Firebase' : '• 💾 Lưu trữ cục bộ'}
          </p>
        </div>
      </div>
    </div>
  `;

  // Save users
  document.getElementById('saveUsersBtn').addEventListener('click', () => {
    const inputs = container.querySelectorAll('.user-name-input');
    const allUsers = getUsers();
    inputs.forEach(input => {
      const id = parseInt(input.dataset.userId);
      const name = input.value.trim() || `Người dùng ${id}`;
      const user = allUsers.find(u => u.id === id);
      if (user) {
        user.name = name;
      }
    });
    saveUsers(allUsers);
    window.dispatchEvent(new CustomEvent('usersUpdated'));
    showToast('Đã lưu thay đổi!');
  });

  // Save Password
  document.getElementById('savePwdBtn').addEventListener('click', () => {
    const targetUserId = parseInt(document.getElementById('pwdUserSelect').value);
    const newPassword = document.getElementById('newPasswordInput').value.trim();

    if (!newPassword) {
      showToast('Vui lòng nhập mật khẩu mới!');
      return;
    }
    if (newPassword.length < 4) {
      showToast('Mật khẩu nên dài tối thiểu 4 ký tự!');
      return;
    }

    if (updateUserPassword(targetUserId, newPassword)) {
      showToast('Đã cập nhật mật khẩu thành công!');
      document.getElementById('newPasswordInput').value = '';
    } else {
      showToast('Lỗi: Cập nhật thất bại!');
    }
  });

  if (isAdmin) {
    // Export
    document.getElementById('exportBtn').addEventListener('click', () => {
      const data = exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kpi_data_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất dữ liệu!');
    });

    // Import
    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importFileInput').click();
    });

    document.getElementById('importFileInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (importAllData(ev.target.result)) {
          showToast('Nhập dữ liệu thành công!');
          window.dispatchEvent(new CustomEvent('usersUpdated'));
          window.dispatchEvent(new CustomEvent('refreshDashboard'));
          renderSettings(container);
        } else {
          showToast('Lỗi: Không thể nhập dữ liệu!');
        }
      };
      reader.readAsText(file);
    });

    // Reset
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (confirm('⚠️ CẢNH BÁO: Hành động này chỉ xóa toàn bộ dữ liệu TASK (CÔNG VIỆC) đã nhập của tất cả mọi người. Tài khoản, mật khẩu, và cài đặt danh mục vẫn ĐƯỢC GIỮ NGUYÊN.\\n\\nBạn có CHẮC CHẮN muốn xóa toàn bộ công việc?')) {
        saveTasks([]);
        window.dispatchEvent(new CustomEvent('refreshDashboard'));
        showToast('Đã xóa toàn bộ dữ liệu công việc!');
      }
    });

    // Work Groups Editor
    const workGroupsEditor = document.getElementById('workGroupsJsonEditor');
    const loadWorkGroupsList = () => {
      workGroupsEditor.value = JSON.stringify(getWorkGroups(), null, 2);
    };
    loadWorkGroupsList();

    document.getElementById('saveWorkGroupsBtn').addEventListener('click', () => {
      try {
        const parsed = JSON.parse(workGroupsEditor.value);
        if (Array.isArray(parsed)) {
          saveWorkGroups(parsed);
          showToast('Đã lưu cấu hình danh mục thành công!');
        } else {
          showToast('Lỗi: Cấu hình phải là một danh sách (Array)');
        }
      } catch (e) {
        showToast('Lỗi cú pháp JSON, vui lòng kiểm tra lại!');
      }
    });

    document.getElementById('resetWorkGroupsBtn').addEventListener('click', () => {
        if (confirm('Khôi phục danh mục hệ thống về mặc định ban đầu?')) {
            import('../data/workGroups.js').then(module => {
                saveWorkGroups(module.DEFAULT_WORK_GROUPS);
                loadWorkGroupsList();
                showToast('Đã khôi phục danh mục mặc định!');
            });
        }
    });
  }

  // Theme toggles
  document.getElementById('themeDarkBtn').addEventListener('click', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggle').textContent = '🌙';
    showToast('Đã chuyển sang giao diện tối');
  });

  document.getElementById('themeLightBtn').addEventListener('click', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('themeToggle').textContent = '☀️';
    showToast('Đã chuyển sang giao diện sáng');
  });
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--gradient-primary);
    color: white;
    padding: 12px 28px;
    border-radius: 40px;
    font-size: 14px;
    font-weight: 600;
    font-family: var(--font-family);
    z-index: 2000;
    box-shadow: var(--shadow-lg);
    animation: fadeIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function escapeAttr(text) {
  return text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
