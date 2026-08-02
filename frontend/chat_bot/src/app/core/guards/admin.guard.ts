import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    console.debug('[adminGuard] not logged in - redirect to /login');
    router.navigate(['/login']);
    return false;
  }

  const user = auth.getCurrentUser() as any;
  console.debug('[adminGuard] currentUser=', user);
  // Normalize roles into an array and require an explicit 'admin' membership.
  const roles: string[] = [];
  if (Array.isArray(user?.roles)) {
    user.roles.forEach((r: any) => { if (r) roles.push(r.toString().toLowerCase()); });
  } else if (user?.role) {
    roles.push(user.role.toString().toLowerCase());
  }

  // Require explicit 'admin' role membership only.
  console.debug('[adminGuard] resolved roles=', roles);
  if (roles.includes('admin')) {
    console.debug('[adminGuard] access granted');
    return true;
  }

  // Not an admin — redirect to default app landing
  console.debug('[adminGuard] access denied - redirecting to /app');
  router.navigate(['/app']);
  return false;
};
