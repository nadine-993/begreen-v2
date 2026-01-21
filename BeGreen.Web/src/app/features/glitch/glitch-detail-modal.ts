import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlitchService } from '../../core/services/glitch.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-glitch-detail-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>Glitch Recovery</h2>
            <div class="status-chip" [class.closed]="request.status === 'Close'">
                {{ request.status === 'Open' ? 'OPEN' : 'RESOLVED' }}
            </div>
          </div>
          <button class="btn-close" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div class="modal-body">
            <div class="info-grid">
                <div class="info-item">
                    <label>Guest Name</label>
                    <span class="highlight">{{ request.guestName }}</span>
                </div>
                <div class="info-item">
                    <label>Room Number</label>
                    <span class="highlight">{{ request.roomNumber }}</span>
                </div>
                <div class="info-item">
                    <label>Reported By</label>
                    <span>{{ request.userName }} ({{ request.department }})</span>
                </div>
                <div class="info-item">
                    <label>Date Reported</label>
                    <span>{{ request.createdAt | date:'medium' }}</span>
                </div>
                <div class="info-item full-width">
                    <label>Initial Description</label>
                    <p class="description-box">{{ request.description }}</p>
                </div>
            </div>

            <div class="history-section">
                <h3>Recovery Progress</h3>
                <div class="history-list" *ngIf="request.history?.length; else noHistory">
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
                <ng-template #noHistory>
                    <p class="empty-state">No progress recorded yet.</p>
                </ng-template>
            </div>

            <div class="actions-section" *ngIf="request.status === 'Open'">
                <div class="note-input">
                    <label>Add Update / Action Taken</label>
                    <textarea [(ngModel)]="newNote" placeholder="Describe the resolution steps or update..."></textarea>
                    <button class="btn-add-note" (click)="addNote()" [disabled]="!newNote.trim() || isSubmitting">
                        Add Update
                    </button>
                </div>

                <div class="close-box" *ngIf="canClose()">
                    <button class="btn-resolve" (click)="closeGlitch()" [disabled]="isSubmitting">
                        <span class="material-symbols-outlined">check_circle</span>
                        Mark as Resolved
                    </button>
                    <p class="helper-text">Only Room Service can resolve glitches.</p>
                </div>
            </div>

            <div class="resolved-banner" *ngIf="request.status === 'Close'">
                <span class="material-symbols-outlined">verified</span>
                This glitch has been marked as resolved and is locked.
            </div>
        </div>

        <footer class="modal-footer">
          <button class="btn-secondary" (click)="close.emit()">Close Panel</button>
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
      background: #ffffff; border-radius: 32px; width: 90%; max-width: 800px;
      max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
    }
    .modal-header {
      padding: 32px; border-bottom: 1px solid var(--accent);
      display: flex; justify-content: space-between; align-items: center;
    }
    .header-text { display: flex; align-items: center; gap: 16px; }
    .header-text h2 { margin: 0; color: #ef4444; font-size: 1.5rem; }
    
    .status-chip {
        padding: 4px 12px; border-radius: 100px; font-size: 0.75rem; font-weight: 800;
        background: #fee2e2; color: #b91c1c;
    }
    .status-chip.closed { background: #dcfce7; color: #15803d; }

    .modal-body { padding: 32px; overflow-y: auto; flex: 1; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-item label { font-size: 0.8rem; font-weight: 600; color: var(--text-light); text-transform: uppercase; }
    .info-item span { font-weight: 500; color: var(--text-dark); }
    .highlight { font-size: 1.1rem; color: var(--primary) !important; font-weight: 700 !important; }
    .full-width { grid-column: 1 / -1; }
    .description-box {
        background: var(--bg-surface); padding: 16px; border-radius: 12px;
        margin: 8px 0 0 0; white-space: pre-wrap; color: var(--text-main); line-height: 1.5; border: 1px dashed var(--accent);
    }

    .history-section h3 { font-size: 1.1rem; margin-bottom: 16px; color: var(--text-dark); border-bottom: 1px solid var(--accent); padding-bottom: 8px; }
    .history-list { display: flex; flex-direction: column; gap: 24px; margin-bottom: 32px; padding-left: 20px; }
    .history-record { display: flex; gap: 16px; position: relative; }
    .record-icon {
        width: 32px; height: 32px; background: white; border: 2px solid var(--accent);
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        color: var(--text-light); z-index: 1;
    }
    .history-list::before {
        content: ''; position: absolute; left: 35px; top: 0; bottom: 0; width: 2px;
        background: var(--accent); z-index: 0;
    }
    .record-content { flex: 1; background: var(--bg-surface); padding: 12px 16px; border-radius: 12px; }
    .record-header { display: flex; justify-content: space-between; align-items: center; }
    .record-date { font-size: 0.8rem; color: var(--text-light); }
    .record-action { font-weight: 600; margin: 2px 0; color: var(--primary); font-size: 0.9rem; }
    .record-note { font-size: 1rem; color: var(--text-dark); margin-top: 4px; }

    .actions-section {
        margin-top: 32px; padding-top: 32px; border-top: 2px solid var(--accent);
        display: grid; grid-template-columns: 2fr 1fr; gap: 32px;
    }
    .note-input { display: flex; flex-direction: column; gap: 12px; }
    .note-input label { font-weight: 600; color: var(--text-dark); }
    .note-input textarea {
        width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--accent); height: 100px;
        transition: border-color 0.2s;
    }
    .note-input textarea:focus { border-color: var(--primary); outline: none; }
    .btn-add-note {
        align-self: flex-start; background: var(--primary); color: white; border: none;
        padding: 10px 24px; border-radius: 10px; font-weight: 600; cursor: pointer;
    }

    .close-box { display: flex; flex-direction: column; gap: 12px; align-items: center; justify-content: center; background: #f8fafc; border-radius: 16px; padding: 20px; }
    .btn-resolve {
        background: #15803d; color: white; border: none; padding: 12px 24px; border-radius: 12px;
        font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center;
    }
    .helper-text { font-size: 0.75rem; color: var(--text-light); text-align: center; }

    .resolved-banner {
        margin-top: 32px; background: #dcfce7; color: #15803d; padding: 20px; border-radius: 16px;
        display: flex; align-items: center; gap: 12px; font-weight: 600;
    }

    .modal-footer { padding: 24px 32px; background: var(--bg-surface); display: flex; justify-content: flex-end; }
    .btn-secondary { background: white; border: 1px solid var(--accent); padding: 10px 20px; border-radius: 10px; cursor: pointer; }
    .btn-close { background: none; border: none; cursor: pointer; color: var(--text-light); }
  `]
})
export class GlitchDetailModalComponent implements OnInit {
    @Input() request: any;
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    private glitchService = inject(GlitchService);
    private authService = inject(AuthService);

    newNote = '';
    isSubmitting = false;
    currentUser: any = null;

    ngOnInit() {
        this.currentUser = this.authService.currentUser();
    }

    canClose(): boolean {
        if (!this.request || this.request.status === 'Close') return false;
        if (!this.currentUser) return false;

        // Rule: Only Room service department can close
        return this.currentUser.department?.toLowerCase() === 'room service';
    }

    addNote() {
        if (!this.newNote.trim() || this.isSubmitting) return;
        this.isSubmitting = true;

        this.glitchService.addNote(this.request.id, this.newNote).subscribe({
            next: (updated) => {
                this.isSubmitting = false;
                this.request = updated;
                this.newNote = '';
                this.success.emit();
            },
            error: (err) => {
                console.error('Error adding note', err);
                this.isSubmitting = false;
                alert('Failed to add update.');
            }
        });
    }

    closeGlitch() {
        if (this.isSubmitting) return;
        this.isSubmitting = true;

        this.glitchService.closeGlitch(this.request.id).subscribe({
            next: (updated) => {
                this.isSubmitting = false;
                this.request = updated;
                this.success.emit();
            },
            error: (err) => {
                console.error('Error closing glitch', err);
                this.isSubmitting = false;
                alert('Failed to resolve glitch.');
            }
        });
    }

    getActionIcon(action: string): string {
        switch (action.toLowerCase()) {
            case 'created': return 'error';
            case 'note added': return 'chat_bubble';
            case 'closed': return 'verified';
            default: return 'history';
        }
    }
}
