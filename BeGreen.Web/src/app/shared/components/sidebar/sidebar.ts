import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar" [class.collapsed]="isCollapsed">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">BG</span>
          <span class="logo-text" *ngIf="!isCollapsed">BeGreen <span>v2</span></span>
        </div>
      </div>
      
      <nav class="sidebar-nav">
        <a *ngFor="let item of navItems" 
           [routerLink]="item.route" 
           routerLinkActive="active" 
           class="nav-link"
           [title]="item.label">
          <span class="material-symbols-outlined">{{ item.icon }}</span>
          <span class="nav-label" *ngIf="!isCollapsed">{{ item.label }}</span>
        </a>
      </nav>
      
      <div class="sidebar-footer">
        <button class="collapse-btn" (click)="onToggleCollapse()">
          <span class="material-symbols-outlined">
            {{ isCollapsed ? 'chevron_right' : 'chevron_left' }}
          </span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 280px;
      height: 100%;
      background-color: #ffffff;
      border-right: 1px solid var(--accent);
      display: flex; flex-direction: column;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 100;
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.02);
    }
    .sidebar.collapsed { width: 80px; }
    .sidebar-header { padding: 32px 24px; }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon {
      background: var(--primary); color: white;
      width: 40px; height: 40px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.2rem; flex-shrink: 0;
    }
    .logo-text { color: var(--primary); font-weight: 800; font-size: 1.4rem; letter-spacing: -1px; }
    .logo-text span { color: var(--text-light); font-weight: 300; font-size: 1rem; }
    .sidebar-nav { flex: 1; padding: 0 16px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
    .nav-link {
      display: flex; align-items: center; gap: 16px; padding: 12px 16px;
      border-radius: 14px; color: var(--text-light); text-decoration: none;
      font-weight: 500; transition: all 0.2s ease;
    }
    .nav-link:hover { background-color: var(--bg-surface); color: var(--primary); }
    .nav-link.active { background-color: var(--primary-light); color: var(--primary); }
    .nav-link .material-symbols-outlined { font-size: 24px; }
    .nav-label { white-space: nowrap; animation: fadeIn 0.3s ease; }
    .sidebar-footer { padding: 16px; border-top: 1px solid var(--accent); display: flex; justify-content: center; }
    .collapse-btn {
      background: var(--bg-surface); border: none; width: 40px; height: 40px;
      border-radius: 12px; color: var(--text-light); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
    }
    .collapse-btn:hover { background-color: var(--accent); color: var(--primary); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class SidebarComponent {
  @Input() isCollapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();

  constructor(private authService: AuthService) { }

  get navItems() {
    const items = [
      { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
      { label: 'Petty Cash', icon: 'payments', route: '/petty-cash' },
      { label: 'Cash Advance', icon: 'account_balance_wallet', route: '/cash-advance' },
      { label: 'Engineering', icon: 'engineering', route: '/engineering' },
      { label: 'IT Orders', icon: 'devices', route: '/it-orders' },
      { label: 'Glitches', icon: 'report_problem', route: '/glitches' },
      { label: 'BEO', icon: 'event_available', route: '/beo' },
      { label: 'Taxi Orders', icon: 'local_taxi', route: '/taxi-orders' },
      { label: 'Expenses', icon: 'receipt_long', route: '/expenses' },
      { label: 'Settings', icon: 'settings', route: '/settings' },
    ];

    const user = this.authService.currentUser();
    return items.filter(item => {
      if (item.label === 'Settings') {
        return user?.department === 'Information Technology';
      }
      return true;
    });
  }

  onToggleCollapse() {
    this.toggleCollapse.emit();
  }
}
