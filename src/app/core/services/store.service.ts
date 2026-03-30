import { Injectable, EventEmitter } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { WorkGroupsService } from './work-groups.service';

const STORAGE_KEYS = {
  USERS: 'kpi_users',
  TASKS: 'kpi_tasks',
  SETTINGS: 'kpi_settings',
  WORK_GROUPS: 'kpi_work_groups'
};

@Injectable({
  providedIn: 'root'
})
export class StoreService {

  public cloudSyncActive = false;
  
  public tasksUpdated = new EventEmitter<void>();
  public usersUpdated = new EventEmitter<void>();
  public workGroupsUpdated = new EventEmitter<void>();
  public dashboardRefresh = new EventEmitter<void>();

  private taskIdCounter: number | null = null;

  constructor(
    private firebaseService: FirebaseService,
    private workGroupsService: WorkGroupsService
  ) { }

  async initCloudSync() {
    const ok = this.firebaseService.initFirebase();
    if (!ok) {
        console.log('[Store] Running in localStorage-only mode');
        return false;
    }

    try {
      const cloudData = await this.firebaseService.pullAllFromCloud();
      if (cloudData) {
        if (cloudData.users && cloudData.users.length > 0) {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cloudData.users));
        }
        if (cloudData.tasks && cloudData.tasks.length > 0) {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(cloudData.tasks));
        }
        if (cloudData.settings) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cloudData.settings));
        }
        if (cloudData.workGroups && cloudData.workGroups.length > 0) {
            localStorage.setItem(STORAGE_KEYS.WORK_GROUPS, JSON.stringify(cloudData.workGroups));
        }
        console.log('[Store] Cloud data loaded');
        this.dashboardRefresh.emit();
      } else {
        const localUsers = this.getUsers();
        const localTasks = this.getTasks();
        const localSettings = this.getSettings();
        const localWorkGroups = this.getWorkGroups();
        await this.firebaseService.syncUsersToCloud(localUsers);
        await this.firebaseService.syncTasksToCloud(localTasks);
        await this.firebaseService.syncSettingsToCloud(localSettings);
        await this.firebaseService.syncWorkGroupsToCloud(localWorkGroups);
        console.log('[Store] Local data pushed to cloud');
      }

      this.firebaseService.listenForTasks((tasks) => {
        if (tasks && tasks.length > 0) {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
            this.taskIdCounter = null;
            this.dashboardRefresh.emit();
        }
      });

      this.firebaseService.listenForUsers((users) => {
        if (users && users.length > 0) {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            this.usersUpdated.emit();
        }
      });

      this.firebaseService.listenForWorkGroups((groups) => {
        if (groups && groups.length > 0) {
            localStorage.setItem(STORAGE_KEYS.WORK_GROUPS, JSON.stringify(groups));
            this.workGroupsUpdated.emit();
            this.dashboardRefresh.emit();
        }
      });

      this.cloudSyncActive = true;
      console.log('[Store] Real-time sync active');
      return true;
    } catch (error) {
      console.error('[Store] Cloud sync init error:', error);
      return false;
    }
  }

  isCloudSyncActive() {
    return this.cloudSyncActive;
  }

  getDefaultUsers() {
    const names = [
        'Ngô Đức Minh', 'Bùi Thị Bình Giang', 'Phạm Thành Trung', 'Phạm Mai Hoa',
        'Nguyễn Ngọc Lan', 'Nguyễn Tạ Minh Dương', 'Nguyễn Thị Giang', 'Hoàng Thùy Giang',
        'Vũ Hương Giang', 'Bùi Thị Bình Hiền', 'Nguyễn Ngân Huệ', 'Lại Thị Lan Hương',
        'Hoàng Thị Hải Hà', 'Nguyễn Ngọc Anh - LPQT', 'Nguyễn Viết Khương', 'Nguyễn Ngọc Anh - TH',
        'Bàn Thị Mai', 'Lê Bá Ngọc', 'Lê Thị Nhàn', 'Võ Mai Nguyên Phương', 'Trương Minh Tú',
        'Hoàng Văn Trường', 'Nguyễn Văn Thành', 'Lê Gia Thanh Tùng'
    ];
    return names.map((name, i) => ({
        id: i + 1,
        name,
        role: i < 5 ? 'admin' : 'user',
        password: '123456',
    }));
  }

  getUsers(): any[] {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
        const defaults = this.getDefaultUsers();
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaults));
        return defaults;
    }
    const users = JSON.parse(data);
    const defaults = this.getDefaultUsers();
    let updated = false;

    users.forEach((u: any) => {
        if (!u.role) {
            u.role = u.id <= 5 ? 'admin' : 'user';
            updated = true;
        }
        if (!u.password) {
            u.password = '123456';
            updated = true;
        }
        const defaultUser = defaults.find((d: any) => d.id === u.id);
        if (defaultUser && (/^Người dùng \d+$/.test(u.name) || /^User \d+/.test(u.name))) {
            u.name = defaultUser.name;
            updated = true;
        }
    });
    if (updated) this.saveUsers(users);
    return users;
  }

  saveUsers(users: any[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    if (this.firebaseService.isCloudEnabled()) this.firebaseService.syncUsersToCloud(users);
  }

  getUserById(id: number) {
    return this.getUsers().find(u => u.id === id);
  }

  updateUserPassword(userId: number, newPassword: string) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        users[index].password = newPassword;
        this.saveUsers(users);
        return true;
    }
    return false;
  }

  private getNextId() {
    if (this.taskIdCounter === null) {
        const tasks = this.getRawTasks();
        this.taskIdCounter = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    }
    return this.taskIdCounter++;
  }

  getRawTasks(): any[] {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!data) return [];
    let tasks = JSON.parse(data);
    let migrated = false;
    tasks.forEach((t: any) => {
        if (t.deadline === undefined) { t.deadline = t.date || ''; migrated = true; }
        if (t.productType === undefined) { t.productType = ''; migrated = true; }
        if (t.assignedQty === undefined) { t.assignedQty = 1; migrated = true; }
        if (t.actualQty === undefined) { t.actualQty = t.status === 'completed' ? 1 : 0; migrated = true; }
        if (t.completionDate === undefined) { t.completionDate = t.status === 'completed' ? t.date : ''; migrated = true; }
        if (t.reworkCount === undefined) { t.reworkCount = t.qualityScore === 75 ? 1 : 0; migrated = true; }
        if (t.delayDays === undefined) { t.delayDays = t.progressScore === 75 ? 1 : 0; migrated = true; }
        if (t.itemId === undefined) { t.itemId = ''; migrated = true; }
        if (t.userId !== undefined && typeof t.userId === 'string') { t.userId = parseInt(t.userId, 10); migrated = true; }
        
        // Soft delete migration: March tasks (month 03) are deleted (is_deleted = 1), others are active (is_deleted = 0)
        if (t.is_deleted === undefined) {
            const dateStr = t.date || '';
            const isMarch = dateStr.includes('-03-');
            t.is_deleted = isMarch ? 1 : 0;
            migrated = true;
        }
    });

    if (migrated) {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        if (this.firebaseService.isCloudEnabled()) {
          this.firebaseService.syncTasksToCloud(tasks);
        }
    }
    return tasks;
  }

  getTasks(): any[] {
    return this.getRawTasks().filter(t => t.is_deleted === 0);
  }

  saveTasks(tasks: any[]) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    if (this.firebaseService.isCloudEnabled()) this.firebaseService.syncTasksToCloud(tasks);
  }

  addTask(task: any, isAutoAssign = false) {
    const loggedInId = this.getLoggedInUser();
    if (task.userId !== loggedInId && !isAutoAssign) {
        console.error('Unauthorized: Cannot add task to another user');
        return null;
    }
    const tasks = this.getRawTasks();
    const newTask = {
        id: this.getNextId(),
        name: task.name,
        groupId: task.groupId,
        itemId: task.itemId || '',
        userId: task.userId,
        date: task.date || new Date().toISOString().split('T')[0],
        status: 'pending',
        deadline: task.deadline || task.date || new Date().toISOString().split('T')[0],
        productType: task.productType || '',
        coefficient: task.coefficient || 1.0,
        assignedQty: task.assignedQty || 1,
        actualQty: task.actualQty || 0,
        completionDate: task.completionDate || '',
        reworkCount: task.reworkCount || 0,
        qualityScore: 100,
        progressScore: 100,
        assignedBy: task.assignedBy || null,
        linkedTaskId: task.linkedTaskId || null,
        createdAt: new Date().toISOString(),
        is_deleted: 0
    };
    tasks.push(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  updateTask(id: number, updates: any, skipSync = false) {
    const tasks = this.getRawTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...updates };
        this.saveTasks(tasks);
        return tasks[index];
    }
    return null;
  }

  syncLinkedTask(taskId: number) {
    const SYNC_FIELDS = ['actualQty', 'completionDate', 'reworkCount', 'status', 'qualityScore', 'progressScore'];
    const tasks = this.getRawTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.linkedTaskId) return;

    const linkedTask = tasks.find(t => t.id === task.linkedTaskId);
    if (!linkedTask) return;

    const syncUpdates: any = {};
    SYNC_FIELDS.forEach(field => {
        if (task[field] !== undefined) {
            syncUpdates[field] = task[field];
        }
    });

    this.updateTask(task.linkedTaskId, syncUpdates, true);
  }

  deleteTask(id: number) {
    this.updateTask(id, { is_deleted: 1 });
  }

  getTasksByUserAndDate(userId: number, date: string) {
    return this.getTasks().filter(t => t.userId === userId && t.date === date);
  }

  getTasksByUserAndDateRange(userId: number, startDate: string, endDate: string) {
    return this.getTasks().filter(t => t.userId === userId && t.date >= startDate && t.date <= endDate);
  }

  getTasksByDate(date: string) {
    return this.getTasks().filter(t => t.date === date);
  }

  getSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : { theme: 'dark', language: 'vi' };
  }

  saveSettings(settings: any) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    if (this.firebaseService.isCloudEnabled()) this.firebaseService.syncSettingsToCloud(settings);
  }

  getWorkGroups() {
    const data = localStorage.getItem(STORAGE_KEYS.WORK_GROUPS);
    if (!data) {
        const def = this.workGroupsService.getAllGroups();
        localStorage.setItem(STORAGE_KEYS.WORK_GROUPS, JSON.stringify(def));
        return def;
    }
    return JSON.parse(data);
  }

  saveWorkGroups(groups: any[]) {
    localStorage.setItem(STORAGE_KEYS.WORK_GROUPS, JSON.stringify(groups));
    if (this.firebaseService.isCloudEnabled()) this.firebaseService.syncWorkGroupsToCloud(groups);
    this.workGroupsUpdated.emit();
  }

  getLoggedInUser(): number | null {
    const id = localStorage.getItem('kpi_logged_in_user');
    return id ? parseInt(id, 10) : null;
  }

  setLoggedInUser(id: number | null) {
    if (id !== null) {
        localStorage.setItem('kpi_logged_in_user', id.toString());
    } else {
        localStorage.removeItem('kpi_logged_in_user');
    }
  }

  exportAllData() {
    return JSON.stringify({
        users: this.getUsers(),
        tasks: this.getRawTasks(),
        settings: this.getSettings(),
        exportedAt: new Date().toISOString()
    }, null, 2);
  }

  importAllData(jsonString: string) {
    try {
        const data = JSON.parse(jsonString);
        if (data.users) {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
            if (this.firebaseService.isCloudEnabled()) this.firebaseService.syncUsersToCloud(data.users);
        }
        if (data.tasks) {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
            if (this.firebaseService.isCloudEnabled()) this.firebaseService.syncTasksToCloud(data.tasks);
        }
        if (data.settings) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
            if (this.firebaseService.isCloudEnabled()) this.firebaseService.syncSettingsToCloud(data.settings);
        }
        if (data.workGroups) {
            localStorage.setItem(STORAGE_KEYS.WORK_GROUPS, JSON.stringify(data.workGroups));
            if (this.firebaseService.isCloudEnabled()) this.firebaseService.syncWorkGroupsToCloud(data.workGroups);
        }
        this.taskIdCounter = null;
        return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  computeTaskColumns(task: any) {
    const coeff = task.coefficient || 1.0;
    const assignedQty = task.assignedQty || 0;
    const actualQty = task.actualQty || 0;

    const col7 = coeff * assignedQty;
    const col9 = coeff * actualQty;

    let col11 = 0;
    if (task.completionDate && task.deadline) {
        const completion = new Date(task.completionDate).getTime();
        const deadline = new Date(task.deadline).getTime();
        const diffMs = completion - deadline;
        col11 = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
}
