import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EngineeringOrder {
    id?: string;
    userId?: string;
    userName?: string;
    department?: string;
    division?: string;
    location: string;
    team: string;
    description: string;
    status: string;
    createdAt: string;
    history?: any[];
}

@Injectable({
    providedIn: 'root'
})
export class EngineeringOrderService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5136/api/EngineeringOrder';

    getRequests(): Observable<EngineeringOrder[]> {
        return this.http.get<EngineeringOrder[]>(this.apiUrl);
    }

    getRequest(id: string): Observable<EngineeringOrder> {
        return this.http.get<EngineeringOrder>(`${this.apiUrl}/${id}`);
    }

    createRequest(request: Partial<EngineeringOrder>): Observable<EngineeringOrder> {
        return this.http.post<EngineeringOrder>(this.apiUrl, request);
    }

    closeOrder(id: string, note?: string): Observable<EngineeringOrder> {
        return this.http.put<EngineeringOrder>(`${this.apiUrl}/${id}/close`, note ? `"${note}"` : null, {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
