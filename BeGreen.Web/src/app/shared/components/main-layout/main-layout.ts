import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { HeaderComponent } from '../header/header';
import { LicenseService, LicenseStatus } from '../../../core/services/license.service';
import { inject, OnInit } from '@angular/core';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent],
    templateUrl: './main-layout.html',
    styleUrl: './main-layout.css'
})
export class MainLayoutComponent implements OnInit {
    private licenseService = inject(LicenseService);
    private cdr = inject(ChangeDetectorRef);

    isSidebarCollapsed = false;
    licenseStatus: LicenseStatus | null = null;
    isLicenseLoading = true;

    ngOnInit() {
        this.checkLicense();
    }

    checkLicense() {
        this.licenseService.getStatus().subscribe({
            next: (status) => {
                this.licenseStatus = status;
                this.isLicenseLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('License check failed', err);
                this.isLicenseLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    toggleSidebar() {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
    }
}
