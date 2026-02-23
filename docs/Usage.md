# Usage Guide

Complete guide to using HammerSpace Chat for both Normal Chat and RAG modes.

## Table of Contents

- [First-Time Setup](#first-time-setup)
- [Normal Chat Mode](#normal-chat-mode)
- [RAG Mode (Document-Based Chat)](#rag-mode-document-based-chat)
- [Tips for Best Results](#tips-for-best-results)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)

---

## First-Time Setup

### 1. Start the Application

```bash
npm run electron:dev
```

Or run the built application from the `release/` directory.

### 2. Configure Database Connection

1. Click the **Settings icon** (⚙️) in the sidebar
2. Navigate to the **"Database"** tab
3. Enter your PostgreSQL connection details:
    - **Host**: `localhost` (or your PostgreSQL server address)
    - **Port**: `5432` (default PostgreSQL port)
    - **Database**: Your database name (e.g., `hammerspace_chat`)
    - **User**: Your PostgreSQL username
    - **Password**: Your PostgreSQL password
4. Click **"Test Connection"** to verify the settings
5. Click **"Save"** to persist the configuration

**Troubleshooting Connection**:

- Ensure PostgreSQL is running: `pg_isready`
- Verify pgvector extension is installed: `CREATE EXTENSION IF NOT EXISTS vector;`
- Check firewall settings if using a remote database

### 3. Configure API Keys

1. Navigate to the **"API Keys"** tab in Settings
2. Enter your **Google Gemini API key**
    - Get one at: https://makersuite.google.com/app/apikey
3. Select your preferred model:
    - **Gemini 2.5 Flash** (Recommended) - Best balance of speed and quality
    - **Gemini 2.5 Pro** - Most capable for complex reasoning
    - **Gemini 2.5 Flash Lite** - Ultra-fast for simple queries
4. Click **"Save"**

### 4. Optional: Configure RAG Parameters

1. Navigate to the **"RAG Config"** tab
2. Adjust parameters based on your needs:
    - **Chunk Size**: `500` (how large each text chunk should be)
    - **Chunk Overlap**: `50` (overlap between chunks for context)
    - **Retrieval Count**: `5` (how many chunks to retrieve per query)
    - **Similarity Threshold**: `0.7` (minimum similarity score, 0-1)
3. Click **"Save"**

**Parameter Guidance**:

- Larger chunk size = more context per chunk, fewer chunks
- Larger overlap = better context continuity, more storage
- More retrieval count = more context, slower responses
- Lower threshold = more results, less precision

---

## Normal Chat Mode

### Creating a Chat Thread

1. Click the **"New Thread"** button in the sidebar
2. Select **"Chat"** as the thread type
3. Enter a descriptive name for your thread (e.g., "General Q&A", "Code Help")
4. Click **"Create"**

### Sending Messages

1. Type your message in the input box at the bottom
2. Press **Enter** or click the **Send** button
3. Watch as the AI streams its response in real-time
4. Continue the conversation with follow-up questions

### Markdown Support

AI responses support full **GitHub Flavored Markdown**:

- **Headings**: # H1, ## H2, ### H3, etc.
- **Text Formatting**: **bold**, _italic_, ~~strikethrough~~
- **Lists**: Ordered (1. 2. 3.) and unordered (- or \*)
- **Code Blocks**: Syntax-highlighted for 180+ languages
- **Inline Code**: `code`
- **Links**: Automatically open in your browser
- **Tables**: Fully rendered with styling
- **Blockquotes**: > Quote text
- **Task Lists**: - [ ] Todo, - [x] Done

### Model Selection

Different models for different tasks:

- **Gemini 2.5 Flash**: Best for general use (fast + quality)
- **Gemini 2.5 Pro**: Best for complex reasoning, analysis, coding
- **Gemini 2.5 Flash Lite**: Best for simple, quick queries

Switch models in Settings → API Keys tab.

---

## RAG Mode (Document-Based Chat)

RAG (Retrieval-Augmented Generation) mode lets you chat with your documents.

### Creating a RAG Thread

1. Click **"New Thread"**
2. Select **"RAG"** as the thread type
3. Enter a descriptive name (e.g., "Research Papers", "Project Docs")
4. Click **"Create"**

### Uploading Documents

1. Click the **"Upload Documents"** button in the chat header
2. Select one or more files:
    - **Supported formats**: PDF, DOCX, TXT, MD
    - **Max file size**: 2MB per file
    - **Max text length**: 500KB after parsing
3. Wait for processing to complete:
    - Files are parsed based on their format
    - Text is intelligently chunked with overlap
    - Each chunk is embedded using Gemini's embedding model
    - Embeddings are stored in PostgreSQL with pgvector
4. See upload progress notifications
5. Document appears in the header with chunk count

**Processing Details**:

- **PDF**: Text extracted with pdf-parse library
- **DOCX**: Converted to plain text with mammoth
- **TXT/MD**: Read directly as plain text
- **Chunking**: Smart boundary detection (prefers paragraphs, then sentences)
- **Embedding**: Uses gemini-embedding-001 with RETRIEVAL_DOCUMENT task type
- **Batch Processing**: 3 chunks at a time to prevent memory issues

### Asking Questions

1. Type your question in the input box
2. The system automatically:
    - Generates an embedding for your question (RETRIEVAL_QUERY task type)
    - Searches for the most relevant document chunks using cosine similarity
    - Retrieves top-N chunks (default: 5) above threshold (default: 0.7)
    - Injects context into the AI prompt with numbered references
    - Generates a response based on your documents
3. View **source citations** below the response:
    - Document name
    - Similarity percentage (higher = more relevant)

### Understanding Source Citations

- **Tags** show which documents were referenced
- **Percentage** indicates similarity score:
    - 90-100%: Extremely relevant
    - 80-89%: Highly relevant
    - 70-79%: Moderately relevant
    - Below 70%: May not be relevant (adjust threshold)
- **Multiple sources**: Context from different parts or documents

**Example**:

```
Sources:
[Research Paper.pdf (94%)] [Meeting Notes.txt (87%)] [Guide.md (72%)]
```

This means the response used 3 chunks, with the research paper being most relevant.

---

## Tips for Best Results

### Normal Chat Mode

**Crafting Good Prompts**:

- Be specific and clear in your questions
- Provide context when needed
- Break complex requests into steps
- Use follow-up questions to dive deeper

**Model Selection**:

- **Gemini 2.5 Flash**: General chat, writing, explanations
- **Gemini 2.5 Pro**: Code review, complex analysis, research
- **Gemini 2.5 Flash Lite**: Quick facts, simple queries

**Example Prompts**:

- ❌ "Tell me about Python" (too vague)
- ✅ "Explain Python list comprehensions with 3 examples"

- ❌ "Help with code" (no context)
- ✅ "Review this Python function for performance issues: [code]"

### RAG Mode

**Document Preparation**:

- Upload relevant documents before asking questions
- Use descriptive thread names to organize different topics
- Split very large documents into smaller files
- Remove headers/footers that add noise

**Optimal Settings**:

- **General documents**: chunk_size=500, overlap=50, threshold=0.7
- **Technical docs**: chunk_size=500, overlap=100-150, threshold=0.75
- **Research papers**: chunk_size=600, overlap=100, threshold=0.7
- **Code documentation**: chunk_size=300, overlap=50, threshold=0.8

**Asking Good Questions**:

- Ask specific questions answerable from your documents
- Reference document names if you have many uploaded
- Review source citations to verify accuracy
- Adjust similarity threshold if you get too few/many results

**Example Workflow**:

1. Upload: "Company Handbook.pdf", "Benefits Guide.pdf"
2. Ask: "What is the remote work policy?"
3. Review sources to confirm which document was used
4. Follow up: "What about international remote work?"

### Document Upload

**Supported Formats**:

- **PDF**: Most reliable with text-based PDFs (not scanned images)
- **DOCX**: Good for Word documents
- **TXT**: Plain text files
- **MD**: Markdown files

**Limits**:

- File size: 2MB maximum
- Text length: 500KB after parsing
- Chunks: 500 maximum per document

**Best Practices**:

- For large documents, split into logical sections
- Remove unnecessary content (headers, footers, page numbers)
- Use clear, well-formatted documents for better chunking
- Avoid scanned PDFs (no OCR support yet)

---

## Keyboard Shortcuts

- **Enter**: Send message (when in input box)
- **Shift + Enter**: New line in message input
- **⌘/Ctrl + ,**: Open Settings _(planned)_

---

## Troubleshooting

### Database Connection Issues

**Problem**: "Failed to connect to database"

**Solutions**:

1. Verify PostgreSQL is running:
    ```bash
    pg_isready
    # OR
    sudo service postgresql status
    ```
2. Ensure pgvector extension is installed:
    ```sql
    -- Connect to your database
    psql -U postgres
    \c hammerspace_chat
    CREATE EXTENSION IF NOT EXISTS vector;
    ```
3. Check connection details in Settings
4. Verify firewall settings if using remote database
5. Check PostgreSQL logs: `/var/log/postgresql/`

### Document Upload Failures

**Problem**: "Failed to upload document"

**Solutions**:

- Check file size (must be < 2MB)
- Ensure file is not corrupted (try opening it)
- Verify file format is supported (PDF, DOCX, TXT, MD)
- Check console for detailed error messages (F12)
- Try uploading fewer files at once
- Restart the application

**Problem**: "Out of memory" during upload

**Solutions**:

- Upload fewer documents at once (1-2 at a time)
- Reduce chunk size in Settings (e.g., 300)
- Close other applications to free memory
- Restart the application
- Split large documents into smaller files

### RAG Responses Not Using Documents

**Problem**: Assistant doesn't reference uploaded documents

**Solutions**:

1. Verify documents were uploaded successfully
    - Check if they appear in the header
    - Verify chunk count > 0
2. Adjust similarity threshold (lower = more lenient)
    - Try 0.6 or 0.5 if 0.7 returns no results
3. Ensure your question is related to document content
4. Try rephrasing your question
5. Check retrieval count (increase to 7-10)

**Problem**: Source citations show low similarity scores

**Solutions**:

- This is normal if documents don't contain exact answers
- Review the cited chunks to verify relevance
- Consider uploading more relevant documents
- Rephrase question to match document terminology

### Streaming Response Issues

**Problem**: Responses are slow or choppy

**Solutions**:

- Check internet connection speed
- Verify Gemini API status
- Try a different model (Flash Lite is faster)
- Check if other applications are using bandwidth

**Problem**: Response stops mid-sentence

**Solutions**:

- Gemini API may have hit rate limits
- Wait a moment and try again
- Check API key is valid
- Review Gemini API quota at https://makersuite.google.com/

### General Issues

**Problem**: Application won't start

**Solutions**:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear build artifacts
rm -rf dist dist-electron

# Rebuild
npm run electron:build
```

**Problem**: UI is unresponsive

**Solutions**:

- Try restarting the application
- Check developer console (F12) for errors
- Report issues with console logs

---

## Known Limitations

### Current Constraints

**File Limits**:

- File size: 2MB per document (configurable in code)
- Text length: 500KB after parsing
- Maximum chunks: 500 per document
- No OCR for scanned PDFs

**Functionality**:

- No conversation memory in RAG mode (each query is independent)
- Single-user application (no multi-user support)
- Local database only (no cloud sync)
- No message editing or deletion
- No export/import of threads

### Performance Considerations

**RAG Mode**:

- First query may be slower (cold start for embeddings)
- Large document uploads: 1-2 minutes for embedding generation
- Vector search performance degrades after ~100,000 chunks
- Recommend splitting into separate threads if experiencing slowness

**Streaming**:

- Response speed depends on Gemini API latency
- Network issues cause choppy streaming
- Very long responses may take time to complete

### Platform Constraints

**Desktop Only**:

- Application runs in Electron (Chromium-based)
- Not a web application
- No mobile support
- Windows, macOS, Linux supported

These limitations are by design to ensure stability and optimal performance. Future versions may relax some constraints.

---

For more information, see:

- [Architecture Overview](./Architecture.md)
- [Database Schema](./DatabaseSchema.md)
- [Development Phases](./DevPhases.md)
- [Future Enhancements](./FutureEnhancements.md)
