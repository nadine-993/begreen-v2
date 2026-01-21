import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EngineeringOrderService } from '../../core/services/engineering-order.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-engineering-order-detail-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>Order Details</h2>
            <div class="status-chip" [class.closed]="request.status === 'Close'">
                {{ request.status === 'Open' ? 'OPEN' : 'CLOSED' }}
            </div>
          </div>
          <button class="btn-close" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div class="modal-body">
            <div class="info-grid">
                <div class="info-item">
                    <label>Requestor</label>
                    <span>{{ request.userName }}</span>
                </div>
                <div class="info-item">
                    <label>Department</label>
                    <span>{{ request.department }}</span>
                </div>
                <div class="info-item">
                    <label>Location</label>
                    <span>{{ request.location }}</span>
                </div>
                <div class="info-item">
                    <label>Team</label>
                    <span>{{ request.team }}</span>
                </div>
                <div class="info-item full-width">
                    <label>Date Submitted</label>
                    <span>{{ request.createdAt | date:'medium' }}</span>
                </div>
                <div class="info-item full-width">
                    <label>Description</label>
                    <p class="description-box">{{ request.description }}</p>
                </div>
            </div>

            <div class="history-section" *ngIf="request.history?.length">
                <h3>Order History</h3>
                <div class="history-list">
                    <div class="history-record" *ngFor="let entry of request.history">
                        <div class="record-icon">
                            <span class="material-symbols-outlined">{{ getActionIcon(entry.action) }}</span>
                        </div>
                        <div class="record-content">
                            <div class="record-header">
                                <strong>{{ entry.userName }}</strong>
                                <span class="record-date">{{ entry.date | date:'short' }}</span>
                            </div>
                            <p class="record-action">{{ entry.action }}</p>
                            <p class="record-note" *ngIf="entry.note">{{ entry.note }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="close-action" *ngIf="canClose()">
                <div class="form-group">
                    <label>Completion Note (Optional)</label>
                    <textarea [(ngModel)]="closeNote" placeholder="Explain what was done..."></textarea>
                </div>
                <button class="btn-close-order" (click)="closeOrder()" [disabled]="isSubmitting">
                    {{ isSubmitting ? 'Closing...' : 'Close Order' }}
                </button>
            </div>
        </div>

        <footer class="modal-footer">
          <button class="btn-secondary" (click)="close.emit()">Close</button>
        </footer>
      </div>
    </div>
  `,
    styles: [`
    .modal-backdrop {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-content {
      background: #ffffff; border-radius: 32px; width: 90%; max-width: 700px;
      max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
    }
    .modal-header {
      padding: 32px; border-bottom: 1px solid var(--accent);
      display: flex; justify-content: space-between; align-items: center;
    }
    .header-text { display: flex; align-items: center; gap: 16px; }
    .header-text h2 { margin: 0; color: var(--primary); font-size: 1.5rem; }
    
    .status-chip {
        padding: 4px 12px; border-radius: 100px; font-size: 0.75rem; font-weight: 800;
        background: #e0f2fe; color: #0369a1;
    }
    .status-chip.closed { background: #fee2e2; color: #b91c1c; }

    .modal-body { padding: 32px; overflow-y: auto; flex: 1; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-item label { font-size: 0.8rem; font-weight: 600; color: var(--text-light); text-transform: uppercase; }
    .info-item span { font-weight: 500; color: var(--text-dark); }
    .full-width { grid-column: 1 / -1; }
    .description-box {
        background: var(--bg-surface); padding: 16px; border-radius: 12px;
        margin: 8px 0 0 0; white-space: pre-wrap; color: var(--text-main); line-height: 1.5;
    }

    .history-section h3 { font-size: 1.1rem; margin-bottom: 16px; color: var(--primary); }
    .history-list { display: flex; flex-direction: column; gap: 20px; border-left: 2px solid var(--accent); margin-left: 12px; padding-left: 24px; }
    .history-record { display: flex; gap: 16px; position: relative; }
    .record-icon {
        width: 32px; height: 32px; background: white; border: 2px solid var(--accent);
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        position: absolute; left: -41px; color: var(--text-light);
    }
    .record-header { display: flex; justify-content: space-between; align-items: center; }
    .record-date { font-size: 0.8rem; color: var(--text-light); }
    .record-action { font-weight: 600; margin: 4px 0; color: var(--text-dark); }
    .record-note { font-size: 0.9rem; color: var(--text-main); font-style: italic; }

    .close-action {
        margin-top: 32px; padding-top: 32px; border-top: 1px solid var(--accent);
        display: flex; flex-direction: column; gap: 16px;
    }
    .close-action textarea {
        width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--accent); height: 80px;
    }
    .btn-close-order {
        background: #ef4444; color: white; border: none; padding: 12px; border-radius: 12px;
        font-weight: 600; cursor: pointer; transition: background 0.2s;
    }
    .btn-close-order:hover { background: #dc2626; }
    .btn-close-order:disabled { opacity: 0.5; }

    .modal-footer { padding: 24px 32px; background: var(--bg-surface); display: flex; justify-content: flex-end; }
    .btn-secondary { background: white; border: 1px solid var(--accent); padding: 10px 20px; border-radius: 10px; cursor: pointer; }
    .btn-close { background: none; border: none; cursor: pointer; color: var(--text-light); }
  `]
})
export class EngineeringOrderDetailModalComponent implements OnInit {
    @Input() request: any;
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    private engineeringService = inject(EngineeringOrderService);
    private authService = inject(AuthService);

    closeNote = '';
    isSubmitting = false;
    currentUser: any = null;

    ngOnInit() {
        this.currentUser = this.authService.currentUser();
    }

    canClose(): boolean {
        if (!this.request || this.request.status === 'Close') return false;
        if (!this.currentUser) return false;

        // Rule: Only Engineering department can close
        return this.currentUser.department?.toLowerCase() === 'engineering';
    }

    closeOrder() {
        if (this.isSubmitting) return;
        this.isSubmitting = true;

        this.engineeringService.closeOrder(this.request.id, this.closeNote).subscribe({
            next: (updated) => {
                this.isSubmitting = false;
                this.request = updated;
                this.success.emit();
                // We keep modal open to show status change, or close it? 
                // Let's close it after a brief delay or let user close it.
                // For now, let's just emit success so the list updates.
            },
            error: (err) => {
                console.error('Error closing order', err);
                this.isSubmitting = false;
                alert('Failed to close order.');
            }
        });
    }

    getActionIcon(action: string): string {
        switch (action.toLowerCase()) {
            case 'created': return 'add_circle';
            case 'closed': return 'check_circle';
            default: return 'history';
        }
    }
}
