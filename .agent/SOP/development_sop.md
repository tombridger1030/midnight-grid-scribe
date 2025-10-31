# Development Standard Operating Procedures

## Overview

This document outlines the standard operating procedures for developing and maintaining the Noctisium project. Following these procedures ensures consistency, quality, and efficient collaboration.

## Project Setup

### Initial Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd noctisium
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env.local` (if exists)
   - Configure Supabase connection in `src/lib/supabase.ts`
   - Set up any required environment variables

4. **Database Setup**
   - Run initial schema: `database/schemas/main_schema.sql`
   - Run kanban schema: `database/schemas/kanban_schema.sql`
   - Apply necessary migrations from `database/migrations/`
   - Set up RLS policies: `database/policies/`

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```
   - Development server runs on `http://localhost:8080`
   - Hot reload enabled for rapid development

2. **Build for Production**
   ```bash
   npm run build
   ```
   - Creates optimized production build
   - Output in `dist/` directory

3. **Linting**
   ```bash
   npm run lint
   ```
   - Runs ESLint for code quality checks
   - Fix issues automatically where possible

## Database Management

### Schema Changes

1. **New Table Creation**
   - Create schema file in `database/schemas/`
   - Follow naming conventions: `snake_case` for tables/columns
   - Include proper constraints and indexes
   - Add RLS policies for multi-tenant security

2. **Table Modifications**
   - Create numbered migration in `database/migrations/`
   - Use sequential numbering (next available number)
   - Include both `UP` and `DOWN` operations mentally
   - Test migrations on development environment first

3. **Migration Naming Convention**
   ```
   XXX_descriptive_migration_name.sql
   Example: 021_cash_console_complete_setup.sql
   ```

### Database Functions and Triggers

1. **Function Creation**
   - Place in appropriate schema file or migration
   - Use clear, descriptive function names
   - Include proper error handling
   - Document function purpose and parameters

2. **Trigger Management**
   - Include `DROP TRIGGER IF EXISTS` before creation
   - Use consistent naming: `table_name_action`
   - Test trigger functionality thoroughly

## Component Development

### Component Structure

1. **File Organization**
   ```
   src/components/
   ├── ui/                     # shadcn/ui components (don't modify directly)
   ├── feature/                # Feature-specific components
   │   ├── ComponentName.tsx
   │   └── ComponentName.types.ts (if needed)
   └── shared/                 # Reusable components
   ```

2. **Component Template**
   ```tsx
   import React from 'react';
   import { cn } from '@/lib/utils';

   interface ComponentNameProps {
     // Define props here
   }

   const ComponentName: React.FC<ComponentNameProps> = ({ ...props }) => {
     return (
       <div className={cn("base-classes", "additional-classes")}>
         {/* Component content */}
       </div>
     );
   };

   export default ComponentName;
   ```

### UI Component Guidelines

1. **Using shadcn/ui Components**
   - Import from `@/components/ui/[component].tsx`
   - Don't modify shadcn/ui components directly
   - Extend functionality through wrapper components

2. **Styling Conventions**
   - Use Tailwind CSS classes
   - Follow utility-first approach
   - Use `cn()` utility for conditional classes
   - Maintain consistent spacing and color palette

3. **Accessibility**
   - Include proper ARIA labels
   - Ensure keyboard navigation
   - Test with screen readers
   - Follow WCAG guidelines

## State Management

### Zustand Store Usage

1. **Store Structure**
   ```typescript
   import { create } from 'zustand';

   interface FeatureStore {
     // State
     data: any;
     loading: boolean;

     // Actions
     fetchData: () => Promise<void>;
     updateData: (newData: any) => void;
   }

   const useFeatureStore = create<FeatureStore>((set, get) => ({
     // Initial state
     data: null,
     loading: false,

     // Actions
     fetchData: async () => {
       set({ loading: true });
       try {
         const data = await apiCall();
         set({ data, loading: false });
       } catch (error) {
         console.error(error);
         set({ loading: false });
       }
     },

     updateData: (newData) => set({ data: newData }),
   }));

   export default useFeatureStore;
   ```

2. **Store Usage in Components**
   ```tsx
   import useFeatureStore from '@/stores/featureStore';

   const Component = () => {
     const { data, loading, fetchData } = useFeatureStore();

     useEffect(() => {
       if (!data) {
         fetchData();
       }
     }, [data, fetchData]);

     // Component logic
   };
   ```

### React Query Integration

1. **Query Hooks**
   ```tsx
   import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
   import { supabase } from '@/lib/supabase';

   export const useUserData = () => {
     return useQuery({
       queryKey: ['userData'],
       queryFn: async () => {
         const { data, error } = await supabase
           .from('table_name')
           .select('*');

         if (error) throw error;
         return data;
       },
     });
   };
   ```

## API Integration

### Supabase Client Usage

1. **Query Patterns**
   ```typescript
   // Read operations
   const { data, error } = await supabase
     .from('table_name')
     .select('*')
     .eq('user_id', userId)
     .order('created_at', { ascending: false });

   // Write operations
   const { data, error } = await supabase
     .from('table_name')
     .insert([{ ...data }])
     .select();
   ```

2. **Error Handling**
   ```typescript
   try {
     const { data, error } = await supabase
       .from('table_name')
       .select('*');

     if (error) throw error;
     return data;
   } catch (error) {
     console.error('Database error:', error);
     // Handle error appropriately
   }
   ```

### Real-time Subscriptions

1. **Setting up Subscriptions**
   ```typescript
   useEffect(() => {
     const subscription = supabase
       .channel('table_changes')
       .on('postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'table_name',
           filter: `user_id=eq.${userId}`
         },
         (payload) => {
           // Handle real-time updates
           handleUpdate(payload);
         }
       )
       .subscribe();

     return () => subscription.unsubscribe();
   }, [userId]);
   ```

## Testing

### Unit Testing

1. **Component Testing**
   ```typescript
   import { render, screen } from '@testing-library/react';
   import Component from './Component';

   test('renders component correctly', () => {
     render(<Component />);
     expect(screen.getByText('Expected text')).toBeInTheDocument();
   });
   ```

2. **Hook Testing**
   ```typescript
   import { renderHook, act } from '@testing-library/react';
   import useCustomHook from './useCustomHook';

   test('hook updates state correctly', () => {
     const { result } = renderHook(() => useCustomHook());

     act(() => {
       result.current.updateState('new value');
     });

     expect(result.current.state).toBe('new value');
   });
   ```

### Integration Testing

1. **API Integration**
   ```typescript
   test('API integration works correctly', async () => {
     const mockData = { /* test data */ };
     jest.spyOn(supabase, 'from').mockReturnValue({
       select: jest.fn().mockReturnValue({
         eq: jest.fn().mockReturnValue({
           data: mockData,
           error: null,
         }),
       }),
     } as any);

     // Test component behavior
   });
   ```

## Code Quality

### TypeScript Guidelines

1. **Type Definitions**
   ```typescript
   // Use interfaces for object shapes
   interface UserData {
     id: string;
     name: string;
     email: string;
   }

   // Use types for unions or computed types
   type Status = 'active' | 'inactive' | 'pending';
   ```

2. **Generic Types**
   ```typescript
   interface ApiResponse<T> {
     data: T;
     success: boolean;
     message?: string;
   }

   const response: ApiResponse<UserData> = await fetchData();
   ```

### Code Style

1. **ESLint Configuration**
   - Follow existing ESLint rules
   - Fix linting issues before committing
   - Use consistent formatting (Prettier if configured)

2. **Naming Conventions**
   - Components: PascalCase (`UserProfile.tsx`)
   - Functions: camelCase (`fetchUserData`)
   - Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
   - Files: kebab-case for utilities (`date-utils.ts`)

## Git Workflow

### Branch Strategy

1. **Main Branch**
   - `main`: Production-ready code
   - Protected branch, require PR reviews

2. **Feature Branches**
   ```bash
   git checkout -b feature/new-feature-name
   git checkout -b fix/bug-description
   git checkout -b docs/update-documentation
   ```

3. **Commit Messages**
   ```
   type(scope): description

   Examples:
   feat(auth): add user authentication
   fix(metrics): resolve calculation error
   docs(readme): update installation instructions
   ```

### Pull Request Process

1. **PR Requirements**
   - Clear description of changes
   - Test cases included
   - Documentation updated if needed
   - No merge conflicts

2. **Review Process**
   - Self-review before requesting others
   - Address all review comments
   - Ensure CI/CD passes
   - Squash commits if needed

## Deployment

### Build Process

1. **Production Build**
   ```bash
   npm run build
   ```
   - Optimized for production
   - Code splitting and minification
   - Environment-specific configurations

2. **Environment Variables**
   - Production values set in deployment environment
   - No sensitive data in code repository
   - Use `.env.example` for documentation

### Release Process

1. **Version Management**
   - Follow semantic versioning
   - Update package.json version
   - Create git tag for releases

2. **Deployment Checklist**
   - [ ] All tests passing
   - [ ] Build successful
   - [ ] Database migrations applied
   - [ ] Environment variables configured
   - [ ] Documentation updated

## Troubleshooting

### Common Issues

1. **Build Errors**
   - Check TypeScript compilation
   - Verify imports and exports
   - Ensure all dependencies installed

2. **Database Issues**
   - Verify Supabase connection
   - Check RLS policies
   - Review migration status

3. **Performance Issues**
   - Analyze bundle size
   - Check for memory leaks
   - Optimize database queries

### Debugging

1. **Development Tools**
   - React Developer Tools
   - Browser DevTools
   - Supabase Dashboard

2. **Logging**
   ```typescript
   console.log('Debug info:', data);
   console.error('Error occurred:', error);
   console.warn('Warning:', warning);
   ```

---

## Related Documentation
- [Project Architecture](./project_architecture.md)
- [Database Schema](./database_schema.md)
- [Tasks & Features](./tasks/)