import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Beo {
    id?: string;
    userId?: string;
    userName?: string;
    createdAt: string;
    dateFrom: string;
    dateTo: string;
    notes: string;
    attachment?: string; // Base64
    history?: any[];
}

@Injectable({
    providedIn: 'root'
})
export class BeoService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5136/api/Beo';

    getRequests(): Observable<Beo[]> {
        return this.http.get<Beo[]>(this.apiUrl);
    }

    getRequest(id: string): Observable<Beo> {
        return this.http.get<Beo>(`${this.apiUrl}/${id}`);
    }

    createRequest(request: Partial<Beo>): Observable<Beo> {
        return this.http.post<Beo>(this.apiUrl, request);
    }
}
