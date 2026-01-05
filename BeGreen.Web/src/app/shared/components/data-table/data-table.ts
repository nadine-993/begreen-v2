import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
    key: string;
    label: string;
    type?: 'text' | 'date' | 'currency' | 'status';
}

@Component({
    selector: 'app-data-table',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="table-container">
      <table class="eco-table">
        <thead>
          <tr>
            <th *ngFor="let col of columns">{{ col.label }}</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of data">
            <td *ngFor="let col of columns">
              <ng-container [ngSwitch]="col.type">
                <span *ngSwitchCase="'status'" [class]="'status-badge ' + getStatusClass(row[col.key])">
                  {{ row[col.key] }}
                </span>
                <span *ngSwitchCase="'date'">
                  {{ row[col.key] | date:'mediumDate' }}
                </span>
                <span *ngSwitchCase="'currency'">
                  {{ row[col.key] | number:'1.0-2' }} <small>{{ row['currency'] || 'SYP' }}</small>
                </span>
                <span *ngSwitchDefault>{{ row[col.key] }}</span>
              </ng-container>
            </td>
            <td class="actions-col">
              <button class="action-btn" title="View Details">
                <span class="material-symbols-outlined">visibility</span>
              </button>
            </td>
          </tr>
          <tr *ngIf="data.length === 0">
            <td [attr.colspan]="columns.length + 1" class="no-data">
              No records found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
    styles: [`
    .table-container {
      background: white;
      border-radius: 24px;
      border: 1px solid var(--accent);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .eco-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background-color: var(--bg-surface);
      color: var(--text-light);
      font-weight: 600;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--accent);
    }
    td {
      padding: 18px 24px;
      border-bottom: 1px solid var(--bg-surface);
      color: var(--text-main);
      font-size: 0.95rem;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background-color: #fcfdfc; }

    .status-badge {
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .status-open, .status-pending { background: #e0f2fe; color: #0369a1; }
    .status-approved, .status-done { background: #dcfce7; color: #15803d; }
    .status-rejected { background: #fee2e2; color: #b91c1c; }
    .status-default { background: var(--bg-surface); color: var(--text-light); }

    .actions-col { text-align: right; }
    .action-btn {
      background: none; border: none; color: var(--text-light);
      cursor: pointer; padding: 4px; border-radius: 8px;
      transition: all 0.2s;
    }
    .action-btn:hover { background: var(--primary-light); color: var(--primary); }
    .no-data { text-align: center; padding: 40px; color: var(--text-light); }
  `]
})
export class DataTableComponent {
    @Input() columns: TableColumn[] = [];
    @Input() data: any[] = [];

    getStatusClass(status: string): string {
        if (!status) return 'status-default';
        const s = status.toLowerCase();
        if (s === 'open' || s === 'pending') return 'status-open';
        if (s === 'approved' || s === 'done' || s === 'paid') return 'status-approved';
        if (s === 'rejected' || s === 'cancelled') return 'status-rejected';
        return 'status-default';
    }
}
