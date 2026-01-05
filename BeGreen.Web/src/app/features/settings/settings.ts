import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { AuthService } from '../../core/services/auth.service';

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
          <div class="table-actions">
            <h2>{{ activeTabLabel }}</h2>
            <button class="btn-primary" (click)="openModal()">
              <span class="material-symbols-outlined">add</span>
              Add {{ activeTabLabelSingular }}
            </button>
          </div>

          <!-- Data Table -->
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th *ngFor="let col of activeColumns">{{ col.label }}</th>
                  <th class="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of data">
                  <td *ngFor="let col of activeColumns">
                    {{ item[col.key] }}
                  </td>
                  <td class="actions-cell">
                    <ng-container *ngIf="!isSystemItem(item)">
                      <button class="btn-icon edit" (click)="openModal(item)">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button class="btn-icon delete" (click)="deleteItem(item)">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </ng-container>
                    <span class="system-badge" *ngIf="isSystemItem(item)">System Role</span>
                  </td>
                </tr>
                <tr *ngIf="data.length === 0">
                  <td [attr.colspan]="activeColumns.length + 1" class="empty-state">
                    No records found
                  </td>
                </tr>
              </tbody>
            </table>
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
                <input type="password" [(ngModel)]="formData.password" name="password" [required]="!editingItem">
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
    }
    .modal-content {
      background: white; border-radius: 24px; width: 100%; max-width: 600px;
      padding: 2rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .modal-header h3 { margin: 0; font-size: 1.5rem; color: var(--primary); }
    .btn-close { background: none; border: none; cursor: pointer; color: var(--text-light); }

    .modal-form { display: flex; flex-direction: column; gap: 1.5rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .form-group:last-child:nth-child(odd) { grid-column: span 2; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-weight: 600; color: var(--text-dark); font-size: 0.9rem; }
    .form-group input, .form-group select {
      padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--accent);
      background: var(--bg-surface); font-size: 1rem; transition: all 0.2s ease;
    }
    .form-group input:focus { outline: none; border-color: var(--primary); background: #ffffff; }

    .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
  `]
})
export class SettingsComponent implements OnInit {
    tabs = [
        { id: 'divisions', label: 'Divisions', icon: 'domain', singular: 'Division' },
        { id: 'departments', label: 'Departments', icon: 'business_center', singular: 'Department' },
        { id: 'roles', label: 'Roles', icon: 'badge', singular: 'Role' },
        { id: 'users', label: 'Users', icon: 'group', singular: 'User' }
    ];
    activeTab = 'divisions';
    data: any[] = [];

    // Lists for dropdowns
    divisions: any[] = [];
    departments: any[] = [];
    roles: any[] = [];

    showModal = false;
    editingItem: any = null;
    formData: any = {};

    columns: { [key: string]: any[] } = {
        divisions: [{ key: 'name', label: 'Name' }],
        departments: [
            { key: 'name', label: 'Department Name' },
            { key: 'division', label: 'Division' }
        ],
        roles: [{ key: 'name', label: 'Role Name' }],
        users: [
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'department', label: 'Dept' }
        ]
    };

    constructor(private settingsService: SettingsService, private authService: AuthService) { }

    ngOnInit() {
        this.preloadDropdowns();
        this.loadData();
    }

    get activeTabLabel() { return this.tabs.find(t => t.id === this.activeTab)?.label; }
    get activeTabLabelSingular() { return this.tabs.find(t => t.id === this.activeTab)?.singular; }
    get activeColumns() { return this.columns[this.activeTab]; }

    preloadDropdowns() {
        this.settingsService.getDivisions().subscribe(res => this.divisions = res);
        this.settingsService.getDepartments().subscribe(res => this.departments = res);
        this.settingsService.getRoles().subscribe(res => this.roles = res);
    }

    loadData() {
        this.data = [];
        switch (this.activeTab) {
            case 'divisions': this.settingsService.getDivisions().subscribe(res => this.data = res); break;
            case 'departments': this.settingsService.getDepartments().subscribe(res => this.data = res); break;
            case 'roles': this.settingsService.getRoles().subscribe(res => this.data = res); break;
            case 'users': this.settingsService.getUsers().subscribe(res => this.data = res); break;
        }
    }

    openModal(item: any = null) {
        this.editingItem = item;
        if (item) {
            this.formData = { ...item };
        } else {
            this.formData = { name: '', email: '', login: '', role: 'User', division: '', department: '' };
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
}
