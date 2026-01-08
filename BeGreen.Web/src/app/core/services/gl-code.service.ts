import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GlCode {
    id: string;
    code: string;
    name: string;
}

@Injectable({
    providedIn: 'root'
})
export class GlCodeService {
    private apiUrl = 'http://localhost:5136/api/GlCodes';
    private http = inject(HttpClient);

    getGlCodes(): Observable<GlCode[]> {
        return this.http.get<GlCode[]>(this.apiUrl);
    }
}
