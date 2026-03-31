import { Injectable, EventEmitter } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { WorkGroupsService, WORK_GROUPS_VERSION } from './work-groups.service';

const STORAGE_KEYS = {
  USERS: 'kpi_users',
  TASKS: 'kpi_tasks',
  SETTINGS: 'kpi_settings',
  WORK_GROUPS: 'kpi_work_groups',
  WORK_GROUPS_VER: 'kpi_work_groups_version'
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
  private _users: any[] = [];
  private _tasks: any[] = [];
  private _settings: any = { theme: 'dark', language: 'vi' };
  private _workGroups: any[] = [];

  constructor(
    private firebaseService: FirebaseService,
    private workGroupsService: WorkGroupsService
  ) { }

  async initCloudSync() {
    const ok = this.firebaseService.initFirebase();
    if (!ok) {
        console.log('[Store] Firebase initialization failed. No data sync available.');
        return false;
    }

    try {
      const cloudData = await this.firebaseService.pullAllFromCloud();
      if (cloudData) {
        if (cloudData.users) this._users = cloudData.users;
        if (cloudData.tasks) this._tasks = cloudData.tasks;
        if (cloudData.settings) this._settings = cloudData.settings;
        
        // Handle WorkGroups with versioning
        if (cloudData.workGroups && cloudData.workGroups.length > 0) {
            const currentVer = cloudData.settings?.workGroupsVersion || '1.0';
            if (currentVer !== WORK_GROUPS_VERSION) {
                console.log(`[Store] Version mismatch: ${currentVer} vs ${WORK_GROUPS_VERSION}. Forcing code defaults.`);
                this._workGroups = this.workGroupsService.getAllGroups();
                this.saveWorkGroups(this._workGroups);
            } else {
                this._workGroups = cloudData.workGroups;
            }
        } else {
            this._workGroups = this.workGroupsService.getAllGroups();
            this.saveWorkGroups(this._workGroups);
        }
        
        console.log('[Store] Cloud data loaded');
        this.dashboardRefresh.emit();
      } else {
        // First run with no cloud data
        this._users = this.getDefaultUsers();
        this._tasks = [];
        this._settings = { theme: 'dark', language: 'vi', workGroupsVersion: WORK_GROUPS_VERSION };
        this._workGroups = this.workGroupsService.getAllGroups();
        
        await this.firebaseService.syncUsersToCloud(this._users);
        await this.firebaseService.syncTasksToCloud(this._tasks);
        await this.firebaseService.syncSettingsToCloud(this._settings);
        await this.firebaseService.syncWorkGroupsToCloud(this._workGroups);
        console.log('[Store] Initial data pushed to cloud');
      }

      this.firebaseService.listenForTasks((tasks) => {
        if (tasks) {
            this._tasks = tasks;
            this.taskIdCounter = null;
            this.dashboardRefresh.emit();
        }
      });

      this.firebaseService.listenForUsers((users) => {
        if (users) {
            this._users = users;
            this.usersUpdated.emit();
        }
      });

      this.firebaseService.listenForWorkGroups((groups) => {
        if (groups) {
            this._workGroups = groups;
            this.workGroupsUpdated.emit();
            this.dashboardRefresh.emit();
        }
      });

      this.cloudSyncActive = true;
      console.log('[Store] Real-time sync active (Pure Cloud Mode)');
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
    if (this._users.length === 0) {
        this._users = this.getDefaultUsers();
    }
    
    // Auto-update core user properties (optional, for safety)
    const defaults = this.getDefaultUsers();
    let updated = false;

    this._users.forEach((u: any) => {
        if (!u.role) { u.role = u.id <= 5 ? 'admin' : 'user'; updated = true; }
        if (!u.password) { u.password = '123456'; updated = true; }
    });
    
    if (updated && this.firebaseService.isCloudEnabled()) {
        this.saveUsers(this._users);
    }
    return this._users;
  }

  saveUsers(users: any[]) {
    this._users = users;
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
    // Return current memory state
    return this._tasks;
  }

  getTasks(): any[] {
    return this.getRawTasks().filter(t => t.is_deleted === 0);
  }

  saveTasks(tasks: any[]) {
    this._tasks = tasks;
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
    return this._settings;
  }

  saveSettings(settings: any) {
    this._settings = settings;
    if (this.firebaseService.isCloudEnabled()) this.firebaseService.syncSettingsToCloud(settings);
  }

  getWorkGroups() {
    if (this._workGroups.length === 0) {
        this._workGroups = this.workGroupsService.getAllGroups();
    }
    return this._workGroups;
  }

  saveWorkGroups(groups: any[]) {
    this._workGroups = groups;
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
        assignedQtyConverted: Math.round(col7 * 100) / 100,
        actualQtyConverted: Math.round(col9 * 100) / 100,
        delayDays: col11,
        progressQtyConverted: Math.round(col12 * 100) / 100,
        qualityQtyConverted: Math.round(col14 * 100) / 100,
    };
  }
}
