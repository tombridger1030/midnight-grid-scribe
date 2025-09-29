# Noctisium Multi-User Setup Guide

## 🚀 Quick Start

Your Noctisium app has been successfully transformed into a multi-user cyberpunk terminal experience! Here's how to complete the setup:

## 1. Database Migration

**Run the database migration in your Supabase SQL Editor:**

1. Go to your Supabase dashboard → SQL Editor
2. Copy and paste the contents of `database-migration.sql`
3. Execute the migration
4. Verify tables are created: `user_profiles`, `user_configs`, `user_kpis`, `user_goals`

## 2. Environment Variables (Optional)

**For GitHub integration, create a `.env` file:**

```bash
cp .env.example .env
```

Then edit `.env` with your GitHub credentials:
- Create a GitHub Personal Access Token at https://github.com/settings/tokens
- Add your username and repositories
- Set `VITE_GITHUB_SYNC_ENABLED=true`

## 3. Start the Application

```bash
npm run dev
```

## ✨ New Features

### 🔐 Cyberpunk Authentication
- Matrix rain background animation
- Terminal boot sequence
- ASCII art branding
- Secure email/password authentication
- User registration with custom usernames

### 👤 Multi-User Support
- Each user has their own data isolation
- Custom usernames (e.g., "midnight" → "midnight@noctisium")
- Personal settings and preferences
- Individual KPI configurations

### ⚙️ Configurable KPIs
- Default KPIs: Strength Sessions, BJJ Sessions, Deep Work Hours, Recovery Sessions
- Add custom KPIs with:
  - Custom names, targets, and units
  - Color coding by category
  - Enable/disable toggles
- 10 additional KPI templates available

### 🎨 User Preferences
- **Module Control**: Enable/disable Content tab and other modules
- **Theme Settings**: Matrix background, glitch effects, animations
- **Dashboard Layout**: Customize which components show
- **Export/Import**: Backup your settings

### 🚦 Smart Navigation
- Dynamic navigation based on user preferences
- Profile dropdown with settings access
- Context-aware terminal prompts

## 🎯 Default User Experience

### First-Time User Flow:
1. **Boot Sequence**: Cyberpunk terminal initialization
2. **Registration**: Create account with custom username
3. **Auto-Setup**: Default KPIs and preferences configured
4. **Dashboard**: Personalized experience ready

### For "midnight" Username:
- Displays as "USER: MIDNIGHT"
- Email shows as "midnight@noctisium"
- Special cyberpunk operator theme

## 📱 Key Components

### Authentication (`src/contexts/AuthContext.tsx`)
- Supabase authentication integration
- User profile management
- Session handling

### Storage (`src/lib/userStorage.ts`)
- User-aware data operations
- Hybrid localStorage + Supabase sync
- Automatic user ID injection

### KPI Management (`src/lib/configurableKpis.ts`)
- Dynamic KPI system
- Template KPIs users can add
- Progress tracking and analytics

### Preferences (`src/lib/userPreferences.ts`)
- Complete user customization
- Module toggles
- Theme settings

### Cyberpunk UI Components
- `MatrixBackground`: Animated terminal rain
- `GlitchText`: Text effects on errors
- `TerminalBootSequence`: Startup animation
- `CyberpunkLogin`: Main login interface

## 🔧 Configuration Options

### Available Modules:
- Dashboard (always enabled)
- Weekly KPIs
- Analytics/Visualizer
- Roadmap & Goals
- Cash Management
- Content Creation (optional)

### KPI Categories:
- Fitness (💪)
- Health (❤️)
- Productivity (⚡)
- Social (👥)
- Learning (📚)
- Discipline (🧘)
- Engineering (⚙️)
- Custom (🎯)

### Theme Options:
- Terminal style: Cyberpunk/Classic/Minimal
- Matrix background: On/Off
- Glitch effects: On/Off
- Animations: On/Off
- Sound effects: On/Off (placeholder)

## 🗃️ Database Schema

### Core Tables:
- `user_profiles`: Username, display name, preferences
- `user_configs`: Key-value configuration storage
- `user_kpis`: Custom KPI definitions per user
- `user_goals`: Roadmap goals per user

### Updated Tables:
All existing tables now include `user_id` for data isolation:
- `weekly_kpis`: Weekly KPI tracking
- `ships`: Achievement logging
- `content_data`: Content metrics
- `metrics`: Daily tracking data

## 🚨 Breaking Changes

### Removed:
- `PinUnlockOverlay` (replaced with full auth)
- Hardcoded `FIXED_USER_ID`
- Static navigation menu
- Single-user localStorage-only storage

### Changed:
- All data operations now require authentication
- Navigation items dynamically loaded
- User display shows actual username
- KPI definitions per user instead of global

## 🎮 User Roles & Examples

### Midnight Operator (`midnight@noctisium`)
- Elite cyberpunk theme
- Full module access
- Advanced KPI tracking

### Regular Users
- Standard terminal interface
- Customizable modules
- Personal KPI configurations

## 🔍 Troubleshooting

### Common Issues:

1. **"No user ID set" warnings**: User needs to be authenticated
2. **Empty KPI list**: Run KPI initialization or add manually
3. **Navigation missing**: Check user preferences → enabled modules
4. **GitHub sync failing**: Verify environment variables in `.env`
5. **Database errors**: Ensure migration was run successfully

### Debug Commands:
```javascript
// In browser console
window.userStorage.getCurrentUserId()
window.testGitHubIntegration()
```

## 🎉 Success!

Your Noctisium app now supports:
- ✅ Multi-user authentication with cyberpunk aesthetics
- ✅ Per-user data isolation and security
- ✅ Configurable KPIs and preferences
- ✅ Dynamic navigation and theming
- ✅ Professional user management
- ✅ Backward-compatible data migration

Welcome to the NOCTISIUM network, operator. Your neural interface is ready.