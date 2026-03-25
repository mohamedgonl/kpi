import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StoreService } from './core/services/store.service';
import { FirebaseService } from './core/services/firebase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isLoggedIn = false;
  selectedUserId: number = 1;
  password = '';
  loginError = false;

  users: any[] = [];
  visibleUsers: any[] = [];
  currentUserId: number = 1;
  
  isCloudActive = false;
  theme = 'dark';

  constructor(
    private store: StoreService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Init cloud sync
    const ok = await this.store.initCloudSync();
    if (ok) {
      this.isCloudActive = true;
    }

    // Load settings theme
    const settings = this.store.getSettings();
    if (settings.theme) {
      this.theme = settings.theme;
      document.documentElement.setAttribute('data-theme', this.theme);
    }

    // Refresh users list when updated remotely
    this.store.usersUpdated.subscribe(() => {
        const loggedInId = this.store.getLoggedInUser();
        if (loggedInId) this.checkAuth();
    });

    this.checkAuth();
  }

  checkAuth() {
    const loggedInId = this.store.getLoggedInUser();
    this.users = this.store.getUsers();

    if (loggedInId) {
      this.currentUserId = loggedInId;
      this.isLoggedIn = true;
      this.applyAccessControl();
      // Ensure we are inside a route if we just logged in
      if (this.router.url === '/') {
        this.router.navigate(['/dashboard']);
      }
    } else {
      this.isLoggedIn = false;
      this.selectedUserId = this.users.length > 0 ? this.users[0].id : 1;
    }
  }

  applyAccessControl() {
    const currentUser = this.store.getUserById(this.currentUserId);
    if (currentUser && currentUser.role === 'user') {
      this.visibleUsers = [currentUser];
    } else {
      this.visibleUsers = [...this.users];
    }
  }

  login() {
    const selectedUser = this.users.find(u => u.id == this.selectedUserId);
    if (selectedUser && selectedUser.password === this.password) {
      this.loginError = false;
      this.store.setLoggedInUser(selectedUser.id);
      this.password = '';
      this.checkAuth();
    } else {
      this.loginError = true;
    }
  }

  logout() {
    this.store.setLoggedInUser(null);
    this.checkAuth();
    this.router.navigate(['/']); // Go to root to show login
  }

  changeUser() {
    // Called when the top user selector dropdown changes
    this.applyAccessControl();
    this.store.dashboardRefresh.emit(); // Fire event to update dashboard
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.theme);
    
    const settings = this.store.getSettings();
    settings.theme = this.theme;
    this.store.saveSettings(settings);
  }
}
