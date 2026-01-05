import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const deptGuard = (allowedDept: string) => {
    return () => {
        const authService = inject(AuthService);
        const router = inject(Router);
        const user = authService.currentUser();

        if (user && user.department === allowedDept) {
            return true;
        }

        router.navigate(['/dashboard']);
        return false;
    };
};
