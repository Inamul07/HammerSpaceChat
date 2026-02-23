# Architecture Overview

HammerSpace Chat is built with a clean, modular architecture following best practices for Electron applications.

## System Architecture

HammerSpace Chat follows a clean, modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process (React)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │    Zustand   │  │  AI Utils    │      │
│  │  (UI Layer)  │──│    Store     │──│  (Gemini)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────▼───────┐                        │
│                    │  ElectronAPI  │  (IPC Bridge)          │
│                    │   (Preload)   │                        │
│                    └───────┬───────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │ IPC Communication
┌────────────────────────────▼─────────────────────────────────┐
│                     Main Process (Node.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ IPC Handlers │  │   Database   │  │   Document   │      │
│  │  (30+ APIs)  │──│  Operations  │  │   Parsers    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────▼───────┐                        │
│                    │  PostgreSQL   │                        │
│                    │  + pgvector   │                        │
│                    └───────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Principles

### 1. Process Isolation

- **Renderer Process** (React/UI) and **Main Process** (Node.js/Database) run in separate processes
- Enhances security and stability
- Prevents UI freezing during heavy operations

### 2. Type-Safe IPC

- All inter-process communication uses typed interfaces
- Full TypeScript support across the IPC boundary
- Compile-time safety for all API calls

### 3. Security First

- Preload script exposes only necessary APIs via `contextBridge`
- No node integration in renderer process
- Sandboxed renderer for better security

### 4. Modular Database Layer

- All database operations abstracted into reusable functions
- Clean separation between data access and business logic
- Easy to test and maintain

### 5. Stateless Main Process

- UI state managed by Zustand in renderer
- Database state persisted in PostgreSQL
- Main process serves as a stateless API layer

### 6. Async Everything

- All IPC calls are asynchronous
- Prevents blocking the UI thread
- Better user experience with responsive interface

## Data Flow Examples

### Normal Chat Message Flow

```
1. User types message in ChatView component
   ↓
2. Component calls handleSendMessage()
   ↓
3. Creates user message: window.electronAPI.message.create()
   ↓
4. IPC call → Main Process → messageOperations.create()
   ↓
5. Database INSERT → Returns message with ID
   ↓
6. React updates UI with new message
   ↓
7. Calls sendMessage() from ai.ts with Gemini API
   ↓
8. Streams response chunks back to component
   ↓
9. Component displays streaming text in real-time
   ↓
10. On complete: creates assistant message in database
    ↓
11. React updates UI with final message
```

### RAG Document Upload Flow

```
1. User clicks "Upload Documents" in RAG thread
   ↓
2. window.electronAPI.file.pickFiles() opens file dialog
   ↓
3. User selects PDF/DOCX/TXT/MD files
   ↓
4. For each file:
   a. window.electronAPI.file.readFile() → Main Process reads file
   b. window.electronAPI.file.parseDocument() → Parses based on type
   c. Component chunks text using chunkText() utility
   d. window.electronAPI.document.create() → Creates DB entry
   e. For each batch of 3 chunks:
      - generateEmbedding() calls Gemini API
      - window.electronAPI.embedding.batchInsert() → Stores in DB
   f. window.electronAPI.document.updateChunkCount() → Updates count
   ↓
5. React displays document in UI with chunk count
```

### RAG Query Flow

```
1. User sends message in RAG thread
   ↓
2. generateQueryEmbedding() → Gemini API (RETRIEVAL_QUERY)
   ↓
3. window.electronAPI.embedding.search() → Vector similarity search
   ↓
4. PostgreSQL with pgvector returns top-N similar chunks
   ↓
5. Component builds context from retrieved chunks
   ↓
6. Injects context into prompt with numbered references
   ↓
7. Calls Gemini API with enhanced prompt
   ↓
8. Streams response to UI
   ↓
9. Stores assistant message in database
   ↓
10. window.electronAPI.messageSource.batchInsert() → Links sources
    ↓
11. React displays message with source citations
```

## Technology Stack Details

### Frontend (Renderer Process)

- **React 18**: Component-based UI with hooks
- **TypeScript**: Type safety across the application
- **Vite**: Fast build tool and dev server
- **Ant Design**: Component library with dark theme
- **Zustand**: Lightweight state management
- **react-markdown**: Markdown rendering
- **remark-gfm**: GitHub Flavored Markdown support
- **react-syntax-highlighter**: Code syntax highlighting

### Backend (Main Process)

- **Electron 28**: Desktop application framework
- **Node.js**: JavaScript runtime
- **TypeScript**: Type safety for main process
- **pg**: PostgreSQL client
- **pdf-parse**: PDF text extraction
- **mammoth**: DOCX to HTML conversion
- **@google/generative-ai**: Gemini API client

### Database

- **PostgreSQL 12+**: Relational database
- **pgvector**: Vector similarity search extension
- **HNSW Indexing**: Fast approximate nearest neighbor search

### AI Services

- **Google Gemini API**: Chat and embeddings
- **gemini-2.5-flash**: Primary chat model
- **gemini-embedding-001**: Document embeddings (768-dim with Matryoshka)

## Project Structure

```
HammerSpaceChat/
├── electron/              # Electron main process
│   ├── database/          # Database layer
│   │   ├── schema.ts      # SQL schema definitions
│   │   ├── manager.ts     # Connection manager
│   │   ├── operations.ts  # CRUD operations
│   │   └── index.ts       # Module exports
│   ├── utils/
│   │   └── documents.ts   # Document parsing utilities
│   ├── main.ts            # Main process entry point
│   └── preload.ts         # Preload script (IPC bridge)
│
├── src/                   # React application (Renderer)
│   ├── components/        # React components
│   │   ├── Layout/
│   │   ├── Sidebar/
│   │   ├── ChatView/
│   │   └── SettingsModal/
│   ├── store/             # Zustand state management
│   │   └── index.ts
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/             # Utility functions
│   │   ├── ai.ts          # Gemini API integration
│   │   └── documents.ts   # Text chunking
│   ├── App.tsx            # Root component
│   ├── main.tsx           # React entry point
│   └── index.css          # Global styles
│
├── docs/                  # Documentation
│   ├── DevPhases.md
│   ├── Architecture.md
│   ├── DatabaseSchema.md
│   ├── Usage.md
│   └── FutureEnhancements.md
│
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript config (React)
├── tsconfig.electron.json # TypeScript config (Electron)
├── vite.config.ts         # Vite configuration
└── README.md              # Main documentation
```

## IPC API Overview

The application exposes 30+ IPC APIs organized into logical groups:

### Database APIs

- `database:connect`, `database:disconnect`, `database:status`

### Thread APIs

- `thread:create`, `thread:list`, `thread:get`, `thread:delete`

### Message APIs

- `message:create`, `message:list`, `message:get`, `message:delete`

### Document APIs

- `document:create`, `document:list`, `document:get`, `document:delete`, `document:updateChunkCount`

### Embedding APIs

- `embedding:batchInsert`, `embedding:search`, `embedding:count`

### Message Source APIs

- `messageSource:batchInsert`, `messageSource:getByMessage`

### File APIs

- `file:pickFiles`, `file:readFile`, `file:parseDocument`

### Shell APIs

- `shell:openExternal`

## Security Considerations

1. **Context Isolation**: Renderer process is isolated from Node.js APIs
2. **Preload Script**: Only exposes whitelisted APIs via contextBridge
3. **No Remote Module**: Does not use deprecated remote module
4. **Database Credentials**: Stored locally, never transmitted over network
5. **API Keys**: Stored in application settings, accessible only to main process
6. **External Links**: Validated before opening in external browser
7. **File Uploads**: Size limits and type validation prevent abuse

## Performance Optimizations

1. **Batch Processing**: Embeddings processed in small batches (3 at a time)
2. **Memory Management**: Explicit garbage collection between batches
3. **HNSW Indexing**: Fast approximate nearest neighbor search
4. **Connection Pooling**: PostgreSQL connection pool for efficiency
5. **Streaming Responses**: Real-time display of AI responses
6. **Lazy Loading**: Components and data loaded on demand
7. **Debouncing**: Input debouncing for search and filters

## Scalability Considerations

**Current Limits**:

- Single-user desktop application
- Local PostgreSQL database
- Vector search optimized for ~100,000 chunks

**Potential Scale-Up Strategies**:

- Horizontal scaling: Multiple database instances
- Cloud database: Managed PostgreSQL with pgvector
- Caching layer: Redis for frequently accessed data
- Background workers: Separate process for embedding generation
- Microservices: Split document processing into separate service

## Error Handling Strategy

1. **Database Errors**: Caught at operation layer, returned as `{ success: false, error: message }`
2. **IPC Errors**: Try-catch in handlers, logged to console, error messages to renderer
3. **API Errors**: Gemini API errors caught and displayed to user with helpful messages
4. **File Errors**: Validation before processing, cleanup on failure
5. **UI Errors**: React error boundaries prevent full app crashes
6. **Network Errors**: Retry logic for transient failures

---

For more details on specific components, see:

- [Database Schema](./DatabaseSchema.md)
- [Development Phases](./DevPhases.md)
- [Usage Guide](./Usage.md)
