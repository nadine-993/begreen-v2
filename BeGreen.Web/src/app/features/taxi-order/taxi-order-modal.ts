import { Component, EventEmitter, Output, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxiOrderService, Passenger } from '../../core/services/taxi-order.service';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-taxi-order-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-text">
            <h2>New Taxi Order</h2>
            <p>Upload Excel or add passengers manually</p>
          </div>
          <button class="btn-close" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div class="modal-body">
            <!-- Manual Add Section -->
            <div class="manual-form">
                <div class="input-grid">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" [(ngModel)]="newP.fullName" placeholder="Name">
                    </div>
                    <div class="form-group">
                        <label>Dept</label>
                        <input type="text" [(ngModel)]="newP.department" placeholder="Dept">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="text" [(ngModel)]="newP.phoneNumber" placeholder="Phone">
                    </div>
                    <div class="form-group">
                        <label>Time</label>
                        <input type="text" [(ngModel)]="newP.pickupTime" placeholder="09:00">
                    </div>
                    <div class="form-group">
                        <label>Pick Up From</label>
                        <input type="text" [(ngModel)]="newP.pickUpFrom" placeholder="Location">
                    </div>
                    <div class="form-group">
                        <label>Destination</label>
                        <input type="text" [(ngModel)]="newP.destination" placeholder="To">
                    </div>
                </div>
                <button type="button" class="btn-add" (click)="addManually()">
                    Add Manually
                </button>
            </div>

            <div class="divider"><span>OR</span></div>

            <!-- Upload Section -->
            <div class="upload-area" [class.processing]="isProcessing">
                <input type="file" (change)="onFileSelected($event)" accept=".xlsx, .xls" id="taxiExcel" hidden #fileInput>
                <label for="taxiExcel" class="upload-label">
                    <span class="material-symbols-outlined">{{ isProcessing ? 'sync' : 'upload_file' }}</span>
                    <div class="label-info">
                        <strong>{{ fileName || 'Upload Excel List' }}</strong>
                        <p>Format: Name, Dept, Phone, Time, From, To</p>
                    </div>
                </label>
                <div class="loader-overlay" *ngIf="isProcessing">
                    <div class="spinner"></div>
                    <p>Processing Spreadsheet...</p>
                    <p class="debug-status" style="font-size: 0.7rem; color: #64748b;">{{ currentStep }}</p>
                </div>
            </div>

            <!-- Error Feedback -->
            <div class="error-banner" *ngIf="lastError">
                <span class="material-symbols-outlined">error</span>
                <p>{{ lastError }}</p>
            </div>

            <!-- Passenger Table -->
            <div class="passenger-list" *ngIf="passengers.length > 0">
                <div class="list-header">
                    <h3>Confirm Passengers ({{ passengers.length }})</h3>
                    <button class="btn-clear" (click)="clearAll()">Clear All</button>
                </div>
                <div class="table-frame">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Dept</th>
                                <th>Phone</th>
                                <th>Time</th>
                                <th>From</th>
                                <th>To</th>
                                <th width="50"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let p of passengers; let i = index">
                                <td>{{ p.fullName }}</td>
                                <td>{{ p.department }}</td>
                                <td>{{ p.phoneNumber }}</td>
                                <td>{{ p.pickupTime }}</td>
                                <td>{{ p.pickUpFrom }}</td>
                                <td>{{ p.destination }}</td>
                                <td class="text-right">
                                    <button class="btn-remove" (click)="removePassenger(i)">
                                        <span class="material-symbols-outlined">delete</span>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="empty-state" *ngIf="passengers.length === 0 && !isProcessing">
                <p>No passengers added yet. Add manually or upload.</p>
            </div>
        </div>

        <footer class="modal-footer">
          <div class="actions">
            <button type="button" class="btn-secondary" (click)="close.emit()">Cancel</button>
            <button 
                type="button" 
                class="btn-primary" 
                [disabled]="passengers.length === 0 || isSubmitting"
                (click)="submitRequest()">
              {{ isSubmitting ? 'Submitting...' : 'Submit Order' }}
            </button>
          </div>
        </footer>
      </div>
    </div>
  `,
    styles: [`
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #ffffff; border-radius: 32px; width: 95%; max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.25); }
    .modal-header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .header-text h2 { margin: 0; color: #f59e0b; font-size: 1.5rem; font-weight: 800; }
    .modal-body { padding: 32px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }
    
    .manual-form { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; }
    .input-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
    .form-group label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .form-group input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; }
    .btn-add { background: #f59e0b; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; float: right; }

    .divider { display: flex; align-items: center; text-align: center; color: #94a3b8; font-size: 0.7rem; font-weight: 800; clear: both; padding-top: 10px; }
    .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #e2e8f0; }
    .divider span { padding: 0 10px; }

    .upload-area { position: relative; border: 2px dashed #cbd5e1; border-radius: 16px; transition: 0.2s; }
    .upload-label { padding: 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; }
    .upload-label .material-symbols-outlined { font-size: 28px; color: #94a3b8; }
    .label-info h3 { margin: 0; font-size: 0.9rem; }
    .label-info p { margin: 2px 0 0; font-size: 0.7rem; color: #64748b; }

    .loader-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.9); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
    .spinner { width: 24px; height: 24px; border: 3px solid #f1f5f9; border-top-color: #f59e0b; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-banner { background: #fef2f2; color: #b91c1c; padding: 12px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }

    .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .btn-clear { background: none; border: none; color: #ef4444; font-weight: 700; cursor: pointer; font-size: 0.8rem; }

    .table-frame { border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden; }
    .modern-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { background: #f8fafc; padding: 10px 14px; text-align: left; color: #64748b; font-weight: 600; }
    td { padding: 10px 14px; border-top: 1px solid #f1f5f9; color: #1e293b; }
    .btn-remove { background: none; border: none; color: #ef4444; opacity: 0.5; cursor: pointer; }

    .empty-state { padding: 30px; text-align: center; color: #94a3b8; }
    .modal-footer { padding: 20px 32px; border-top: 1px solid #f1f5f9; background: #f8fafc; display: flex; justify-content: flex-end; }
    .actions { display: flex; gap: 12px; }
    .btn-secondary { padding: 10px 20px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-weight: 600; cursor: pointer; }
    .btn-primary { padding: 10px 28px; border-radius: 8px; border: none; background: #f59e0b; color: white; font-weight: 700; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class TaxiOrderModalComponent {
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    private taxiService = inject(TaxiOrderService);
    private cdr = inject(ChangeDetectorRef);
    private zone = inject(NgZone);

    fileName = '';
    passengers: Passenger[] = [];
    isProcessing = false;
    isSubmitting = false;
    base64File = '';
    lastError = '';
    currentStep = '';

    newP: Partial<Passenger> = {
        fullName: '',
        department: '',
        phoneNumber: '',
        pickUpFrom: '',
        destination: '',
        pickupTime: ''
    };

    private log(msg: string) {
        this.zone.run(() => {
            this.currentStep = msg;
            this.cdr.detectChanges();
        });
    }

    addManually() {
        if (!this.newP.fullName) return;
        this.passengers.push({
            fullName: this.newP.fullName || '',
            department: this.newP.department || '',
            phoneNumber: this.newP.phoneNumber || '',
            pickUpFrom: this.newP.pickUpFrom || '',
            destination: this.newP.destination || '',
            pickupTime: this.newP.pickupTime || ''
        } as Passenger);
        this.newP = { fullName: '', department: '', phoneNumber: '', pickUpFrom: '', destination: '', pickupTime: '' };
        this.cdr.detectChanges();
    }

    removePassenger(index: number) {
        this.passengers.splice(index, 1);
        this.cdr.detectChanges();
    }

    async onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        this.zone.run(() => {
            this.isProcessing = true;
            this.fileName = file.name;
            this.lastError = '';
            this.cdr.detectChanges();
        });

        const safetyTimer = setTimeout(() => {
            if (this.isProcessing) {
                this.isProcessing = false;
                this.cdr.detectChanges();
            }
        }, 15000);

        try {
            this.log('Reading file...');
            const buffer = await file.arrayBuffer();
            this.log('Parsing Excel...');
            const workbook = XLSX.read(buffer, { type: 'array' });
            const ws = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

            if (!rows || rows.length < 1) throw new Error('Excel is empty');

            // Find headers
            let hIdx = -1, colNames: string[] = [];
            for (let i = 0; i < Math.min(rows.length, 10); i++) {
                const norm = rows[i].map(v => String(v || '').toLowerCase().replace(/[^a-z]/g, ''));
                if (norm.some(h => ['fullname', 'name', 'passenger'].includes(h))) {
                    hIdx = i;
                    colNames = norm;
                    break;
                }
            }

            if (hIdx === -1) throw new Error('Required column "Full name" not found.');

            const findIdx = (targets: string[]) => colNames.findIndex(h => targets.some(t => t.toLowerCase().replace(/[^a-z]/g, '') === h));

            const idx = {
                name: findIdx(['fullname', 'name', 'passenger']),
                dept: findIdx(['department', 'dept']),
                phone: findIdx(['phonenumber', 'contactnumber', 'phone', 'contact']),
                from: findIdx(['pickupfrom', 'from', 'pickup']),
                to: findIdx(['destination', 'to', 'location']),
                time: findIdx(['pickuptime', 'time', 'pickup'])
            };

            const parsed = rows.slice(hIdx + 1)
                .filter(r => r[idx.name])
                .map(r => {
                    let time = idx.time !== -1 ? r[idx.time] : '';
                    if (typeof time === 'number') {
                        const total = Math.round(time * 1440);
                        time = (Math.floor(total / 60)).toString().padStart(2, '0') + ':' + (total % 60).toString().padStart(2, '0');
                    }
                    return {
                        fullName: String(r[idx.name] || ''),
                        department: idx.dept !== -1 ? String(r[idx.dept] || '') : '',
                        phoneNumber: idx.phone !== -1 ? String(r[idx.phone] || '') : '',
                        pickUpFrom: idx.from !== -1 ? String(r[idx.from] || '') : '',
                        destination: idx.to !== -1 ? String(r[idx.to] || '') : '',
                        pickupTime: String(time || '')
                    } as Passenger;
                });

            this.zone.run(() => {
                this.passengers = [...this.passengers, ...parsed];
            });

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                this.base64File = reader.result as string;
                this.cdr.detectChanges();
            };

        } catch (err: any) {
            this.zone.run(() => this.lastError = err.message);
        } finally {
            clearTimeout(safetyTimer);
            this.zone.run(() => {
                this.isProcessing = false;
                this.cdr.detectChanges();
            });
        }
    }

    clearAll() {
        this.passengers = [];
        this.fileName = '';
        this.base64File = '';
        this.lastError = '';
        this.cdr.detectChanges();
    }

    submitRequest() {
        if (this.isSubmitting || this.passengers.length === 0) return;
        this.isSubmitting = true;

        this.taxiService.createRequest({
            attachment: this.base64File,
            passengers: this.passengers
        }).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.success.emit();
                this.close.emit();
            },
            error: () => {
                this.isSubmitting = false;
                alert('Submission failed.');
            }
        });
    }
}
