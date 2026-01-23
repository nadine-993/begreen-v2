import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { AuthService } from '../../core/services/auth.service';
import { LicenseService, LicenseStatus } from '../../core/services/license.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <header class="settings-header">
        <div class="header-content">
          <h1>Settings</h1>
          <p>Manage organizational structure and user access</p>
        </div>
      </header>

      <div class="settings-card">
        <nav class="settings-tabs">
          <button 
            *ngFor="let tab of tabs" 
            [class.active]="activeTab === tab.id"
            (click)="activeTab = tab.id; loadData()">
            <span class="material-symbols-outlined">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </nav>

        <div class="tab-content">
          <!-- Header with Add Button -->
          <div class="table-actions" *ngIf="activeTab !== 'license'">
            <h2>{{ activeTabLabel }}</h2>
            <button class="btn-primary" (click)="openModal()">
              <span class="material-symbols-outlined">add</span>
              Add {{ activeTabLabelSingular }}
            </button>
          </div>

          <!-- License Management Section -->
          <div class="license-management" *ngIf="activeTab === 'license'">
            <div class="license-status-card" [class.expired]="licenseStatus?.daysRemaining === 0">
              <div class="status-header">
                <span class="material-symbols-outlined">{{ licenseStatus?.isLicensed ? 'verified' : 'warning' }}</span>
                <h3>System License: {{ licenseStatus?.isLicensed ? 'Active' : 'Missing/Expired' }}</h3>
              </div>
              
              <div class="license-details" *ngIf="licenseStatus">
                <div class="detail-item">
                  <label>Issued To:</label>
                  <span>{{ licenseStatus.issuedTo || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <label>Expiry Date:</label>
                  <span>{{ licenseStatus.expiryDate | date:'mediumDate' }}</span>
                </div>
                <div class="detail-item">
                  <label>Days Remaining:</label>
                  <span class="days-count" [class.low]="licenseStatus.isNearExpiry">{{ licenseStatus.daysRemaining }} Days</span>
                </div>
              </div>

              <div class="activation-form" *ngIf="isAdmin()">
                <h4>Activate New License</h4>
                <p>Enter your 16-character license key below to renew your subscription.</p>
                <div class="input-group">
                  <input type="text" [(ngModel)]="newLicenseKey" name="newLicenseKey" placeholder="XXXX-YYYY-ZZZZ-WWWW">
                  <button class="btn-primary" (click)="activateLicense()" [disabled]="!newLicenseKey">
                    Activate
                  </button>
                </div>
                <p class="success-msg" *ngIf="activationMsg">{{ activationMsg }}</p>
                <p class="error-msg" *ngIf="activationError">{{ activationError }}</p>
              </div>
            </div>
          </div>

          <!-- Data Table -->
          <div class="table-container" *ngIf="activeTab !== 'license'">
            <table class="data-table">
              <thead>
                <tr>
                  <th *ngFor="let col of activeColumns">
                    <div class="header-cell">
                      <span class="header-label">{{ col.label }}</span>
                      <div class="filter-input-wrapper">
                        <input 
                          type="text" 
                          [placeholder]="'Filter ' + col.label + '...'" 
                          [(ngModel)]="filters[col.key]" 
                          (input)="onFilterChange()"
                          class="filter-input">
                      </div>
                    </div>
                  </th>
                  <th class="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="isLoading">
                  <td [attr.colspan]="activeColumns.length + 1" class="loading-state">
                    <div class="loading-spinner"></div>
                    Loading data...
                  </td>
                </tr>
                <ng-container *ngIf="!isLoading">
                  <tr *ngFor="let item of paginatedData; trackBy: trackByItem">
                    <td *ngFor="let col of activeColumns">
                      <ng-container *ngIf="col.key !== 'isDisabled'">
                        {{ item[col.key] }}
                      </ng-container>
                      <ng-container *ngIf="col.key === 'isDisabled'">
                        <span class="status-badge" [class.disabled]="item.isDisabled">
                          {{ item.isDisabled ? 'Disabled' : 'Active' }}
                        </span>
                      </ng-container>
                    </td>
                    <td class="actions-cell">
                      <div class="menu-container" *ngIf="!isSystemItem(item)">
                        <button class="btn-icon-menu" (click)="toggleMenu($event, item.id)" title="Actions">
                          <span class="material-symbols-outlined">more_vert</span>
                        </button>
                        
                        <div class="dropdown-menu" *ngIf="activeMenuId === item.id">
                          <button class="menu-item" (click)="openModal(item)">
                            <span class="material-symbols-outlined">edit</span>
                            Edit
                          </button>
                          
                          <button class="menu-item" *ngIf="activeTab === 'users'" (click)="resetPassword(item)">
                            <span class="material-symbols-outlined">lock_reset</span>
                            Reset Password
                          </button>
                          
                          <button class="menu-item" *ngIf="activeTab === 'users'" (click)="toggleStatus(item)">
                            <span class="material-symbols-outlined">
                              {{ item.isDisabled ? 'person_check' : 'person_off' }}
                            </span>
                            {{ item.isDisabled ? 'Enable' : 'Disable' }}
                          </button>
                          
                          <div class="menu-divider"></div>
                          
                          <button class="menu-item delete" (click)="deleteItem(item)">
                            <span class="material-symbols-outlined">delete</span>
                            Delete
                          </button>
                        </div>
                      </div>
                      <span class="system-badge" *ngIf="isSystemItem(item)">System Role</span>
                    </td>
                  </tr>
                </ng-container>
                <tr *ngIf="!isLoading && paginatedData.length === 0">
                  <td [attr.colspan]="activeColumns.length + 1" class="empty-state">
                    No records match your filters
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Pagination Footer -->
            <div class="pagination-footer" *ngIf="!isLoading && filteredData.length > 0">
              <div class="pagination-info">
                Showing <strong>{{ rangeStart }}</strong> to <strong>{{ rangeEnd }}</strong> of <strong>{{ filteredData.length }}</strong>
              </div>
              
              <div class="pagination-controls">
                <button class="page-btn" [disabled]="currentPage === 1" (click)="setPage(1)">
                  <span class="material-symbols-outlined">first_page</span>
                </button>
                <button class="page-btn" [disabled]="currentPage === 1" (click)="setPage(currentPage - 1)">
                  <span class="material-symbols-outlined">chevron_left</span>
                </button>
                
                <div class="page-numbers">
                  <button 
                    *ngFor="let p of visiblePages" 
                    class="page-num" 
                    [class.active]="p === currentPage"
                    (click)="setPage(p)">
                    {{ p }}
                  </button>
                </div>

                <button class="page-btn" [disabled]="currentPage === totalPages" (click)="setPage(currentPage + 1)">
                  <span class="material-symbols-outlined">chevron_right</span>
                </button>
                <button class="page-btn" [disabled]="currentPage === totalPages" (click)="setPage(totalPages)">
                  <span class="material-symbols-outlined">last_page</span>
                </button>
              </div>

              <div class="pager-size">
                <select [(ngModel)]="pageSize" (change)="onPageSizeChange()">
                  <option [value]="5">5 / page</option>
                  <option [value]="10">10 / page</option>
                  <option [value]="25">25 / page</option>
                  <option [value]="50">50 / page</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal for Create/Edit -->
    <div class="modal-backdrop" *ngIf="showModal" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h3>{{ editingItem ? 'Edit' : 'Create' }} {{ activeTabLabelSingular }}</h3>
          <button class="btn-close" (click)="closeModal()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>
        
        <form class="modal-form" (submit)="saveItem()">
          <div class="form-grid">
            <!-- Common Name Field (for Division, Role, Department name) -->
            <div class="form-group" *ngIf="activeTab !== 'users'">
              <label>Name</label>
              <input type="text" [(ngModel)]="formData.name" name="name" required placeholder="Enter name">
            </div>

            <!-- Department specific: Division dropdown -->
            <div class="form-group" *ngIf="activeTab === 'departments'">
              <label>Division</label>
              <select [(ngModel)]="formData.division" name="division" required>
                <option value="" disabled>Select Division</option>
                <option *ngFor="let div of divisions" [value]="div.name">{{ div.name }}</option>
              </select>
            </div>

            <!-- Department Approvers -->
            <ng-container *ngIf="activeTab === 'departments'">
              <div class="form-group">
                <label>Approver One</label>
                <select [(ngModel)]="formData.approverOne" name="approverOne">
                  <option [value]="null">None</option>
                  <option *ngFor="let user of users" [value]="user.name">{{ user.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Approver Two</label>
                <select [(ngModel)]="formData.approverTwo" name="approverTwo">
                  <option [value]="null">None</option>
                  <option *ngFor="let user of users" [value]="user.name">{{ user.name }}</option>
                </select>
              </div>
            </ng-container>

            <!-- Division Approvers -->
            <ng-container *ngIf="activeTab === 'divisions'">
              <div class="form-group">
                <label>Head of Division Approver One</label>
                <select [(ngModel)]="formData.headOfDivisionApproverOne" name="hodApproverOne">
                  <option [value]="null">None</option>
                  <option *ngFor="let user of users" [value]="user.name">{{ user.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Head of Division Approver Two</label>
                <select [(ngModel)]="formData.headOfDivisionApproverTwo" name="hodApproverTwo">
                  <option [value]="null">None</option>
                  <option *ngFor="let user of users" [value]="user.name">{{ user.name }}</option>
                </select>
              </div>
            </ng-container>

            <!-- User specific fields -->
            <ng-container *ngIf="activeTab === 'users'">
              <div class="form-group">
                <label>Full Name</label>
                <input type="text" [(ngModel)]="formData.name" name="name" required placeholder="Full Name">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" [(ngModel)]="formData.email" name="email" required placeholder="email@example.com">
              </div>
              <div class="form-group">
                <label>Login ID</label>
                <input type="text" [(ngModel)]="formData.login" name="login" required placeholder="username">
              </div>
              <div class="form-group">
                <label>Password {{ editingItem ? '(Leave blank to keep current)' : '' }}</label>
                <input 
                  type="password" 
                  [(ngModel)]="formData.password" 
                  name="password" 
                  [required]="!editingItem"
                  [disabled]="!editingItem"
                  [placeholder]="!editingItem ? 'Set by user' : '••••••••'">
              </div>
              <div class="form-group">
                <label>Role</label>
                <select [(ngModel)]="formData.role" name="role" required>
                  <option *ngFor="let r of roles" [value]="r.name" [disabled]="r.name.toLowerCase() === 'admin' && !isAdmin()">
                    {{ r.name }} {{ r.name.toLowerCase() === 'admin' && !isAdmin() ? '(Admin only)' : '' }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Division</label>
                <select [(ngModel)]="formData.division" name="division">
                  <option *ngFor="let div of divisions" [value]="div.name">{{ div.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Department</label>
                <select [(ngModel)]="formData.department" name="department">
                  <option *ngFor="let d of departments" [value]="d.name">{{ d.name }}</option>
                </select>
              </div>

              <!-- Signature Upload for Specific Roles -->
              <div class="form-group full-width" *ngIf="requiresSignature(formData.role)">
                <label>Digital Signature</label>
                <div class="signature-upload-wrapper">
                  <div class="signature-preview" *ngIf="formData.signature">
                    <img [src]="formData.signature" alt="Signature Preview">
                    <button type="button" class="btn-remove-signature" (click)="formData.signature = null">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                  <div class="upload-placeholder" *ngIf="!formData.signature">
                    <span class="material-symbols-outlined">draw</span>
                    <p>Click to upload signature image</p>
                    <input type="file" (change)="onFileSelected($event)" accept="image/*">
                  </div>
                </div>
              </div>
            </ng-container>
          </div>

          <footer class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary">Save changes</button>
          </footer>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .settings-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .settings-header { margin-bottom: 2rem; }
    .settings-header h1 { font-size: 2rem; font-weight: 800; color: var(--primary); margin: 0; }
    .settings-header p { color: var(--text-light); margin-top: 0.5rem; }

    .settings-card {
      background: #ffffff; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.05);
      border: 1px solid var(--accent); overflow: hidden;
    }

    .settings-tabs {
      display: flex; background: var(--bg-surface); border-bottom: 1px solid var(--accent);
      padding: 0 1rem;
    }
    .settings-tabs button {
      padding: 1.25rem 1.5rem; border: none; background: none; color: var(--text-light);
      font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;
      border-bottom: 3px solid transparent; transition: all 0.2s ease;
    }
    .settings-tabs button:hover { color: var(--primary); }
    .settings-tabs button.active { color: var(--primary); border-bottom-color: var(--primary); background: #ffffff; }

    .tab-content { padding: 2rem; }
    .table-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .table-actions h2 { font-size: 1.25rem; font-weight: 700; color: var(--text-dark); margin: 0; }

    .btn-primary {
      background: var(--primary); color: white; border: none; padding: 0.75rem 1.5rem;
      border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
      transition: all 0.2s ease;
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-primary:disabled { background: var(--text-light); cursor: not-allowed; }

    .btn-secondary {
      background: var(--bg-surface); color: var(--text-dark); border: 1px solid var(--accent);
      padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600; cursor: pointer;
    }

    .table-container { border: 1px solid var(--accent); border-radius: 16px; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { padding: 1rem 1.5rem; background: var(--bg-surface); font-weight: 600; color: var(--text-light); border-bottom: 1px solid var(--accent); }
    .data-table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--accent); color: var(--text-dark); }
    .empty-state { text-align: center; padding: 3rem !important; color: var(--text-light); }

    .actions-col { width: 120px; text-align: right; }
    .actions-cell { display: flex; gap: 0.5rem; justify-content: flex-end; }
    
    /* License Management Styles */
    .license-management { max-width: 600px; }
    .license-status-card { 
      background: #f8fafc; border: 1px solid var(--accent); border-radius: 20px; padding: 2rem;
      display: flex; flex-direction: column; gap: 1.5rem;
    }
    .license-status-card.expired { background: #fff1f2; border-color: #fecdd3; }
    .status-header { display: flex; align-items: center; gap: 1rem; }
    .status-header .material-symbols-outlined { font-size: 2.5rem; color: #10b981; }
    .license-status-card.expired .status-header .material-symbols-outlined { color: #ef4444; }
    .status-header h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-dark); }

    .license-details { display: flex; flex-direction: column; gap: 1rem; border-top: 1px solid var(--accent); border-bottom: 1px solid var(--accent); padding: 1.5rem 0; }
    .detail-item { display: flex; justify-content: space-between; font-weight: 600; }
    .detail-item label { color: var(--text-light); }
    .detail-item span { color: var(--text-dark); }
    .days-count.low { color: #f59e0b; }
    .license-status-card.expired .days-count { color: #ef4444; }

    .activation-form { display: flex; flex-direction: column; gap: 1rem; }
    .activation-form h4 { margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-dark); }
    .activation-form p { margin: 0; font-size: 0.9rem; color: var(--text-light); }
    .input-group { display: flex; gap: 1rem; }
    .input-group input { flex: 1; padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--accent); background: white; font-family: monospace; }
    .success-msg { color: #10b981; font-weight: 600; margin-top: 0.5rem; }
    .error-msg { color: #ef4444; font-weight: 600; margin-top: 0.5rem; }
    .btn-icon {
      width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
    }
    .btn-icon.edit { background: var(--primary-light); color: var(--primary); }
    .btn-icon.delete { background: #fee2e2; color: #ef4444; }
    .btn-icon:hover { transform: scale(1.1); }

    .system-badge {
      font-size: 0.75rem; font-weight: 700; color: var(--text-light);
      background: var(--bg-surface); padding: 4px 12px; border-radius: 20px;
      border: 1px solid var(--accent); text-transform: uppercase; letter-spacing: 0.5px;
    }

    /* Modal Styles */
    .modal-backdrop {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      padding: 20px;
    }
    .modal-content {
      background: white; border-radius: 24px; width: 100%; max-width: 600px;
      max-height: 90vh; display: flex; flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      overflow: hidden;
    }
    .modal-header { 
      display: flex; justify-content: space-between; align-items: center; 
      padding: 1.5rem 2rem; border-bottom: 1px solid var(--accent);
      background: white; flex-shrink: 0;
    }
    .modal-header h3 { margin: 0; font-size: 1.5rem; color: var(--primary); }
    .btn-close { background: none; border: none; cursor: pointer; color: var(--text-light); }

    .modal-form { 
      display: flex; flex-direction: column; 
      flex: 1; overflow: hidden; 
    }
    .form-grid { 
      display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; 
      padding: 2rem; overflow-y: auto; flex: 1;
    }
    .form-group:last-child:nth-child(odd) { grid-column: span 2; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-weight: 600; color: var(--text-dark); font-size: 0.9rem; }
    .form-group input, .form-group select {
      padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--accent);
      background: var(--bg-surface); font-size: 1rem; transition: all 0.2s ease;
    }
    .form-group input:focus { outline: none; border-color: var(--primary); background: #ffffff; }
    .form-group.full-width { grid-column: span 2; }

    /* Signature Upload Styles */
    .signature-upload-wrapper {
      border: 2px dashed var(--accent); border-radius: 16px; padding: 1.5rem;
      text-align: center; position: relative; min-height: 120px;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg-surface); transition: all 0.2s ease;
    }
    .signature-upload-wrapper:hover { border-color: var(--primary); background: #f0fdf9; }
    
    .upload-placeholder { cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: var(--text-light); }
    .upload-placeholder input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .upload-placeholder .material-symbols-outlined { font-size: 2.5rem; }

    .signature-preview { position: relative; width: 100%; max-height: 150px; display: flex; justify-content: center; }
    .signature-preview img { max-width: 100%; max-height: 110px; object-fit: contain; }
    
    .btn-remove-signature {
      position: absolute; top: -10px; right: -10px; background: #ef4444; color: white;
      border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
    .btn-remove-signature .material-symbols-outlined { font-size: 1.25rem; }

    .modal-footer { 
      display: flex; justify-content: flex-end; gap: 1rem; 
      padding: 1.25rem 2rem; border-top: 1px solid var(--accent);
      background: white; flex-shrink: 0;
    }
    .loading-state { text-align: center; padding: 3rem !important; color: var(--text-light); }
    .loading-spinner {
      width: 24px; height: 24px; border: 3px solid var(--accent);
      border-top-color: var(--primary); border-radius: 50%;
      margin: 0 auto 1rem; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* New Styles for Header Filtering & Pagination */
    th { padding: 12px 16px !important; }
    .header-cell { display: flex; flex-direction: column; gap: 6px; }
    .header-label { font-size: 0.7rem; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; }
    .filter-input { 
      width: 100%; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--accent); 
      background: white; font-size: 0.75rem; color: var(--text-dark); 
    }
    .filter-input:focus { outline: none; border-color: var(--primary); }

    .pagination-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 24px; background: #f8fafc; border-top: 1px solid var(--accent);
      font-size: 0.85rem; color: var(--text-light);
    }
    .pagination-controls { display: flex; align-items: center; gap: 6px; }
    .page-numbers { display: flex; gap: 4px; }
    .page-btn, .page-num {
      background: white; border: 1px solid var(--accent);
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--text-dark); font-weight: 600;
      transition: all 0.2s;
    }
    .page-btn .material-symbols-outlined { font-size: 18px; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-btn:hover:not(:disabled), .page-num:hover { border-color: var(--primary); color: var(--primary); }
    .page-num.active { background: var(--primary); color: white; border-color: var(--primary); }
    .pager-size select { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--accent); background: white; cursor: pointer; }

    .status-badge {
      padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;
      background: #dcfce7; color: #166534;
    }
    .status-badge.disabled { background: #fee2e2; color: #991b1b; }
    
    /* Dropdown Menu Styles */
    .menu-container { position: relative; display: flex; justify-content: flex-end; }
    .btn-icon-menu {
      width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--accent);
      background: white; color: var(--text-light); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .btn-icon-menu:hover { background: var(--bg-surface); color: var(--primary); border-color: var(--primary); }
    
    .dropdown-menu {
      position: absolute; top: 100%; right: 0; margin-top: 8px;
      background: white; border-radius: 12px; min-width: 180px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.1);
      border: 1px solid var(--accent); z-index: 100; overflow: hidden;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

    .menu-item {
      width: 100%; padding: 10px 16px; border: none; background: none;
      display: flex; align-items: center; gap: 12px; color: var(--text-dark);
      font-size: 0.9rem; font-weight: 500; cursor: pointer; text-align: left;
      transition: all 0.2s;
    }
    .menu-item:hover { background: var(--bg-surface); color: var(--primary); }
    .menu-item .material-symbols-outlined { font-size: 20px; color: var(--text-light); transition: color 0.2s; }
    .menu-item:hover .material-symbols-outlined { color: var(--primary); }
    
    .menu-item.delete { color: #ef4444; }
    .menu-item.delete:hover { background: #fee2e2; }
    .menu-item.delete .material-symbols-outlined { color: #ef4444; }
    
    .menu-divider { height: 1px; background: var(--accent); margin: 4px 0; }
  `]
})
export class SettingsComponent implements OnInit {
  tabs = [
    { id: 'divisions', label: 'Divisions', icon: 'domain', singular: 'Division' },
    { id: 'departments', label: 'Departments', icon: 'business_center', singular: 'Department' },
    { id: 'roles', label: 'Roles', icon: 'badge', singular: 'Role' },
    { id: 'users', label: 'Users', icon: 'group', singular: 'User' },
    { id: 'license', label: 'License', icon: 'key', singular: 'License' }
  ];
  activeTab = 'divisions';
  data: any[] = [];
  isLoading = false;
  activeMenuId: string | null = null;

  // Filtering & Pagination
  filteredData: any[] = [];
  paginatedData: any[] = [];
  filters: { [key: string]: string } = {};
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Lists for dropdowns
  divisions: any[] = [];
  departments: any[] = [];
  roles: any[] = [];
  users: any[] = [];

  showModal = false;
  editingItem: any = null;
  formData: any = {};

  // Licensing
  licenseStatus: LicenseStatus | null = null;
  newLicenseKey: string = '';
  activationMsg: string = '';
  activationError: string = '';

  columns: { [key: string]: any[] } = {
    divisions: [
      { key: 'name', label: 'Name' },
      { key: 'headOfDivisionApproverOne', label: 'HOD Approver 1' },
      { key: 'headOfDivisionApproverTwo', label: 'HOD Approver 2' }
    ],
    departments: [
      { key: 'name', label: 'Department Name' },
      { key: 'division', label: 'Division' },
      { key: 'approverOne', label: 'Approver 1' },
      { key: 'approverTwo', label: 'Approver 2' }
    ],
    roles: [{ key: 'name', label: 'Role Name' }],
    users: [
      { key: 'name', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Dept' },
      { key: 'isDisabled', label: 'Status' }
    ]
  };

  constructor(private settingsService: SettingsService,
    private authService: AuthService,
    private licenseService: LicenseService,
    private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.preloadDropdowns();
    this.loadData();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.activeMenuId) {
      this.activeMenuId = null;
      this.cdr.detectChanges();
    }
  }

  toggleMenu(event: MouseEvent, id: string) {
    event.stopPropagation();
    if (this.activeMenuId === id) {
      this.activeMenuId = null;
    } else {
      this.activeMenuId = id;
    }
    this.cdr.detectChanges();
  }

  get activeTabLabel() { return this.tabs.find(t => t.id === this.activeTab)?.label; }
  get activeTabLabelSingular() { return this.tabs.find(t => t.id === this.activeTab)?.singular; }
  get activeColumns() { return this.columns[this.activeTab]; }

  preloadDropdowns() {
    this.settingsService.getDivisions().subscribe(res => this.divisions = res);
    this.settingsService.getDepartments().subscribe(res => this.departments = res);
    this.settingsService.getRoles().subscribe(res => this.roles = res);
    this.settingsService.getUsers().subscribe(res => this.users = res);
  }

  loadData() {
    this.isLoading = true;
    this.data = [];
    const onDone = (res: any[]) => {
      this.data = res;
      this.isLoading = false;
      this.onFilterChange(); // Initial filter and pagination
      this.cdr.detectChanges();
    };
    const onError = (err: any) => {
      console.error('Error loading data', err);
      this.isLoading = false;
    };

    switch (this.activeTab) {
      case 'divisions': this.settingsService.getDivisions().subscribe({ next: onDone, error: onError }); break;
      case 'departments': this.settingsService.getDepartments().subscribe({ next: onDone, error: onError }); break;
      case 'roles': this.settingsService.getRoles().subscribe({ next: onDone, error: onError }); break;
      case 'users': this.settingsService.getUsers().subscribe({ next: onDone, error: onError }); break;
      case 'license': this.loadLicenseStatus(); break;
    }
  }

  loadLicenseStatus() {
    this.isLoading = true;
    this.licenseService.getStatus().subscribe({
      next: (res) => {
        this.licenseStatus = res;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading license status', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  activateLicense() {
    this.activationMsg = '';
    this.activationError = '';
    this.licenseService.activate(this.newLicenseKey).subscribe({
      next: (res) => {
        this.activationMsg = res.message;
        this.newLicenseKey = '';
        this.loadLicenseStatus();
      },
      error: (err) => {
        this.activationError = err.error?.message || 'Activation failed. Check key format.';
      }
    });
  }

  openModal(item: any = null) {
    this.editingItem = item;
    if (item) {
      this.formData = { ...item };
    } else {
      this.formData = { name: '', email: '', login: '', role: 'User', division: '', department: '', signature: null };
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingItem = null;
    this.formData = {};
  }

  saveItem() {
    const obs = this.editingItem
      ? this.updateAction(this.editingItem.id, this.formData)
      : this.createAction(this.formData);

    obs.subscribe(() => {
      this.loadData();
      if (['divisions', 'departments', 'roles'].includes(this.activeTab)) {
        this.preloadDropdowns();
      }
      this.closeModal();
    });
  }

  private createAction(data: any) {
    switch (this.activeTab) {
      case 'divisions': return this.settingsService.createDivision(data);
      case 'departments': return this.settingsService.createDepartment(data);
      case 'roles': return this.settingsService.createRole(data);
      case 'users': return this.settingsService.createUser(data);
      default: throw new Error('Invalid tab');
    }
  }

  toggleStatus(item: any) {
    if (item.role?.toLowerCase() === 'admin') {
      alert('Admin users cannot be disabled.');
      return;
    }
    this.settingsService.toggleUserStatus(item.id).subscribe({
      next: (res) => {
        item.isDisabled = res.isDisabled;
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert(err.error || 'Failed to toggle status');
      }
    });
  }

  resetPassword(item: any) {
    if (!confirm(`Are you sure you want to trigger a password reset for ${item.name}? An email will be sent to ${item.email}.`)) return;

    this.settingsService.resetUserPassword(item.id).subscribe({
      next: () => {
        alert(`Password reset email for ${item.name} has been sent successfully.`);
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to trigger password reset');
      }
    });
  }

  private updateAction(id: string, data: any) {
    switch (this.activeTab) {
      case 'divisions': return this.settingsService.updateDivision(id, data);
      case 'departments': return this.settingsService.updateDepartment(id, data);
      case 'roles': return this.settingsService.updateRole(id, data);
      case 'users': return this.settingsService.updateUser(id, data);
      default: throw new Error('Invalid tab');
    }
  }

  deleteItem(item: any) {
    if (this.isSystemItem(item)) return;
    if (!confirm(`Are you sure you want to delete this ${this.activeTabLabelSingular}?`)) return;

    let obs;
    switch (this.activeTab) {
      case 'divisions': obs = this.settingsService.deleteDivision(item.id); break;
      case 'departments': obs = this.settingsService.deleteDepartment(item.id); break;
      case 'roles': obs = this.settingsService.deleteRole(item.id); break;
      case 'users': obs = this.settingsService.deleteUser(item.id); break;
      default: throw new Error('Invalid tab');
    }

    obs.subscribe(() => this.loadData());
  }

  isSystemItem(item: any) {
    if (this.activeTab === 'roles' && item.name?.toLowerCase() === 'admin') return true;
    if (this.activeTab === 'users' && item.role?.toLowerCase() === 'admin') return true;
    return false;
  }

  isAdmin() {
    return this.authService.currentUser()?.role.toLowerCase() === 'admin';
  }

  requiresSignature(role: string): boolean {
    if (!role) return false;
    const signatureRoles = ['head of department', 'head of division', 'general cashier'];
    return signatureRoles.includes(role.toLowerCase());
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.formData.signature = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  trackByItem(index: number, item: any) {
    return item.id || index;
  }

  // Filtering Logic
  onFilterChange() {
    this.filteredData = this.data.filter(item => {
      return (this.activeColumns || []).every(col => {
        const val = String(item[col.key] || '').toLowerCase();
        const filter = String(this.filters[col.key] || '').toLowerCase();
        return val.includes(filter);
      });
    });
    this.currentPage = 1;
    this.updatePagination();
  }

  // Pagination Logic
  updatePagination() {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedData = this.filteredData.slice(start, start + this.pageSize);
  }

  setPage(p: number) {
    this.currentPage = p;
    this.updatePagination();
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  get rangeStart() { return (this.currentPage - 1) * this.pageSize + 1; }
  get rangeEnd() { return Math.min(this.currentPage * this.pageSize, this.filteredData.length); }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
}
