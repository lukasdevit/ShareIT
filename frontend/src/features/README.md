# features/

Domain-based feature modules. Each folder is a self-contained feature.

- `auth/` — AuthProvider, useAuth hook, LoginForm.
- `dashboard/` — DashboardProvider, useDashboard hook (persists view mode & admin tab to localStorage).

**Rules**: Feature modules may contain providers, hooks, and feature-specific components. They must not import from other features.
