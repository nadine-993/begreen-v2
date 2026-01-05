import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ModuleService } from '../../core/services/module.service';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table';

@Component({
  selector: 'app-module-list',
  standalone: true,
  imports: [CommonModule, DataTableComponent],
  template: `
    <div class="module-view">
      <header class="module-header">
        <div class="title-group">
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </div>
        <button class="btn-primary">
          <span class="material-symbols-outlined">add</span>
          New Request
        </button>
      </header>

      <div class="filters-bar">
        <!-- Future: Add search/filter inputs here -->
      </div>

      <app-data-table 
        [columns]="columns" 
        [data]="moduleData">
      </app-data-table>
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

  title = '';
  subtitle = '';
  columns: TableColumn[] = [];
  moduleData: any[] = [];
  collectionName = '';

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
    this.moduleService.getModuleData(this.collectionName).subscribe({
      next: (data) => {
        console.log(`Received ${data.length} records for ${this.collectionName}`, data);
        this.moduleData = data;
      },
      error: (err) => {
        console.error('Error loading module data:', err);
      }
    });
  }
}
