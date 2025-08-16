# Overview

This is a full-stack web application for "Marathi Vidyalaya" - a Marathi school-themed educational platform featuring a smart AI tutor. The application combines a modern React frontend with an Express.js backend to deliver an interactive learning experience. The core feature is a floating, draggable chatbot widget that supports multilingual conversations (English, Hindi, and Marathi) with both text and voice input capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built using React with TypeScript and follows a component-based architecture:

- **Framework**: React 18 with Vite as the build tool for fast development and optimized production builds
- **Styling**: Tailwind CSS with a custom design system featuring school-themed colors (saffron, green, white) and typography
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible design
- **State Management**: TanStack Query for server state management and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Build System**: Vite with TypeScript support and path aliases for clean imports

## Backend Architecture

The backend follows a RESTful API pattern with Express.js:

- **Framework**: Express.js with TypeScript for type safety
- **API Design**: RESTful endpoints with centralized route management
- **Data Storage**: In-memory storage implementation with interface for future database integration
- **Error Handling**: Centralized error middleware with structured error responses
- **Development**: Hot reload with tsx for seamless development experience

## Core Features

### Chatbot Widget
- **Draggable Interface**: Floating widget with drag-and-drop functionality across the screen
- **Multi-modal Input**: Supports both text input and voice commands via Web Speech API
- **Language Support**: Dynamic language switching between English, Hindi, and Marathi with automatic conversation reset
- **Voice Features**: Speech-to-text input and text-to-speech output with language-specific voice selection

### AI Integration
- **AI Provider**: Google Gemini AI for generating contextual responses
- **Language Context**: System prompts tailored for each language to ensure responses match the selected language
- **Educational Focus**: Tutor persona with student-friendly explanations

## Data Layer

### Schema Design
Using Drizzle ORM with PostgreSQL schema definitions:
- **Users Table**: Basic user management with username/password authentication
- **Chat Messages Table**: Conversation history with message content, language, response, and timestamps
- **Type Safety**: Zod schemas for runtime validation and TypeScript inference

### Storage Strategy
- **Development**: In-memory storage for rapid prototyping and testing
- **Production Ready**: Database interface abstractions prepared for PostgreSQL integration
- **Migration Support**: Drizzle migrations configured for schema evolution

## Styling and Design

### Design System
- **Theme**: Marathi school aesthetic with warm, educational colors
- **Typography**: Custom font stack with educational-friendly typefaces
- **Components**: Consistent design language with glassmorphism effects for modern appeal
- **Responsive**: Mobile-first design with adaptive layouts

### CSS Architecture
- **Utility-First**: Tailwind CSS for rapid development and consistent spacing
- **Custom Properties**: CSS variables for theme customization and dark mode support
- **Component Styling**: Scoped styles with Tailwind's component layer

## Development Workflow

### Build Process
- **Development**: Vite dev server with hot module replacement
- **Production**: Optimized builds with code splitting and asset optimization
- **Type Checking**: TypeScript compilation with strict mode enabled

### Code Organization
- **Monorepo Structure**: Shared types and schemas between frontend and backend
- **Path Aliases**: Clean import statements with @ and @shared prefixes
- **Component Structure**: Modular components with clear separation of concerns

# External Dependencies

## AI Services
- **Google Gemini AI**: Natural language processing for generating educational responses and multilingual conversation support

## Database
- **PostgreSQL**: Primary database with Neon Database serverless hosting for scalable data storage
- **Drizzle ORM**: Type-safe database operations with migration support

## Browser APIs
- **Web Speech API**: Client-side speech recognition and synthesis for voice interaction features

## UI Framework
- **Radix UI**: Headless, accessible component primitives for form controls, dialogs, and interactive elements
- **shadcn/ui**: Pre-built component library with consistent design patterns

## Development Tools
- **Vite**: Fast build tool with plugin ecosystem for React development
- **TanStack Query**: Server state management for efficient data fetching and caching
- **Wouter**: Lightweight routing solution for single-page application navigation

## Styling
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **PostCSS**: CSS processing with autoprefixer for browser compatibility

## TypeScript Ecosystem
- **Zod**: Runtime schema validation and type inference
- **Class Variance Authority**: Type-safe component variant management