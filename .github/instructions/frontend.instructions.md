---
applyTo: "frontend/chat_bot/src/**"
---
# Angular Frontend Conventions

Framework: Angular 20, standalone components, lazy-loaded routes, Reactive Forms, Angular Material, `@ngx-translate/core` for i18n, `@fullcalendar/angular` for scheduler views.

## Component Rules
- All components must be `standalone: true` — no NgModules.
- Lazy-load via `loadComponent` in `app.routes.ts`. Protected routes go inside the `Layout` block with `canActivate: [authGuard]`.
- Never use template-driven forms. Always use `ReactiveFormsModule` + `FormBuilder`.
- Never use raw HTML inputs — use Angular Material components.

## TypeScript Strictness
- Never use `any`. Define interfaces in `models/` for every entity.
- Use those interfaces in all service method signatures, component properties, and error handlers.

## Service Pattern
```typescript
@Injectable({ providedIn: 'root' })
export class FooService {
  private readonly apiUrl = environment.foo_apiBaseUrl;
  constructor(private http: HttpClient) {}
  getAll(): Observable<Foo[]> {
    return this.http.get<Foo[]>(this.apiUrl).pipe(catchError(err => this.handleError(err)));
  }
  private handleError(error: HttpErrorResponse): Observable<never> { return throwError(() => error); }
}
```

## API Base URLs — `environment.ts`
| Key | Gateway path |
|---|---|
| `auth_apiBaseUrl` | `/auth` |
| `appointment_apiBaseUrl` | `/book/api/appointments` |
| `scheduler_apiBaseUrl` | `/book/api/schedulers` |
| `chat_apiBaseUrl` | `/chat` |
| `i18n_apiBaseUrl` | `/i18n` |

All calls go through the gateway at `http://localhost:8080` (local) — never call service ports directly from the frontend.

## Common Pitfalls
- Check `services/` before creating a new service — many already exist.
- Do not install new npm packages without confirming the package is not already present in `package.json`.
