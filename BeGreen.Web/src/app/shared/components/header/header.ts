import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule],
    template: `
    <header class="top-nav">
      <div class="search-bar">
        <!-- Search placeholder -->
      </div>
      
      <div class="user-actions">
        <div class="user-profile">
          <div class="user-info">
            <span class="user-name">{{ authService.currentUser()?.name }}</span>
            <span class="user-role">{{ authService.currentUser()?.role }}</span>
          </div>
          <div class="user-avatar">
            {{ authService.currentUser()?.name?.charAt(0) }}
          </div>
        </div>
        
        <button class="logout-btn" (click)="onLogout()" title="Logout">
          <span class="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
  `,
    styles: [`
    .top-nav {
      height: 80px;
      background-color: #ffffff;
      border-bottom: 1px solid var(--accent);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 40px;
      flex-shrink: 0;
    }
    .user-actions { display: flex; align-items: center; gap: 24px; }
    .user-profile { display: flex; align-items: center; gap: 12px; padding-right: 24px; border-right: 1px solid var(--accent); }
    .user-info { display: flex; flex-direction: column; align-items: flex-end; }
    .user-name { font-weight: 700; font-size: 0.95rem; color: var(--text-main); }
    .user-role { font-size: 0.75rem; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; }
    .user-avatar {
      width: 40px; height: 40px; background-color: var(--primary-light);
      color: var(--primary); border-radius: 50%; display: flex;
      align-items: center; justify-content: center; font-weight: 700;
    }
    .logout-btn {
      background: transparent; border: 1.5px solid var(--accent);
      width: 40px; height: 40px; border-radius: 12px;
      color: var(--text-light); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
    }
    .logout-btn:hover { background-color: #fff5f5; border-color: #feb2b2; color: #c53030; }
  `]
})
export class HeaderComponent {
    authService = inject(AuthService);

    onLogout() {
        this.authService.logout();
    }
}
