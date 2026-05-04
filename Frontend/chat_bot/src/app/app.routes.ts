import { Routes } from '@angular/router';
import { Login } from './Components/login/login';
import { Register } from './Components/register/register';
import { Layout } from './pages/layout/layout';

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
            // {
            //     path: 'appointments',
            //     loadComponent: () =>
            //         import('./Components/appointments/appointments')
            //             .then(m => m.Appointments),
            // },
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
            // ✅ Help Page
            {
                path: 'help',
                loadComponent: () =>
                    import('./Components/faq/faq')
                        .then(m => m.Faq),
            },
            //✅ settings Page
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
            //✅ profile Page
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
