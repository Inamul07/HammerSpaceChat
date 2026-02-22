# HammerSpace Chat

An AI Chat application with Normal Chat and RAG (Retrieval-Augmented Generation) modes built with Electron, React, and PostgreSQL.

## 🎯 Features

- **Normal Chat Mode**: Direct conversations with AI models
- **RAG Mode**: Context-aware chat using your documents
- **Thread Management**: Organize conversations in separate threads
- **Document Processing**: Upload and process PDF, TXT, MD, and DOCX files
- **Configurable RAG**: Customize chunk size, retrieval count, and similarity thresholds
- **Streaming Responses**: Real-time response streaming from AI
- **Dark Mode UI**: Built with Ant Design for a sleek dark interface

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Desktop**: Electron 28
- **UI Framework**: Ant Design 5 (Dark Mode)
- **State Management**: Zustand
- **Database**: PostgreSQL with pgvector extension
- **AI Provider**: Google Gemini API (with support for more providers)
- **Document Processing**:
    - PDF: pdf-parse
    - DOCX: mammoth
    - TXT/MD: Native Node.js

## 📋 Prerequisites

Before running HammerSpace Chat, ensure you have:

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v12 or higher) with **pgvector extension** installed
3. **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Setting up PostgreSQL with pgvector

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Install pgvector extension
# Connect to your database and run:
# CREATE EXTENSION IF NOT EXISTS vector;
```

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd HammerSpaceChat

# Install dependencies
npm install
```

### Development

```bash
# Run in development mode
npm run electron:dev
```

This will start:

- Vite dev server on http://localhost:5173
- Electron window with hot-reload enabled

### Building

```bash
# Build for production
npm run electron:build
```

Built applications will be in the `release/` directory.

## 📁 Project Structure

```
HammerSpaceChat/
├── electron/              # Electron main process
│   ├── database/          # Database layer
│   │   ├── schema.ts      # SQL schema definitions
│   │   ├── manager.ts     # Connection manager
│   │   ├── operations.ts  # CRUD operations
│   │   └── index.ts       # Module exports
│   ├── main.ts            # Main process entry point
│   └── preload.ts         # Preload script (IPC bridge)
├── src/                   # React application
│   ├── components/        # React components
│   ├── store/             # Zustand state management
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   │   ├── ai.ts          # AI/Gemini integration
│   │   ├── database.ts    # Database utilities (renderer side)
│   │   └── documents.ts   # Document processing
│   ├── App.tsx            # Root component
│   ├── main.tsx           # React entry point
│   └── index.css          # Global styles
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript config (React)
├── tsconfig.electron.json # TypeScript config (Electron)
├── vite.config.ts         # Vite config
└── README.md              # This file
```

## 🗄️ Database Schema

The application uses PostgreSQL with pgvector extension. The following tables are automatically created on first connection:

### Core Tables

**threads**

- Stores both chat and RAG thread metadata
- Tracks thread type, name, and timestamps
- Auto-updates `updated_at` on modifications

**messages**

- Stores user and assistant messages
- Links to parent thread with cascade delete
- Supports message sources for RAG mode

**documents** (RAG mode)

- Tracks uploaded documents per thread
- Stores metadata: name, type, size, chunk count
- Supports PDF, TXT, MD, and DOCX formats

**embeddings** (RAG mode with pgvector)

- Stores document chunks as 768-dimensional vectors
- Uses HNSW indexing for fast similarity search
- Supports cosine similarity operations

**message_sources**

- Junction table linking messages to source documents
- Tracks similarity scores for retrieved chunks
- Enables document reference display in UI

Schema is automatically initialized when connecting to PostgreSQL for the first time.

## 🎓 Development Roadmap

### ✅ Phase 1: Project Setup & Foundation (COMPLETED)

- [x] Initialize Electron + React + TypeScript project
- [x] Set up folder structure
- [x] Install core dependencies (Zustand, Ant Design, PostgreSQL client)
- [x] Configure build tooling (Vite, TypeScript)
- [x] Create basic Electron main process and preload script
- [x] Set up React app with Ant Design dark theme
- [x] Define TypeScript types for the application

**Outcome**: Project foundation is ready with proper structure and configuration.

---

### ✅ Phase 2: Database Layer (COMPLETED)

- [x] PostgreSQL connection manager with connection pooling
- [x] Comprehensive schema definitions (threads, messages, documents, embeddings)
- [x] Auto-migration and schema initialization on first connect
- [x] IPC handlers for all database operations:
    - Database connection/disconnection/status
    - Thread CRUD operations
    - Message operations with source tracking
    - Document management
    - Embedding batch insert and vector similarity search
- [x] pgvector integration with HNSW indexing for fast similarity search
- [x] Transaction support for atomic operations
- [x] Proper foreign key constraints and cascade deletes

**Outcome**: Complete database layer with PostgreSQL + pgvector integration. All CRUD operations exposed via IPC.

**Files Created**:

- `electron/database/schema.ts` - Database schema SQL
- `electron/database/manager.ts` - Connection manager and initialization
- `electron/database/operations.ts` - CRUD operations for all entities
- `electron/database/index.ts` - Module exports
- Updated `electron/main.ts` - Added 30+ IPC handlers
- Updated `electron/preload.ts` - Exposed database API to renderer
- Updated `src/types/index.ts` - Type definitions for API responses

---

### ✅ Phase 3: Core UI & Layout (COMPLETED)

- [x] Zustand store for global state management
- [x] Main application layout with sidebar and content area
- [x] Sidebar component with:
    - Thread list with visual distinction (Chat vs RAG)
    - Database connection status indicator
    - New thread creation modal
    - Thread deletion with confirmation
    - Settings button
- [x] Chat interface component with:
    - Message display (user and assistant)
    - Message input area with send button
    - Document tags for RAG threads
    - Source citations display
    - Auto-scroll to latest message
    - Loading states
- [x] Settings modal with three tabs:
    - Database configuration with test connection
    - API key management (Gemini)
    - RAG configuration (chunk size, overlap, retrieval count, similarity threshold)
- [x] Responsive dark theme UI using Ant Design
- [x] Complete state management with Zustand

**Outcome**: Full UI implementation with all core components connected. Users can connect to database, manage threads, and view the chat interface.

**Files Created**:

- `src/store/index.ts` - Zustand store with app state
- `src/components/Layout/` - Main layout component
- `src/components/Sidebar/` - Sidebar with thread management
- `src/components/ChatView/` - Chat interface and message display
- `src/components/SettingsModal/` - Settings with database/API/RAG config
- Updated `src/components/index.ts` - Component exports
- Updated `src/App.tsx` - Integrated all components

---

### ✅ Phase 3.5: Launch Troubleshooting & Bug Fixes (COMPLETED)

After completing Phase 3, encountered and resolved several critical issues during first app launch:

**Issues Fixed**:

1. **Module System Mismatch**
    - Problem: Electron was looking for CommonJS but TypeScript was outputting ES modules
    - Solution: Changed `tsconfig.electron.json` module setting from "ESNext" to "CommonJS"
    - Impact: All Electron main process code now properly compiles to CommonJS

2. **Import.meta.url Incompatibility**
    - Problem: `import.meta.url` and `fileURLToPath` only work with ES modules
    - Solution: Removed import.meta usage, using built-in `__dirname` instead
    - Files Modified: `electron/main.ts`

3. **Schema Version Table Initialization**
    - Problem: PostgreSQL cannot execute CREATE TABLE and SELECT in a single query string
    - Error: "relation schema_version does not exist"
    - Solution: Split into separate SQL constants:
        - `CREATE_VERSION_TABLE_SQL` - Creates the table if not exists
        - `GET_VERSION_SQL` - Queries the version
    - Modified `initializeSchema()` to call CREATE before SELECT
    - Files Modified: `electron/database/schema.ts`, `electron/database/manager.ts`

4. **Build Output Path Issues**
    - Problem: TypeScript was outputting to `dist-electron/electron/main.js` instead of `dist-electron/main.js`
    - Solution: Created forwarding files that require the actual compiled files
    - Files Created: `dist-electron/main.js`, `dist-electron/preload.js`

**Outcome**: App now builds successfully and schema initialization works properly. Ready for first launch and database connection testing.

**Key Learnings**:

- Electron main process requires CommonJS (require/exports), not ES modules
- PostgreSQL pg client requires separate query calls for DDL and DML operations
- Module format must be consistent throughout the Electron main process

---

### 📅 Phase 4: Normal Chat Mode

- [ ] Gemini API integration
- [ ] Streaming response handling
- [ ] Message sending/receiving
- [ ] Thread creation and management

---

### 📅 Phase 5: RAG Mode - Part 1 (Document Processing)

- [ ] Document upload and parsing
- [ ] Text chunking with configurable parameters
- [ ] Embedding generation
- [ ] Storage in PostgreSQL with pgvector

---

### 📅 Phase 6: RAG Mode - Part 2 (Retrieval & Chat)

- [ ] Vector similarity search
- [ ] Context injection into prompts
- [ ] Document reference display
- [ ] Source citation in responses

---

### 📅 Phase 7: Polish & Configuration

- [x] Settings UI for RAG parameters (completed in Phase 3)
- [x] Help documentation for PostgreSQL setup (completed in Phase 3)
- [x] Error handling and loading states (completed in Phase 3)
- [ ] Performance optimization

---

## 🤝 Contributing

This is a learning project. Feel free to explore and experiment!

## 📄 License

MIT

---

**Last Updated**: February 22, 2026  
**Current Phase**: Phase 3.5 Complete ✅ (Launch troubleshooting resolved)  
**Next Phase**: Phase 4 - Normal Chat Mode (Gemini API Integration)  
**Status**: App builds successfully, ready for first launch and database connection testing
