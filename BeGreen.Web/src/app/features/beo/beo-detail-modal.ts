import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BeoService } from '../../core/services/beo.service';

@Component({
    selector: 'app-beo-detail-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>BEO Order Details</h2>
            <div class="date-chip">
                {{ request.dateFrom | date:'mediumDate' }} - {{ request.dateTo | date:'mediumDate' }}
            </div>
          </div>
          <button class="btn-close" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div class="modal-body">
            <div class="info-grid">
                <div class="info-item">
                    <label>Created By</label>
                    <span class="highlight">{{ request.userName }}</span>
                </div>
                <div class="info-item">
                    <label>Created At</label>
                    <span>{{ request.createdAt | date:'medium' }}</span>
                </div>
                <div class="info-item full-width">
                    <label>Notes / Event Details</label>
                    <p class="description-box">{{ request.notes }}</p>
                </div>
            </div>

            <div class="attachment-section" *ngIf="request.attachment">
                <h3>Attachment</h3>
                <div class="attachment-box">
                    <div class="attachment-info">
                        <span class="material-symbols-outlined">description</span>
                        <span>Banquet Event Order Document</span>
                    </div>
                    <div class="attachment-actions">
                        <button class="btn-preview" (click)="previewAttachment()">
                            <span class="material-symbols-outlined">visibility</span>
                            View
                        </button>
                        <button class="btn-download" (click)="downloadAttachment()">
                            <span class="material-symbols-outlined">download</span>
                            Download
                        </button>
                    </div>
                </div>

                <div *ngIf="isPreviewing" class="preview-area">
                    <img *ngIf="isImage" [src]="request.attachment" class="img-preview">
                    <iframe *ngIf="!isImage" [src]="pdfUrl" class="pdf-preview"></iframe>
                </div>
            </div>

            <div class="attachment-section" *ngIf="!request.attachment">
                <h3>Attachment</h3>
                <p class="empty-state">No attachment available for this BEO.</p>
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
    .header-text h2 { margin: 0; color: #4338ca; font-size: 1.5rem; }
    
    .date-chip {
        padding: 4px 12px; border-radius: 100px; font-size: 0.75rem; font-weight: 800;
        background: #e0e7ff; color: #4338ca;
    }

    .modal-body { padding: 32px; overflow-y: auto; flex: 1; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-item label { font-size: 0.8rem; font-weight: 600; color: var(--text-light); text-transform: uppercase; }
    .info-item span { font-weight: 500; color: var(--text-dark); }
    .highlight { font-size: 1.1rem; color: #4338ca !important; font-weight: 700 !important; }
    .full-width { grid-column: 1 / -1; }
    .description-box {
        background: var(--bg-surface); padding: 16px; border-radius: 12px;
        margin: 8px 0 0 0; white-space: pre-wrap; color: var(--text-main); line-height: 1.5; border: 1px dashed var(--accent);
    }

    .attachment-section h3 { font-size: 1.1rem; margin-bottom: 16px; color: var(--text-dark); border-bottom: 1px solid var(--accent); padding-bottom: 8px; }
    .attachment-box {
        background: #f8fafc; border-radius: 16px; padding: 16px 24px;
        display: flex; justify-content: space-between; align-items: center;
        border: 1px solid var(--accent);
    }
    .attachment-info { display: flex; align-items: center; gap: 12px; color: var(--text-dark); font-weight: 600; }
    .attachment-actions { display: flex; gap: 12px; }
    
    .btn-preview, .btn-download {
        display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 10px;
        font-weight: 600; cursor: pointer; border: none; font-size: 0.9rem;
    }
    .btn-preview { background: #4338ca; color: white; }
    .btn-download { background: #ffffff; color: #4338ca; border: 1px solid #4338ca; }

    .preview-area { margin-top: 24px; border: 2px solid var(--accent); border-radius: 16px; overflow: hidden; }
    .img-preview { width: 100%; height: auto; display: block; }
    .pdf-preview { width: 100%; height: 600px; border: none; }

    .empty-state { color: var(--text-light); font-style: italic; }

    .modal-footer { padding: 24px 32px; background: var(--bg-surface); display: flex; justify-content: flex-end; }
    .btn-secondary { background: white; border: 1px solid var(--accent); padding: 10px 20px; border-radius: 10px; cursor: pointer; }
    .btn-close { background: none; border: none; cursor: pointer; color: var(--text-light); }
  `]
})
export class BeoDetailModalComponent {
    @Input() request: any;
    @Output() close = new EventEmitter<void>();

    isPreviewing = false;
    isImage = true;
    pdfUrl: any;

    previewAttachment() {
        this.isPreviewing = !this.isPreviewing;
        if (this.isPreviewing && this.request.attachment) {
            this.isImage = this.request.attachment.startsWith('data:image');
            // For PDF we might need to Sanitizer if it's data URI
            this.pdfUrl = this.request.attachment;
        }
    }

    downloadAttachment() {
        if (!this.request.attachment) return;
        const link = document.createElement('a');
        link.href = this.request.attachment;
        link.download = `BEO_${this.request.userName}_${this.request.id}.${this.isImage ? 'png' : 'pdf'}`;
        link.click();
    }
}
