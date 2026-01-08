import { Component, EventEmitter, Input, OnInit, Output, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PettyCashService } from '../../core/services/petty-cash.service';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { GlCodeService, GlCode } from '../../core/services/gl-code.service';

@Component({
  selector: 'app-petty-cash-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>New Petty Cash Request</h2>
            <p>Fill in the details for your disbursement request</p>
          </div>
          <button class="btn-close" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <form (submit)="submitRequest()" class="petty-cash-form">
          <div class="form-scroll-area">
            <div class="items-list">
              <div *ngFor="let item of items; let i = index" class="item-card">
                <div class="item-header">
                  <h3>Item #{{ i + 1 }}</h3>
                  <button type="button" class="btn-remove" *ngIf="items.length > 1" (click)="removeItem(i)">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>

                <div class="item-grid">
                  <div class="form-group">
                    <label>GL Code</label>
                    <div class="gl-select-container">
                      <input 
                        type="text" 
                        [(ngModel)]="item.glSearchTerm" 
                        (input)="filterGlCodes(i)"
                        (focus)="onGlFocus(i)"
                        [name]="'glSearch-' + i"
                        placeholder="Select or search GL Code..."
                        autocomplete="off">
                      <div class="gl-dropdown" *ngIf="item.showGlDropdown">
                        <ng-container *ngIf="item.filteredCodes?.length; else noResults">
                          <div 
                            *ngFor="let code of item.filteredCodes" 
                            class="gl-option"
                            (click)="selectGlCode(i, code)">
                            <strong>{{ code.code }}</strong> - {{ code.name }}
                          </div>
                        </ng-container>
                        <ng-template #noResults>
                          <div class="gl-no-results">No matching GL codes found</div>
                        </ng-template>
                      </div>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Requestor</label>
                    <select [(ngModel)]="item.requestor" name="requestor-{{i}}" required>
                      <option value="" disabled>Select Staff</option>
                      <option *ngFor="let u of deptUsers" [value]="u.name">{{ u.name }}</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Currency</label>
                    <select [(ngModel)]="item.currency" name="currency-{{i}}" required>
                      <option value="SYP">SYP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Amount</label>
                    <input type="number" [(ngModel)]="item.amount" name="amount-{{i}}" placeholder="0.00" required>
                  </div>

                  <div class="form-group full-width">
                    <label>Description</label>
                    <textarea [(ngModel)]="item.description" name="description-{{i}}" rows="2" placeholder="Describe the reason for this item..." required></textarea>
                  </div>
                </div>
              </div>
            </div>

            <button type="button" class="btn-add-item" (click)="addItem()">
              <span class="material-symbols-outlined">add_circle</span>
              Add Another Item
            </button>
          </div>

          <footer class="modal-footer">
            <div class="total-summary">
              <span class="label">Total Amount:</span>
              <span class="value">{{ calculateTotal() | number:'1.2-2' }} SYP</span>
            </div>
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
      background: #ffffff; border-radius: 32px; width: 90%; max-width: 800px;
      max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 50px 100px -20px rgba(0,0,0,0.25);
    }
    .modal-header {
      padding: 32px; border-bottom: 1px solid var(--accent);
      display: flex; justify-content: space-between; align-items: center;
    }
    .header-text h2 { margin: 0; color: var(--primary); font-size: 1.75rem; font-weight: 800; }
    .header-text p { margin: 4px 0 0 0; color: var(--text-light); }
    .btn-close { background: var(--bg-surface); border: none; padding: 8px; border-radius: 12px; cursor: pointer; color: var(--text-light); transition: all 0.2s; }
    .btn-close:hover { background: #fee2e2; color: #ef4444; }

    .petty-cash-form { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .form-scroll-area { padding: 32px; overflow-y: auto; flex: 1; }
    
    .items-list { display: flex; flex-direction: column; gap: 24px; margin-bottom: 24px; }
    .item-card {
      background: var(--bg-surface); padding: 24px; border-radius: 20px;
      border: 1px solid var(--accent); position: relative;
    }
    .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .item-header h3 { margin: 0; font-size: 1.1rem; color: var(--text-dark); }
    
    .item-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .full-width { grid-column: span 2; }
    
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-weight: 600; color: var(--text-dark); font-size: 0.9rem; }
    .form-group input, .form-group select, .form-group textarea {
      padding: 12px 16px; border-radius: 12px; border: 1px solid var(--accent);
      background: #ffffff; font-size: 1rem; transition: all 0.2s;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0, 109, 78, 0.1);
    }

    .btn-remove { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; border-radius: 8px; transition: all 0.2s; }
    .btn-remove:hover { background: #fee2e2; }

    .btn-add-item {
      width: 100%; padding: 16px; background: none; border: 2px dashed var(--accent);
      border-radius: 16px; color: var(--primary); font-weight: 600; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;
    }
    .btn-add-item:hover { background: var(--bg-surface); border-color: var(--primary); }

    .gl-select-container { position: relative; }
    .gl-dropdown {
      position: absolute; top: 100%; left: 0; right: 0;
      background: white; border: 1px solid var(--accent); border-radius: 12px;
      margin-top: 4px; max-height: 250px; overflow-y: auto; z-index: 100;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
    }
    .gl-option {
      padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f1f5f9;
      font-size: 0.9rem; transition: all 0.2s;
    }
    .gl-option:hover { background: #f8fafc; color: var(--primary); }
    .gl-option:last-child { border-bottom: none; }
    .gl-option strong { color: var(--primary); }
    .gl-no-results { padding: 16px; text-align: center; color: var(--text-light); font-style: italic; }

    .modal-footer {
      padding: 32px; border-top: 1px solid var(--accent); background: var(--bg-surface);
      display: flex; justify-content: space-between; align-items: center;
    }
    .total-summary .label { color: var(--text-light); font-weight: 600; margin-right: 12px; }
    .total-summary .value { font-size: 1.5rem; font-weight: 800; color: var(--primary); }
    
    .actions { display: flex; gap: 16px; }
    .btn-secondary { background: #ffffff; color: var(--text-dark); border: 1px solid var(--accent); padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn-primary { background: var(--primary); color: white; border: none; padding: 12px 32px; border-radius: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 109, 78, 0.2); }
    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
  `]
})
export class PettyCashModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private pettyCashService = inject(PettyCashService);
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private glCodeService = inject(GlCodeService);

  allGlCodes: GlCode[] = [];

  items: any[] = [{
    glCode: '',
    glSearchTerm: '',
    filteredCodes: [] as GlCode[],
    showGlDropdown: false,
    requestor: '',
    currency: 'SYP',
    amount: null,
    description: '',
    date: new Date()
  }];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.gl-select-container')) {
      this.items.forEach(item => item.showGlDropdown = false);
    }
  }

  deptUsers: any[] = [];
  isSubmitting = false;

  ngOnInit() {
    this.loadDeptUsers();
    this.loadGlCodes();
  }

  loadGlCodes() {
    this.glCodeService.getGlCodes().subscribe(codes => {
      this.allGlCodes = codes;
      // Initialize results for existing items
      this.items.forEach(item => {
        item.filteredCodes = [...this.allGlCodes];
      });
    });
  }

  loadDeptUsers() {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.settingsService.getUsers().subscribe(users => {
      this.deptUsers = users.filter((u: any) => u.department === currentUser.department);
      // Pre-select current user as default requestor for the first item
      if (this.items[0]) {
        this.items[0].requestor = currentUser.name;
      }
    });
  }

  addItem() {
    const currentUser = this.authService.currentUser();
    this.items.push({
      glCode: '',
      glSearchTerm: '',
      filteredCodes: [...this.allGlCodes],
      showGlDropdown: false,
      requestor: currentUser ? currentUser.name : '',
      currency: 'SYP',
      amount: null,
      description: '',
      date: new Date()
    });
  }

  onGlFocus(index: number) {
    // Hide all other dropdowns
    this.items.forEach((item, i) => {
      item.showGlDropdown = (i === index);
    });

    const item = this.items[index];
    if (!item.glSearchTerm) {
      item.filteredCodes = [...this.allGlCodes];
    }
    item.showGlDropdown = true;
  }

  filterGlCodes(index: number) {
    const item = this.items[index];
    item.showGlDropdown = true;

    if (!item.glSearchTerm) {
      item.filteredCodes = [...this.allGlCodes];
      return;
    }

    const term = item.glSearchTerm.toLowerCase();
    item.filteredCodes = this.allGlCodes
      .filter(c => c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term));
  }

  selectGlCode(index: number, gl: GlCode) {
    const item = this.items[index];
    item.glCode = gl.code;
    item.glSearchTerm = `${gl.code} - ${gl.name}`;
    item.showGlDropdown = false;
  }

  removeItem(index: number) {
    this.items.splice(index, 1);
  }

  calculateTotal() {
    return this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  submitRequest() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const request = {
      details: this.items.map((item, index) => ({
        ...item,
        itemId: index + 1
      }))
    };

    this.pettyCashService.createRequest(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.success.emit();
        this.close.emit();
      },
      error: (err) => {
        console.error('Error creating petty cash request', err);
        this.isSubmitting = false;
        const msg = err.error?.message || err.error || err.message || 'Unknown error';
        alert(`Failed to submit request: ${msg}`);
      }
    });
  }
}
