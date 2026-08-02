# Admin UI Design — WhatsApp Appointment Management (MVP)

Status: Draft — initial wireframes and component inventory. No code changes yet.

## Overview
This document outlines the UI design for the Admin Dashboard focused on the clinic approval workflow and high-level KPIs. It maps the ASCII mockup you provided to concrete components, layouts, and interactions.

Files created:
- [frontend/chat_bot/src/assets/admin-wireframes/dashboard-desktop.svg](frontend/chat_bot/src/assets/admin-wireframes/dashboard-desktop.svg)

## Key Screens
- Dashboard (overview, KPI tiles, charts, pending approvals table)
- Clinics list
- Clinic detail (modal or page)
- Approvals queue (filtered view)
- Users & Subscriptions
- Notifications / Inbox

## Topbar
- Logo (left)
- Global search
- Notifications menu
- Admin profile dropdown (settings, sign out)

## Sidebar (left)
- Navigation items: Dashboard, Clinics, Users, Approval, Analytics, WhatsApp, Plans, Reports, Settings
- Collapsible on mobile

## Dashboard Layout (desktop)
- Top row: KPI tiles (Clinics, Users, Sign-ins, Revenue)
- Middle row: Line chart (User Growth) and Pie chart (Clinic Status)
- Bottom: Pending Approvals table with actions (Approve, Reject, Request Info, Assign Reviewer)

## KPI Tiles
- Each tile: title, headline number, short delta (today / % change)
- Tiles are fed by `/admin/metrics/overview` endpoint

## Pending Approvals Table
Columns: Clinic | Owner | Plan | Status | Action
- Row actions: Approve (primary), Reject (danger), Request Info (secondary), Assign Reviewer (menu)
- Bulk selection for group actions
- Pagination + server-side filtering

## Interaction Flows
- Approve: confirm modal → API POST `/admin/clinics/{id}/action` (action=approve) → toast success → refresh KPIs
- Reject: reason modal → API POST (action=reject, reason) → toast + audit
- Request Info: message modal → send notification + change status to Needs Info
- Assign Reviewer: reviewer picker modal → API assign

## Component Inventory
- Layout: `AdminShell`, `Topbar`, `Sidebar`
- Dashboard: `KpiGrid`, `KpiTile`, `ChartCard`, `PendingApprovalsCard`, `ApprovalsTable`
- Shared: `Button`, `Modal`, `Select`, `Table`, `Toast`, `Avatar`, `SearchInput`

## Style Tokens (suggested)
- Primary: #0F172A (text), Accent: #111827, Success: #10B981, Warning: #F59E0B, Danger: #EF4444
- Background: #F5F7FA, Card: #FFFFFF, Border: #E6EAF0
- Radius: 8px, Spacing base: 8px

## Accessibility & Responsiveness
- Keyboard-accessible table actions and modals
- Color contrast >= 4.5:1 for primary text
- Responsive: collapse sidebar to hamburger under 1024px; stack KPI tiles vertically under 640px

## Next Steps (after you review)
1. Finalize visual style (colors, spacing, font). Approve or provide brand tokens.
2. Produce high-fidelity Figma-ready SVGs for Desktop and Mobile (I will generate more SVGs or PNGs here).
3. Generate component skeletons and route map in `frontend/chat_bot/src/app/admin/` (no code changes until you approve).

---

Please review this design doc and the desktop wireframe. Tell me any adjustments (colors, additional KPIs, layout changes). Once you validate, I will produce mobile wireframes and a component skeleton plan.