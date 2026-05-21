/**
 * Data Store with Cloud Sync
 * In-memory cache + Firebase Realtime Database for cross-device sync.
 *
 * Writes are sent per-record (push/update/remove on `tasks/{id}` etc.) instead
 * of replacing the whole collection. Reads use child-event listeners so each
 * change downloads only the affected record.
 */
import {
    initFirebase, isCloudEnabled,
    pushTask, updateTaskFields, removeTaskCloud, setAllTasks,
    pushUser, updateUserFields, setAllUsers,
    pushWorkGroup, setAllWorkGroups,
    syncSettingsToCloud,
    pullAllFromCloud,
    listenForTaskChanges, listenForUserChanges, listenForWorkGroupChanges,
    migrateToKeyedFormat
} from './firebase.js';
import { DEFAULT_WORK_GROUPS, WORK_GROUPS_VERSION } from './workGroups.js';

// In-memory data cache
let _users = [];
let _tasks = [];
let _settings = { theme: 'dark', language: 'vi' };
let _workGroups = [];

let cloudSyncActive = false;

// ===================== REFRESH DISPATCH (debounced) =====================
// Child events arrive one-per-record. During initial sync that can be hundreds
// of events back-to-back; coalesce into a single UI refresh.

let _refreshTimer = null;
const _pendingRefresh = new Set();

function scheduleRefresh(eventName) {
    _pendingRefresh.add(eventName);
    if (_refreshTimer) return;
    _refreshTimer = setTimeout(() => {
        const events = Array.from(_pendingRefresh);
        _pendingRefresh.clear();
        _refreshTimer = null;
        events.forEach(name => window.dispatchEvent(new CustomEvent(name)));
    }, 150);
}

// ===================== CLOUD INIT =====================

export async function initCloudSync() {
    const ok = await initFirebase();
    if (!ok) {
        console.warn('[Store] Firebase not available. Running with defaults.');
        return false;
    }

    try {
        // One-time data shape migration (array → keyed-by-id). No-op after first run.
        await migrateToKeyedFormat();

        const cloudData = await pullAllFromCloud();
        if (cloudData && (cloudData.users || cloudData.tasks || cloudData.workGroups)) {
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
        } else {
            // First run for this database — seed defaults.
            _users = getDefaultUsers();
            _tasks = [];
            _settings = { theme: 'dark', language: 'vi', workGroupsVersion: WORK_GROUPS_VERSION };
            _workGroups = DEFAULT_WORK_GROUPS;

            await Promise.all([
                setAllUsers(_users),
                setAllTasks(_tasks),
                syncSettingsToCloud(_settings),
                setAllWorkGroups(_workGroups)
            ]);
            console.log('[Store] Initial data pushed to cloud');
        }

        // Real-time listeners (child events — only deltas, not full collections)
        listenForTaskChanges({
            onAdded: (task) => {
                if (!task || task.id == null) return;
                const idx = _tasks.findIndex(t => t.id === task.id);
                if (idx === -1) _tasks.push(task);
                else _tasks[idx] = task;
                taskIdCounter = null;
                scheduleRefresh('refreshDashboard');
            },
            onChanged: (task) => {
                if (!task || task.id == null) return;
                const idx = _tasks.findIndex(t => t.id === task.id);
                if (idx !== -1) _tasks[idx] = task;
                else _tasks.push(task);
                scheduleRefresh('refreshDashboard');
            },
            onRemoved: (key) => {
                const id = Number(key);
                _tasks = _tasks.filter(t => t.id !== id);
                scheduleRefresh('refreshDashboard');
            }
        });

        listenForUserChanges({
            onAdded: (user) => {
                if (!user || user.id == null) return;
                const idx = _users.findIndex(u => u.id === user.id);
                if (idx === -1) _users.push(user);
                else _users[idx] = user;
                scheduleRefresh('usersUpdated');
            },
            onChanged: (user) => {
                if (!user || user.id == null) return;
                const idx = _users.findIndex(u => u.id === user.id);
                if (idx !== -1) _users[idx] = user;
                else _users.push(user);
                scheduleRefresh('usersUpdated');
            },
            onRemoved: (key) => {
                const id = Number(key);
                _users = _users.filter(u => u.id !== id);
                scheduleRefresh('usersUpdated');
            }
        });

        listenForWorkGroupChanges({
            onAdded: (group) => {
                if (!group || group.id == null) return;
                const idx = _workGroups.findIndex(g => g.id === group.id);
                if (idx === -1) _workGroups.push(group);
                else _workGroups[idx] = group;
                scheduleRefresh('workGroupsUpdated');
                scheduleRefresh('refreshDashboard');
            },
            onChanged: (group) => {
                if (!group || group.id == null) return;
                const idx = _workGroups.findIndex(g => g.id === group.id);
                if (idx !== -1) _workGroups[idx] = group;
                else _workGroups.push(group);
                scheduleRefresh('workGroupsUpdated');
                scheduleRefresh('refreshDashboard');
            },
            onRemoved: (key) => {
                const id = isNaN(Number(key)) ? key : Number(key);
                _workGroups = _workGroups.filter(g => g.id !== id);
                scheduleRefresh('workGroupsUpdated');
                scheduleRefresh('refreshDashboard');
            }
        });

        cloudSyncActive = true;
        console.log('[Store] Cloud sync active (delta mode)');
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
    return _users;
}

/**
 * Bulk replace users — used by Settings UI when admin edits names.
 * Diffs against current cache and only writes records that actually changed.
 */
export function saveUsers(users) {
    const before = new Map(_users.map(u => [u.id, u]));
    _users = users;
    if (!isCloudEnabled()) return;

    users.forEach(u => {
        const prev = before.get(u.id);
        if (!prev) {
            pushUser(u);
        } else if (JSON.stringify(prev) !== JSON.stringify(u)) {
            pushUser(u);
        }
    });
}

export function getUserById(id) {
    return getUsers().find(u => u.id === id);
}

export function updateUserPassword(userId, newPassword) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        users[index].password = newPassword;
        if (isCloudEnabled()) updateUserFields(userId, { password: newPassword });
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

/**
 * Bulk replace — only used by import and "clear all". Writes a single set on
 * the parent node. Per-task changes should go through addTask/updateTask/deleteTask.
 */
export function saveTasks(tasks) {
    _tasks = tasks;
    taskIdCounter = null;
    if (isCloudEnabled()) setAllTasks(tasks);
}

export function addTask(task, isAutoAssign = false) {
    const loggedInId = getLoggedInUser();
    if (task.userId !== loggedInId && !isAutoAssign) {
        console.error('Unauthorized: Cannot add task to another user');
        return null;
    }

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
    _tasks.push(newTask);
    console.log(`[Store] Created task ID ${newTask.id} for user ${newTask.userId}`);
    if (isCloudEnabled()) pushTask(newTask);
    return newTask;
}

export function updateTask(id, updates) {
    const index = _tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    _tasks[index] = { ..._tasks[index], ...updates };
    if (isCloudEnabled()) updateTaskFields(id, updates);
    return _tasks[index];
}

const SYNC_FIELDS = ['actualQty', 'completionDate', 'reworkCount', 'status', 'qualityScore', 'progressScore'];

export function syncLinkedTask(taskId) {
    const task = _tasks.find(t => t.id === taskId);
    if (!task || !task.linkedTaskId) return;

    const linkedTask = _tasks.find(t => t.id === task.linkedTaskId);
    if (!linkedTask) return;

    const syncUpdates = {};
    SYNC_FIELDS.forEach(field => {
        if (task[field] !== undefined) {
            syncUpdates[field] = task[field];
        }
    });

    console.log(`[Store] Syncing task ${taskId} → linked task ${task.linkedTaskId}`, syncUpdates);
    updateTask(task.linkedTaskId, syncUpdates);
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

/**
 * Bulk replace work groups — rare operation (admin edits JSON in Settings).
 * Diffs and only writes records that actually changed.
 */
export function saveWorkGroups(groups) {
    const before = new Map(_workGroups.map(g => [g.id, g]));
    _workGroups = groups;

    if (isCloudEnabled()) {
        const incomingIds = new Set(groups.map(g => g.id));
        const hasRemovals = [...before.keys()].some(id => !incomingIds.has(id));

        if (hasRemovals) {
            // Removals require a full replace so dropped keys are cleared.
            setAllWorkGroups(groups);
        } else {
            groups.forEach(g => {
                const prev = before.get(g.id);
                if (!prev || JSON.stringify(prev) !== JSON.stringify(g)) {
                    pushWorkGroup(g);
                }
            });
        }
    }
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
        if (data.users && isCloudEnabled()) setAllUsers(data.users);
        if (data.tasks && isCloudEnabled()) setAllTasks(data.tasks);
        if (data.settings && isCloudEnabled()) syncSettingsToCloud(data.settings);
        if (data.workGroups && isCloudEnabled()) setAllWorkGroups(data.workGroups);

        if (data.users) _users = data.users;
        if (data.tasks) _tasks = data.tasks;
        if (data.settings) _settings = data.settings;
        if (data.workGroups) _workGroups = data.workGroups;
        taskIdCounter = null;
        return true;
    } catch (e) {
        console.error('Import failed:', e);
        return false;
    }
}
