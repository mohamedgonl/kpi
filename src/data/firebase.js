/**
 * Firebase Configuration and Real-time Database Module
 * Provides cloud data sync for cross-device access
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or use existing)
 * 3. Enable Realtime Database
 * 4. Copy your project config and replace the placeholder below
 * 5. Set database rules (see bottom of this file)
 */
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, update, remove } from 'firebase/database';

// ============================================================
// FIREBASE CONFIG — Replace with your project's config
// ============================================================
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
let isFirebaseEnabled = false;
let listeners = {};

/**
 * Initialize Firebase — call once at app start
 * Returns true if Firebase is properly configured, false otherwise
 */
export function initFirebase() {
    try {
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY') {
            console.warn('[Firebase] Not configured. Please set your environment variables in .env');
            isFirebaseEnabled = false;
            return false;
        }

        app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        isFirebaseEnabled = true;
        console.log('[Firebase] Initialized successfully');
        return true;
    } catch (error) {
        console.error('[Firebase] Initialization failed:', error);
        isFirebaseEnabled = false;
        return false;
    }
}

/**
 * Check if Firebase is enabled and configured
 */
export function isCloudEnabled() {
    return isFirebaseEnabled && db !== null;
}

// ============================================================
// DATA OPERATIONS
// ============================================================

/**
 * Save data to Firebase path
 */
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

/**
 * Read data from Firebase path (one-time)
 */
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

/**
 * Update specific fields at a Firebase path
 */
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

/**
 * Delete data at a Firebase path
 */
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

/**
 * Listen for real-time changes at a Firebase path
 * Returns an unsubscribe function
 */
export function cloudListen(path, callback) {
    if (!isCloudEnabled()) return () => { };
    const dbRef = ref(db, path);
    const unsubscribe = onValue(dbRef, (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null);
    }, (error) => {
        console.error(`[Firebase] Listen error on ${path}:`, error);
    });

    // Store for cleanup
    listeners[path] = unsubscribe;
    return unsubscribe;
}

/**
 * Remove all active listeners
 */
export function cloudCleanup() {
    Object.values(listeners).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
    });
    listeners = {};
}

// ============================================================
// SYNC HELPERS — for store.js integration
// ============================================================

/**
 * Sync all tasks to cloud
 */
export async function syncTasksToCloud(tasks) {
    return cloudSet('tasks', tasks);
}

/**
 * Sync all users to cloud
 */
export async function syncUsersToCloud(users) {
    return cloudSet('users', users);
}

/**
 * Sync settings to cloud
 */
export async function syncSettingsToCloud(settings) {
    return cloudSet('settings', settings);
}

/**
 * Pull all data from cloud (for initial load)
 */
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
            tasks: tasks ? (Array.isArray(tasks) ? tasks : Object.values(tasks)) : null,
            users: users ? (Array.isArray(users) ? users : Object.values(users)) : null,
            settings: settings || null,
            workGroups: workGroups ? (Array.isArray(workGroups) ? workGroups : Object.values(workGroups)) : null,
        };
    } catch (error) {
        console.error('[Firebase] Pull all failed:', error);
        return null;
    }
}

/**
 * Listen for real-time task changes
 */
let taskDebounceTimer = null;

export function listenForTasks(callback) {
    return cloudListen('tasks', (data) => {
        if (taskDebounceTimer) clearTimeout(taskDebounceTimer);
        taskDebounceTimer = setTimeout(() => {
            const tasks = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
            callback(tasks);
        }, 500);
    });
}

/**
 * Listen for real-time user changes
 */
export function listenForUsers(callback) {
    return cloudListen('users', (data) => {
        const users = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        callback(users);
    });
}

/**
 * Sync work groups to cloud
 */
export async function syncWorkGroupsToCloud(groups) {
    return cloudSet('workGroups', groups);
}

/**
 * Listen for real-time work groups changes
 */
export function listenForWorkGroups(callback) {
    return cloudListen('workGroups', (data) => {
        const groups = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        callback(groups);
    });
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

For development/testing without auth, use:
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
*/
