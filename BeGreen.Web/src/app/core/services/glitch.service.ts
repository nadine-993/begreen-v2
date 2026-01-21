import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Glitch {
    id?: string;
    userId?: string;
    userName?: string;
    department?: string;
    division?: string;
    guestName: string;
    roomNumber: string;
    description: string;
    notes?: string;
    status: string;
    createdAt: string;
    history?: any[];
}

@Injectable({
    providedIn: 'root'
})
export class GlitchService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5136/api/Glitch';

    getRequests(): Observable<Glitch[]> {
        return this.http.get<Glitch[]>(this.apiUrl);
    }

    getRequest(id: string): Observable<Glitch> {
        return this.http.get<Glitch>(`${this.apiUrl}/${id}`);
    }

    createRequest(request: Partial<Glitch>): Observable<Glitch> {
        return this.http.post<Glitch>(this.apiUrl, request);
    }

    addNote(id: string, note: string): Observable<Glitch> {
        return this.http.put<Glitch>(`${this.apiUrl}/${id}/note`, `"${note}"`, {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    closeGlitch(id: string, note?: string): Observable<Glitch> {
        return this.http.put<Glitch>(`${this.apiUrl}/${id}/close`, note ? `"${note}"` : null, {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
