import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItOrderService } from '../../core/services/it-order.service';

@Component({
    selector: 'app-it-order-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>New IT Request</h2>
            <p>Submit a request for hardware, software or support</p>
          </div>
          <button class="btn-close" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <form (submit)="submitRequest()" class="modal-form">
          <div class="form-content">
            <div class="form-group full-width">
              <label>System / Asset Name</label>
              <input 
                type="text" 
                [(ngModel)]="request.systemName" 
                name="systemName" 
                placeholder="e.g. Laptop, Email, Printer, POS..." 
                required>
            </div>

            <div class="form-group full-width">
              <label>Description of Request</label>
              <textarea 
                [(ngModel)]="request.description" 
                name="description" 
                rows="4" 
                placeholder="Details of the issue or requirement..." 
                required></textarea>
            </div>
          </div>

          <footer class="modal-footer">
            <div class="actions">
              <button type="button" class="btn-secondary" (click)="close.emit()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="isSubmitting">
                {{ isSubmitting ? 'Submitting...' : 'Submit Request' }}
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
    .header-text h2 { margin: 0; color: var(--primary); font-size: 1.75rem; font-weight: 800; }
    .btn-close { background: var(--bg-surface); border: none; padding: 8px; border-radius: 12px; cursor: pointer; color: var(--text-light); }
    
    .form-content { padding: 32px; display: flex; flex-direction: column; gap: 24px; }
    .full-width { width: 100%; }
    
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-weight: 600; color: var(--text-dark); font-size: 0.9rem; }
    .form-group input, .form-group textarea {
      padding: 12px 16px; border-radius: 12px; border: 1px solid var(--accent);
      background: #ffffff; font-size: 1rem;
    }
    
    .modal-footer {
      padding: 32px; border-top: 1px solid var(--accent); background: var(--bg-surface);
      display: flex; justify-content: flex-end;
    }
    .actions { display: flex; gap: 16px; }
    .btn-secondary { background: #ffffff; color: var(--text-dark); border: 1px solid var(--accent); padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn-primary { background: var(--primary); color: white; border: none; padding: 12px 32px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.7; }
  `]
})
export class ItOrderModalComponent {
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    private itService = inject(ItOrderService);

    request = {
        systemName: '',
        description: ''
    };

    isSubmitting = false;

    submitRequest() {
        if (this.isSubmitting) return;
        this.isSubmitting = true;

        this.itService.createRequest(this.request as any).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.success.emit();
                this.close.emit();
            },
            error: (err) => {
                console.error('Error creating IT order', err);
                this.isSubmitting = false;
                alert('Failed to submit request.');
            }
        });
    }
}
