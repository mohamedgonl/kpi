/**
 * KPI Tracker — Main Application Entry
 * Hash-based tab routing, event delegation, cloud sync init, periodic 6 PM check
 */
import './styles/main.css';
import { getUsers, getSettings, saveSettings, getLoggedInUser, setLoggedInUser, initCloudSync, isCloudSyncActive } from './data/store.js';
import { renderDashboard } from './components/dashboard.js';
import { renderReports } from './components/reports.js';
import { renderSettings } from './components/settings.js';
import { startNotificationCheck } from './components/notification.js';

// ===================== STATE =====================
let currentUserId = 1;
let currentDate = new Date().toISOString().split('T')[0];
let currentTab = 'dashboard';

// ===================== ACCESS CONTROL =====================
function applyAccessControl() {
  populateUserSelect();
}

// ===================== AUTH =====================
function checkAuth() {
  const loggedInId = getLoggedInUser();
  const loginScreen = document.getElementById('login-screen');
  const appHeader = document.getElementById('app-header');
  const appMain = document.getElementById('app-main');

  if (loggedInId) {
    currentUserId = loggedInId;
    loginScreen.style.display = 'none';
    appHeader.style.display = 'block';
    appMain.style.display = 'block';
    applyAccessControl();
    switchTab('dashboard');
    startNotificationCheck();
  } else {
    loginScreen.style.display = 'flex';
    appHeader.style.display = 'none';
    appMain.style.display = 'none';

    const select = document.getElementById('loginUserSelect');
    select.innerHTML = getUsers().map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  }
}

// ===================== INIT =====================
async function init() {
  // Initialize cloud sync (non-blocking — falls back to localStorage)
  initCloudSync().then(ok => {
    if (ok) {
      console.log('☁️ Cloud sync active');
      // Show cloud indicator
      const indicator = document.getElementById('cloudIndicator');
      if (indicator) indicator.style.display = 'inline-flex';
    }
  });

  // Load settings
  const settings = getSettings();
  if (settings.theme) {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.getElementById('themeToggle').textContent = settings.theme === 'dark' ? '🌙' : '☀️';
  }

  // Bind Auth Events
  document.getElementById('loginBtn').addEventListener('click', () => {
    const selectedId = parseInt(document.getElementById('loginUserSelect').value);
    const password = document.getElementById('loginPassword').value;
    const user = getUsers().find(u => u.id === selectedId);

    if (user && user.password === password) {
      document.getElementById('loginError').style.display = 'none';
      setLoggedInUser(selectedId);
      document.getElementById('loginPassword').value = '';
      checkAuth();
    } else {
      document.getElementById('loginError').style.display = 'block';
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    setLoggedInUser(null);
    checkAuth();
  });

  // Bind navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Bind theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    document.getElementById('themeToggle').textContent = next === 'dark' ? '🌙' : '☀️';
    saveSettings({ ...getSettings(), theme: next });
  });

  // Bind user selector
  document.getElementById('currentUserSelect').addEventListener('change', (e) => {
    currentUserId = parseInt(e.target.value);
    applyAccessControl();
    refreshCurrentPage();
  });

  // Listen for custom events
  window.addEventListener('refreshDashboard', () => refreshCurrentPage());
  window.addEventListener('dateChange', (e) => {
    currentDate = e.detail;
    refreshCurrentPage();
  });
  window.addEventListener('usersUpdated', () => {
    applyAccessControl();
  });

  // Run auth check on load
  checkAuth();
}

// ===================== NAVIGATION =====================
function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${tab}`);
  });

  refreshCurrentPage();
}

function refreshCurrentPage() {
  switch (currentTab) {
    case 'dashboard':
      renderDashboard(document.getElementById('page-dashboard'), currentUserId, currentDate);
      break;
    case 'reports':
      renderReports(document.getElementById('page-reports'));
      break;
    case 'settings':
      renderSettings(document.getElementById('page-settings'));
      break;
  }
}

// ===================== USER SELECT =====================
function populateUserSelect() {
  const select = document.getElementById('currentUserSelect');
  const allUsers = getUsers();
  const currentUser = allUsers.find(u => u.id === currentUserId);

  let visibleUsers = allUsers;
  if (currentUser && currentUser.role === 'user') {
    visibleUsers = [currentUser];
  }

  select.innerHTML = visibleUsers.map(u =>
    `<option value="${u.id}" ${u.id === currentUserId ? 'selected' : ''}>${u.name}</option>`
  ).join('');
}

// ===================== START =====================
document.addEventListener('DOMContentLoaded', init);
