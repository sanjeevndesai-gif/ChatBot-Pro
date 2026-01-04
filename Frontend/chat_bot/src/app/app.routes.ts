import { Routes } from '@angular/router';
import { Login } from './Components/login/login';
import { Register } from './Components/register/register';
import { Layout } from './pages/layout/layout';
import { Customerreport } from './Components/reports/customerreport/customerreport';

export const routes: Routes = [

    // ✅ 1. Landing Page (Default Public Page)
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
            import('./pages/landing/landing').then(m => m.Landing),
    },

    // ✅ 2. Public Auth Pages
    {
        path: 'login',
        component: Login,
    },
    {
        path: 'register',
        component: Register,
    },

    // ✅ 3. PRIVATE AREA with Horizontal Menu (Layout)
    {
        path: '',
        component: Layout,
        children: [

            // ✅ Dashboard
            {
                // path: 'customerreport',
                // loadComponent: () =>
                //     import('./Components/reports/customerreport/customerreport')
                //         .then(m => m.Customerreport),
                path: 'customer-report',
                component: Customerreport,
            },

            // ✅ Reports Page
            {
                path: 'reports',
                loadComponent: () =>
                    import('./Components/reports/schedulereport/schedulereport')
                        .then(m => m.Schedulereport),
            },

            // ✅ Optional: default inside layout
            {
                path: '',
                redirectTo: 'reports',
                pathMatch: 'full'
            }
        ]
    },

    // ✅ 4. Fallback
    { path: '**', redirectTo: '' }

];
