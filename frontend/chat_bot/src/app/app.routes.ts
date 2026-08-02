import { Routes } from '@angular/router';
import { Login } from './Components/login/login';
import { Register } from './Components/register/register';
import { Layout } from './pages/layout/layout';
import { authGuard } from './core/guards/auth.guard';
import { Faq } from './Components/faq/faq';

export const routes: Routes = [

    // 1. Landing Page (Default Public Page)
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
            import('./pages/landing/landing').then(m => m.Landing),
    },

    // 2. Public Auth Pages
    {
        path: 'login',
        component: Login,
    },
    {
        path: 'register',
        component: Register,
    },

    // 3. Private Area with Layout (requires authentication)
    {
        path: 'app',
        component: Layout,
        canActivate: [authGuard],
        children: [
            {
                path: 'book-appointment',
                loadComponent: () =>
                    import('./Components/book-appointment/book-appointment')
                        .then(m => m.BookAppointment),
            },
            {
                path: 'schedulereport',
                loadComponent: () =>
                    import('./Components/reports/schedulereport/schedulereport')
                        .then(m => m.Schedulereport),
            },
            {
                path: 'scheduler',
                loadComponent: () =>
                    import('./Components/scheduler/scheduler')
                        .then(m => m.Scheduler),
            },
            {
                path: 'help',
                component: Faq,
            },
            {
                path: 'settings',
                loadComponent: () =>
                    import('./Components/setting/setting')
                        .then(m => m.Setting),
            },
            {
                path: 'plan-billing',
                loadComponent: () =>
                    import('./Components/billing/billing-page/billing-page')
                        .then(m => m.BillingPage),
            },
            {
                path: 'profile',
                loadComponent: () =>
                    import('./Components/profile/profile')
                        .then(m => m.Profile),
            },
            {
                path: 'editprofile',
                loadComponent: () =>
                    import('./Components/editprofile/editprofile')
                        .then(m => m.EditProfile)
            },
            {
                path: 'view-users',
                loadComponent: () =>
                    import('./Components/view-users/view-users')
                        .then(m => m.ViewUsers),
            },
            // Admin area (lazy-loaded standalone admin layout with child routes)
            {
                path: 'admin',
                loadComponent: () => import('./Components/admin-dashboard/admin-layout').then(m => m.AdminLayout),
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./Components/admin-dashboard/dashboard.page').then(m => m.DashboardPage)
                    },
                    {
                        path: 'approvals',
                        loadComponent: () => import('./Components/admin-dashboard/approvals.page').then(m => m.ApprovalsPage)
                    }
                ]
            },


            // // ✅ Optional: default inside layout
            // {
            //     path: '',
            //     redirectTo: 'reports',
            //     pathMatch: 'full'
            // }
        ]
    },

    // ✅ 4. Fallback
    { path: '**', redirectTo: '' }

];
