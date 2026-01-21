import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout';
import { deptGuard } from './core/guards/dept.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'reset-password', loadComponent: () => import('./features/reset-password/reset-password').then(m => m.ResetPasswordComponent) },
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent) },
            {
                path: 'petty-cash',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'Petty Cash',
                    subtitle: 'Manage local cash disbursements',
                    collection: 'pettycashes',
                    columns: [
                        { key: 'createdAt', label: 'Date', type: 'date' },
                        { key: 'userName', label: 'Request' },
                        { key: 'department', label: 'Dept' },
                        { key: 'total', label: 'Amount', type: 'currency' },
                        { key: 'status', label: 'Status', type: 'status' }
                    ]
                }
            },
            {
                path: 'cash-advance',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'Cash Advance',
                    subtitle: 'Business travel and advance requests',
                    collection: 'cashadvances',
                    columns: [
                        { key: 'createdAt', label: 'Date', type: 'date' },
                        { key: 'userName', label: 'Requestor' },
                        { key: 'department', label: 'Dept' },
                        { key: 'total', label: 'Amount', type: 'currency' },
                        { key: 'status', label: 'Status', type: 'status' }
                    ]
                }
            },
            {
                path: 'engineering',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'Engineering Orders',
                    subtitle: 'Maintenance and facility work orders',
                    collection: 'engineeringorders',
                    columns: [
                        { key: 'createdAt', label: 'Date', type: 'date' },
                        { key: 'status', label: 'Status', type: 'status' },
                        { key: 'userName', label: 'Requestor' },
                        { key: 'location', label: 'Location' },
                        { key: 'team', label: 'Team' }
                    ]
                }
            },
            {
                path: 'it-orders',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'IT Requests',
                    subtitle: 'Hardware, software and support requests',
                    collection: 'itorders',
                    columns: [
                        { key: 'createdAt', label: 'Date', type: 'date' },
                        { key: 'status', label: 'Status', type: 'status' },
                        { key: 'userName', label: 'Requestor' },
                        { key: 'systemName', label: 'System/Asset' }
                    ]
                }
            },
            {
                path: 'glitches',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'Guest Glitches',
                    subtitle: 'Guest service recovery tracking',
                    collection: 'glitches',
                    columns: [
                        { key: 'createdAt', label: 'Date', type: 'date' },
                        { key: 'status', label: 'Status', type: 'status' },
                        { key: 'guestName', label: 'Guest' },
                        { key: 'roomNumber', label: 'Room' },
                        { key: 'userName', label: 'Reported By' }
                    ]
                }
            },
            {
                path: 'beos',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'BEO Orders',
                    subtitle: 'Banquet Event Orders and setups',
                    collection: 'beos',
                    columns: [
                        { key: 'createdAt', label: 'Date', type: 'date' },
                        { key: 'userName', label: 'Created By' },
                        { key: 'dateFrom', label: 'Starts', type: 'date' },
                        { key: 'dateTo', label: 'Ends', type: 'date' }
                    ]
                }
            },
            {
                path: 'taxi-orders',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'Taxi Orders',
                    subtitle: 'Staff transportation and airport transfers',
                    collection: 'taxiorders',
                    columns: [
                        { key: 'createdAt', label: 'Date', type: 'date' },
                        { key: 'userName', label: 'Created By' },
                        { key: 'status', label: 'Status', type: 'status' }
                    ]
                }
            },
            {
                path: 'expenses',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'Expenses',
                    subtitle: 'Reimbursement and cost tracking',
                    collection: 'expenses',
                    columns: [
                        { key: 'createdAt', label: 'Date', type: 'date' },
                        { key: 'userName', label: 'Requestor' },
                        { key: 'department', label: 'Dept' },
                        { key: 'amount', label: 'Amount', type: 'currency' },
                        { key: 'status', label: 'Status', type: 'status' }
                    ]
                }
            },
            {
                path: 'settings',
                loadComponent: () => import('./features/settings/settings').then(m => m.SettingsComponent),
                canActivate: [deptGuard('Information Technology')]
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    { path: '**', redirectTo: '/login' }
];
