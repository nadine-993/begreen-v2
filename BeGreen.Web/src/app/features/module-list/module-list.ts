import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ModuleService } from '../../core/services/module.service';
import { PettyCashService } from '../../core/services/petty-cash.service';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table';
import { PettyCashModalComponent } from '../petty-cash/petty-cash-modal';
import { PettyCashDetailModalComponent } from '../petty-cash/petty-cash-detail-modal';

@Component({
  selector: 'app-module-list',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PettyCashModalComponent, PettyCashDetailModalComponent],
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

      <!-- Petty Cash Modal -->
      <app-petty-cash-modal 
        *ngIf="showPettyCashModal" 
        (close)="showPettyCashModal = false"
        (success)="loadData()">
      </app-petty-cash-modal>

      <div class="filters-bar">
        <!-- Future: Add search/filter inputs here -->
      </div>

      <app-data-table 
        [columns]="columns" 
        [data]="moduleData"
        (view)="handleView($event)">
      </app-data-table>

      <!-- Petty Cash Detail Modal -->
      <app-petty-cash-detail-modal
        *ngIf="selectedRequest"
        [request]="selectedRequest"
        (close)="selectedRequest = null"
        (success)="loadData()">
      </app-petty-cash-detail-modal>
    </div>
  `,
  styles: [`
    .module-view { padding: 40px; max-width: 1400px; margin: 0 auto; }
    .module-header {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-bottom: 32px;
    }
    .title-group h1 { color: var(--primary); font-size: 2rem; margin: 0; }
    .title-group p { color: var(--text-light); margin: 8px 0 0 0; }
    
    .btn-primary {
      background: var(--primary); color: white; border: none;
      padding: 12px 24px; border-radius: 12px; font-weight: 600;
      display: flex; align-items: center; gap: 8px; cursor: pointer;
      transition: all 0.2s; box-shadow: 0 4px 12px rgba(0, 109, 78, 0.2);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 109, 78, 0.3); }
  `]
})
export class ModuleListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private moduleService = inject(ModuleService);
  private pettyCashService = inject(PettyCashService);
  private cdr = inject(ChangeDetectorRef);

  title = '';
  subtitle = '';
  columns: TableColumn[] = [];
  moduleData: any[] = [];
  collectionName = '';
  showPettyCashModal = false;
  selectedRequest: any = null;

  ngOnInit() {
    this.route.data.subscribe(data => {
      console.log('Module View data:', data);
      this.title = data['title'];
      this.subtitle = data['subtitle'];
      this.columns = data['columns'];
      this.collectionName = data['collection'];
      this.loadData();
    });
  }

  loadData() {
    console.log('Loading data for collection:', this.collectionName);

    const dataObservable = this.collectionName === 'pettycashes'
      ? this.pettyCashService.getRequests()
      : this.moduleService.getModuleData(this.collectionName);

    dataObservable.subscribe({
      next: (data) => {
        console.log(`Received ${data.length} records for ${this.collectionName}`, data);
        this.moduleData = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading module data:', err);
      }
    });
  }

  openNewRequestModal() {
    if (this.collectionName === 'pettycashes') {
      this.showPettyCashModal = true;
    } else {
      alert('New request for this module is not yet implemented.');
    }
  }

  handleView(row: any) {
    if (this.collectionName === 'pettycashes') {
      // Re-fetch full details to ensure we have the expanded history and items
      this.pettyCashService.getRequest(row.id).subscribe(fullRequest => {
        this.selectedRequest = fullRequest;
        this.cdr.detectChanges();
      });
    } else {
      console.log('Viewing row:', row);
    }
  }
}
