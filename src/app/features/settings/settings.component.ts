import { Component, OnInit } from '@angular/core';
import { StoreService } from '../../core/services/store.service';
import { WorkGroupsService } from '../../core/services/work-groups.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: []
})
export class SettingsComponent implements OnInit {

  users: any[] = [];
  currentUser: any = null;
  listCurrentUser: any[] = [];
  isAdmin = false;
  cloudActive = false;

  pwdUserId: number = 1;
  newPassword = '';

  workGroupsJson = '';

  constructor(
    private store: StoreService,
    private wgService: WorkGroupsService
  ) { }

  ngOnInit(): void {
    this.refreshData();
    this.store.workGroupsUpdated.subscribe(() => {
      this.workGroupsJson = JSON.stringify(this.store.getWorkGroups(), null, 2);
    });
  }

  refreshData() {
    this.users = this.store.getUsers();
    const loggedInId = this.store.getLoggedInUser();
    this.currentUser = this.users.find(u => u.id === loggedInId);
    this.listCurrentUser = this.currentUser ? [this.currentUser] : [];
    this.isAdmin = this.currentUser && this.currentUser.role === 'admin';
    this.cloudActive = this.store.isCloudSyncActive();
    
    if (this.isAdmin) {
      this.pwdUserId = loggedInId || 1;
      this.workGroupsJson = JSON.stringify(this.store.getWorkGroups(), null, 2);
    } else {
      this.pwdUserId = loggedInId || 1;
    }
  }

  saveUsers() {
    this.store.saveUsers(this.users);
    this.store.usersUpdated.emit();
    this.showToast('Đã lưu thay đổi!');
  }

  savePassword() {
    if (!this.newPassword) {
      this.showToast('Vui lòng nhập mật khẩu mới!');
      return;
    }
    if (this.newPassword.length < 4) {
      this.showToast('Mật khẩu nên dài tối thiểu 4 ký tự!');
      return;
    }

    if (this.store.updateUserPassword(this.pwdUserId, this.newPassword)) {
      this.showToast('Đã cập nhật mật khẩu thành công!');
      this.newPassword = '';
    } else {
      this.showToast('Lỗi: Cập nhật thất bại!');
    }
  }

  exportData() {
    const data = this.store.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Đã xuất dữ liệu!');
  }

  importData(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      if (this.store.importAllData(ev.target.result)) {
        this.showToast('Nhập dữ liệu thành công!');
        this.store.usersUpdated.emit();
        this.store.dashboardRefresh.emit();
        this.refreshData();
      } else {
        this.showToast('Lỗi: Không thể nhập dữ liệu!');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  resetTasksData() {
    if (confirm('⚠️ CẢNH BÁO: Hành động này chỉ xóa toàn bộ dữ liệu TASK (CÔNG VIỆC) đã nhập của tất cả mọi người. Tài khoản, mật khẩu, và cài đặt danh mục vẫn ĐƯỢC GIỮ NGUYÊN.\n\nBạn có CHẮC CHẮN muốn xóa toàn bộ công việc?')) {
      this.store.saveTasks([]);
      this.store.dashboardRefresh.emit();
      this.showToast('Đã xóa toàn bộ dữ liệu công việc!');
    }
  }

  saveWorkGroups() {
    try {
      const parsed = JSON.parse(this.workGroupsJson);
      if (Array.isArray(parsed)) {
        this.store.saveWorkGroups(parsed);
        this.showToast('Đã lưu cấu hình danh mục thành công!');
      } else {
        this.showToast('Lỗi: Cấu hình phải là một danh sách (Array)');
      }
    } catch (e) {
      this.showToast('Lỗi cú pháp JSON, vui lòng kiểm tra lại!');
    }
  }

  resetWorkGroups() {
    if (confirm('Khôi phục danh mục hệ thống về mặc định ban đầu?')) {
      this.store.saveWorkGroups(this.wgService.getAllGroups());
      this.workGroupsJson = JSON.stringify(this.store.getWorkGroups(), null, 2);
      this.showToast('Đã khôi phục danh mục mặc định!');
    }
  }

  setTheme(theme: string) {
    document.documentElement.setAttribute('data-theme', theme);
    const settings = this.store.getSettings();
    settings.theme = theme;
    this.store.saveSettings(settings);
    
    const themeToggle = document.getElementById('themeToggle');
    if(themeToggle) themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    
    this.showToast(`Đã chuyển sang giao diện ${theme === 'dark' ? 'tối' : 'sáng'}`);
  }

  showToast(message: string) {
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
      if(toast) {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
      }
    }, 2000);
  }
}
