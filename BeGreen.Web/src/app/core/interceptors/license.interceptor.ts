import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const licenseInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 402) {
                // License Expired or Missing
                console.warn('License issue detected:', error.error?.message);
                // We can redirect to a dedicated page or simply rely on the UI 
                // components to show the error if they are watching the license service.
                // For a hard block, we might redirect to a 'license-expired' route.
            }
            return throwError(() => error);
        })
    );
};
