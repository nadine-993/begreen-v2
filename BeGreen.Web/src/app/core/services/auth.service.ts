import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User, LoginResponse } from '../../shared/models/user.model';
import { map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:5136/api/Auth'; // Corrected port

    currentUser = signal<User | null>(null);

    constructor(private http: HttpClient, private router: Router) {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            this.currentUser.set(JSON.parse(savedUser));
        }
    }

    login(model: any) {
        return this.http.post<LoginResponse>(`${this.apiUrl}/login`, model).pipe(
            tap((user: User) => {
                if (user) {
                    localStorage.setItem('user', JSON.stringify(user));
                    this.currentUser.set(user);
                }
            })
        );
    }

    logout() {
        localStorage.removeItem('user');
        this.currentUser.set(null);
        this.router.navigateByUrl('/login');
    }
}
