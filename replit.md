# YouTube Trust Analyzer

## Overview

This is a full-stack web application built to analyze the trustworthiness of YouTube videos by examining their comments using sentiment analysis. The app allows users to search for YouTube videos, analyze comment patterns, and generate trust scores based on various factors including sentiment, spam detection, and bot-like behavior identification.

**Status: Fully functional and deployed** - The application is running successfully with YouTube API integration, comprehensive comment analysis, and automatic trust scoring on search results.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL session store

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon
- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: Drizzle Kit for schema management
- **Fallback Storage**: In-memory storage implementation for development

## Key Components

### Database Schema
- **Videos Table**: Stores YouTube video metadata including title, description, channel info, view counts, and trust scores
- **Comments Table**: Stores individual comment data with sentiment analysis results and quality indicators
- **Analysis Results Table**: Aggregated analysis data per video including sentiment distribution and trust metrics

### API Services
- **YouTube Service**: Integrates with YouTube Data API v3 for video search and comment retrieval
- **Sentiment Service**: Analyzes comment sentiment using keyword-based classification
- **Storage Service**: Abstracts database operations with interface-based design

### Frontend Components
- **Video Search**: Interface for searching YouTube videos with filtering options
- **Video Card**: Displays video information with analysis triggers
- **Comment Analysis**: Shows detailed comment breakdown with filtering and sorting
- **Trust Meter**: Visual representation of video trustworthiness scores

## Data Flow

1. **Search Flow**: User searches for videos → API calls YouTube service → Results stored in database → **Automatic quick analysis** performed (50 comments) → Trust scores calculated → Frontend displays video cards with trust meters
2. **Deep Analysis Flow**: User triggers deep analysis → API fetches comprehensive comments (up to 500 + replies) → Enhanced sentiment analysis performed → Results stored and aggregated → Detailed trust score calculated → Frontend updates with comprehensive analysis results
3. **Export Flow**: User requests data export → API generates JSON report → File downloaded to user's device

## Recent Improvements (January 2025)

### Enhanced ML-Inspired Sentiment Analysis
- **Weighted scoring system** with positive/negative word importance levels
- **Context-aware analysis** including negation detection and intensifiers
- **Content quality indicators** analyzing personal experience, specific details, and engagement patterns
- **Advanced trust scoring** incorporating like ratios, comment length, and engagement quality
- **Pattern recognition** for detecting spam, bot behavior, and suspicious activity

### Automatic Trust Analysis
- **Instant trust scores** displayed on search results without manual analysis
- **Quick preview analysis** using 50 comments for immediate feedback
- **Deep analysis button** for comprehensive review of up to 500 comments + replies
- **Enhanced comment collection** including replies and threaded discussions
- **Intelligent result count filtering** properly handling 5, 10, 15, 20+ result requests

### User Experience Improvements
- **Automatic analysis on search** - No need to click each video individually
- **Visual trust indicators** with color-coded trust levels and explanations
- **Comprehensive comment pagination** fetching all available comments
- **Better loading states** showing analysis progress
- **Enhanced error handling** for videos with disabled comments

## External Dependencies

### APIs
- **YouTube Data API v3**: Required for video search and comment retrieval (API key needed)

### Database
- **Neon Database**: Serverless PostgreSQL provider
- **Connection**: Uses `@neondatabase/serverless` driver

### UI Libraries
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## Deployment Strategy

### Development
- **Server**: Development server runs on `tsx` with hot reloading
- **Client**: Vite dev server with HMR
- **Database**: Connects to Neon database via environment variable

### Production
- **Build Process**: 
  - Frontend: Vite builds to `dist/public`
  - Backend: esbuild bundles server code to `dist/index.js`
- **Deployment**: Single process serving both API and static files
- **Database**: Production Neon database connection

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `YOUTUBE_API_KEY`: YouTube Data API key (required for video search)
- `NODE_ENV`: Environment designation (development/production)

### Architecture Decisions

**Monorepo Structure**: Chose to keep frontend, backend, and shared code in a single repository for easier development and deployment. This simplifies dependency management and allows for shared TypeScript types.

**Drizzle ORM**: Selected over other ORMs for its TypeScript-first approach and excellent performance. Provides type safety while maintaining SQL-like syntax.

**In-Memory Fallback**: Implemented memory storage as fallback to ensure the application can run without database connectivity during development.

**Component-Based Architecture**: Used shadcn/ui components for consistent design system and rapid development while maintaining customization flexibility.

**TanStack Query**: Chosen for its excellent caching, background updates, and error handling capabilities for API state management.

**Neon Database**: Selected for its serverless nature, excellent TypeScript support, and seamless integration with modern web applications.