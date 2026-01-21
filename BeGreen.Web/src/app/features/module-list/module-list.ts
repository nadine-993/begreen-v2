import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ModuleService } from '../../core/services/module.service';
import { PettyCashService } from '../../core/services/petty-cash.service';
import { CashAdvanceService } from '../../core/services/cash-advance.service';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table';
import { PettyCashModalComponent } from '../petty-cash/petty-cash-modal';
import { PettyCashDetailModalComponent } from '../petty-cash/petty-cash-detail-modal';
import { CashAdvanceModalComponent } from '../cash-advance/cash-advance-modal';
import { CashAdvanceDetailModalComponent } from '../cash-advance/cash-advance-detail-modal';
import { EngineeringOrderService } from '../../core/services/engineering-order.service';
import { EngineeringOrderModalComponent } from '../engineering-order/engineering-order-modal';
import { EngineeringOrderDetailModalComponent } from '../engineering-order/engineering-order-detail-modal';
import { ItOrderService } from '../../core/services/it-order.service';
import { ItOrderModalComponent } from '../it-order/it-order-modal';
import { ItOrderDetailModalComponent } from '../it-order/it-order-detail-modal';
import { GlitchService } from '../../core/services/glitch.service';
import { GlitchModalComponent } from '../glitch/glitch-modal';
import { GlitchDetailModalComponent } from '../glitch/glitch-detail-modal';
import { BeoService } from '../../core/services/beo.service';
import { BeoModalComponent } from '../beo/beo-modal';
import { BeoDetailModalComponent } from '../beo/beo-detail-modal';
import { TaxiOrderService } from '../../core/services/taxi-order.service';
import { TaxiOrderModalComponent } from '../taxi-order/taxi-order-modal';
import { TaxiOrderDetailModalComponent } from '../taxi-order/taxi-order-detail-modal';
import { ExpenseService } from '../../core/services/expense.service';
import { ExpenseModalComponent } from '../expense/expense-modal';
import { ExpenseDetailModalComponent } from '../expense/expense-detail-modal';
import { PdfService } from '../../core/services/pdf.service';

@Component({
  selector: 'app-module-list',
  standalone: true,
  imports: [
    CommonModule,
    DataTableComponent,
    PettyCashModalComponent,
    PettyCashDetailModalComponent,
    CashAdvanceModalComponent,
    CashAdvanceDetailModalComponent,
    EngineeringOrderModalComponent,
    EngineeringOrderDetailModalComponent,
    ItOrderModalComponent,
    ItOrderDetailModalComponent,
    GlitchModalComponent,
    GlitchDetailModalComponent,
    BeoModalComponent,
    BeoDetailModalComponent,
    TaxiOrderModalComponent,
    TaxiOrderDetailModalComponent,
    ExpenseModalComponent,
    ExpenseDetailModalComponent
  ],
  template: `
    <div class="module-view">
      <header class="module-header">
        <div class="title-group">
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </div>
        <button class="btn-primary" (click)="openNewRequestModal()">
          <span class="material-symbols-outlined">add</span>
          New Request
        </button>
      </header>

      <!-- Modals -->
      <app-petty-cash-modal *ngIf="showPettyCashModal" (close)="showPettyCashModal = false" (success)="loadData()"></app-petty-cash-modal>
      <app-cash-advance-modal *ngIf="showCashAdvanceModal" (close)="showCashAdvanceModal = false" (success)="loadData()"></app-cash-advance-modal>
      <app-engineering-order-modal *ngIf="showEngineeringModal" (close)="showEngineeringModal = false" (success)="loadData()"></app-engineering-order-modal>
      <app-it-order-modal *ngIf="showItModal" (close)="showItModal = false" (success)="loadData()"></app-it-order-modal>
      <app-glitch-modal *ngIf="showGlitchModal" (close)="showGlitchModal = false" (success)="loadData()"></app-glitch-modal>
      <app-beo-modal *ngIf="showBeoModal" (close)="showBeoModal = false" (success)="loadData()"></app-beo-modal>
      <app-taxi-order-modal *ngIf="showTaxiModal" (close)="showTaxiModal = false" (success)="loadData()"></app-taxi-order-modal>
      <app-expense-modal *ngIf="showExpenseModal" (close)="showExpenseModal = false" (success)="loadData()"></app-expense-modal>

      <app-data-table 
        [columns]="columns" 
        [data]="moduleData"
        (view)="handleView($event)"
        (download)="handleDownload($event)">
      </app-data-table>

      <!-- Detail Modals -->
      <app-petty-cash-detail-modal *ngIf="selectedRequest && collectionName === 'pettycashes'" [request]="selectedRequest" (close)="selectedRequest = null" (success)="loadData()"></app-petty-cash-detail-modal>
      <app-cash-advance-detail-modal *ngIf="selectedRequest && collectionName === 'cashadvances'" [request]="selectedRequest" (close)="selectedRequest = null" (success)="loadData()"></app-cash-advance-detail-modal>
      <app-engineering-order-detail-modal *ngIf="selectedRequest && collectionName === 'engineeringorders'" [request]="selectedRequest" (close)="selectedRequest = null" (success)="loadData()"></app-engineering-order-detail-modal>
      <app-it-order-detail-modal *ngIf="selectedRequest && collectionName === 'itorders'" [request]="selectedRequest" (close)="selectedRequest = null" (success)="loadData()"></app-it-order-detail-modal>
      <app-glitch-detail-modal *ngIf="selectedRequest && collectionName === 'glitches'" [request]="selectedRequest" (close)="selectedRequest = null" (success)="loadData()"></app-glitch-detail-modal>
      <app-beo-detail-modal *ngIf="selectedRequest && collectionName === 'beos'" [request]="selectedRequest" (close)="selectedRequest = null"></app-beo-detail-modal>
      <app-taxi-order-detail-modal *ngIf="selectedRequest && collectionName === 'taxiorders'" [request]="selectedRequest" (close)="selectedRequest = null" (updated)="loadData()"></app-taxi-order-detail-modal>
      <app-expense-detail-modal *ngIf="selectedRequest && collectionName === 'expenses'" [request]="selectedRequest" (close)="selectedRequest = null" (success)="loadData()"></app-expense-detail-modal>
    </div>
  `,
  styles: [`
    .module-view { padding: 40px; max-width: 1400px; margin: 0 auto; }
    .module-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
    .title-group h1 { color: var(--primary); font-size: 2rem; margin: 0; }
    .title-group p { color: var(--text-light); margin: 8px 0 0 0; }
    .btn-primary { background: var(--primary); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0, 109, 78, 0.2); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 109, 78, 0.3); }
  `]
})
export class ModuleListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private moduleService = inject(ModuleService);
  private pettyCashService = inject(PettyCashService);
  private cashAdvanceService = inject(CashAdvanceService);
  private engineeringOrderService = inject(EngineeringOrderService);
  private itOrderService = inject(ItOrderService);
  private glitchService = inject(GlitchService);
  private beoService = inject(BeoService);
  private taxiService = inject(TaxiOrderService);
  private expenseService = inject(ExpenseService);
  private pdfService = inject(PdfService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  title = '';
  subtitle = '';
  columns: TableColumn[] = [];
  moduleData: any[] = [];
  collectionName = '';

  showPettyCashModal = false;
  showCashAdvanceModal = false;
  showEngineeringModal = false;
  showItModal = false;
  showGlitchModal = false;
  showBeoModal = false;
  showTaxiModal = false;
  showExpenseModal = false;

  selectedRequest: any = null;

  ngOnInit() {
    this.route.data.subscribe(data => {
      this.title = data['title'];
      this.subtitle = data['subtitle'];
      this.columns = data['columns'];
      this.collectionName = data['collection'];
      this.loadData();
    });
  }

  loadData() {
    let obs;
    if (this.collectionName === 'pettycashes') obs = this.pettyCashService.getRequests();
    else if (this.collectionName === 'cashadvances') obs = this.cashAdvanceService.getRequests();
    else if (this.collectionName === 'engineeringorders') obs = this.engineeringOrderService.getRequests();
    else if (this.collectionName === 'itorders') obs = this.itOrderService.getRequests();
    else if (this.collectionName === 'glitches') obs = this.glitchService.getRequests();
    else if (this.collectionName === 'beos') obs = this.beoService.getRequests();
    else if (this.collectionName === 'taxiorders') obs = this.taxiService.getRequests();
    else if (this.collectionName === 'expenses') obs = this.expenseService.getRequests();
    else obs = this.moduleService.getModuleData(this.collectionName);

    obs.subscribe({
      next: (data) => { this.moduleData = data; this.cdr.detectChanges(); },
      error: (err) => console.error('Error loading data:', err)
    });
  }

  openNewRequestModal() {
    if (this.collectionName === 'pettycashes') this.showPettyCashModal = true;
    else if (this.collectionName === 'cashadvances') this.showCashAdvanceModal = true;
    else if (this.collectionName === 'engineeringorders') this.showEngineeringModal = true;
    else if (this.collectionName === 'itorders') this.showItModal = true;
    else if (this.collectionName === 'glitches') this.showGlitchModal = true;
    else if (this.collectionName === 'beos') this.showBeoModal = true;
    else if (this.collectionName === 'taxiorders') this.showTaxiModal = true;
    else if (this.collectionName === 'expenses') this.showExpenseModal = true;
  }

  handleView(row: any) {
    const id = row.id || row.Id;
    if (this.collectionName === 'pettycashes') this.pettyCashService.getRequest(id).subscribe(res => { this.selectedRequest = res; this.cdr.detectChanges(); });
    else if (this.collectionName === 'cashadvances') this.cashAdvanceService.getRequest(id).subscribe(res => { this.selectedRequest = res; this.cdr.detectChanges(); });
    else if (this.collectionName === 'engineeringorders') this.engineeringOrderService.getRequest(id).subscribe(res => { this.selectedRequest = res; this.cdr.detectChanges(); });
    else if (this.collectionName === 'itorders') this.itOrderService.getRequest(id).subscribe(res => { this.selectedRequest = res; this.cdr.detectChanges(); });
    else if (this.collectionName === 'glitches') this.glitchService.getRequest(id).subscribe(res => { this.selectedRequest = res; this.cdr.detectChanges(); });
    else if (this.collectionName === 'beos') this.beoService.getRequest(id).subscribe(res => { this.selectedRequest = res; this.cdr.detectChanges(); });
    else if (this.collectionName === 'taxiorders') this.taxiService.getRequest(id).subscribe(res => { this.zone.run(() => { this.selectedRequest = res; this.cdr.detectChanges(); }); });
    else if (this.collectionName === 'expenses') this.expenseService.getRequest(id).subscribe(res => { this.selectedRequest = res; this.cdr.detectChanges(); });
  }

  handleDownload(row: any) {
    const id = row.id || row.Id;
    if (this.collectionName === 'pettycashes') this.pettyCashService.getRequest(id).subscribe(res => this.pdfService.downloadPettyCashPdf(res).subscribe());
    else if (this.collectionName === 'cashadvances') this.cashAdvanceService.getRequest(id).subscribe(res => this.pdfService.downloadCashAdvancePdf(res).subscribe());
    else if (this.collectionName === 'expenses') {
      // If there's an attachment, download it
      if (row.attachment) {
        const link = document.createElement('a');
        link.href = row.attachment;
        link.download = `Expense_Attachment_${id}.png`;
        link.click();
      } else {
        alert('No attachment found for this expense.');
      }
    }
  }
}
