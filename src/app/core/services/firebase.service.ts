import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, update, remove, Database } from 'firebase/database';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private isFirebaseEnabled = false;
  private listeners: { [path: string]: () => void } = {};

  private readonly firebaseConfig = {
    apiKey: "AIzaSyBnBvHHFMnnaHoPYUXs-2zUR2g1l6jLHfU",
    authDomain: "kpi-dun.firebaseapp.com",
    databaseURL: "https://kpi-dun-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kpi-dun",
    storageBucket: "kpi-dun.firebasestorage.app",
    messagingSenderId: "1085391599947",
    appId: "1:1085391599947:web:55dab3afa7e71f82ff10ce",
    measurementId: "G-LZGGL975YQ"
  };

  initFirebase(): boolean {
    try {
      if (this.firebaseConfig.apiKey === 'YOUR_API_KEY') {
        console.warn('[Firebase] Not configured. Using localStorage only.');
        this.isFirebaseEnabled = false;
        return false;
      }
      this.app = initializeApp(this.firebaseConfig);
      this.db = getDatabase(this.app);
      this.isFirebaseEnabled = true;
      console.log('[Firebase] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Firebase] Initialization failed:', error);
      this.isFirebaseEnabled = false;
      return false;
    }
  }

  isCloudEnabled(): boolean {
    return this.isFirebaseEnabled && this.db !== null;
  }

  async cloudSet(path: string, data: any): Promise<boolean> {
    if (!this.isCloudEnabled() || !this.db) return false;
    try {
      await set(ref(this.db, path), data);
      return true;
    } catch (error) {
      console.error(`[Firebase] Error writing to ${path}:`, error);
      return false;
    }
  }

  async cloudGet(path: string): Promise<any> {
    if (!this.isCloudEnabled() || !this.db) return null;
    try {
      const snapshot = await get(ref(this.db, path));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error(`[Firebase] Error reading ${path}:`, error);
      return null;
    }
  }

  cloudListen(path: string, callback: (data: any) => void): () => void {
    if (!this.isCloudEnabled() || !this.db) return () => {};
    const dbRef = ref(this.db, path);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : null);
    }, (error) => {
      console.error(`[Firebase] Listen error on ${path}:`, error);
    });
    this.listeners[path] = unsubscribe;
    return unsubscribe;
  }

  cloudCleanup() {
    Object.values(this.listeners).forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this.listeners = {};
  }

  // Domain-specific methods to support StoreService
  async syncTasksToCloud(tasks: any[]) { return this.cloudSet('tasks', tasks); }
  async syncUsersToCloud(users: any[]) { return this.cloudSet('users', users); }
  async syncSettingsToCloud(settings: any) { return this.cloudSet('settings', settings); }
  async syncWorkGroupsToCloud(groups: any[]) { return this.cloudSet('workGroups', groups); }

  async pullAllFromCloud() {
    if (!this.isCloudEnabled()) return null;
    try {
      const [tasks, users, settings, workGroups] = await Promise.all([
        this.cloudGet('tasks'),
        this.cloudGet('users'),
        this.cloudGet('settings'),
        this.cloudGet('workGroups'),
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

  private taskDebounceTimer: any = null;
  listenForTasks(callback: (tasks: any[]) => void) {
    return this.cloudListen('tasks', (data) => {
      if (this.taskDebounceTimer) clearTimeout(this.taskDebounceTimer);
      this.taskDebounceTimer = setTimeout(() => {
        const tasks = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        callback(tasks);
      }, 500);
    });
  }

  listenForUsers(callback: (users: any[]) => void) {
    return this.cloudListen('users', (data) => {
      const users = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
      callback(users);
    });
  }

  listenForWorkGroups(callback: (groups: any[]) => void) {
    return this.cloudListen('workGroups', (data) => {
      const groups = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
      callback(groups);
    });
  }
}
