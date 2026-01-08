import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout';
import { deptGuard } from './core/guards/dept.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
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
                        { key: 'requestDate', label: 'Date', type: 'date' },
                        { key: 'requestor', label: 'Requestor' },
                        { key: 'department', label: 'Dept' },
                        { key: 'amount', label: 'Amount', type: 'currency' },
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
                    collection: 'engineering',
                    columns: [
                        { key: 'requestDate', label: 'Date', type: 'date' },
                        { key: 'requestor', label: 'Requestor' },
                        { key: 'location', label: 'Location' },
                        { key: 'team', label: 'Team' },
                        { key: 'status', label: 'Status', type: 'status' }
                    ]
                }
            },
            {
                path: 'it-orders',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'IT Orders',
                    subtitle: 'Hardware, software and support requests',
                    collection: 'itorders',
                    columns: [
                        { key: 'requestDate', label: 'Date', type: 'date' },
                        { key: 'requestor', label: 'Requestor' },
                        { key: 'type', label: 'Request Type' },
                        { key: 'systemName', label: 'System' },
                        { key: 'status', label: 'Status', type: 'status' }
                    ]
                }
            },
            {
                path: 'glitches',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'Glitches',
                    subtitle: 'Guest service recovery tracking',
                    collection: 'glitches',
                    columns: [
                        { key: 'requestDate', label: 'Date', type: 'date' },
                        { key: 'requestor', label: 'Staff' },
                        { key: 'guestName', label: 'Guest' },
                        { key: 'roomNumber', label: 'Room' },
                        { key: 'status', label: 'Status', type: 'status' }
                    ]
                }
            },
            {
                path: 'beo',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'BEO',
                    subtitle: 'Banquet Event Orders',
                    collection: 'beo',
                    columns: [
                        { key: 'requestDate', label: 'Date', type: 'date' },
                        { key: 'requestor', label: 'Requestor' },
                        { key: 'notes', label: 'Summary' }
                    ]
                }
            },
            {
                path: 'taxi-orders',
                loadComponent: () => import('./features/module-list/module-list').then(m => m.ModuleListComponent),
                data: {
                    title: 'Taxi Orders',
                    subtitle: 'Guest and staff transportation',
                    collection: 'taxiorders',
                    columns: [
                        { key: 'requestDate', label: 'Date', type: 'date' },
                        { key: 'requestor', label: 'Staff' },
                        { key: 'passengerName', label: 'Passenger' },
                        { key: 'destination', label: 'To' },
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
                        { key: 'requestDate', label: 'Date', type: 'date' },
                        { key: 'requestor', label: 'Requestor' },
                        { key: 'totalAmount', label: 'Amount', type: 'currency' },
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
