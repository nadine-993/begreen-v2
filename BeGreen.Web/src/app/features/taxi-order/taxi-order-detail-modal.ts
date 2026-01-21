import { Component, EventEmitter, Input, Output, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxiOrderService } from '../../core/services/taxi-order.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-taxi-order-detail-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>Taxi Order Details</h2>
            <p>Submitted by {{ request?.userName }} on {{ request?.createdAt | date:'medium' }}</p>
          </div>
          <div class="status-badge" [attr.data-status]="request?.status">
            {{ request?.status }}
          </div>
        </header>

        <div class="modal-body">
            <div class="passengers-section">
                <h3>Passenger List ({{ request?.passengers?.length || 0 }})</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Dept</th>
                                <th>Phone</th>
                                <th>PickUp</th>
                                <th>To</th>
                                <th>Time</th>
                                <th width="100">Status</th>
                                <th *ngIf="isSecurity() && request?.status !== 'Closed'" width="100">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let p of request?.passengers; let i = index">
                                <td>{{ p.fullName }}</td>
                                <td>{{ p.department }}</td>
                                <td>{{ p.phoneNumber }}</td>
                                <td>{{ p.pickUpFrom }}</td>
                                <td>{{ p.destination }}</td>
                                <td>{{ p.pickupTime }}</td>
                                <td>
                                    <span class="row-status" [attr.data-status]="p.status">
                                        {{ p.status || 'Pending' }}
                                    </span>
                                </td>
                                <td *ngIf="isSecurity() && request?.status !== 'Closed'" class="actions-cell">
                                    <button 
                                        *ngIf="p.status === 'Pending' || !p.status"
                                        class="btn-row-success" 
                                        title="Approve"
                                        (click)="updateStatus(i, 'Approved')">
                                        <span class="material-symbols-outlined">check</span>
                                    </button>
                                    <button 
                                        *ngIf="p.status === 'Pending' || !p.status"
                                        class="btn-row-danger" 
                                        title="Reject"
                                        (click)="updateStatus(i, 'Rejected')">
                                        <span class="material-symbols-outlined">close</span>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="history-section">
                <h3>History Log</h3>
                <div class="timeline">
                    <div class="timeline-item" *ngFor="let entry of request?.history">
                        <div class="timeline-icon">
                            <span class="material-symbols-outlined">
                                {{ entry.action?.includes('Approved') ? 'check' : (entry.action?.includes('Rejected') ? 'close' : 'send') }}
                            </span>
                        </div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <strong>{{ entry.action }}</strong>
                                <span>{{ entry.date | date:'short' }}</span>
                            </div>
                            <p class="timeline-user">By {{ entry.userName }}</p>
                            <p class="timeline-note" *ngIf="entry.note">{{ entry.note }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer class="modal-footer">
          <div class="footer-input" *ngIf="isSecurity() && request?.status !== 'Closed'">
              <textarea [(ngModel)]="approvalNote" placeholder="Add an optional note for your action..."></textarea>
          </div>
          <div class="footer-actions">
            <button type="button" class="btn-secondary" (click)="close.emit()">Close Window</button>
            <button type="button" class="btn-attachment" *ngIf="request?.attachment" (click)="downloadExcel()">
                <span class="material-symbols-outlined">download</span> Download Original Excel
            </button>
          </div>
        </footer>
      </div>
    </div>
  `,
    styles: [`
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #ffffff; border-radius: 32px; width: 95%; max-width: 1100px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.25); }
    .modal-header { padding: 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .header-text h2 { margin: 0; color: #f59e0b; font-size: 1.75rem; font-weight: 800; }
    
    .status-badge { padding: 10px 20px; border-radius: 99px; font-weight: 800; font-size: 0.85rem; text-transform: uppercase; }
    .status-badge[data-status="Pending"] { background: #fffbeb; color: #92400e; }
    .status-badge[data-status="Closed"] { background: #1e293b; color: white; }
    .status-badge[data-status="Partially Approved"] { background: #e0f2fe; color: #075985; }

    .modal-body { padding: 32px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 40px; }
    .passengers-section h3, .history-section h3 { margin: 0 0 20px 0; font-size: 1.2rem; color: #1e293b; font-weight: 700; }
    
    .table-container { border: 1px solid #f1f5f9; border-radius: 20px; overflow: hidden; background: #fafafa; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { background: #f8fafc; padding: 16px; text-align: left; color: #64748b; font-weight: 700; border-bottom: 2px solid #f1f5f9; }
    td { padding: 16px; border-top: 1px solid #f1f5f9; color: #334155; }

    .row-status { padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
    .row-status[data-status="Approved"] { background: #dcfce7; color: #166534; }
    .row-status[data-status="Rejected"] { background: #fee2e2; color: #991b1b; }
    .row-status[data-status="Pending"], .row-status:not([data-status]) { background: #f1f5f9; color: #64748b; }

    .actions-cell { display: flex; gap: 10px; }
    .btn-row-success, .btn-row-danger { width: 36px; height: 36px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
    .btn-row-success { background: #dcfce7; color: #166534; }
    .btn-row-success:hover { background: #166534; color: white; transform: scale(1.1); }
    .btn-row-danger { background: #fee2e2; color: #991b1b; }
    .btn-row-danger:hover { background: #991b1b; color: white; transform: scale(1.1); }

    .timeline { display: flex; flex-direction: column; gap: 24px; padding-left: 10px; }
    .timeline-item { display: flex; gap: 20px; position: relative; }
    .timeline-icon { width: 44px; height: 44px; border-radius: 14px; background: #ffffff; display: flex; align-items: center; justify-content: center; color: #f59e0b; border: 2px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .timeline-header { display: flex; justify-content: space-between; align-items: center; }
    .timeline-user { color: #64748b; font-size: 0.8rem; margin: 4px 0 0 0; }
    .timeline-note { margin: 8px 0 0 0; background: #f1f5f9; padding: 10px 14px; border-radius: 12px; font-size: 0.85rem; color: #475569; border-left: 3px solid #cbd5e1; }

    .modal-footer { padding: 32px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
    .footer-input { margin-bottom: 20px; }
    .footer-input textarea { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; font-family: inherit; font-size: 0.9rem; resize: none; min-height: 60px; }
    
    .footer-actions { display: flex; gap: 16px; justify-content: flex-end; }
    .btn-secondary { background: white; border: 1px solid #cbd5e1; padding: 12px 28px; border-radius: 14px; font-weight: 700; cursor: pointer; color: #475569; }
    .btn-attachment { background: white; border: 2px solid #f59e0b; color: #f59e0b; padding: 12px 28px; border-radius: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; }
  `]
})
export class TaxiOrderDetailModalComponent implements OnInit {
    @Input() request: any;
    @Output() close = new EventEmitter<void>();
    @Output() updated = new EventEmitter<void>();

    private taxiService = inject(TaxiOrderService);
    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);

    approvalNote = '';

    constructor() {
    }

    ngOnInit() {
        this.cdr.detectChanges();
    }

    isSecurity(): boolean {
        const user = this.authService.currentUser();
        return user?.department?.toLowerCase() === 'security' || user?.role?.toLowerCase() === 'admin';
    }

    updateStatus(index: number, status: string) {
        this.taxiService.updatePassengerStatus(this.request.id, index, status, this.approvalNote || undefined).subscribe({
            next: (res) => {
                this.request = res;
                this.approvalNote = '';
                this.updated.emit();
                this.cdr.detectChanges();
            },
            error: (err: any) => alert('Action failed.')
        });
    }

    downloadExcel() {
        if (!this.request?.attachment) return;
        const link = document.createElement('a');
        link.href = this.request.attachment;
        link.download = `TaxiOrder_${this.request.id}.xlsx`;
        link.click();
    }
}
