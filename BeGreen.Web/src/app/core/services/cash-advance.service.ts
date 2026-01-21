import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CashAdvance {
    id?: string;
    userId?: string;
    userName?: string;
    department?: string;
    division?: string;
    description?: string;
    total: number;
    currency: string;
    status: string;
    currentApproverUserId?: string;
    currentApproverName?: string;
    approveOrder: number;
    createdAt: string;
    history?: any[];
}

@Injectable({
    providedIn: 'root'
})
export class CashAdvanceService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5136/api/CashAdvance';

    getRequests(): Observable<CashAdvance[]> {
        return this.http.get<CashAdvance[]>(this.apiUrl);
    }

    getRequest(id: string): Observable<CashAdvance> {
        return this.http.get<CashAdvance>(`${this.apiUrl}/${id}`);
    }

    createRequest(request: CashAdvance): Observable<CashAdvance> {
        return this.http.post<CashAdvance>(this.apiUrl, request);
    }

    approveRequest(id: string, note?: string): Observable<CashAdvance> {
        return this.http.put<CashAdvance>(`${this.apiUrl}/${id}/approve`, note ? `"${note}"` : null, {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    rejectRequest(id: string, note?: string): Observable<CashAdvance> {
        return this.http.put<CashAdvance>(`${this.apiUrl}/${id}/reject`, note ? `"${note}"` : null, {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
