# CarePoint 365 Rota

A staff rostering and shift management application built for care sector organisations. Integrates with Microsoft Dataverse for data storage and Azure AD (Entra ID) for authentication.

## Features

- **Rota Management** — Weekly, fortnightly, and monthly rota grids with team/people/shift reference views
- **Daily View** — Day-at-a-glance shift overview with attendance tracking
- **Staff Management** — Staff profiles, capabilities, and availability management
- **Shift Patterns** — Pattern library, builder, and assignment tools for recurring schedules
- **Domiciliary Care** — Service user-centric visit scheduling and round planning
- **Shift Swaps & Open Shifts** — Request management and open shift offers
- **Dashboard** — Coverage analytics, critical alerts, and period statistics
- **Reports** — Swap history and operational reports

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| State (client) | Zustand |
| State (server) | TanStack React Query |
| Routing | React Router 7 |
| Forms | React Hook Form + Zod |
| Auth | MSAL (Azure AD / Entra ID) |
| Backend | Microsoft Dataverse Web API |
| Hosting | Azure Static Web Apps |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Access to a Microsoft Dataverse environment
- An Azure AD app registration

### Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_CLIENT_ID=<your-azure-ad-app-client-id>
VITE_TENANT_ID=<your-azure-ad-tenant-id>
VITE_DATAVERSE_URL=https://<your-org>.crm11.dynamics.com
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app runs on [http://localhost:5176](http://localhost:5176) by default.

### Build

```bash
npm run build          # Production build
npm run build:check    # Type-check then build
```

### Quality Checks

```bash
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier formatting
npm run format:check   # Check formatting
```

## Project Structure

```
src/
├── api/                    # Dataverse Web API client and entity operations
│   ├── dataverse/          # Dataverse client, types, entity modules
│   └── flows/              # Power Automate flow integration
├── components/             # React components by feature area
│   ├── admin/              # Admin management (units, agency workers)
│   ├── auth/               # Authentication (MSAL provider, login)
│   ├── common/             # Shared UI (header, sidenav, error boundaries)
│   ├── daily/              # Daily view components
│   ├── dashboard/          # Dashboard widgets
│   ├── requests/           # Shift swap request components
│   ├── rota/               # Rota grid and shift management
│   ├── shifts/             # Shift-specific components
│   └── staff/              # Staff management components
├── config/                 # MSAL configuration
├── data/                   # Dummy data generators (development)
├── features/               # Self-contained feature modules
│   └── shift-patterns/     # Pattern library, builder, assignment
├── hooks/                  # Global custom hooks
├── pages/                  # Route-level page components
├── repositories/           # Repository pattern (domiciliary features)
├── services/               # Business logic services
├── store/                  # Zustand state stores
├── types/                  # Shared TypeScript type definitions
└── utils/                  # Utility functions
```

## Deployment

The application deploys automatically to Azure Static Web Apps via GitHub Actions on push to `main`. Pull requests generate preview environments.

## Documentation

Additional documentation is available in the `docs/` directory:

- **DATAVERSE-DEVELOPMENT-GUIDE.md** — Dataverse API conventions and schema naming rules
- **CURSOR-DOMICILIARY-SUPPORTED-LIVING-ROSTERING.md** — Domiciliary care feature specification
- **MOBILE-APP-SHIFT-SWAP-SPEC.md** — Mobile shift swap specification
- **OPEN-SHIFTS-DATAVERSE-SCHEMA.md** — Open shifts Dataverse schema
- **QA-Dashboard-Feature-Guide.md** — Dashboard QA test scripts

## Licence

Proprietary — CarePoint365
