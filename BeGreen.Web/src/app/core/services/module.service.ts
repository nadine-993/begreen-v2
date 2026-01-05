import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ModuleService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5136/api/Modules';

    getModuleData(collectionName: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/${collectionName}`);
    }
}
