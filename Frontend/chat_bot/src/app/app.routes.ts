import { Routes } from '@angular/router';
import { Register } from './Components/register/register';
import { Login } from './Components/login/login';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
            import('./pages/landing/landing').then((m) => m.Landing),
    },
    // {
    //   path: 'register',
    //   loadComponent: () =>
    //     import('./Components/register/register').then((m) => m.Register),
    // },
    {
        path: 'register',
        component: Register
    },
    {
        path: 'login',
        component: Login
    },
    // optional: catch-all for unknown routes
    { path: '**', redirectTo: '' }
];