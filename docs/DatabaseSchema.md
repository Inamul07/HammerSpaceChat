# Database Schema

HammerSpace Chat uses PostgreSQL with the pgvector extension for storing chat data and vector embeddings.

## Overview

The database schema is automatically initialized when you first connect to PostgreSQL. It includes full support for both Normal Chat and RAG modes.

## Schema Version Management

The application uses an auto-migration system to manage schema evolution:

- **Current Version**: 2
- **Version Table**: `schema_version`
- **Migration Strategy**: Automatic on first connection
- **Rollback**: Not supported (backup before upgrading)

## Core Tables

### threads

Stores metadata for both chat and RAG conversation threads.

```sql
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('chat', 'rag')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:

- `id`: Unique identifier (UUID)
- `name`: User-defined thread name
- `type`: Either 'chat' or 'rag'
- `created_at`: Timestamp when thread was created
- `updated_at`: Automatically updated on modifications

**Indexes**:

- Primary key on `id`
- Sorted by `updated_at DESC` for thread list

---

### messages

Stores all messages (both user and assistant) within threads.

```sql
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:

- `id`: Unique identifier (UUID)
- `thread_id`: Foreign key to threads table
- `role`: Either 'user' or 'assistant'
- `content`: Message text content
- `created_at`: Timestamp when message was created

**Relationships**:

- Belongs to one thread
- Cascade delete when thread is deleted
- Can have many message_sources (RAG mode)

**Indexes**:

- Primary key on `id`
- Foreign key index on `thread_id`
- Sorted by `created_at ASC` for chronological display

---

### documents (RAG Mode)

Tracks uploaded documents within RAG threads.

```sql
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  chunk_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:

- `id`: Unique identifier (UUID)
- `thread_id`: Foreign key to threads table
- `name`: Original filename
- `file_type`: One of: 'pdf', 'txt', 'md', 'docx'
- `file_size`: Size in bytes
- `chunk_count`: Number of chunks created from this document
- `uploaded_at`: Timestamp when document was uploaded

**Supported File Types**:

- **PDF**: Parsed with pdf-parse
- **DOCX**: Parsed with mammoth
- **TXT**: Plain text files
- **MD**: Markdown files

**Relationships**:

- Belongs to one thread (must be RAG type)
- Has many embeddings (chunks)
- Cascade delete when thread is deleted

**Constraints**:

- File size limit: 2MB (enforced in application)
- Maximum chunks: 500 per document (enforced in application)

---

### embeddings (RAG Mode with pgvector)

Stores document chunks as vector embeddings for similarity search.

```sql
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(768) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS embeddings_vector_idx
ON embeddings USING hnsw (embedding vector_cosine_ops);
```

**Fields**:

- `id`: Unique identifier (UUID)
- `document_id`: Foreign key to documents table
- `thread_id`: Foreign key to threads table
- `chunk_text`: The actual text content of this chunk
- `chunk_index`: Sequential index within the document (0, 1, 2, ...)
- `embedding`: 768-dimensional vector from gemini-embedding-001
- `created_at`: Timestamp when embedding was created

**Vector Details**:

- **Dimensions**: 768
- **Model**: gemini-embedding-001
- **Task Type**: RETRIEVAL_DOCUMENT
- **Representation**: Matryoshka Representation Learning
- **Distance Metric**: Cosine similarity

**Indexing**:

- **HNSW Index**: Hierarchical Navigable Small World graph
- **Purpose**: Fast approximate nearest neighbor search
- **Operator**: `vector_cosine_ops` for cosine distance
- **Performance**: Sub-linear query time for large datasets

**Relationships**:

- Belongs to one document
- Belongs to one thread
- Can be referenced by many message_sources

**Chunking Strategy**:

- Default size: 500 characters
- Default overlap: 50 characters
- Smart boundary detection: paragraphs → sentences → words
- Prevents mid-word splits

---

### message_sources (RAG Mode)

Junction table linking assistant messages to the document chunks used to generate them.

```sql
CREATE TABLE IF NOT EXISTS message_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  embedding_id UUID NOT NULL REFERENCES embeddings(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:

- `id`: Unique identifier (UUID)
- `message_id`: Foreign key to messages table
- `document_id`: Foreign key to documents table
- `embedding_id`: Foreign key to embeddings table (specific chunk)
- `similarity_score`: Cosine similarity score (0-1, higher is better)
- `created_at`: Timestamp when link was created

**Purpose**:

- Track which document chunks were used to generate each response
- Enable source citation display in UI
- Support future analytics and debugging
- Maintain traceability of AI responses

**Relationships**:

- Belongs to one message (assistant only)
- References one document
- References one specific embedding (chunk)
- Multiple sources can link to same message

**Query Pattern**:

```sql
-- Get sources for a message with document names and similarity scores
SELECT
  ms.similarity_score,
  d.name as document_name,
  e.chunk_text
FROM message_sources ms
JOIN documents d ON ms.document_id = d.id
JOIN embeddings e ON ms.embedding_id = e.id
WHERE ms.message_id = $1
ORDER BY ms.similarity_score DESC;
```

---

### schema_version

Tracks the current database schema version for migrations.

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:

- `version`: Schema version number
- `applied_at`: Timestamp when this version was applied

**Migration History**:

- **Version 1**: Initial schema
- **Version 2**: Updated embeddings to 768 dimensions with Matryoshka learning

---

## Indexes Summary

**Primary Indexes**:

- All tables have UUID primary keys with btree indexes
- Enables fast lookups by ID

**Foreign Key Indexes**:

- `messages.thread_id`
- `documents.thread_id`
- `embeddings.document_id`
- `embeddings.thread_id`
- `message_sources.message_id`
- `message_sources.document_id`
- `message_sources.embedding_id`

**Vector Index**:

- HNSW index on `embeddings.embedding` for similarity search

**Implicit Indexes**:

- Timestamp fields often queried for sorting
- PostgreSQL query planner handles these efficiently

---

## Data Relationships

```
threads (1) ──┬──→ (many) messages
              │
              ├──→ (many) documents (RAG only)
              │
              └──→ (many) embeddings (RAG only)

documents (1) ──→ (many) embeddings
              └──→ (many) message_sources

messages (1) ──→ (many) message_sources (assistant only)

embeddings (1) ──→ (many) message_sources
```

**Cascade Behavior**:

- Deleting a **thread** deletes all messages, documents, embeddings, and sources
- Deleting a **document** deletes all its embeddings and message source links
- Deleting a **message** deletes all its source links
- Deleting an **embedding** deletes its source links

---

## Sample Queries

### Get all messages with sources for a thread

```sql
SELECT
  m.*,
  COALESCE(
    json_agg(
      json_build_object(
        'document_id', ms.document_id,
        'document_name', d.name,
        'chunk_text', e.chunk_text,
        'similarity', ms.similarity_score
      )
    ) FILTER (WHERE ms.id IS NOT NULL),
    '[]'
  ) as sources
FROM messages m
LEFT JOIN message_sources ms ON m.id = ms.message_id
LEFT JOIN documents d ON ms.document_id = d.id
LEFT JOIN embeddings e ON ms.embedding_id = e.id
WHERE m.thread_id = $1
GROUP BY m.id
ORDER BY m.created_at ASC;
```

### Vector similarity search

```sql
SELECT
  e.chunk_text,
  e.chunk_index,
  d.name as document_name,
  d.id as document_id,
  e.id as embedding_id,
  1 - (e.embedding <=> $2::vector) as similarity
FROM embeddings e
JOIN documents d ON e.document_id = d.id
WHERE e.thread_id = $1
  AND 1 - (e.embedding <=> $2::vector) >= $3
ORDER BY e.embedding <=> $2::vector
LIMIT $4;
```

**Parameters**:

- `$1`: thread_id
- `$2`: query embedding vector (768 dimensions)
- `$3`: similarity threshold (e.g., 0.7)
- `$4`: limit (e.g., 5)

**Operators**:

- `<=>`: Cosine distance operator (pgvector)
- `1 - distance`: Convert distance to similarity score

---

## Storage Considerations

**Size Estimates per Document**:

- Metadata in `documents`: ~1KB
- Text chunks in `embeddings.chunk_text`: ~500 bytes each
- Vector embeddings: 768 dimensions × 4 bytes = 3,072 bytes per chunk
- Assume 100 chunks per document: ~300KB per document

**Example Database Sizes**:

- 10 documents: ~3MB
- 100 documents: ~30MB
- 1,000 documents: ~300MB
- 10,000 documents: ~3GB

**Cleanup Recommendations**:

- Archive old threads periodically
- Delete unused RAG threads with large document sets
- Vacuum database regularly: `VACUUM ANALYZE;`
- Monitor with: `SELECT pg_size_pretty(pg_database_size('your_database'));`

---

## Backup & Recovery

**Backup Strategy**:

```bash
# Full backup
pg_dump -U postgres hammerspace_chat > backup.sql

# Restore
psql -U postgres hammerspace_chat < backup.sql
```

**Selective Backup** (exclude embeddings to save space):

```bash
pg_dump -U postgres \
  --exclude-table=embeddings \
  hammerspace_chat > backup_no_vectors.sql
```

**Note**: Embeddings can be regenerated from documents, but it's time-consuming.

---

For more information, see:

- [Architecture Overview](./Architecture.md)
- [Development Phases](./DevPhases.md)
