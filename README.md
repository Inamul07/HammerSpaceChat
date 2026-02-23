# HammerSpace Chat

An AI Chat application with Normal Chat and RAG (Retrieval-Augmented Generation) modes built with Electron, React, and PostgreSQL.

## 🎯 Features

- **Normal Chat Mode**: Direct conversations with AI models with markdown support
- **RAG Mode**: Context-aware chat using your documents with vector similarity search
- **Thread Management**: Organize conversations in separate threads
- **Document Processing**: Upload and process PDF, TXT, MD, and DOCX files with intelligent chunking
- **Vector Embeddings**: Generate 768-dimensional embeddings using gemini-embedding-001 with Matryoshka learning
- **Similarity Search**: Fast vector search using pgvector with HNSW indexing
- **Source Citations**: View which documents were used to generate each response
- **Batch Processing**: Memory-optimized batch processing for large documents
- **Configurable RAG**: Customize chunk size, retrieval count, and similarity thresholds
- **Streaming Responses**: Real-time response streaming from AI
- **Markdown Rendering**: Full GitHub Flavored Markdown support with syntax highlighting
- **Dark Mode UI**: Built with Ant Design for a sleek dark interface
- **Database Versioning**: Auto-migration system for schema updates

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Desktop**: Electron 28
- **UI Framework**: Ant Design 5 (Dark Mode)
- **State Management**: Zustand
- **Database**: PostgreSQL with pgvector extension
- **AI Provider**: Google Gemini API
    - Chat: gemini-2.5-flash / gemini-2.5-pro / gemini-2.5-flash-lite
    - Embeddings: gemini-embedding-001 (768 dimensions with Matryoshka learning)
- **Markdown Rendering**: react-markdown + remark-gfm
- **Syntax Highlighting**: react-syntax-highlighter (VS Code Dark+ theme)
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
- Uses Google's gemini-embedding-001 with Matryoshka Representation Learning
- HNSW indexing for fast cosine similarity search
- Batch processing with memory optimization

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

### ✅ Phase 4: Normal Chat Mode (COMPLETED)

- [x] Gemini API integration with model selection
- [x] Streaming response handling with real-time display
- [x] Message sending/receiving with database persistence
- [x] Thread creation and management (completed in Phase 3)
- [x] Configurable model selection (Gemini 2.5 Pro, Flash, Flash Lite, 1.5 series)
- [x] Error handling with user-friendly messages
- [x] API key validation
- [x] Markdown rendering with GitHub Flavored Markdown support
- [x] Syntax highlighting for code blocks (180+ languages)

**Outcome**: Full Normal Chat Mode working with streaming AI responses. Users can create chat threads, send messages, and receive AI responses in real-time with rich markdown formatting and syntax-highlighted code blocks.

**Files Created/Modified**:

- `src/utils/ai.ts` - Gemini API integration with streaming support
- Updated `src/components/ChatView/ChatView.tsx` - Message sending, streaming display, markdown rendering, syntax highlighting
- Updated `src/components/ChatView/ChatView.css` - Markdown and code block styling
- Updated `src/components/SettingsModal/SettingsModal.tsx` - Added model selector dropdown
- Updated `src/types/index.ts` - Added GeminiModel type and GEMINI_MODELS constant
- Updated `src/store/index.ts` - Added geminiModel to settings state

**Markdown Features**:

- Headings (H1-H6), paragraphs, line breaks
- Bold, italic, strikethrough text formatting
- Ordered and unordered lists
- Code blocks with syntax highlighting (VS Code Dark+ theme)
- Inline code with accent coloring
- Tables with styling
- Blockquotes with visual accent
- Links with hover effects
- Horizontal rules
- Task lists (GitHub Flavored Markdown)

**Available Models**:

- Gemini 2.5 Flash (Recommended) - Industry leader for price-to-performance
- Gemini 2.5 Pro (Most Capable) - High-end reasoning with massive context
- Gemini 2.5 Flash Lite - Ultra-cost-efficient for simple tasks
- Gemini 1.5 Pro/Flash - Stable legacy versions
- Gemini Pro - Original legacy model

---

### ✅ Phase 5: RAG Mode - Part 1 (Document Processing) (COMPLETED)

- [x] Document upload with file picker integration
- [x] Multi-format document parsing (PDF, DOCX, TXT, MD)
- [x] Intelligent text chunking with configurable parameters
- [x] Smart boundary detection (paragraphs → sentences → words)
- [x] Embedding generation using gemini-embedding-001
- [x] Batch processing with memory optimization (3 chunks per batch)
- [x] Database storage with pgvector (768-dimensional vectors)
- [x] Document metadata tracking (size, type, chunk count)
- [x] Progress notifications during upload
- [x] Error handling with cleanup on failure
- [x] File size limits (2MB max, 500KB text max, 500 chunks max)
- [x] Infinite loop prevention in chunking algorithm

**Outcome**: Complete document processing pipeline. Users can upload documents (PDF, DOCX, TXT, MD) which are parsed, chunked, embedded using Gemini's embedding model, and stored in PostgreSQL with pgvector. Ultra-small batch processing prevents memory crashes even with large documents.

**Key Implementation Details**:

- **Document Parsing**:
    - PDF: pdf-parse library for text extraction
    - DOCX: mammoth library for Word document conversion
    - TXT/MD: Native Node.js fs for plain text files
    - File validation and type checking before processing
- **Text Chunking**:
    - Configurable chunk size (default: 500 characters)
    - Configurable overlap (default: 50 characters)
    - Smart boundary detection: prefers paragraph breaks, then sentence breaks, then word breaks
    - Infinite loop protection with 10,000 iteration safety limit
    - Always advances forward to prevent stuck states
- **Embedding Generation**:
    - Model: gemini-embedding-001 with output_dimensionality=768
    - Task type: RETRIEVAL_DOCUMENT for optimal RAG performance
    - Matryoshka Representation Learning for efficient 768-dim vectors
    - Rate limiting: 150ms between API calls to prevent throttling
    - Zero-vector fallback on embedding errors
- **Memory Optimization**:
    - Ultra-small batches: 3 chunks processed at a time
    - 100ms GC delay between batches
    - Immediate database insertion after each batch
    - Explicit memory cleanup (chunks array cleared)
    - File size limits enforce safety boundaries
- **Database Migration**:
    - Implemented version-based migration system
    - Migration to v2: Drop and recreate embeddings table with 768 dimensions
    - Auto-migration on app startup when schema version < 2
    - Supports future schema updates

**Files Created/Modified**:

- `electron/utils/documents.ts` (NEW) - Server-side document parsing utilities
- `src/utils/documents.ts` (NEW) - Client-side text chunking and validation
- Updated `src/utils/ai.ts` - Added generateEmbeddings() with Matryoshka config
- Updated `src/components/ChatView/ChatView.tsx` - Document upload workflow with batched processing
- Updated `electron/main.ts` - Added file picker, document parsing IPC handlers
- Updated `electron/preload.ts` - Exposed file operations to renderer
- Updated `electron/database/schema.ts` - Migration system with MIGRATE_TO_V2_SQL
- Updated `electron/database/manager.ts` - Auto-migration logic
- Updated `src/types/index.ts` - Added TextChunk, file operation types

**Memory Safety Features**:

1. File size validation before processing (2MB max)
2. Text length validation (500KB max)
3. Chunk count limiting (500 max with truncation)
4. Batch size of 3 for minimal memory footprint
5. Garbage collection delays between operations
6. Try-catch protection around chunking
7. Explicit memory cleanup on error paths

---

### ✅ Phase 6: RAG Mode - Part 2 (Vector Search & Context-Aware Chat) (COMPLETED)

- [x] Vector similarity search using pgvector cosine similarity
- [x] Query embedding generation for user messages with RETRIEVAL_QUERY task type
- [x] Top-N document chunk retrieval based on similarity threshold
- [x] Context injection into Gemini prompts with structured format
- [x] RAG-specific chat responses with document context
- [x] Document reference display in message UI
- [x] Source citation with similarity scores and document names
- [x] Message-to-source linking in database with junction table

**Outcome**: Full RAG (Retrieval-Augmented Generation) chat mode is now functional. When users send messages in RAG threads, the system automatically:

1. Generates query embeddings using gemini-embedding-001 (RETRIEVAL_QUERY task type)
2. Performs vector similarity search against uploaded document chunks
3. Retrieves top-N most relevant contexts based on similarity threshold
4. Injects retrieved context into Gemini prompt with numbered references
5. Displays source citations with document names and similarity scores in UI
6. Links assistant messages to source documents in database

**Key Implementation Details**:

- **Query Embedding Generation**:
    - Function: `generateQueryEmbedding()` in `src/utils/ai.ts`
    - Uses taskType: "RETRIEVAL_QUERY" (optimized for search queries)
    - Different from document embeddings which use "RETRIEVAL_DOCUMENT"
    - Returns 768-dimensional vectors for cosine similarity matching

- **Vector Similarity Search**:
    - Uses pgvector's `<=>` operator for efficient cosine distance calculation
    - HNSW indexing for fast approximate nearest neighbor search
    - Configurable similarity threshold (default: 0.7)
    - Configurable retrieval count (default: 5 top results)
    - Results sorted by distance (closest/most similar first)

- **Context Injection**:
    - Structured prompt template: "You are a helpful assistant. Use the following context to answer..."
    - Numbered source references: [1], [2], [3], etc.
    - Each context includes document name and chunk text
    - Clear instructions for AI to cite sources in responses
    - Fallback to normal chat if retrieval fails

- **Message-Source Linking**:
    - New operation: `messageSourceOperations.batchInsert()`
    - Stores links between assistant messages and retrieved chunks
    - Tracks similarity scores for each source
    - Enables source display in UI and future analytics
    - Atomic database transactions for data integrity

- **Source Citation UI**:
    - Display component in message list showing document sources
    - Ant Design Tags with FileTextOutlined icons
    - Shows document name and similarity percentage
    - Styled with flexbox layout and proper spacing
    - Only visible for RAG mode assistant responses with sources

**Files Created/Modified**:

- Updated `src/utils/ai.ts` - Added generateQueryEmbedding() with RETRIEVAL_QUERY task type
- Updated `electron/database/operations.ts` - Added messageSourceOperations (batchInsert, getByMessage, deleteByMessage)
- Updated `electron/database/index.ts` - Exported messageSourceOperations
- Updated `electron/main.ts` - Added IPC handlers for messageSource operations
- Updated `electron/preload.ts` - Exposed messageSource API to renderer
- Updated `src/types/index.ts` - Added messageSource to ElectronAPI interface
- Updated `src/components/ChatView/ChatView.tsx` - Implemented full RAG workflow in handleSendMessage
- Updated `src/components/ChatView/ChatView.css` - Added message-sources styling
- Updated `electron/database/operations.ts` - Modified messageOperations.listByThread to include sources via LEFT JOIN

**RAG Workflow in Detail**:

1. **User sends message** in RAG thread
2. **Query embedding generated** using gemini-embedding-001 with RETRIEVAL_QUERY task type
3. **Vector search** finds top-N similar chunks using cosine similarity
4. **Context built** from retrieved chunks with document names and chunk text
5. **Prompt injected** with context and instructions to cite sources
6. **AI generates** response using provided context
7. **Assistant message created** in database
8. **Sources linked** to message via messageSourceOperations.batchInsert
9. **UI displays** message with source citations showing documents and similarity scores

**Configuration Options**:

- `retrievalCount`: Number of chunks to retrieve (default: 5)
- `similarityThreshold`: Minimum similarity score (default: 0.7, range: 0-1)
- `chunkSize`: Size of text chunks for embedding (default: 500)
- `chunkOverlap`: Overlap between chunks (default: 50)

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

**Last Updated**: February 23, 2026  
**Current Phase**: Phase 6 Complete ✅ (RAG Mode Part 2 - Vector Search & Context-Aware Chat fully functional)  
**Next Phase**: Phase 7 - Polish & Configuration  
**Status**: Full RAG chat pipeline operational! Users can upload documents (PDF, DOCX, TXT, MD), which are chunked and embedded. When asking questions in RAG threads, the system performs vector similarity search, retrieves relevant contexts, injects them into AI prompts, and displays source citations with similarity scores. Both Normal Chat and RAG modes fully functional.
