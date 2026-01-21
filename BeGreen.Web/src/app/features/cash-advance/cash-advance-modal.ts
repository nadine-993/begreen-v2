import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CashAdvanceService } from '../../core/services/cash-advance.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-cash-advance-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>New Cash Advance Request</h2>
            <p>Request funds for business travel or expenses</p>
          </div>
          <button class="btn-close" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <form (submit)="submitRequest()" class="modal-form">
          <div class="form-content">
            <div class="form-group full-width">
              <label>Description</label>
              <textarea 
                [(ngModel)]="request.description" 
                name="description" 
                rows="3" 
                placeholder="Reason for advance..." 
                required></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Currency</label>
                <select [(ngModel)]="request.currency" name="currency" required>
                  <option value="SYP">SYP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              <div class="form-group">
                <label>Total Amount</label>
                <input 
                  type="number" 
                  [(ngModel)]="request.total" 
                  name="total" 
                  placeholder="0.00" 
                  required>
              </div>
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
    .form-row { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; }
    .full-width { width: 100%; }
    
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-weight: 600; color: var(--text-dark); font-size: 0.9rem; }
    .form-group input, .form-group select, .form-group textarea {
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
export class CashAdvanceModalComponent {
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    private cashAdvanceService = inject(CashAdvanceService);
    private authService = inject(AuthService);

    request = {
        description: '',
        total: 0,
        currency: 'SYP'
    };

    isSubmitting = false;

    submitRequest() {
        if (this.isSubmitting) return;
        this.isSubmitting = true;

        this.cashAdvanceService.createRequest(this.request as any).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.success.emit();
                this.close.emit();
            },
            error: (err) => {
                console.error('Error creating cash advance request', err);
                this.isSubmitting = false;
                alert('Failed to submit request.');
            }
        });
    }
}
