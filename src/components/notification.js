/**
 * 6 PM Notification Component
 * Checks for users who haven't logged tasks today and shows a floating badge
 */
import { getUsers, getUsersWithTasksOnDate, getLoggedInUser } from '../data/store.js';

let notificationDismissed = false;
let lastCheckDate = null;

export function checkAndShowNotification() {
  const now = new Date();
  const currentHour = now.getHours();
  const today = now.toISOString().split('T')[0];

  // Reset dismissal each day
  if (lastCheckDate !== today) {
    notificationDismissed = false;
    lastCheckDate = today;
  }

  // Only show after 17:00 (5 PM) and if not dismissed
  if (currentHour < 17 || notificationDismissed) {
    return;
  }

  const currentUserId = getLoggedInUser();
  if (!currentUserId) return;

  const usersWithTasks = getUsersWithTasksOnDate(today);
  const container = document.getElementById('notification-container');

  if (usersWithTasks.has(currentUserId)) {
    container.innerHTML = '';
    return;
  }

  const allUsers = getUsers();
  const currentUser = allUsers.find(u => u.id === currentUserId);
  if (!currentUser) return;

  container.innerHTML = `
    <div class="notification-badge">
      <button class="notification-close" id="notifClose">✕</button>
      <div class="notification-title">
        🔔 Nhắc nhở KPI
      </div>
      <p style="font-size:12px; margin-top:8px; margin-bottom:8px;">
        Xin chào <strong>${escapeHtml(currentUser.name)}</strong>, bạn chưa cập nhật báo cáo công việc ngày hôm nay!
      </p>
    </div>
  `;

  document.getElementById('notifClose').addEventListener('click', () => {
    notificationDismissed = true;
    container.innerHTML = '';
  });
}

export function startNotificationCheck() {
  // Check immediately
  checkAndShowNotification();

  // Then check every minute
  setInterval(checkAndShowNotification, 60 * 1000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
