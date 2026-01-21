import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, DashboardSummary } from '../../core/services/dashboard.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <header class="header">
        <div class="header-content">
          <h1>Dynamic Operations Overview</h1>
          <p>Real-time status tracking across all BeGreen modules</p>
        </div>
        <button class="refresh-btn" (click)="loadSummary()" [disabled]="isLoading">
           <span class="material-symbols-outlined" [class.spinning]="isLoading">refresh</span>
        </button>
      </header>

      <div class="error-banner" *ngIf="errorMessage">
        <span class="material-symbols-outlined">error</span>
        <p>{{ errorMessage }}</p>
        <button (click)="loadSummary()">Retry</button>
      </div>
      
      <div class="summary-grid" *ngIf="summary && !isLoading">
        <div class="module-card" *ngFor="let module of modules" [routerLink]="module.route">
          <div class="card-header">
            <div class="icon-box" [style.background-color]="module.color + '15'" [style.color]="module.color">
              <span class="material-symbols-outlined">{{ module.icon }}</span>
            </div>
            <div class="title-area">
               <h3>{{ module.label }}</h3>
               <span class="total-badge">{{ summary[module.id]?.total || 0 }} Total</span>
            </div>
          </div>

          <div class="status-bars">
            <div class="status-item" *ngFor="let s of getStatusConfig(module.id)">
              <div class="status-info">
                <span class="status-label">{{ s.label }}</span>
                <span class="status-count">{{ summary[module.id]?.breakdown?.[s.key] || 0 }}</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" 
                     [style.width.%]="calcPercent(module.id, s.key)"
                     [style.background-color]="s.color">
                </div>
              </div>
            </div>
          </div>
          
          <div class="card-footer">
            <span class="view-all">View Details</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>
      </div>

      <div class="loading-state" *ngIf="isLoading && !summary">
        <div class="loader"></div>
        <p>Analyzing system data...</p>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 40px; max-width: 1400px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .header h1 { font-size: 2.25rem; font-weight: 800; color: #1e293b; letter-spacing: -1px; margin: 0; }
    .header p { color: #64748b; font-size: 1.1rem; margin-top: 4px; }
    
    .error-banner { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 16px; border-radius: 12px; margin-bottom: 32px; display: flex; align-items: center; gap: 12px; }
    .error-banner button { margin-left: auto; background: #991b1b; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }

    .refresh-btn { background: white; border: 1px solid #e2e8f0; width: 48px; height: 48px; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all 0.2s; }
    .refresh-btn:hover { background: #f8fafc; color: #10b981; border-color: #10b981; }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
    
    .module-card { 
      background: white; border-radius: 28px; padding: 28px; 
      border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;
      display: flex; flex-direction: column; gap: 24px;
    }
    .module-card:hover { transform: translateY(-8px); border-color: #10b98133; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); }

    .card-header { display: flex; gap: 16px; align-items: center; }
    .icon-box { width: 56px; height: 56px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
    .title-area h3 { margin: 0; font-size: 1.15rem; font-weight: 700; color: #1e293b; }
    .total-badge { font-size: 0.75rem; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; margin-top: 4px; display: inline-block; }

    .status-bars { display: flex; flex-direction: column; gap: 16px; }
    .status-item { display: flex; flex-direction: column; gap: 6px; }
    .status-info { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 600; }
    .status-label { color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-count { color: #1e293b; }
    
    .progress-track { height: 6px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 99px; transition: width 1s ease-out; }

    .card-footer { margin-top: auto; padding-top: 16px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; color: #10b981; font-weight: 700; font-size: 0.85rem; opacity: 0; transform: translateX(-10px); transition: all 0.3s; }
    .module-card:hover .card-footer { opacity: 1; transform: translateX(0); }

    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 100px; color: #64748b; }
    .loader { width: 48px; height: 48px; border: 4px solid #f1f5f9; border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite; }
  `]
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  summary: DashboardSummary | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  modules = [
    { id: 'pettycashes', label: 'Petty Cash', icon: 'payments', route: '/petty-cash', color: '#10b981' },
    { id: 'cashadvances', label: 'Cash Advance', icon: 'account_balance_wallet', route: '/cash-advance', color: '#3b82f6' },
    { id: 'engineeringorders', label: 'Engineering', icon: 'engineering', route: '/engineering', color: '#f59e0b' },
    { id: 'itorders', label: 'IT Orders', icon: 'devices', route: '/it-orders', color: '#6366f1' },
    { id: 'glitches', label: 'Glitches', icon: 'report_problem', route: '/glitches', color: '#ef4444' },
    { id: 'beos', label: 'BEO Orders', icon: 'event_available', route: '/beos', color: '#8b5cf6' },
    { id: 'taxiorders', label: 'Taxi Orders', icon: 'local_taxi', route: '/taxi-orders', color: '#ec4899' },
    { id: 'expenses', label: 'Expenses', icon: 'receipt_long', route: '/expenses', color: '#14b8a6' }
  ];

  financeStatusConfig = [
    { key: 'pending', label: 'Pending', color: '#f59e0b' },
    { key: 'approved', label: 'Approved/Paid', color: '#10b981' },
    { key: 'rejected', label: 'Rejected', color: '#ef4444' }
  ];

  serviceStatusConfig = [
    { key: 'open', label: 'Open', color: '#3b82f6' },
    { key: 'closed', label: 'Closed', color: '#64748b' }
  ];

  taxiStatusConfig = [
    { key: 'pending', label: 'Pending', color: '#f59e0b' },
    { key: 'open', label: 'Partially Approved', color: '#3b82f6' },
    { key: 'closed', label: 'Closed', color: '#64748b' }
  ];

  beoStatusConfig: { key: string, label: string, color: string }[] = [
    { key: 'past', label: 'Past Events', color: '#64748b' },
    { key: 'current', label: 'Current Events', color: '#10b981' },
    { key: 'future', label: 'Future Events', color: '#3b82f6' }
  ];

  constructor() {
    // Constructor should be clean
  }

  ngOnInit() {
    this.loadSummary();
  }

  getStatusConfig(moduleId: string) {
    if (moduleId === 'beos') return this.beoStatusConfig;
    if (moduleId === 'taxiorders') return this.taxiStatusConfig;
    if (['engineeringorders', 'itorders', 'glitches'].includes(moduleId)) return this.serviceStatusConfig;
    return this.financeStatusConfig;
  }

  loadSummary() {
    this.isLoading = true;
    this.errorMessage = null;
    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.isLoading = false;
        this.cdr.detectChanges(); // Force UI update
      },
      error: (err) => {
        console.error('Dashboard error:', err);
        this.errorMessage = `Connection failed. Please ensure the backend is running.`;
        this.isLoading = false;
        this.cdr.detectChanges(); // Force UI update
      }
    });
  }

  calcPercent(moduleId: string, statusKey: string): number {
    if (!this.summary || !this.summary[moduleId]) return 0;
    const total = this.summary[moduleId].total;
    if (total === 0) return 0;
    const count = (this.summary[moduleId].breakdown as any)[statusKey] || 0;
    return (count / total) * 100;
  }
}
