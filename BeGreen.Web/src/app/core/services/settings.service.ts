import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private apiUrl = 'http://localhost:5136/api/Settings';

    constructor(private http: HttpClient) { }

    // Divisions
    getDivisions(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/divisions`);
    }
    createDivision(division: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/divisions`, division);
    }
    updateDivision(id: string, division: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/divisions/${id}`, division);
    }
    deleteDivision(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/divisions/${id}`);
    }

    // Departments
    getDepartments(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/departments`);
    }
    createDepartment(department: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/departments`, department);
    }
    updateDepartment(id: string, department: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/departments/${id}`, department);
    }
    deleteDepartment(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/departments/${id}`);
    }

    // Roles
    getRoles(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/roles`);
    }
    createRole(role: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/roles`, role);
    }
    updateRole(id: string, role: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/roles/${id}`, role);
    }
    deleteRole(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/roles/${id}`);
    }

    // Users
    getUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/users`);
    }
    createUser(user: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/users`, user);
    }
    updateUser(id: string, user: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/users/${id}`, user);
    }
    deleteUser(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/users/${id}`);
    }
}
