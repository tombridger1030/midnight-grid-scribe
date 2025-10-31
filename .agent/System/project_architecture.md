# Noctisium Project Architecture

## Project Overview

Noctisium is a terminal-inspired personal metrics tracking system designed for extreme-performance productivity tracking. The application, codenamed "Midnight Terminal Tracker," is built for users running 21-day on / 7-day off sprints to track various personal metrics including deep work, workouts, calories, sleep, finance, and habits.

## Tech Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.1 with SWC plugin
- **UI Components**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS 3.4.11 with animations
- **State Management**: Zustand 5.0.6
- **Routing**: React Router DOM 6.26.2
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts 2.15.4
- **Query Client**: TanStack Query 5.56.2 for server state

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase real-time subscriptions
- **Storage**: LocalStorage fallback with Supabase persistence

### Development Tools
- **Package Manager**: npm (with bun.lockb present)
- **Linting**: ESLint with TypeScript support
- **Type Checking**: TypeScript 5.5.3

## Application Architecture

### Core Components Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui component library
│   ├── content/              # Content tracking components
│   ├── cyberpunk/            # Login/authentication UI
│   └── [various].tsx         # Feature-specific components
├── contexts/                 # React contexts (Date, Auth)
├── hooks/                    # Custom React hooks
├── lib/                      # Utility libraries and services
├── pages/                    # Route components
├── stores/                   # Zustand stores
└── main.tsx                  # Application entry point
```

### Key Features

#### 1. Authentication & User Management
- Cyberpunk-themed authentication interface
- Supabase-based user authentication with admin support
- Profile management with preferences and module configuration
- Multi-user support with proper data isolation
- User configuration management for integrations (GitHub, etc.)

#### 2. Metrics Tracking System
- **Configurable KPIs**: User-defined key performance indicators with advanced options
- **Daily Metrics**: JSON-based flexible metric storage
- **Weekly Reviews**: Structured weekly performance analysis with completion tracking
- **Ranking System**: Performance categorization and scoring
- **Average & Reverse Scoring**: Advanced KPI calculation methods

#### 3. Sprint Management
- **Customizable Cycles**: Configurable ON/OFF day periods
- **Auto-Status Updates**: Sprint transitions (planned → active → completed)
- **Visual Calendar**: Color-coded sprint phases and habit compliance
- **Historical Tracking**: Complete sprint history with editable periods

#### 4. Content Creation Tracking
- **Multi-Platform Support**: Track content across different platforms
- **Performance Metrics**: Views, engagement, swipe rates, revenue
- **Weekly Analytics**: Content performance trends and insights
- **Import/Export**: Data portability via JSON and CSV

#### 5. Financial Dashboard
- **Revenue Tracking**: MRR and financial metrics
- **Runway Calculator**: Financial sustainability projections
- **Cash Console**: Financial metrics visualization

#### 6. Skill Progression System
- **Skill Tracking**: Competency development monitoring
- **Progress Visualization**: Skill advancement charts
- **KPI Integration**: Skills tied to performance metrics

## Database Architecture

### Core Tables

#### Main Schema (`main_schema.sql`)
- **goals**: Yearly and monthly goal tracking with progress calculation
- **metrics**: Daily metric data storage (JSONB for flexibility)
- **financial_metrics**: Financial data (MRR, net worth)
- **sprints**: Sprint cycle management
- **roadmaps**: Goal and milestone tracking

#### Extended Core Schema (via 018_complete_database_setup_fixed.sql)
- **user_profiles**: User authentication and preferences with admin support
- **user_configs**: User-specific configuration settings (GitHub integrations, etc.)
- **user_kpis**: User-defined KPI configurations with advanced options
- **weekly_kpis**: Weekly aggregated KPI data
- **weekly_kpi_entries**: Detailed weekly KPI entries with completion tracking
- **content_metrics**: Platform-specific content performance metrics
- **platform_metrics**: General platform performance tracking

#### Kanban Schema (`kanban_schema.sql`)
- **kanban_boards**: Project/Initiative boards
- **kanban_columns**: Task status columns
- **kanban_tasks**: Individual tasks with soft delete support

#### Advanced Features Schema (via migrations)
- **content_items**: Content creation tracking
- **skill_progression**: Skill development tracking
- **ranking_system**: Performance categorization and scoring

### Key Design Patterns

#### Data Storage
- **JSONB Usage**: Flexible metric storage in `metrics.data` and `goals.monthly`
- **Soft Deletes**: Tasks marked as deleted rather than removed
- **Timestamp Triggers**: Automatic `updated_at` management
- **Progress Calculation**: Automated goal progress computation

#### Security
- **Row Level Security**: User data isolation
- **User-Based Filtering**: All queries filtered by `user_id`
- **Auth Integration**: Supabase auth with user context

## State Management

### Client-Side State
- **Zustand Stores**: Feature-specific state management
  - `skillProgressionStore`: Skill progression state
- **React Context**: Global state (Date, Auth)
- **TanStack Query**: Server state caching and synchronization

### Data Flow
1. **User Interaction** → Component Event Handlers
2. **State Updates** → Local state or API calls
3. **API Calls** → Supabase queries/mutations
4. **Database Updates** → Real-time subscriptions
5. **UI Re-render** → Automatic via state changes

## Integration Points

### External Services
- **Supabase**: Database, auth, and real-time features
- **GitHub API**: Integration for development metrics (via `lib/github.ts`)

### Internal Integrations
- **Storage Layer**: Abstracted storage (`lib/storage.ts`, `lib/userStorage.ts`)
- **KPI System**: Configurable metrics management (`lib/configurableKpis.ts`)
- **Date Utilities**: Consistent date handling (`lib/dateUtils.ts`)
- **Chart Utilities**: Data visualization helpers (`lib/chartUtils.ts`)

## Routing Structure

```
/                          → Dashboard (main overview)
/kpis                      → Metrics input interface
/dashboard                 → Dashboard (alias for /)
/visualizer                → Data visualization and charts
/roadmap                   → Goals and milestones
/cash                      → Financial dashboard
/profile                   → User profile and settings
/content/                  → Content tracking section
  /dashboard               → Content overview
  /weekly                  → Weekly content analytics
  /input                   → Content data entry
```

## Key Features Deep Dive

### Terminal Aesthetics
- **Monospace Fonts**: Terminal-inspired typography
- **System Stat Indicators**: Simulated CPU/RAM usage displays
- **Typewriter Effects**: Animated text rendering
- **Color Scheme**: Terminal-inspired green/cyan color palette

### Import/Export System
- **JSON Support**: Full data serialization/deserialization
- **CSV Export**: Spreadsheet-compatible data export
- **Backup/Restore**: Complete user data backup functionality

### Performance Optimizations
- **React Query**: Intelligent caching and background refetching
- **Component Memoization**: Selective re-rendering optimization
- **Lazy Loading**: Route-based code splitting
- **Virtual Scrolling**: Efficient large dataset rendering

## Development Workflow

### Local Development
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`

### Database Management
- Schema files in `database/schemas/`
- Numbered migrations in `database/migrations/`
- Policies and functions in respective subdirectories

### Component Development
- UI components extend shadcn/ui library
- Feature components in organized subdirectories
- Consistent TypeScript patterns throughout

---

## Related Documentation
- [Database Schema Documentation](./database_schema.md)
- [Development SOP](../SOP/development_sop.md)
- [Tasks & Features](../tasks/)