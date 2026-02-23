/**
 * Database schema definitions for HammerSpace Chat
 * Creates tables for threads, messages, documents, and embeddings
 */

export const SCHEMA_SQL = `
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Threads table (for both chat and RAG threads)
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('chat', 'rag')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on thread type for faster filtering
CREATE INDEX IF NOT EXISTS idx_threads_type ON threads(type);
CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at DESC);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

-- Create index on thread_id for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Documents table (for RAG mode)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'txt', 'md', 'docx')),
  file_size INTEGER NOT NULL,
  chunk_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

-- Create index on thread_id for faster document retrieval
CREATE INDEX IF NOT EXISTS idx_documents_thread_id ON documents(thread_id);

-- Embeddings table (for RAG mode with pgvector)
-- Stores document chunks and their vector embeddings
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(768), -- gemini-embedding-001 with output_dimensionality=768
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

-- Create index for vector similarity search (HNSW index for faster cosine similarity)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- Create index on document_id for faster retrieval
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_thread_id ON embeddings(thread_id);

-- Message sources junction table (tracks which documents were used for each message)
CREATE TABLE IF NOT EXISTS message_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  embedding_id UUID NOT NULL REFERENCES embeddings(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (embedding_id) REFERENCES embeddings(id) ON DELETE CASCADE
);

-- Create index on message_id for faster source retrieval
CREATE INDEX IF NOT EXISTS idx_message_sources_message_id ON message_sources(message_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on threads
DROP TRIGGER IF EXISTS update_threads_updated_at ON threads;
CREATE TRIGGER update_threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

/**
 * Check if database schema is initialized
 */
export const CHECK_SCHEMA_SQL = `
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'threads'
);
`;

/**
 * Create schema version table
 */
export const CREATE_VERSION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

/**
 * Get database version/migration status
 */
export const GET_VERSION_SQL = `
SELECT COALESCE(MAX(version), 0) as version FROM schema_version;
`;

/**
 * Mark schema as initialized
 */
export const MARK_SCHEMA_INITIALIZED_SQL = `
INSERT INTO schema_version (version) VALUES (2)
ON CONFLICT (version) DO NOTHING;
`;

/**
 * Migration to version 2: Update embeddings table to support gemini-embedding-001 with 768 dimensions
 */
export const MIGRATE_TO_V2_SQL = `
-- Drop old embeddings table if it exists
DROP TABLE IF EXISTS embeddings CASCADE;

-- Recreate embeddings table with 768 dimensions for gemini-embedding-001 (Matryoshka mode)
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(768), -- gemini-embedding-001 with output_dimensionality=768
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

-- Create index for vector similarity search (HNSW index for faster cosine similarity)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- Create index on document_id for faster retrieval
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_thread_id ON embeddings(thread_id);

-- Mark migration as complete
INSERT INTO schema_version (version) VALUES (2)
ON CONFLICT (version) DO NOTHING;
`;
