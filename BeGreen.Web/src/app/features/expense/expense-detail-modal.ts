import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../../core/services/expense.service';
import { AuthService } from '../../core/services/auth.service';
import { PdfService } from '../../core/services/pdf.service';

@Component({
    selector: 'app-expense-detail-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>Expense Claim Details</h2>
            <p>Submitted by {{ request.userName }} on {{ request.createdAt | date:'medium' }}</p>
          </div>
          <div class="status-badge" [attr.data-status]="request.status">
            {{ request.status }}
          </div>
        </header>

        <div class="modal-body">
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">Amount</span>
                    <span class="value amount">{{ request.amount | number:'1.2-2' }} {{ request.currency }}</span>
                </div>
                <div class="info-item">
                    <span class="label">Department</span>
                    <span class="value">{{ request.department }}</span>
                </div>
                <div class="info-item">
                    <span class="label">Current Approver</span>
                    <span class="value">{{ request.currentApproverName || 'None' }}</span>
                </div>
            </div>

            <div class="description-box">
                <span class="label">Description</span>
                <p>{{ request.description }}</p>
            </div>

            <div class="attachment-box" *ngIf="request.attachment">
                <span class="label">Attachment</span>
                <div class="attachment-preview" (click)="downloadAttachment()">
                    <span class="material-symbols-outlined">description</span>
                    <span>Click to download receipt</span>
                </div>
            </div>

            <div class="history-section">
                <h3>Approval History</h3>
                <div class="timeline">
                    <div class="timeline-item" *ngFor="let entry of request.history">
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
          <div class="footer-input" *ngIf="canApprove()">
              <textarea [(ngModel)]="approvalNote" placeholder="Add an optional note for your action..."></textarea>
          </div>
          <div class="footer-actions">
            <button type="button" class="btn-secondary" (click)="close.emit()">Close</button>
            <ng-container *ngIf="canApprove()">
                <button type="button" class="btn-danger" (click)="reject()" [disabled]="isSubmittingAction">Reject</button>
                <button type="button" class="btn-primary" (click)="approve()" [disabled]="isSubmittingAction">Approve</button>
            </ng-container>
            <button type="button" class="btn-print" *ngIf="request.status === 'PAID'" (click)="printReport()" [disabled]="isPrinting">
                <span class="material-symbols-outlined">{{ isPrinting ? 'sync' : 'print' }}</span> {{ isPrinting ? 'Generating...' : 'Print Report' }}
            </button>
          </div>
        </footer>
      </div>
    </div>
  `,
    styles: [`
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #ffffff; border-radius: 32px; width: 95%; max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.25); }
    .modal-header { padding: 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .header-text h2 { margin: 0; color: #10b981; font-size: 1.75rem; font-weight: 800; }
    
    .status-badge { padding: 8px 16px; border-radius: 99px; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; }
    .status-badge[data-status="PENDING"] { background: #fef3c7; color: #92400e; }
    .status-badge[data-status="PAID"] { background: #dcfce7; color: #166534; }
    .status-badge[data-status="REJECTED"] { background: #fee2e2; color: #991b1b; }

    .modal-body { padding: 32px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 32px; }
    
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .value { font-weight: 600; color: #1e293b; }
    .value.amount { font-size: 1.25rem; color: #10b981; font-weight: 800; }

    .description-box { background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #f1f5f9; }
    .description-box p { margin: 8px 0 0 0; color: #475569; line-height: 1.6; }

    .attachment-box { margin-top: 8px; }
    .attachment-preview { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; cursor: pointer; color: #166534; font-weight: 600; margin-top: 8px; }

    .history-section h3 { margin-bottom: 20px; font-size: 1.1rem; color: #1e293b; font-weight: 700; border-left: 4px solid #10b981; padding-left: 12px; }
    .timeline { display: flex; flex-direction: column; gap: 24px; padding-left: 12px; }
    .timeline-item { display: flex; gap: 16px; }
    .timeline-icon { width: 40px; height: 40px; border-radius: 12px; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #10b981; border: 1px solid #f1f5f9; }
    .timeline-header { display: flex; justify-content: space-between; width: 100%; }
    .timeline-note { margin: 8px 0 0 0; background: #f1f5f9; padding: 10px 14px; border-radius: 12px; font-size: 0.85rem; color: #475569; border-left: 3px solid #cbd5e1; }

    .modal-footer { padding: 32px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
    .footer-input { margin-bottom: 20px; }
    .footer-input textarea { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; font-family: inherit; font-size: 0.9rem; resize: none; min-height: 60px; }
    .footer-input textarea:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }
    
    .footer-actions { display: flex; gap: 16px; justify-content: flex-end; }
    .btn-secondary { background: white; border: 1px solid #e2e8f0; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn-primary { background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn-danger { background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn-print { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .btn-print:disabled { opacity: 0.7; }
  `]
})
export class ExpenseDetailModalComponent {
    @Input() request: any;
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    private expenseService = inject(ExpenseService);
    private authService = inject(AuthService);
    private pdfService = inject(PdfService);

    isPrinting = false;
    isSubmittingAction = false;
    approvalNote = '';

    canApprove(): boolean {
        const user = this.authService.currentUser();
        return !!user && this.request.status === 'PENDING' && this.request.currentApproverUserId === user.id;
    }

    approve() {
        if (this.isSubmittingAction) return;
        this.isSubmittingAction = true;

        this.expenseService.approveRequest(this.request.id, this.approvalNote || undefined).subscribe({
            next: (res) => {
                this.isSubmittingAction = false;
                this.request = res;
                this.success.emit();
                this.approvalNote = '';
            },
            error: () => {
                this.isSubmittingAction = false;
                alert('Failed to approve');
            }
        });
    }

    reject() {
        if (this.isSubmittingAction) return;
        this.isSubmittingAction = true;

        this.expenseService.rejectRequest(this.request.id, this.approvalNote || undefined).subscribe({
            next: (res) => {
                this.isSubmittingAction = false;
                this.request = res;
                this.success.emit();
                this.approvalNote = '';
            },
            error: () => {
                this.isSubmittingAction = false;
                alert('Failed to reject');
            }
        });
    }

    downloadAttachment() {
        if (!this.request.attachment) return;
        const link = document.createElement('a');
        link.href = this.request.attachment;
        link.download = `Expense_Receipt_${this.request.id}.png`;
        link.click();
    }

    printReport() {
        if (this.isPrinting) return;
        this.isPrinting = true;
        this.pdfService.downloadExpensePdf(this.request).subscribe({
            next: () => this.isPrinting = false,
            error: () => {
                this.isPrinting = false;
                window.print();
            }
        });
    }
}
