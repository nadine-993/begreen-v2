import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ExpenseService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5136/api/Expenses';

    getRequests(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    getRequest(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`);
    }

    createRequest(request: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, request);
    }

    approveRequest(id: string, note?: string): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}/approve`, note ? `"${note}"` : null, {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    rejectRequest(id: string, note?: string): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}/reject`, note ? `"${note}"` : null, {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
