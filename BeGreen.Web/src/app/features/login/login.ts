import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.html',
    styleUrl: './login.css'
})
export class LoginComponent {
    loginData = { email: '', password: '' };
    loading = signal(false);
    error = signal('');

    constructor(private authService: AuthService, private router: Router) { }

    onSubmit() {
        this.loading.set(true);
        this.error.set('');

        this.authService.login(this.loginData).subscribe({
            next: () => {
                this.router.navigateByUrl('/dashboard');
            },
            error: (err) => {
                this.error.set(err.error || 'Login failed. Please check your credentials.');
                this.loading.set(false);
            }
        });
    }
}
