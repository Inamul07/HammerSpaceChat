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

## ✨ What Makes This Special

**Production-Grade RAG Implementation**

- True vector similarity search using pgvector with HNSW indexing (not just keyword matching)
- Matryoshka Representation Learning for efficient 768-dimensional embeddings
- Context-aware retrieval with configurable similarity thresholds
- Source citations showing exactly which documents contributed to each response
- Persistent chunk counts and metadata across sessions

**Intelligent Document Processing**

- Multi-format support (PDF, DOCX, TXT, MD) with format-specific parsers
- Smart boundary detection: prefers paragraph breaks, then sentences, then words
- Configurable chunking with overlap for better context preservation
- Memory-optimized batch processing (ultra-small batches prevent OOM errors)
- Infinite loop protection and safety limits

**Optimized Performance**

- Batch embedding generation with rate limiting
- HNSW indexing for fast approximate nearest neighbor search
- Efficient IPC communication between Electron processes
- Database query optimization with proper indexing
- Explicit memory management for large document processing

**Developer-Friendly Architecture**

- Clean separation: Electron main process (Node.js) ↔ Renderer (React)
- Type-safe IPC communication with full TypeScript definitions
- Modular database layer with reusable operations
- Auto-migration system for schema evolution
- Comprehensive error handling with user-friendly messages

**Polished User Experience**

- Real-time streaming responses with markdown rendering
- Syntax highlighting for 180+ programming languages
- External links open in browser (proper desktop app behavior)
- Compact, readable message formatting (no excessive whitespace)
- Visual distinction between Chat and RAG threads
- Progress notifications during uploads
- Loading states and smooth animations

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

## ⚡ Quick Start

Get up and running in under 5 minutes:

```bash
# 1. Clone and install
git clone <repository-url>
cd HammerSpaceChat
npm install

# 2. Ensure PostgreSQL is running
brew services start postgresql@15  # macOS
# OR
sudo service postgresql start      # Linux

# 3. Create database and enable pgvector
psql -U postgres
CREATE DATABASE hammerspace_chat;
\c hammerspace_chat
CREATE EXTENSION IF NOT EXISTS vector;
\q

# 4. Start the app
npm run electron:dev
```

**First Launch Setup:**

1. Click Settings (⚙️) → Database tab
2. Enter: `localhost`, `5432`, `hammerspace_chat`, your username/password
3. Click "Test Connection" → "Save"
4. Switch to API Keys tab
5. Paste your Gemini API key → "Save"
6. Click "New Thread" → Select "Chat" → Start chatting!

For RAG mode: Create a "RAG" thread, upload documents, then ask questions about them.

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

## 📚 Documentation

### Quick Links

- **[Architecture Overview](docs/Architecture.md)** - System design, data flow, IPC APIs, and technical deep-dive
- **[Database Schema](docs/DatabaseSchema.md)** - PostgreSQL tables, relationships, indexes, and storage
- **[Usage Guide](docs/Usage.md)** - Complete guide for both Normal Chat and RAG modes
- **[Development Phases](docs/DevPhases.md)** - Full development roadmap (all 7 phases)
- **[Future Enhancements](docs/FutureEnhancements.md)** - Planned features and roadmap

### 📁 Project Structure

```
HammerSpaceChat/
├── docs/                  # Documentation
├── electron/              # Electron main process
│   ├── database/          # Database layer (schema, manager, operations)
│   ├── utils/             # Server-side utilities
│   ├── main.ts            # Main process entry point
│   └── preload.ts         # IPC bridge (contextBridge)
├── src/                   # React application
│   ├── components/        # UI components
│   ├── store/             # Zustand state management
│   ├── types/             # TypeScript definitions
│   └── utils/             # Client-side utilities (AI, documents)
└── release/               # Built applications
```

See [Architecture.md](docs/Architecture.md) for detailed architecture diagrams and design principles.

---

## 🤝 Contributing

This is a learning project. Feel free to explore and experiment!

## 📄 License

MIT

---

**Last Updated**: February 23, 2026  
**Current Phase**: Phase 7 Complete ✅ - ALL PHASES COMPLETED  
**Status**: 🎉 **Production Ready** - Full-featured AI chat application with both Normal Chat and RAG modes fully operational. Complete with document processing, vector similarity search, source citations, optimized UI/UX, and all critical bug fixes implemented. Ready for real-world use!

**Key Capabilities**:

- ✅ Normal Chat Mode with streaming responses and full markdown support
- ✅ RAG Mode with document upload, embedding, vector search, and source citations
- ✅ Multi-format document support (PDF, DOCX, TXT, MD)
- ✅ Intelligent chunking with Matryoshka embeddings (768-dim vectors)
- ✅ Fast similarity search using pgvector + HNSW indexing
- ✅ Configurable RAG parameters via Settings UI
- ✅ Persistent database with auto-migration
- ✅ Production-grade error handling and memory optimization
- ✅ Polished UI with dark mode, syntax highlighting, and external link handling

🚀 **The application is feature-complete and ready for deployment!**
