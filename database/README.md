# Database Documentation

This directory contains all database-related files for the Noctisium application, organized by purpose.

## Directory Structure

```
database/
├── schemas/           # Complete database schemas
├── migrations/        # Database migrations (numbered)
├── policies/          # Row Level Security (RLS) policies
├── functions/         # Database functions and procedures
└── legacy/           # Old/deprecated SQL files
```

## Schemas

### `schemas/main_schema.sql`
Complete database schema including all tables, triggers, and functions for the main application.

### `schemas/kanban_schema.sql`
Schema for the kanban board functionality including boards, columns, and tasks.

## Migrations

Run these in order when setting up or updating your database:

1. **`001_fix_sprints_table.sql`** - Comprehensive fix for sprints table with missing columns
2. **`002_add_sprint_columns.sql`** - Alternative migration for adding sprint columns
3. **`003_simple_migration.sql`** - Fallback simple migration
4. **`004_kanban_migration.sql`** - Adds soft delete functionality to kanban tasks

## Policies

### `sprints_update_policy.sql`
Row Level Security policies for the sprints table to ensure users can only access their own data.

## Functions

### `delete_sprint_function.sql`
Database function for safely deleting sprints with proper logging and error handling.

## Usage Instructions

### Initial Setup
1. Run the main schema: `schemas/main_schema.sql`
2. Run the kanban schema: `schemas/kanban_schema.sql`
3. Apply RLS policies: `policies/sprints_update_policy.sql`

### Troubleshooting
If you encounter issues with the sprints table:
1. Try `migrations/001_fix_sprints_table.sql` first
2. If that fails, use `migrations/003_simple_migration.sql`

### Adding New Features
- New tables/schemas → `schemas/`
- Database changes → `migrations/` (with sequential numbering)
- Access control → `policies/`
- Custom functions → `functions/`

## Legacy Files

The `legacy/` directory contains old SQL files that are kept for reference but should not be used in production. These include various iterations of schema files and debugging scripts from development. 