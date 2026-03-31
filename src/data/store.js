/**
 * Data Store with Cloud Sync
 * localStorage as primary + Firebase Realtime Database for cross-device sync
 * When Firebase is configured, all writes go to both local and cloud
 */
import {
    initFirebase, isCloudEnabled,
    syncTasksToCloud, syncUsersToCloud, syncSettingsToCloud, syncWorkGroupsToCloud,
    pullAllFromCloud, listenForTasks, listenForUsers, listenForWorkGroups
} from './firebase.js';
import { DEFAULT_WORK_GROUPS, WORK_GROUPS_VERSION } from './workGroups.js';

const STORAGE_KEYS = {
    USERS: 'kpi_users',
    TASKS: 'kpi_tasks',
    SETTINGS: 'kpi_settings',
    WORK_GROUPS: 'kpi_work_groups',
    WORK_GROUPS_VER: 'kpi_work_groups_version'
};

// In-memory data cache
let _users = [];
let _tasks = [];
let _settings = { theme: 'dark', language: 'vi' };
let _workGroups = [];

// Track cloud sync state
let cloudSyncActive = false;
let cloudInitialized = false;

// ===================== CLOUD INIT =====================

/**
 * Initialize cloud sync — call once at app start
 * Will pull cloud data if available, then listen for real-time changes
 */
export async function initCloudSync() {
    const ok = initFirebase();
    cloudInitialized = true;

    if (!ok) {
        console.warn('[Store] Firebase not available. Running with defaults.');
        return false;
    }

    try {
        const cloudData = await pullAllFromCloud();
        if (cloudData) {
            if (cloudData.users) _users = cloudData.users;
            if (cloudData.tasks) _tasks = cloudData.tasks;
            if (cloudData.settings) _settings = cloudData.settings;
            
            if (cloudData.workGroups && cloudData.workGroups.length > 0) {
                const currentVer = cloudData.settings?.workGroupsVersion || '1.0';
                if (currentVer !== WORK_GROUPS_VERSION) {
                    console.log(`[Store] Version mismatch: ${currentVer} vs ${WORK_GROUPS_VERSION}. Forcing code defaults.`);
                    _workGroups = DEFAULT_WORK_GROUPS;
                    saveWorkGroups(_workGroups);
                } else {
                    _workGroups = cloudData.workGroups;
                }
            } else {
                _workGroups = DEFAULT_WORK_GROUPS;
                saveWorkGroups(_workGroups);
            }
            
            console.log('[Store] Cloud data loaded');
            window.dispatchEvent(new CustomEvent('refreshDashboard'));
        } else {
            // First run - initialization
            _users = getDefaultUsers();
            _tasks = [];
            _settings = { theme: 'dark', language: 'vi', workGroupsVersion: WORK_GROUPS_VERSION };
            _workGroups = DEFAULT_WORK_GROUPS;
            
            await syncUsersToCloud(_users);
            await syncTasksToCloud(_tasks);
            await syncSettingsToCloud(_settings);
            await syncWorkGroupsToCloud(_workGroups);
            console.log('[Store] Initial data pushed to cloud');
        }

        // Set up real-time listeners
        listenForTasks((tasks) => {
            if (tasks) {
                _tasks = tasks;
                taskIdCounter = null;
                window.dispatchEvent(new CustomEvent('refreshDashboard'));
            }
        });

        listenForUsers((users) => {
            if (users) {
                _users = users;
                window.dispatchEvent(new CustomEvent('usersUpdated'));
            }
        });

        listenForWorkGroups((groups) => {
            if (groups) {
                _workGroups = groups;
                window.dispatchEvent(new CustomEvent('workGroupsUpdated'));
                window.dispatchEvent(new CustomEvent('refreshDashboard'));
            }
        });

        cloudSyncActive = true;
        console.log('[Store] Pure Cloud Sync active');
        return true;
    } catch (error) {
        console.error('[Store] Cloud sync init error:', error);
        return false;
    }
}

export function isCloudSyncActive() {
    return cloudSyncActive;
}

// ===================== USERS =====================

function getDefaultUsers() {
    const names = [
        'Ngô Đức Minh',
        'Bùi Thị Bình Giang',
        'Phạm Thành Trung',
        'Phạm Mai Hoa',
        'Nguyễn Ngọc Lan',
        'Nguyễn Tạ Minh Dương',
        'Nguyễn Thị Giang',
        'Hoàng Thùy Giang',
        'Vũ Hương Giang',
        'Bùi Thị Bình Hiền',
        'Nguyễn Ngân Huệ',
        'Lại Thị Lan Hương',
        'Hoàng Thị Hải Hà',
        'Nguyễn Ngọc Anh - LPQT',
        'Nguyễn Viết Khương',
        'Nguyễn Ngọc Anh - TH',
        'Bàn Thị Mai',
        'Lê Bá Ngọc',
        'Lê Thị Nhàn',
        'Võ Mai Nguyên Phương',
        'Trương Minh Tú',
        'Hoàng Văn Trường',
        'Nguyễn Văn Thành',
        'Lê Gia Thanh Tùng',
    ];
    return names.map((name, i) => ({
        id: i + 1,
        name,
        role: i < 5 ? 'admin' : 'user',
        password: '123456',
    }));
}

export function getUsers() {
    if (_users.length === 0) {
        _users = getDefaultUsers();
    }
    
    const defaults = getDefaultUsers();
    let updated = false;

    _users.forEach(u => {
        if (!u.role) { u.role = u.id <= 5 ? 'admin' : 'user'; updated = true; }
        if (!u.password) { u.password = '123456'; updated = true; }
    });
    
    if (updated) saveUsers(_users);
    return _users;
}

export function saveUsers(users) {
    _users = users;
    if (isCloudEnabled()) syncUsersToCloud(users);
}

export function getUserById(id) {
    return getUsers().find(u => u.id === id);
}

export function updateUserPassword(userId, newPassword) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        users[index].password = newPassword;
        saveUsers(users);
        return true;
    }
    return false;
}

// ===================== TASKS =====================

let taskIdCounter = null;

function getNextId() {
    if (taskIdCounter === null) {
        const tasks = getRawTasks();
        taskIdCounter = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    }
    return taskIdCounter++;
}

export function getRawTasks() {
    return _tasks;
}

export function getTasks() {
    return getRawTasks().filter(t => t.is_deleted === 0);
}

export function saveTasks(tasks) {
    _tasks = tasks;
    if (isCloudEnabled()) syncTasksToCloud(tasks);
}

export function addTask(task, isAutoAssign = false) {
    const loggedInId = getLoggedInUser();
    if (task.userId !== loggedInId && !isAutoAssign) {
        console.error('Unauthorized: Cannot add task to another user');
        return null;
    }

    const tasks = getRawTasks();
    const newTask = {
        id: getNextId(),
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
    console.log(`[Store] Created task ID ${newTask.id} for user ${newTask.userId}`);
    saveTasks(tasks);
    return newTask;
}

export function updateTask(id, updates, skipSync = false) {
    const tasks = getRawTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...updates };
        saveTasks(tasks);
        return tasks[index];
    }
    return null;
}

/**
 * Sync evaluation fields from a task to its linked leader/specialist task.
 * Call after updating evaluation-related fields on a task.
 */
const SYNC_FIELDS = ['actualQty', 'completionDate', 'reworkCount', 'status', 'qualityScore', 'progressScore'];

export function syncLinkedTask(taskId) {
    const tasks = getRawTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.linkedTaskId) return;

    const linkedTask = tasks.find(t => t.id === task.linkedTaskId);
    if (!linkedTask) return;

    const syncUpdates = {};
    SYNC_FIELDS.forEach(field => {
        if (task[field] !== undefined) {
            syncUpdates[field] = task[field];
        }
    });

    console.log(`[Store] Syncing task ${taskId} → linked task ${task.linkedTaskId}`, syncUpdates);
    updateTask(task.linkedTaskId, syncUpdates, true);
}

export function deleteTask(id) {
    updateTask(id, { is_deleted: 1 });
}

export function getTasksByUserAndDate(userId, date) {
    return getTasks().filter(t => t.userId === userId && t.date === date);
}

export function getTasksByUserAndDateRange(userId, startDate, endDate) {
    return getTasks().filter(t =>
        t.userId === userId && t.date >= startDate && t.date <= endDate
    );
}

export function getTasksByDate(date) {
    return getTasks().filter(t => t.date === date);
}

export function getUsersWithTasksOnDate(date) {
    const tasks = getTasksByDate(date);
    const userIds = new Set(tasks.map(t => t.userId));
    return userIds;
}

// ===================== COMPUTED COLUMNS =====================

export function computeTaskColumns(task) {
    const coeff = task.coefficient || 1.0;
    const assignedQty = task.assignedQty || 0;
    const actualQty = task.actualQty || 0;

    const col7 = coeff * assignedQty;
    const col9 = coeff * actualQty;

    let col11 = 0;
    if (task.completionDate && task.deadline) {
        const completion = new Date(task.completionDate);
        const deadline = new Date(task.deadline);
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

// ===================== SETTINGS =====================

export function getSettings() {
    return _settings;
}

export function saveSettings(settings) {
    _settings = settings;
    if (isCloudEnabled()) syncSettingsToCloud(settings);
}

// ===================== WORK GROUPS =====================

export function getWorkGroups() {
    if (_workGroups.length === 0) {
        _workGroups = DEFAULT_WORK_GROUPS;
    }
    return _workGroups;
}

export function saveWorkGroups(groups) {
    _workGroups = groups;
    if (isCloudEnabled()) syncWorkGroupsToCloud(groups);
    window.dispatchEvent(new CustomEvent('workGroupsUpdated'));
}

// ===================== DATA EXPORT/IMPORT =====================

export function exportAllData() {
    return JSON.stringify({
        users: getUsers(),
        tasks: getRawTasks(),
        settings: getSettings(),
        exportedAt: new Date().toISOString()
    }, null, 2);
}

export function getLoggedInUser() {
    const id = localStorage.getItem('kpi_logged_in_user');
    return id ? parseInt(id) : null;
}

export function setLoggedInUser(id) {
    if (id) {
        localStorage.setItem('kpi_logged_in_user', id.toString());
    } else {
        localStorage.removeItem('kpi_logged_in_user');
    }
}

export function importAllData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data.users) {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
            if (isCloudEnabled()) syncUsersToCloud(data.users);
        }
        if (data.tasks) {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
            if (isCloudEnabled()) syncTasksToCloud(data.tasks);
        }
        if (data.settings) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
            if (isCloudEnabled()) syncSettingsToCloud(data.settings);
        }
        if (data.workGroups) {
            localStorage.setItem(STORAGE_KEYS.WORK_GROUPS, JSON.stringify(data.workGroups));
            if (isCloudEnabled()) syncWorkGroupsToCloud(data.workGroups);
        }
        taskIdCounter = null;
        return true;
    } catch (e) {
        console.error('Import failed:', e);
        return false;
    }
}
