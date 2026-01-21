import { Component, EventEmitter, Input, Output, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PettyCashService } from '../../core/services/petty-cash.service';
import { PdfService } from '../../core/services/pdf.service';

@Component({
  selector: 'app-petty-cash-detail-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>Petty Cash Details</h2>
            <p>Request by {{ request.userName }} on {{ request.createdAt | date:'mediumDate' }}</p>
          </div>
          <button class="btn-close" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div class="modal-body scroll-area">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Status</span>
              <span class="value badge" [attr.data-status]="request.status">
                {{ request.status }}
              </span>
            </div>
            <div class="info-item">
              <span class="label">Total Amount</span>
              <span class="value highlight">{{ request.total | number:'1.2-2' }} {{ request.currency }}</span>
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

          <div class="section">
            <h3>Disbursement Items</h3>
            <div class="details-table-wrapper">
              <table class="details-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>GL Code</th>
                    <th>Requestor</th>
                    <th>Amount</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of request.details">
                    <td>{{ item.itemId }}</td>
                    <td><code class="gl-code">{{ item.glCode }}</code></td>
                    <td>{{ item.requestor }}</td>
                    <td class="amount-cell">{{ item.amount | number:'1.2-2' }} <small>{{ item.currency }}</small></td>
                    <td>{{ item.description }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="section" *ngIf="request.history?.length">
            <h3>Approval History</h3>
            <div class="timeline">
              <div *ngFor="let record of request.history" class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <strong>{{ record.userName }}</strong>
                    <span class="action-tag">{{ record.action }}</span>
                    <small>{{ record.date | date:'short' }}</small>
                  </div>
                  <p class="timeline-note" *ngIf="record.note">{{ record.note }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <div class="footer-input" *ngIf="canApprove">
              <textarea [(ngModel)]="approvalNote" placeholder="Add an optional note..."></textarea>
          </div>
          <div class="footer-actions">
            <button class="btn-secondary" (click)="close.emit()">Close</button>
            <ng-container *ngIf="canApprove">
                <button class="btn-danger" (click)="reject()" [disabled]="isSubmitting">Reject</button>
                <button class="btn-primary" (click)="approve()" [disabled]="isSubmitting">Approve</button>
            </ng-container>
            <button 
              *ngIf="request.status === 'PAID'" 
              class="btn-download" 
              (click)="downloadPdf()"
              [disabled]="isDownloading">
              <span class="material-symbols-outlined">{{ isDownloading ? 'sync' : 'picture_as_pdf' }}</span>
              {{ isDownloading ? 'Preparing...' : 'Download PDF' }}
            </button>
          </div>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #ffffff; border-radius: 32px; width: 90%; max-width: 900px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.25); }
    .modal-header { padding: 32px; border-bottom: 1px solid var(--accent); display: flex; justify-content: space-between; align-items: center; }
    .header-text h2 { margin: 0; color: var(--primary); font-size: 1.75rem; font-weight: 800; }
    .header-text p { margin: 4px 0 0 0; color: var(--text-light); }
    .btn-close { background: var(--bg-surface); border: none; padding: 8px; border-radius: 12px; cursor: pointer; color: var(--text-light); transition: all 0.2s; }
    
    .scroll-area { overflow-y: auto; padding: 32px; flex: 1; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 24px; padding: 24px; background: var(--bg-surface); border-radius: 24px; margin-bottom: 32px; border: 1px solid var(--accent); }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-item .label { font-size: 0.75rem; font-weight: 700; color: var(--text-light); text-transform: uppercase; }
    .info-item .value { font-weight: 600; color: var(--text-dark); }
    .info-item .value.highlight { color: var(--primary); font-size: 1.25rem; font-weight: 800; }

    .badge { padding: 4px 12px; border-radius: 100px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
    .badge[data-status="PENDING"] { background: #e0f2fe; color: #0369a1; }
    .badge[data-status="PAID"] { background: #dcfce7; color: #15803d; }
    .badge[data-status="REJECTED"] { background: #fee2e2; color: #991b1b; }

    .section { margin-bottom: 40px; }
    .section h3 { font-size: 1.1rem; color: var(--text-dark); margin-bottom: 20px; font-weight: 700; border-left: 4px solid var(--primary); padding-left: 12px; }

    .details-table-wrapper { border: 1px solid var(--accent); border-radius: 16px; overflow: hidden; }
    .details-table { width: 100%; border-collapse: collapse; text-align: left; background: white; }
    .details-table th { background: var(--bg-surface); padding: 16px; font-size: 0.8rem; color: var(--text-light); }
    .details-table td { padding: 16px; border-top: 1px solid var(--accent); font-size: 0.9rem; }
    .gl-code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #475569; }
    .amount-cell { font-weight: 700; color: var(--primary); }

    .timeline { display: flex; flex-direction: column; gap: 0; padding-left: 12px; }
    .timeline-item { display: flex; gap: 24px; position: relative; padding-bottom: 24px; }
    .timeline-item::before { content: ''; position: absolute; left: 6px; top: 0; bottom: 0; width: 2px; background: var(--accent); }
    .timeline-item:last-child::before { display: none; }
    .timeline-marker { width: 14px; height: 14px; border-radius: 50%; background: white; border: 3px solid var(--primary); z-index: 1; margin-top: 4px; }
    .timeline-header { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
    .action-tag { background: var(--bg-surface); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; color: var(--text-light); }
    .timeline-note { margin: 8px 0 0 0; background: #f8fafc; padding: 10px 14px; border-radius: 12px; font-size: 0.85rem; color: #475569; border-left: 3px solid #e2e8f0; }

    .modal-footer { padding: 32px; border-top: 1px solid var(--accent); background: var(--bg-surface); }
    .footer-input { margin-bottom: 20px; }
    .footer-input textarea { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--accent); font-family: inherit; font-size: 0.9rem; resize: none; min-height: 60px; }
    
    .footer-actions { display: flex; justify-content: flex-end; gap: 16px; }
    .btn-secondary { background: #ffffff; color: var(--text-dark); border: 1px solid var(--accent); padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn-primary { background: var(--primary); color: white; border: none; padding: 12px 32px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn-danger { background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn-download { background: #0ea5e9; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .btn-download:disabled { opacity: 0.7; }
  `]
})
export class PettyCashDetailModalComponent implements OnInit {
  @Input() request: any;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private pettyCashService = inject(PettyCashService);
  private pdfService = inject(PdfService);

  isSubmitting = false;
  isDownloading = false;
  approvalNote = '';

  get canApprove(): boolean {
    const user = this.authService.currentUser();
    return !!user && this.request?.status === 'PENDING' && this.request?.currentApproverUserId === user.id;
  }

  ngOnInit() {
    this.cdr.detectChanges();
  }

  approve() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    this.pettyCashService.approveRequest(this.request.id, this.approvalNote || undefined).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.request = res;
        this.success.emit();
        this.approvalNote = '';
      },
      error: (err) => {
        console.error('Error approving request', err);
        this.isSubmitting = false;
        alert('Failed to approve request.');
      }
    });
  }

  reject() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    this.pettyCashService.rejectRequest(this.request.id, this.approvalNote || undefined).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.request = res;
        this.success.emit();
        this.approvalNote = '';
      },
      error: (err) => {
        console.error('Error rejecting request', err);
        this.isSubmitting = false;
        alert('Failed to reject request.');
      }
    });
  }

  downloadPdf() {
    if (this.isDownloading) return;
    this.isDownloading = true;

    this.pdfService.downloadPettyCashPdf(this.request).subscribe({
      next: () => {
        this.isDownloading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error downloading PDF', err);
        this.isDownloading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
