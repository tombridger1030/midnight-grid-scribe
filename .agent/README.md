# Noctisium Documentation Hub

Welcome to the Noctisium project documentation. This directory contains comprehensive documentation about the system architecture, development processes, and feature specifications.

## Quick Navigation

### 🏗️ System Documentation
- **[Project Architecture](./System/project_architecture.md)** - Complete overview of system design, tech stack, and architecture patterns
- **[Database Schema](./System/database_schema.md)** - Detailed database structure, relationships, and migration strategy

### 📋 Tasks & Features
- **[Tasks Overview](./tasks/README.md)** - Product requirements and implementation plans for all features

### 📖 Development Standards & Procedures (SOP)
- **[Development SOP](./SOP/development_sop.md)** - Standard operating procedures for development workflow

## Getting Started

### For New Developers
1. Start with [Project Architecture](./System/project_architecture.md) to understand the system
2. Review [Development SOP](./SOP/development_sop.md) for coding standards and workflow
3. Check [Tasks Overview](./tasks/README.md) to see current feature development status

### For Feature Development
1. Read the specific feature documentation in `./tasks/`
2. Understand the database impact from [Database Schema](./System/database_schema.md)
3. Follow [Development SOP](./SOP/development_sop.md) for implementation guidelines

### For Database Changes
1. Review [Database Schema](./System/database_schema.md) for current structure
2. Follow migration procedures in [Development SOP](./SOP/development_sop.md)
3. Update documentation after schema changes

## Documentation Structure

```
.agent/
├── README.md                    # This file - documentation hub
├── System/                      # System architecture and database
│   ├── project_architecture.md  # System design and tech stack
│   └── database_schema.md       # Database structure and relationships
├── SOP/                         # Development standards and procedures
│   └── development_sop.md       # Development workflow and best practices
└── tasks/                       # Feature specifications and PRDs
    ├── README.md               # Tasks overview and index
    ├── metrics-input.md        # Daily metrics input system
    ├── data-visualization.md   # Charts and analytics
    ├── sprint-management.md    # Sprint cycle tracking
    └── [other features...]
```

## Key Concepts

### System Philosophy
- **Terminal-Inspired Design**: Minimal, efficient interface for power users
- **Flexible Metrics**: Configurable KPIs for personalized tracking
- **Sprint-Based Productivity**: 21-day ON / 7-day OFF work cycles
- **Data Portability**: Import/export functionality for user ownership

### Technical Pillars
- **Multi-Tenant Architecture**: Secure user data isolation
- **Real-Time Sync**: Live data updates across devices
- **Progressive Web App**: Offline-first with sync capabilities
- **Component-Based Design**: Modular, reusable React components

### Data Management
- **Structured + Flexible**: Hybrid approach with traditional tables and JSONB
- **Migration Strategy**: Numbered, backward-compatible schema changes
- **Security First**: Row-level security and proper access controls

## Current Status

### ✅ Completed Features
- Core metrics tracking system
- Sprint management with visual calendar
- Goal tracking with progress calculation
- Financial dashboard with MRR tracking
- Content creation analytics
- User authentication and profiles
- Kanban task management
- Data import/export functionality

### 🚧 In Development
- Mobile responsiveness improvements
- Advanced data visualizations
- Real-time collaboration features

### 📋 Planned Features
- Team/workspace functionality
- Advanced analytics and insights
- Integration with external services
- Mobile app development

## Contributing to Documentation

### Documentation Standards
- **Consistency**: Use similar structure across documents
- **Clarity**: Write for different audiences (developers, product managers, users)
- **Currency**: Keep documentation up-to-date with code changes
- **Cross-References**: Link related documents for context

### Update Process
1. Make code changes
2. Update relevant documentation immediately
3. Update this README if new documents are added
4. Review all linked documents for accuracy

### Document Templates
- Use existing documents as templates
- Include "Related Documentation" sections
- Add table of contents for longer documents
- Use consistent formatting and styling

## Development Workflow Integration

### Before Starting Development
1. Read relevant feature documentation in `./tasks/`
2. Understand database impact from `./System/database_schema.md`
3. Review [Development SOP](./SOP/development_sop.md) for standards

### During Development
1. Update documentation as you implement features
2. Document any schema changes in migration files
3. Note any deviations from planned implementation

### After Development
1. Update feature documentation with final implementation details
2. Add any new architectural patterns to `./System/project_architecture.md`
3. Update [Development SOP](./SOP/development_sop.md) if new processes are introduced

## Support and Questions

### Getting Help
1. Check existing documentation first
2. Look in related documents for cross-references
3. Review Git history for recent changes
4. Check issue tracker for known problems

### Providing Feedback
1. Create issues for documentation gaps
2. Suggest improvements to existing documents
3. Report outdated information
4. Contribute to documentation updates

---

## Related Resources
- **Main Project README** (../README.md) - Project overview and setup
- **Code Repository** - Source code and implementation
- **Database Schema** (database/) - SQL schema files and migrations
- **Component Library** (src/components/ui/) - shadcn/ui components

**Last Updated**: 2025-10-11
**Documentation Version**: 1.0.0