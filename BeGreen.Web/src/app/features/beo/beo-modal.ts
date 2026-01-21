import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BeoService } from '../../core/services/beo.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-beo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>New BEO Order</h2>
            <p>Create a new Banquet Event Order</p>
          </div>
          <button class="btn-close" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div *ngIf="!canCreate" class="access-denied">
            <span class="material-symbols-outlined">lock</span>
            <p>Access Restricted: Only members of <strong>Sales, Marketing, Catering, or Social Media</strong> can create BEO orders.</p>
            <button class="btn-secondary" (click)="close.emit()">Close</button>
        </div>

        <form *ngIf="canCreate" (submit)="submitRequest()" class="modal-form">
          <div class="form-content">
            <div class="form-row">
              <div class="form-group">
                <label>Start Date</label>
                <input type="date" [(ngModel)]="request.dateFrom" name="dateFrom" required>
              </div>
              <div class="form-group">
                <label>End Date</label>
                <input type="date" [(ngModel)]="request.dateTo" name="dateTo" required>
              </div>
            </div>

            <div class="form-group full-width">
              <label>Notes / Event Details</label>
              <textarea 
                [(ngModel)]="request.notes" 
                name="notes" 
                rows="4" 
                placeholder="Include event name, location, and key requirements..." 
                required></textarea>
            </div>

            <div class="form-group full-width">
                <label>Attachment (PDF/Image)</label>
                <div class="file-upload">
                    <input type="file" (change)="onFileSelected($event)" accept="image/*,.pdf" id="fileInput">
                    <label for="fileInput" class="file-label">
                        <span class="material-symbols-outlined">cloud_upload</span>
                        {{ fileName || 'Click to select or drag and drop' }}
                    </label>
                </div>
            </div>
          </div>

          <footer class="modal-footer">
            <div class="actions">
              <button type="button" class="btn-secondary" (click)="close.emit()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="isSubmitting">
                {{ isSubmitting ? 'Creating...' : 'Create BEO' }}
              </button>
            </div>
          </footer>
        </form>
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
      background: #ffffff; border-radius: 32px; width: 90%; max-width: 600px;
      display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 50px 100px -20px rgba(0,0,0,0.25);
    }
    .modal-header {
      padding: 32px; border-bottom: 1px solid var(--accent);
      display: flex; justify-content: space-between; align-items: center;
    }
    .header-text h2 { margin: 0; color: #4338ca; font-size: 1.75rem; font-weight: 800; }
    .btn-close { background: var(--bg-surface); border: none; padding: 8px; border-radius: 12px; cursor: pointer; color: var(--text-light); }
    
    .form-content { padding: 32px; display: flex; flex-direction: column; gap: 24px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .full-width { width: 100%; }
    
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-weight: 600; color: var(--text-dark); font-size: 0.9rem; }
    .form-group input, .form-group textarea {
      padding: 12px 16px; border-radius: 12px; border: 1px solid var(--accent);
      background: #ffffff; font-size: 1rem;
    }

    .file-upload { position: relative; }
    .file-upload input { display: none; }
    .file-label {
        display: flex; flex-direction: column; align-items: center; gap: 8px;
        padding: 32px; border: 2px dashed var(--accent); border-radius: 20px;
        cursor: pointer; transition: all 0.2s; color: var(--text-light);
    }
    .file-label:hover { border-color: var(--primary); background: #f8fafc; color: var(--primary); }
    .file-label .material-symbols-outlined { font-size: 32px; }

    .access-denied {
        padding: 64px 32px; display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center;
    }
    .access-denied .material-symbols-outlined { font-size: 64px; color: #f43f5e; }
    .access-denied p { color: var(--text-main); font-size: 1.1rem; }
    
    .modal-footer {
      padding: 32px; border-top: 1px solid var(--accent); background: var(--bg-surface);
      display: flex; justify-content: flex-end;
    }
    .actions { display: flex; gap: 16px; }
    .btn-secondary { background: #ffffff; color: var(--text-dark); border: 1px solid var(--accent); padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn-primary { background: #4338ca; color: white; border: none; padding: 12px 32px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.7; }
  `]
})
export class BeoModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private beoService = inject(BeoService);
  private authService = inject(AuthService);

  request = {
    dateFrom: '',
    dateTo: '',
    notes: '',
    attachment: ''
  };

  fileName = '';
  isSubmitting = false;
  canCreate = false;

  ngOnInit() {
    const user = this.authService.currentUser();
    const dept = user?.department?.toLowerCase() || '';
    const allowedDepts = ['sales', 'marketing', 'catering', 'social media'];
    this.canCreate = allowedDepts.includes(dept);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        this.request.attachment = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  submitRequest() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    this.beoService.createRequest(this.request as any).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.success.emit();
        this.close.emit();
      },
      error: (err) => {
        console.error('Error creating BEO', err);
        this.isSubmitting = false;
        alert('Failed to create BEO.');
      }
    });
  }
}
