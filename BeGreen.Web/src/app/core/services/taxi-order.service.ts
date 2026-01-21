import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Passenger {
    fullName: string;
    department: string;
    phoneNumber: string;
    pickUpFrom: string;
    destination: string;
    pickupTime: string;
    status: string;
}

export interface TaxiOrder {
    id?: string;
    userId?: string;
    userName?: string;
    department?: string;
    division?: string;
    createdAt: string;
    status: string;
    attachment?: string;
    passengers: Passenger[];
    history?: any[];
}

@Injectable({
    providedIn: 'root'
})
export class TaxiOrderService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5136/api/TaxiOrder';

    getRequests(): Observable<TaxiOrder[]> {
        return this.http.get<TaxiOrder[]>(this.apiUrl);
    }

    getRequest(id: string): Observable<TaxiOrder> {
        return this.http.get<TaxiOrder>(`${this.apiUrl}/${id}`);
    }

    createRequest(request: Partial<TaxiOrder>): Observable<TaxiOrder> {
        return this.http.post<TaxiOrder>(this.apiUrl, request);
    }

    updatePassengerStatus(id: string, index: number, status: string, note?: string): Observable<TaxiOrder> {
        return this.http.put<TaxiOrder>(`${this.apiUrl}/${id}/passengers/${index}/status`, `"${status}"`, {
            params: note ? { note } : {},
            headers: { 'Content-Type': 'application/json' }
        });
    }

    approveOrder(id: string, note?: string): Observable<TaxiOrder> {
        return this.http.put<TaxiOrder>(`${this.apiUrl}/${id}/approve`, note ? `"${note}"` : null, {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    rejectOrder(id: string, note?: string): Observable<TaxiOrder> {
        return this.http.put<TaxiOrder>(`${this.apiUrl}/${id}/reject`, note ? `"${note}"` : null, {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
