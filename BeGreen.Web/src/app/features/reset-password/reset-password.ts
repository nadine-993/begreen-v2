import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <header>
          <h1>Reset Password</h1>
          <p *ngIf="userName">Set a new password for {{ userName }}</p>
          <p *ngIf="!userName && !errorMessage">Validating your reset link...</p>
        </header>

        <div class="error-msg" *ngIf="errorMessage">
          <span class="material-symbols-outlined">error</span>
          {{ errorMessage }}
          <div class="actions">
            <a routerLink="/login" class="btn-link">Back to Login</a>
          </div>
        </div>

        <form *ngIf="userName && !successMessage" (submit)="onSubmit()" #resetForm="ngForm">
          <div class="form-group">
            <label>New Password</label>
            <input 
              type="password" 
              [(ngModel)]="newPassword" 
              name="newPassword" 
              required 
              minlength="6"
              placeholder="Min 6 characters">
          </div>
          <div class="form-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              [(ngModel)]="confirmPassword" 
              name="confirmPassword" 
              required 
              placeholder="Confirm new password">
          </div>
          <button type="submit" class="btn-primary" [disabled]="resetForm.invalid || isSubmitting">
            {{ isSubmitting ? 'Updating...' : 'Set New Password' }}
          </button>
        </form>

        <div class="success-msg" *ngIf="successMessage">
          <span class="material-symbols-outlined">check_circle</span>
          {{ successMessage }}
          <div class="actions">
            <a routerLink="/login" class="btn-primary">Go to Login</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #006d4e 0%, #004d36 100%); padding: 20px;
    }
    .auth-card {
      background: white; padding: 40px; border-radius: 24px; width: 100%; max-width: 400px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    }
    header { text-align: center; margin-bottom: 30px; }
    header h1 { color: #1e293b; margin: 0; font-size: 1.75rem; font-weight: 800; }
    header p { color: #64748b; margin-top: 8px; font-size: 0.95rem; }
    
    .form-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-weight: 600; font-size: 0.9rem; color: #475569; }
    .form-group input { 
      padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem;
      transition: border-color 0.2s;
    }
    .form-group input:focus { outline: none; border-color: #10b981; }

    .btn-primary {
      width: 100%; background: #10b981; color: white; border: none; padding: 14px;
      border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer;
      transition: all 0.2s; margin-top: 10px; display: inline-block; text-align: center;
      text-decoration: none;
    }
    .btn-primary:hover:not(:disabled) { background: #059669; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .error-msg { 
      background: #fee2e2; color: #991b1b; padding: 16px; border-radius: 12px; 
      display: flex; flex-direction: column; align-items: center; gap: 10px; font-weight: 500;
    }
    .success-msg { 
      background: #dcfce7; color: #166534; padding: 16px; border-radius: 12px; 
      display: flex; flex-direction: column; align-items: center; gap: 10px; font-weight: 500;
    }
    .btn-link { color: #006d4e; text-decoration: underline; font-weight: 600; border: none; background: none; cursor: pointer; }
    .actions { margin-top: 15px; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  token: string | null = null;
  userName: string | null = null;
  newPassword = '';
  confirmPassword = '';
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token')?.trim() || null;
    if (!this.token) {
      this.errorMessage = 'Invalid or missing reset token.';
      this.cdr.detectChanges();
      return;
    }

    this.authService.verifyResetToken(this.token).subscribe({
      next: (res) => {
        this.userName = res.name;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || err.error || 'The reset link is invalid or has expired.';
        this.cdr.detectChanges();
      }
    });
  }

  onSubmit() {
    if (this.newPassword !== this.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.authService.completeReset({
      token: this.token,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Your password has been reset successfully.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || err.error || 'Failed to reset password. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}
