import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <header class="header">
        <h1>Dashboard</h1>
        <p>Welcome to BeGreen v2</p>
      </header>
      
      <div class="card-grid">
        <div class="stat-card">
          <h3>Active Requests</h3>
          <p class="count">12</p>
        </div>
        <div class="stat-card">
          <h3>Pending Approvals</h3>
          <p class="count">4</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header h1 {
      color: var(--primary);
      margin-bottom: 8px;
    }
    .header p {
      color: var(--text-light);
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 24px;
      margin-top: 40px;
    }
    .stat-card {
      background: #ffffff;
      padding: 24px;
      border-radius: 24px;
      box-shadow: var(--shadow);
      border: 1px solid var(--accent);
    }
    .stat-card h3 {
      font-size: 0.9rem;
      color: var(--text-light);
      margin-bottom: 12px;
    }
    .stat-card .count {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--primary);
    }
  `]
})
export class DashboardComponent { }
