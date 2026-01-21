import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ModuleBreakdown {
    pending: number;
    approved: number;
    rejected: number;
    open: number;
    closed: number;
    [key: string]: number;
}

export interface ModuleSummary {
    total: number;
    breakdown: ModuleBreakdown;
}

export interface DashboardSummary {
    [key: string]: ModuleSummary;
}

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5136/api/Dashboard';

    getSummary(): Observable<DashboardSummary> {
        return this.http.get<DashboardSummary>(`${this.apiUrl}/summary`);
    }
}
