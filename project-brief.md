### Project: Advanced RAG System for Vaadin Documentation

**1\. Project Overview & Goal**

The primary goal of this project is to refactor and enhance our existing RAG system for the Vaadin documentation. The current "naive" implementation is insufficient for navigating the documentation's hierarchical structure.

We will evolve the system by implementing a two-step ingestion pipeline and advanced retrieval strategies. The final product will be a robust, modular RAG system, exposed via a REST API, that provides highly relevant, context-aware results for use by both human developers and AI agents.

**2\. The Core Problem to Address**

Technical documentation, like Vaadin's, is not flat. It's a structured hierarchy of sections and pages. A query like "how to build a form" might semantically match an introductory page, while the actionable code examples and details reside in child pages (Fields & Binding, Validation, etc.). This hierarchy can also span across multiple files. Furthermore, content is often specific to either the **Flow** or **Hilla** frameworks.

Our current system fails to reliably retrieve this specific, actionable content. The refactored system must understand and leverage the documentation's structure—both within and across files—and allow filtering by framework to retrieve precise chunks of information and provide broader context when necessary.

**3\. Target Architecture & Technology Stack**

We will refactor the existing monorepo into a workspace-based structure.

* **Technology:** Bun, TypeScript, Pinecone  
* **Recommended Core Library:** **LangChain.js** (langchain npm package). Its comprehensive toolset for document loading, chunking, and retrieval makes it the ideal choice for this project.  
* **Monorepo Structure:** Use Bun workspaces to manage the following packages.

/vaadin-rag-system/  
├── packages/  
│   ├── 1-asciidoc-converter/  // New  
│   ├── 2-embedding-generator/ // New  
│   ├── rest-server/           // Refactored  
│   ├── mcp-server/            // Refactored  
│   └── core-types/            // New  
├── package.json               // Root config for Bun workspaces  
└── bun.lockb

**4\. Task Breakdown & Expected Outcomes**

#### Epic 1: Refactor Project Structure

* **Goal:** Reorganize the codebase into the target architecture defined above.  
* **Tasks:**  
  1. Initialize a Bun workspace at the project root.  
  2. Create five new packages: 1-asciidoc-converter, 2-embedding-generator, rest-server, mcp-server, and core-types.  
  3. Move existing logic from the old docs-ingestion, rest-server, and mcp-server projects into their new respective packages.  
  4. Establish the core-types package as the single source of truth for shared data structures. All other packages should list it as a dependency.

#### Epic 2: Implement the Two-Step Ingestion Pipeline

* **Goal:** Create an automated pipeline that processes source documentation and populates our vector database with hierarchically aware data.  
* **Task: 1-asciidoc-converter**  
  * **Responsibility:** Convert proprietary source files into a clean, standard format with framework and URL metadata.  
  * **Input:** Vaadin documentation from a specified git repository.  
  * **Process:**  
    1. Check out the documentation source.  
    2. For each AsciiDoc file, run the necessary proprietary pre-processing to handle imports and custom syntax.  
    3. **Detect Framework:** Use the provided logic to determine if the content is for flow, hilla, or is common.  
    4. **Generate Source URL:** From the original file path (sourcePath), generate the public documentation URL. The logic should transform a path like .../vaadin-docs/articles/path/to/page.adoc into https://vaadin.com/docs/path/to/page.  
    5. **Convert to Markdown:** Convert the processed AsciiDoc files into Markdown.  
    6. **Embed Metadata:** Prepend Markdown frontmatter to each output file containing the detected framework and the generated source\_url.  
  * **Output:** The generated Markdown files should be placed in packages/1-asciidoc-converter/dist/markdown/. This directory preserves the original file structure, and each file contains frontmatter metadata.  
* **Task: 2-embedding-generator**  
  * **Responsibility:** Chunk, embed, and store the documentation, creating logical links both within and across files using **LangChain.js**.  
  * **Input:** The directory of Markdown files located at packages/1-asciidoc-converter/dist/markdown/.  
  * **Process:**  
    1. **Parse File Hierarchy:** First, recursively scan the input directory to build a map of parent-child relationships between files (e.g., forms.md is the parent of files in the forms/ subdirectory like forms/binding.md).  
    2. **Process Hierarchically:** Process parent documents before their children to ensure parent chunk\_ids are available.  
    3. **Load and Chunk:** For each file, use langchain/document\_loaders/fs/markdown to load it. The loader will automatically parse the frontmatter into the document's metadata. Use langchain/text\_splitter (specifically MarkdownHeaderTextSplitter) to chunk the content based on headers.  
    4. **Assign parent\_id for Cross-File Relationships:** This is a critical step. For all chunks generated from a child file (e.g., forms/binding.md), their top-level parent\_id must be set to the chunk\_id of the parent document's main introductory section (from forms.md).  
    5. **Assign parent\_id for Intra-File Relationships:** For chunks within the same file, the parent\_id should point to the chunk\_id of the containing section, as determined by the header splitter.  
    6. **Generate Metadata and Embeddings:** For each chunk, generate a unique chunk\_id, its vector embedding, and the full metadata payload as defined in the DocumentChunk interface (including the framework and source\_url properties from the frontmatter).  
    7. **Upsert to Pinecone:** Store the chunks, vectors, and rich metadata in the Pinecone index.

#### Epic 3: Enhance the Retrieval REST Service

* **Goal:** Create a powerful, reusable REST API for searching the documentation with framework filtering.  
* **Task: rest-server**  
  * **Responsibility:** Expose documentation retrieval functionality via a REST endpoint using **LangChain.js**. The external API contract must remain unchanged.  
  * **Process:**  
    1. **Maintain Existing API:** The service must continue to accept a question string, a framework string ('flow' | 'hilla' | ''), and an optional stream boolean flag.  
    2. **Implement New Internals:** Use langchain/vectorstores/pinecone to connect to the Pinecone index.  
    3. **Implement Hybrid Search with Filtering:** Construct a Pinecone query that performs hybrid search based on the question. If the framework parameter is provided and is not empty, add a metadata filter to the query to only match documents where metadata.framework equals the given value or 'common'. If the parameter is omitted or empty, search all documents.  
    4. **Use Fusion:** Use a fusion algorithm (e.g., Reciprocal Rank Fusion) to combine and re-rank the results from both searches.  
  * **Output:** Return a JSON array of RetrievalResult objects, sorted by relevance, adhering to the existing response format (including streaming behavior if requested).

#### Epic 4: Update the MCP Server

* **Goal:** Enable the MCP agent to leverage the new rich metadata for more advanced reasoning.  
* **Task: mcp-server**  
  * **Responsibility:** Orchestrate agentic workflows.  
  * **Process:**  
    1. Refactor the server to call the rest-server API, passing the framework context if available.  
    2. The server must be able to interpret the parent\_id from the retrieved chunks.  
    3. Implement a tool, e.g., getDocumentChunk(chunk\_id: string), that the agent can use. This allows the agent to explicitly request a parent chunk if it determines the initial context is insufficient.

**5\. Key Data Structures (To be defined in core-types)**

The following TypeScript interfaces are critical for ensuring consistency across the services.

/\*\*  
 \* Represents a single processed and chunked piece of documentation.  
 \* This is the core data structure to be stored in Pinecone's metadata payload.  
 \*/  
export interface DocumentChunk {  
  /\*\*  
   \* A unique identifier for this specific chunk.  
   \* e.g., 'forms-binder-validation-1'  
   \*/  
  chunk\_id: string;

  /\*\*  
   \* The chunk\_id of the direct parent document or section.  
   \* This enables hierarchical lookups. Null for top-level documents.  
   \* e.g., 'forms-binder-intro'  
   \*/  
  parent\_id: string | null;

  /\*\*  
   \* The framework this chunk applies to.  
   \* 'common' is used if it applies to both.  
   \*/  
  framework: 'flow' | 'hilla' | 'common';

  /\*\*  
   \* The actual text content of the chunk.  
   \*/  
  content: string;

  /\*\*  
   \* The full URL to the source documentation page from which this chunk was derived.  
   \*/  
  source\_url: string;

  /\*\*  
   \* Additional metadata, such as the original heading title.  
   \*/  
  metadata?: {  
    title?: string;  
    \[key: string\]: any;  
  };  
}

/\*\*  
 \* The structure of the objects returned by the REST retrieval API.  
 \* It extends the base chunk with a relevance score from the search.  
 \*/  
export interface RetrievalResult extends DocumentChunk {  
  relevance\_score: number;  
}

**6\. Definition of Done**

The project is complete when:

1. The monorepo is successfully refactored into the five specified packages.  
2. An automated script (bun run ingest:all) can successfully execute the full two-step ingestion pipeline, correctly creating both intra-file and cross-file parent-child links and storing framework and URL metadata.  
3. The rest-server implements the new hybrid search logic internally while maintaining its existing external API contract.  
4. The mcp-server is able to use the rest-server and demonstrate the ability to retrieve a parent document based on the parent\_id of an initial result.