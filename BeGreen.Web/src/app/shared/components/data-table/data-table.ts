import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'currency' | 'status';
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-container">
      <table class="eco-table">
        <thead>
          <tr>
            <th *ngFor="let col of columns">
              <div class="header-cell">
                <span class="header-label">{{ col.label }}</span>
                <div class="filter-input-wrapper">
                  <input 
                    type="text" 
                    [placeholder]="'Filter ' + col.label + '...'" 
                    [(ngModel)]="filters[col.key]" 
                    (input)="onFilterChange()"
                    class="filter-input">
                </div>
              </div>
            </th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of paginatedData">
            <td *ngFor="let col of columns">
              <ng-container [ngSwitch]="col.type">
                <span *ngSwitchCase="'status'" [class]="'status-badge ' + getStatusClass(row[col.key])">
                  {{ formatStatus(row[col.key], row) }}
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
              <div class="action-group">
                <button class="action-btn" title="View Details" (click)="view.emit(row)">
                  <span class="material-symbols-outlined">visibility</span>
                </button>
                <button 
                  *ngIf="row.status?.toUpperCase() === 'PAID'" 
                  class="action-btn download-btn" 
                  title="Download PDF" 
                  (click)="download.emit(row)">
                  <span class="material-symbols-outlined">download</span>
                </button>
              </div>
            </td>
          </tr>
          <tr *ngIf="paginatedData.length === 0">
            <td [attr.colspan]="columns.length + 1" class="no-data">
              No records match your filters.
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination Footer -->
      <div class="pagination-footer" *ngIf="filteredData.length > 0">
        <div class="pagination-info">
          Showing <strong>{{ rangeStart }}</strong> to <strong>{{ rangeEnd }}</strong> of <strong>{{ filteredData.length }}</strong>
        </div>
        
        <div class="pagination-controls">
          <button class="page-btn" [disabled]="currentPage === 1" (click)="setPage(1)">
            <span class="material-symbols-outlined">first_page</span>
          </button>
          <button class="page-btn" [disabled]="currentPage === 1" (click)="setPage(currentPage - 1)">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          
          <div class="page-numbers">
            <button 
              *ngFor="let p of visiblePages" 
              class="page-num" 
              [class.active]="p === currentPage"
              (click)="setPage(p)">
              {{ p }}
            </button>
          </div>

          <button class="page-btn" [disabled]="currentPage === totalPages" (click)="setPage(currentPage + 1)">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
          <button class="page-btn" [disabled]="currentPage === totalPages" (click)="setPage(totalPages)">
            <span class="material-symbols-outlined">last_page</span>
          </button>
        </div>

        <div class="pager-size">
          <select [(ngModel)]="pageSize" (change)="onPageSizeChange()">
            <option [value]="5">5 / page</option>
            <option [value]="10">10 / page</option>
            <option [value]="25">25 / page</option>
            <option [value]="50">50 / page</option>
          </select>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .table-container {
      background: white;
      border-radius: 24px;
      border: 1px solid var(--accent);
      box-shadow: var(--shadow);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .eco-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background-color: var(--bg-surface);
      border-bottom: 2px solid var(--accent);
      padding: 16px 20px;
    }
    .header-cell {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .header-label {
      color: var(--text-dark);
      font-weight: 700;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .filter-input-wrapper {
      position: relative;
    }
    .filter-input {
      width: 100%;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--accent);
      background: white;
      font-size: 0.8rem;
      font-family: inherit;
      color: var(--text-main);
      transition: all 0.2s;
    }
    .filter-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(0, 109, 78, 0.1);
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
    .status-approved, .status-done, .status-paid { background: #dcfce7; color: #15803d; }
    .status-rejected { background: #fee2e2; color: #b91c1c; }
    .status-default { background: var(--bg-surface); color: var(--text-light); }

    .actions-col { text-align: right; vertical-align: middle; }
    .action-group { display: flex; gap: 8px; justify-content: flex-end; }
    .action-btn {
      background: none; border: none; color: var(--text-light);
      cursor: pointer; padding: 6px; border-radius: 8px;
      transition: all 0.2s; display: flex; align-items: center; justify-content: center;
    }
    .action-btn:hover { background: var(--primary-light); color: var(--primary); }
    .action-btn.download-btn:hover { background: #e0f2fe; color: #0ea5e9; }
    .no-data { text-align: center; padding: 60px; color: var(--text-light); border-bottom: none; }

    /* Pagination Footer */
    .pagination-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: var(--bg-surface);
      border-top: 1px solid var(--accent);
      font-size: 0.9rem;
      color: var(--text-light);
    }
    .pagination-controls { display: flex; align-items: center; gap: 8px; }
    .page-numbers { display: flex; gap: 4px; }
    .page-btn, .page-num {
      background: white; border: 1px solid var(--accent);
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--text-main); font-weight: 600;
      transition: all 0.2s;
    }
    .page-btn .material-symbols-outlined { font-size: 20px; }
    .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .page-btn:hover:not(:disabled), .page-num:hover {
      border-color: var(--primary); color: var(--primary);
    }
    .page-num.active {
      background: var(--primary); color: white; border-color: var(--primary);
    }
    .pager-size select {
      padding: 8px 12px; border-radius: 10px; border: 1px solid var(--accent);
      background: white; color: var(--text-main); cursor: pointer;
    }
  `]
})
export class DataTableComponent implements OnChanges {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Output() view = new EventEmitter<any>();
  @Output() download = new EventEmitter<any>();

  filteredData: any[] = [];
  paginatedData: any[] = [];
  filters: { [key: string]: string } = {};

  // Pagination state
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] || changes['columns']) {
      this.resetFilters();
      this.onFilterChange();
    }
  }

  resetFilters() {
    this.columns.forEach(col => {
      if (!(col.key in this.filters)) {
        this.filters[col.key] = '';
      }
    });
  }

  onFilterChange() {
    this.filteredData = this.data.filter(row => {
      return this.columns.every(col => {
        const val = String(row[col.key] || '').toLowerCase();
        const filter = String(this.filters[col.key] || '').toLowerCase();
        return val.includes(filter);
      });
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedData = this.filteredData.slice(start, end);
  }

  setPage(p: number) {
    this.currentPage = p;
    this.updatePagination();
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  get rangeStart() { return (this.currentPage - 1) * this.pageSize + 1; }
  get rangeEnd() { return Math.min(this.currentPage * this.pageSize, this.filteredData.length); }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-default';
    const s = status.toLowerCase();
    if (s === 'open' || s === 'pending') return 'status-open';
    if (s === 'approved' || s === 'done' || s === 'paid' || s === 'close') return 'status-approved';
    if (s === 'rejected' || s === 'cancelled') return 'status-rejected';
    return 'status-default';
  }

  formatStatus(status: string, row?: any): string {
    if (!status) return 'Unknown';
    const s = status.toLowerCase();

    // Add current approver name for pending status if available
    if ((s === 'pending' || s === 'open') && row?.currentApproverName) {
      const displayStatus = s === 'pending' ? 'Pending Approval' : 'Open';
      return `${displayStatus} - ${row.currentApproverName}`;
    }

    if (s === 'pending') return 'Pending Approval';
    if (s === 'paid') return 'Paid';
    // Capitalize default
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
}
