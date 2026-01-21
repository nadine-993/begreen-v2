import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ItOrder {
    id?: string;
    userId?: string;
    userName?: string;
    department?: string;
    division?: string;
    systemName: string;
    description: string;
    status: string;
    createdAt: string;
    history?: any[];
}

@Injectable({
    providedIn: 'root'
})
export class ItOrderService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5136/api/ItOrder';

    getRequests(): Observable<ItOrder[]> {
        return this.http.get<ItOrder[]>(this.apiUrl);
    }

    getRequest(id: string): Observable<ItOrder> {
        return this.http.get<ItOrder>(`${this.apiUrl}/${id}`);
    }

    createRequest(request: Partial<ItOrder>): Observable<ItOrder> {
        return this.http.post<ItOrder>(this.apiUrl, request);
    }

    closeOrder(id: string, note?: string): Observable<ItOrder> {
        return this.http.put<ItOrder>(`${this.apiUrl}/${id}/close`, note ? `"${note}"` : null, {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
