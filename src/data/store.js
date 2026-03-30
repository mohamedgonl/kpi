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
import { DEFAULT_WORK_GROUPS } from './workGroups.js';

const STORAGE_KEYS = {
    USERS: 'kpi_users',
    TASKS: 'kpi_tasks',
    SETTINGS: 'kpi_settings',
    WORK_GROUPS: 'kpi_work_groups'
};

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
        console.log('[Store] Running in localStorage-only mode');
        return false;
    }

    // Pull cloud data and merge
    try {
        const cloudData = await pullAllFromCloud();
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
            window.dispatchEvent(new CustomEvent('refreshDashboard'));
        } else {
            // Upload local data to cloud if cloud is empty
            const localUsers = getUsers();
            const localTasks = getTasks();
            const localSettings = getSettings();
            const localWorkGroups = getWorkGroups();
            await syncUsersToCloud(localUsers);
            await syncTasksToCloud(localTasks);
            await syncSettingsToCloud(localSettings);
            await syncWorkGroupsToCloud(localWorkGroups);
            console.log('[Store] Local data pushed to cloud');
        }

        // Set up real-time listeners
        listenForTasks((tasks) => {
            if (tasks && tasks.length > 0) {
                localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
                taskIdCounter = null;
                window.dispatchEvent(new CustomEvent('refreshDashboard'));
            }
        });

        listenForUsers((users) => {
            if (users && users.length > 0) {
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
                window.dispatchEvent(new CustomEvent('usersUpdated'));
            }
        });

        listenForWorkGroups((groups) => {
            if (groups && groups.length > 0) {
                localStorage.setItem(STORAGE_KEYS.WORK_GROUPS, JSON.stringify(groups));
                window.dispatchEvent(new CustomEvent('workGroupsUpdated'));
                window.dispatchEvent(new CustomEvent('refreshDashboard'));
            }
        });

        cloudSyncActive = true;
        console.log('[Store] Real-time sync active');
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
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
        const defaults = getDefaultUsers();
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaults));
        return defaults;
    }
    const users = JSON.parse(data);
    const defaults = getDefaultUsers();
    let updated = false;

    users.forEach(u => {
        if (!u.role) {
            u.role = u.id <= 5 ? 'admin' : 'user';
            updated = true;
        }
        if (!u.password) {
            u.password = '123456';
            updated = true;
        }
        const defaultUser = defaults.find(d => d.id === u.id);
        if (defaultUser && (/^Người dùng \d+$/.test(u.name) || /^User \d+/.test(u.name))) {
            u.name = defaultUser.name;
            updated = true;
        }
    });
    if (updated) saveUsers(users);
    return users;
}

export function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
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
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!data) return [];
    let tasks = JSON.parse(data);
    // Migrate old tasks to new model
    let migrated = false;
    tasks.forEach(t => {
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
        if (isCloudEnabled()) syncTasksToCloud(tasks);
    }
    return tasks;
}

export function getTasks() {
    return getRawTasks().filter(t => t.is_deleted === 0);
}

export function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
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
        assignedQtyConverted: Math.round(col7 * 10) / 10,
        actualQtyConverted: Math.round(col9 * 10) / 10,
        delayDays: col11,
        progressQtyConverted: Math.round(col12 * 10) / 10,
        qualityQtyConverted: Math.round(col14 * 10) / 10,
    };
}

// ===================== SETTINGS =====================

export function getSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : { theme: 'dark', language: 'vi' };
}

export function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    if (isCloudEnabled()) syncSettingsToCloud(settings);
}

// ===================== WORK GROUPS =====================

export function getWorkGroups() {
    const data = localStorage.getItem(STORAGE_KEYS.WORK_GROUPS);
    if (!data) {
        localStorage.setItem(STORAGE_KEYS.WORK_GROUPS, JSON.stringify(DEFAULT_WORK_GROUPS));
        return DEFAULT_WORK_GROUPS;
    }
    return JSON.parse(data);
}

export function saveWorkGroups(groups) {
    localStorage.setItem(STORAGE_KEYS.WORK_GROUPS, JSON.stringify(groups));
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
