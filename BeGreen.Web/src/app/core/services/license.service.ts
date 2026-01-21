import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LicenseStatus {
    isLicensed: boolean;
    expiryDate?: string;
    issuedTo?: string;
    daysRemaining: number;
    isNearExpiry: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class LicenseService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5136/api/License';

    getStatus(): Observable<LicenseStatus> {
        return this.http.get<LicenseStatus>(`${this.apiUrl}/status`);
    }

    activate(licenseKey: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/activate`, JSON.stringify(licenseKey), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
