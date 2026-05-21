/**
 * Firebase Configuration and Real-time Database Module
 * Provides cloud data sync for cross-device access
 *
 * BANDWIDTH-OPTIMIZED:
 * - Writes happen per-record at `tasks/{id}` etc., not as a full-array set on the parent node.
 * - Listeners are child-event based (added/changed/removed) so each change downloads only the
 *   affected record instead of the whole collection.
 */
import { initializeApp } from 'firebase/app';
import {
    getDatabase, ref, set, get, onValue, update, remove,
    onChildAdded, onChildChanged, onChildRemoved
} from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app = null;
let db = null;
let auth = null;
let currentAuthUid = null;
let isFirebaseEnabled = false;
let listeners = {};

/**
 * Initialize Firebase + sign in anonymously. Returns true only after auth
 * succeeds, so subsequent reads/writes don't hit PERMISSION_DENIED under
 * `auth != null` rules.
 */
export async function initFirebase() {
    try {
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY') {
            console.warn('[Firebase] Not configured. Please set your environment variables in .env');
            isFirebaseEnabled = false;
            return false;
        }
        app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, (user) => {
            currentAuthUid = user ? user.uid : null;
        });

        const cred = await signInAnonymously(auth);
        currentAuthUid = cred.user.uid;

        isFirebaseEnabled = true;
        console.log('[Firebase] Initialized + anonymous auth ready', { uid: currentAuthUid });
        return true;
    } catch (error) {
        console.error('[Firebase] Initialization failed:', error);
        isFirebaseEnabled = false;
        return false;
    }
}

export function isCloudEnabled() {
    return isFirebaseEnabled && db !== null && currentAuthUid !== null;
}

export function getAuthUid() {
    return currentAuthUid;
}

// ============================================================
// LOW-LEVEL OPERATIONS
// ============================================================

export async function cloudSet(path, data) {
    if (!isCloudEnabled()) return false;
    try {
        await set(ref(db, path), data);
        return true;
    } catch (error) {
        console.error(`[Firebase] Error writing to ${path}:`, error);
        return false;
    }
}

export async function cloudGet(path) {
    if (!isCloudEnabled()) return null;
    try {
        const snapshot = await get(ref(db, path));
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error(`[Firebase] Error reading ${path}:`, error);
        return null;
    }
}

export async function cloudUpdate(path, updates) {
    if (!isCloudEnabled()) return false;
    try {
        await update(ref(db, path), updates);
        return true;
    } catch (error) {
        console.error(`[Firebase] Error updating ${path}:`, error);
        return false;
    }
}

export async function cloudRemove(path) {
    if (!isCloudEnabled()) return false;
    try {
        await remove(ref(db, path));
        return true;
    } catch (error) {
        console.error(`[Firebase] Error removing ${path}:`, error);
        return false;
    }
}

export function cloudListen(path, callback) {
    if (!isCloudEnabled()) return () => { };
    const dbRef = ref(db, path);
    const unsubscribe = onValue(dbRef, (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null);
    }, (error) => {
        console.error(`[Firebase] Listen error on ${path}:`, error);
    });
    listeners[path] = unsubscribe;
    return unsubscribe;
}

export function cloudCleanup() {
    Object.values(listeners).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
    });
    listeners = {};
}

// ============================================================
// MIGRATION — convert legacy array-shaped collections to objects
// keyed by record id. Run once; flagged via /_meta/keyedById.
// ============================================================

function arrayToKeyedObject(value) {
    if (!value) return {};
    const arr = Array.isArray(value) ? value : Object.values(value);
    const obj = {};
    arr.forEach(item => {
        if (item && item.id != null) obj[String(item.id)] = item;
    });
    return obj;
}

export async function migrateToKeyedFormat() {
    if (!isCloudEnabled()) return false;
    try {
        const meta = await cloudGet('_meta');
        if (meta && meta.keyedById) return true;

        const [tasksRaw, usersRaw, wgRaw] = await Promise.all([
            cloudGet('tasks'),
            cloudGet('users'),
            cloudGet('workGroups')
        ]);

        const ops = [];
        if (tasksRaw) ops.push(cloudSet('tasks', arrayToKeyedObject(tasksRaw)));
        if (usersRaw) ops.push(cloudSet('users', arrayToKeyedObject(usersRaw)));
        if (wgRaw) ops.push(cloudSet('workGroups', arrayToKeyedObject(wgRaw)));
        await Promise.all(ops);

        await cloudSet('_meta', {
            keyedById: true,
            migratedAt: new Date().toISOString()
        });
        console.log('[Firebase] Migrated cloud data to keyed-by-id format');
        return true;
    } catch (error) {
        console.error('[Firebase] Migration failed:', error);
        return false;
    }
}

// ============================================================
// PULL HELPERS — used on initial app load only
// ============================================================

export async function pullAllFromCloud() {
    if (!isCloudEnabled()) return null;
    try {
        const [tasks, users, settings, workGroups] = await Promise.all([
            cloudGet('tasks'),
            cloudGet('users'),
            cloudGet('settings'),
            cloudGet('workGroups'),
        ]);
        return {
            tasks: tasks ? Object.values(tasks) : null,
            users: users ? Object.values(users) : null,
            settings: settings || null,
            workGroups: workGroups ? Object.values(workGroups) : null,
        };
    } catch (error) {
        console.error('[Firebase] Pull all failed:', error);
        return null;
    }
}

// ============================================================
// TASKS — per-record writes
// ============================================================

export async function pushTask(task) {
    if (!isCloudEnabled() || !task || task.id == null) return false;
    return cloudSet(`tasks/${task.id}`, task);
}

export async function updateTaskFields(taskId, updates) {
    if (!isCloudEnabled() || taskId == null) return false;
    return cloudUpdate(`tasks/${taskId}`, updates);
}

export async function removeTaskCloud(taskId) {
    if (!isCloudEnabled() || taskId == null) return false;
    return cloudRemove(`tasks/${taskId}`);
}

/**
 * Bulk replace — used for import and "clear all". Converts array to keyed object.
 */
export async function setAllTasks(tasks) {
    if (!isCloudEnabled()) return false;
    const payload = Array.isArray(tasks) ? arrayToKeyedObject(tasks) : tasks;
    return cloudSet('tasks', payload || {});
}

// ============================================================
// USERS — per-record writes
// ============================================================

export async function pushUser(user) {
    if (!isCloudEnabled() || !user || user.id == null) return false;
    return cloudSet(`users/${user.id}`, user);
}

export async function updateUserFields(userId, updates) {
    if (!isCloudEnabled() || userId == null) return false;
    return cloudUpdate(`users/${userId}`, updates);
}

export async function setAllUsers(users) {
    if (!isCloudEnabled()) return false;
    const payload = Array.isArray(users) ? arrayToKeyedObject(users) : users;
    return cloudSet('users', payload || {});
}

// ============================================================
// WORK GROUPS — per-record writes
// ============================================================

export async function pushWorkGroup(group) {
    if (!isCloudEnabled() || !group || group.id == null) return false;
    return cloudSet(`workGroups/${group.id}`, group);
}

export async function setAllWorkGroups(groups) {
    if (!isCloudEnabled()) return false;
    const payload = Array.isArray(groups) ? arrayToKeyedObject(groups) : groups;
    return cloudSet('workGroups', payload || {});
}

// ============================================================
// SETTINGS — single object, kept as-is (small + rarely written)
// ============================================================

export async function syncSettingsToCloud(settings) {
    return cloudSet('settings', settings);
}

// ============================================================
// CHILD-EVENT LISTENERS — bandwidth-efficient real-time sync
// Each child event downloads only the changed record, not the
// whole collection.
// ============================================================

function listenChildren(path, { onAdded, onChanged, onRemoved }) {
    if (!isCloudEnabled()) return () => { };
    const collRef = ref(db, path);
    const u1 = onChildAdded(collRef, (snap) => {
        const val = snap.val();
        if (val && onAdded) onAdded(val, snap.key);
    }, (e) => console.error(`[Firebase] childAdded error on ${path}:`, e));
    const u2 = onChildChanged(collRef, (snap) => {
        const val = snap.val();
        if (val && onChanged) onChanged(val, snap.key);
    }, (e) => console.error(`[Firebase] childChanged error on ${path}:`, e));
    const u3 = onChildRemoved(collRef, (snap) => {
        if (onRemoved) onRemoved(snap.key);
    }, (e) => console.error(`[Firebase] childRemoved error on ${path}:`, e));
    const unsub = () => { u1(); u2(); u3(); };
    listeners[path] = unsub;
    return unsub;
}

export function listenForTaskChanges(handlers) {
    return listenChildren('tasks', handlers);
}

export function listenForUserChanges(handlers) {
    return listenChildren('users', handlers);
}

export function listenForWorkGroupChanges(handlers) {
    return listenChildren('workGroups', handlers);
}

// ============================================================
// RECOMMENDED FIREBASE REALTIME DATABASE RULES
// ============================================================
/*
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "tasks": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "users": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "settings": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
*/
