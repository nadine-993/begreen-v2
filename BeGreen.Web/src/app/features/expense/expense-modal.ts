import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../../core/services/expense.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-expense-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>New Expense Claim</h2>
            <p>Submit your expense for approval and reimbursement</p>
          </div>
          <button class="btn-close" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <form (submit)="submitRequest()" class="expense-form">
          <div class="form-scroll-area">
             <div class="form-grid">
                <div class="form-group full-width">
                    <label>Description</label>
                    <textarea [(ngModel)]="expense.description" name="description" rows="3" placeholder="Describe the purpose of this expense..." required></textarea>
                </div>

                <div class="form-group">
                    <label>Amount</label>
                    <div class="input-with-icon">
                        <input type="number" [(ngModel)]="expense.amount" name="amount" placeholder="0.00" required>
                    </div>
                </div>

                <div class="form-group">
                    <label>Currency</label>
                    <select [(ngModel)]="expense.currency" name="currency" required>
                        <option value="SYP">SYP</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                    </select>
                </div>

                <div class="form-group full-width">
                    <label>Receipt Attachment (Optional)</label>
                    <div class="file-upload-zone" [class.has-file]="!!expense.attachment">
                        <input type="file" (change)="onFileSelected($event)" accept="image/*,.pdf" id="fileInput">
                        <label for="fileInput" class="upload-label">
                            <span class="material-symbols-outlined">{{ expense.attachment ? 'check_circle' : 'cloud_upload' }}</span>
                            <span class="upload-text">{{ expense.attachment ? 'File attached' : 'Upload Receipt (Image or PDF)' }}</span>
                        </label>
                        <button type="button" class="btn-clear" *ngIf="expense.attachment" (click)="expense.attachment = undefined">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
             </div>
          </div>

          <footer class="modal-footer">
            <div class="actions">
              <button type="button" class="btn-secondary" (click)="close.emit()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="isSubmitting">
                {{ isSubmitting ? 'Submitting...' : 'Submit Claim' }}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  `,
    styles: [`
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #ffffff; border-radius: 32px; width: 90%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.25); }
    .modal-header { padding: 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .header-text h2 { margin: 0; color: #10b981; font-size: 1.75rem; font-weight: 800; }
    .header-text p { margin: 4px 0 0 0; color: #64748b; }
    .btn-close { background: #f8fafc; border: none; padding: 8px; border-radius: 12px; cursor: pointer; color: #64748b; }

    .expense-form { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .form-scroll-area { padding: 32px; overflow-y: auto; flex: 1; }
    
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .full-width { grid-column: span 2; }
    
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-weight: 700; color: #1e293b; font-size: 0.9rem; }
    .form-group input, .form-group select, .form-group textarea { padding: 14px 16px; border-radius: 14px; border: 1px solid #e2e8f0; background: #ffffff; font-size: 1rem; transition: 0.2s; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }

    .file-upload-zone { border: 2px dashed #e2e8f0; border-radius: 16px; padding: 24px; text-align: center; position: relative; transition: 0.2s; }
    .file-upload-zone.has-file { border-color: #10b981; background: #f0fdf4; }
    .file-upload-zone input[type="file"] { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
    .upload-label { cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 12px; color: #64748b; }
    .has-file .upload-label { color: #15803d; }
    .upload-label .material-symbols-outlined { font-size: 40px; }
    .btn-clear { position: absolute; top: 12px; right: 12px; background: #fee2e2; border: none; padding: 8px; border-radius: 10px; color: #ef4444; cursor: pointer; }

    .modal-footer { padding: 32px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
    .actions { display: flex; gap: 16px; justify-content: flex-end; }
    .btn-secondary { background: #ffffff; color: #475569; border: 1px solid #e2e8f0; padding: 12px 28px; border-radius: 14px; font-weight: 700; cursor: pointer; }
    .btn-primary { background: #10b981; color: white; border: none; padding: 12px 36px; border-radius: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3); }
    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
  `]
})
export class ExpenseModalComponent {
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    private expenseService = inject(ExpenseService);
    private authService = inject(AuthService);

    expense: any = {
        description: '',
        amount: null,
        currency: 'SYP',
        attachment: undefined
    };

    isSubmitting = false;

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.expense.attachment = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    submitRequest() {
        if (this.isSubmitting) return;
        this.isSubmitting = true;

        this.expenseService.createRequest(this.expense).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.success.emit();
                this.close.emit();
            },
            error: (err) => {
                this.isSubmitting = false;
                alert('Failed to submit claim.');
            }
        });
    }
}
