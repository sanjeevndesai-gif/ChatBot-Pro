# Admin Component Skeleton — WhatsApp Appointment Management

Status: Draft — scaffold plan for frontend components (Angular standalone approach).

Directory: frontend/chat_bot/src/app/admin/

## Routes (lazy under `/app/admin`)
- `/app/admin` → `AdminLayout` (shell with Topbar + Sidebar + router-outlet)
  - `/app/admin/dashboard` → `DashboardPage`
  - `/app/admin/clinics` → `ClinicsPage`
  - `/app/admin/clinics/:id` → `ClinicDetailPage` (modal-capable)
  - `/app/admin/approvals` → `ApprovalsQueuePage`
  - `/app/admin/users` → `UsersPage`
  - `/app/admin/analytics` → `AnalyticsPage`
  - `/app/admin/settings` → `AdminSettingsPage`

## Components & Files
- `AdminLayout` — admin-layout.ts/html/scss
  - Topbar: `AdminTopbar` (search, notifications, profile)
  - Sidebar: `AdminSidebar` (nav)
- `DashboardPage` — dashboard.page.ts/html/scss
  - `KpiGrid` (`kpi-grid.ts` + `kpi-tile.ts`)
  - `ChartCard` (`chart-card.ts`) — wraps chart library (Chart.js / Apex) usage
  - `PendingApprovalsCard` (`pending-approvals-card.ts`) — small table widget
- `ApprovalsQueuePage` — approvals-queue.page.ts/html/scss
  - `ApprovalsTable` (`approvals-table.ts`) — server-side pagination, bulk actions
  - `ApproveModal` (`approve-modal.ts`) — confirm & capture reason
  - `RejectModal` (`reject-modal.ts`) — require rejection reason
  - `RequestInfoModal` (`request-info-modal.ts`) — send message to owner
  - `AssignReviewerModal` (`assign-reviewer-modal.ts`)
- `ClinicsPage` — clinics.page.ts/html/scss
  - `ClinicList` (`clinic-list.ts`) — filters, search, virtual scroll
  - `ClinicCard` / `ClinicRow`
- `ClinicDetailPage` — clinic-detail.page.ts/html/scss
  - `DocsViewer` (`docs-viewer.ts`) — preview uploaded documents
  - `ActivityTimeline` (`activity-timeline.ts`)
- `UsersPage` — users.page.ts/html/scss
  - `UsersTable`, `SubscriptionSummaryCard`
- `AnalyticsPage` — analytics.page.ts/html/scss
  - `TimeseriesChart`, `CohortCard`
- Shared
  - `ConfirmModal`, `Toast`, `Spinner`, `EmptyState`, `Pill`, `Badge`

## Services
- `AdminService` — communicates with admin endpoints: metrics, clinics, approvals, audit, notifications.
- `SocketService` (optional) — push notifications for new approvals.
- Reuse existing `AuthService`, `ToastService`, `UserService`.

## State
- Light-weight store using RxJS `BehaviorSubject` inside `AdminService` for metrics + current filters.
- Table pagination params persisted in URL query params for shareable views.

## UI Libraries
- Keep existing dependencies (Bootstrap / ng-bootstrap) — use Chart.js or ApexCharts (check existing package.json before adding new deps).

## Acceptance Notes
- All actions must call `AdminService` and append to audit log via backend.
- Approve/Reject flows use modals with confirmation and optimistic UI updates.

## Next Tasks (after you approve this skeleton)
1. Scaffold `admin` folder and create `AdminLayout` + `DashboardPage` components.
2. Implement `AdminService` methods and wire `KpiGrid` to `/admin/metrics/overview`.
3. Add route registration under `app` layout and protect routes with `authGuard` and role checks.

---

Approve this skeleton and I will scaffold the files and implement the `AdminService` and `DashboardPage` UI next.