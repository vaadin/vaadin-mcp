# Vaadin RAG System Refactor - Project Plan & Tracking

**Project Status**: 🟡 Epic 2 Complete - Ready for Epic 3  
**Last Updated**: 2025-07-23 (Epic 2.2 completed)  
**Context Window Limit**: 128k tokens per session  
**⚠️ CRITICAL RULE**: Each agent completes ONE session only, then hands off

**📚 REQUIRED READING**: 
1. **project-brief.md** - The WHY, WHAT, and detailed requirements
2. **This document** - The HOW, task breakdown, and execution plan

## 📋 Project Overview

This project refactors the existing naive RAG system for Vaadin documentation into a sophisticated, hierarchically-aware system using a two-step ingestion pipeline and advanced retrieval strategies. The system will understand the documentation's hierarchical structure both within and across files and provide framework-specific filtering.

### Key Problems to Solve
- Current system fails to retrieve specific, actionable content from hierarchical documentation
- Lack of understanding of parent-child relationships across files
- No framework-specific filtering (Flow vs Hilla)
- Missing context breadcrumbs for better retrieval

### Target Architecture
```
/vaadin-rag-system/
├── packages/
│   ├── core-types/            # Shared TypeScript interfaces
│   ├── 1-asciidoc-converter/  # AsciiDoc → Markdown + metadata
│   ├── 2-embedding-generator/ # Markdown → Vector database
│   ├── rest-server/           # Enhanced REST API
│   └── mcp-server/            # Refactored MCP server
├── package.json               # Bun workspace configuration
└── test-data/                 # Test AsciiDoc files
```

## 🔧 Technology Stack & Versions

**Runtime & Package Manager:**
- Bun (latest)
- TypeScript (^5.8.2)

**Core Libraries:**
- **LangChain.js**: 0.3.30
- **@langchain/core**: 0.3.66
- **@langchain/community**: 0.3.48
- **asciidoctor**: 2.2.6 (exact version required)
- **downdoc**: ^1.0.2-stable (exact version required)

**Vector Database & Embeddings:**
- Pinecone (clear and repopulate existing index)
- OpenAI text-embedding-3-small

## 📊 Epic Breakdown & Progress Tracking

### Epic 1: Refactor Project Structure 
**Status**: ✅ **COMPLETED**  
**Complexity**: Medium (5-8 hours)  
**Context Window**: Single session  
**Completed**: 2025-07-23

#### Tasks:
- [x] **1.1** Initialize Bun workspace at project root
- [x] **1.2** Create `core-types` package with shared interfaces
- [x] **1.3** Create `1-asciidoc-converter` package structure
- [x] **1.4** Create `2-embedding-generator` package structure  
- [x] **1.5** Refactor `rest-server` into packages structure
- [x] **1.6** Refactor `mcp-server` into packages structure
- [x] **1.7** Update all inter-package dependencies

**Validation Criteria:**
- [x] `bun install` works from root
- [x] All packages have correct dependencies on `core-types`
- [x] TypeScript compilation works across all packages

**Technical Decisions Made:**
- Created workspace with proper Bun workspace configuration
- All packages follow consistent TypeScript configuration (ES2022, ESNext modules)
- Core-types package contains all shared interfaces as specified in project brief
- Placeholder implementation files created for new packages (to be implemented in Epic 2)
- Updated package names to follow workspace conventions (removed "vaadin-docs-" prefixes)
- Added LangChain dependencies to packages that will need them (rest-server, embedding-generator)

**Epic 2.1 Completed Successfully:**
- ✅ All modules implemented and functional
- ✅ Framework detection: 100% accuracy on test cases (flow, hilla, common)
- ✅ Repository checkout and file discovery working
- ✅ AsciiDoc → Markdown conversion with frontmatter
- ✅ URL generation for Vaadin.com links
- ✅ Directory structure preservation
- ✅ Component file handling (processes for both frameworks)
- ✅ Comprehensive test data structure created
- ✅ TypeScript compilation successful
- ✅ All core-types interfaces properly used

**Notes for Next Agent (Epic 2.2):**
- 1-asciidoc-converter package is ready and tested
- Test data structure created in `/test-data/` with hierarchical examples
- Framework detection tested and working: flow, hilla, common detection
- Core converter function `convertDocumentation()` exported and ready
- All dependencies properly configured in package.json
- Repository manager handles file discovery and filtering
- URL generator creates proper Vaadin.com links
- Ready for Epic 2.2: 2-embedding-generator implementation

---

### Epic 2: Implement Two-Step Ingestion Pipeline
**Status**: ✅ **COMPLETED**  
**Complexity**: High (12-16 hours)  
**Context Window**: 2-3 sessions  
**Completed**: 2025-07-23

#### Epic 2.1: 1-asciidoc-converter Package
**Status**: ✅ **COMPLETED**  
**Session**: 1 (6-8 hours)  
**Completed**: 2025-07-23

**Input**: Vaadin documentation from git repository  
**Output**: Markdown files with frontmatter metadata in `packages/1-asciidoc-converter/dist/markdown/`

#### Tasks:
- [x] **2.1.1** Set up repository checkout (reuse existing logic)
- [x] **2.1.2** Implement framework detection (reuse existing `detectFramework`)
- [x] **2.1.3** Implement URL generation logic (reuse existing `enhanceMetadata`)
- [x] **2.1.4** Create AsciiDoc → Markdown converter with frontmatter
- [x] **2.1.5** Preserve directory structure in output
- [x] **2.1.6** Create test suite with sample AsciiDoc files

**Test Data Required:**
```
test-data/
├── forms.adoc                    # Parent document  
├── forms/
│   ├── binding.adoc             # Child document (Flow)
│   ├── validation.adoc          # Child document (Hilla)
│   └── complex-example.adoc     # Multi-framework with includes
└── components/
    └── button.adoc              # Component (both frameworks)
```

**Validation Criteria:**
- [x] Correctly processes include directives
- [x] Detects framework: flow, hilla, or common
- [x] Generates correct Vaadin.com URLs
- [x] Preserves directory structure
- [x] Adds frontmatter with metadata
- [x] Test suite passes with 100% framework detection accuracy

#### Epic 2.2: 2-embedding-generator Package  
**Status**: ✅ **COMPLETED**  
**Session**: 2 (6-8 hours)  
**Completed**: 2025-07-23

**Input**: Markdown files from `1-asciidoc-converter/dist/markdown/`  
**Output**: Embeddings stored in Pinecone with hierarchical relationships

#### Tasks:
- [x] **2.2.1** Implement file hierarchy parser
- [x] **2.2.2** Create LangChain document loader for markdown with frontmatter
- [x] **2.2.3** Implement MarkdownHeaderTextSplitter for chunking
- [x] **2.2.4** Create parent-child relationship logic (cross-file)
- [x] **2.2.5** Create parent-child relationship logic (intra-file)
- [x] **2.2.6** Generate embeddings with OpenAI
- [x] **2.2.7** Upsert to Pinecone in batches with rich metadata
- [x] **2.2.8** Create test suite for chunking and relationships

**Key Logic:**
```typescript
// Cross-file relationships
if (isChildFile(filePath)) {
    chunk.parent_id = getParentChunkId(getParentFile(filePath));
}

// Intra-file relationships  
if (chunk.level > 1) {
    chunk.parent_id = getContainingSection(chunk);
}
```

**Validation Criteria:**
- [x] Correctly parses file hierarchy
- [x] Creates proper parent-child relationships across files
- [x] Creates proper parent-child relationships within files  
- [x] Generates unique chunk_ids
- [x] Stores complete metadata in Pinecone
- [x] Test suite validates relationship accuracy

**Epic 2.2 Completed Successfully:**
- ✅ Complete hierarchical markdown chunking pipeline implemented
- ✅ File hierarchy parser with cross-file parent-child detection  
- ✅ LangChain document loader with frontmatter parsing
- ✅ Markdown header-based chunking with size limits
- ✅ Sophisticated relationship builder for intra-file and cross-file relationships
- ✅ OpenAI embeddings generation with batching and retry logic
- ✅ Pinecone upserter with metadata management and batch processing
- ✅ Comprehensive test suite for validation
- ✅ Main pipeline function with complete error handling and timing
- ✅ Environment variable configuration support
- ✅ TypeScript compilation successful
- ✅ All modules pass import validation
- ✅ **Test data reorganized**: Each package has its own test-data directory
- ✅ **All tests passing**: 100% success rate for both packages
- ✅ **Production ready**: Compiled JavaScript tests pass

**Notes for Next Agent (Epic 3):**
- 2-embedding-generator package is ready for production use
- Main function: `generateEmbeddings(config)` or `generateEmbeddingsFromEnv(markdownDir)`
- All modules properly exported and TypeScript compiled
- Rich metadata stored in Pinecone including parent_id, framework, source_url, headings
- Cross-file relationships established based on directory structure
- Intra-file relationships based on markdown header hierarchy
- Comprehensive configuration validation and error handling
- Ready for Epic 3: Enhanced REST Service implementation

---

### Epic 3: Enhance Retrieval REST Service
**Status**: 🔴 Not Started  
**Complexity**: Medium (6-8 hours)  
**Context Window**: Single session

**Goal**: Upgrade REST API with hybrid search and framework filtering while maintaining external API contract.

#### Tasks:
- [ ] **3.1** Implement LangChain Pinecone vector store connection
- [ ] **3.2** Create hybrid search functionality
- [ ] **3.3** Implement framework filtering logic
- [ ] **3.4** Add Reciprocal Rank Fusion (RRF) for result combining
- [ ] **3.5** Maintain existing API contract (question, framework, stream)
- [ ] **3.6** Create test suite for search functionality

**API Contract (Must Maintain):**
```typescript
POST /search
{
  question: string;
  framework: 'flow' | 'hilla' | '';
  stream?: boolean;
}

Response: RetrievalResult[]
```

**Search Logic:**
```typescript
// If framework provided and not empty
const filter = framework ? 
  { framework: { $in: [framework, 'common'] } } : 
  {};

const results = await vectorStore.hybridSearch(question, {
  filter,
  k: 20
});

return fusionRanking(results);
```

**Validation Criteria:**
- [ ] Hybrid search returns relevant results
- [ ] Framework filtering works correctly
- [ ] RRF improves result quality
- [ ] External API contract unchanged
- [ ] Streaming functionality preserved
- [ ] Performance meets existing benchmarks

---

### Epic 4: Update MCP Server
**Status**: 🔴 Not Started  
**Complexity**: Low-Medium (4-6 hours)  
**Context Window**: Single session

**Goal**: Enable MCP agent to leverage rich metadata for advanced reasoning.

#### Tasks:
- [ ] **4.1** Refactor to call rest-server API
- [ ] **4.2** Implement getDocumentChunk(chunk_id) tool
- [ ] **4.3** Add parent-child navigation capabilities
- [ ] **4.4** Update agent prompts for hierarchical reasoning
- [ ] **4.5** Create test scenarios for agent workflows

**New MCP Tool:**
```typescript
tools: [
  {
    name: "getDocumentChunk",
    description: "Retrieve a specific document chunk by ID",
    parameters: {
      chunk_id: { type: "string", required: true }
    }
  }
]
```

**Agent Enhancement:**
- Can request parent context when initial results lack detail
- Understands hierarchical relationships  
- Provides better context breadcrumbs

**Validation Criteria:**
- [ ] Successfully calls rest-server API
- [ ] getDocumentChunk tool functions correctly
- [ ] Agent can navigate parent-child relationships
- [ ] Demonstrates improved contextual responses

---

## 🧪 Test Strategy & Data

### Test Data Structure
```
test-data/
├── simple-flow.adoc           # Basic Flow document
├── simple-hilla.adoc          # Basic Hilla document  
├── common-content.adoc        # Framework-agnostic content
├── forms/                     # Hierarchical structure
│   ├── index.adoc            # Parent: "Add a Form"
│   ├── binding/
│   │   ├── index.adoc        # Child: "Fields & Binding"
│   │   ├── flow.adoc         # Framework-specific
│   │   └── hilla.adoc        # Framework-specific
│   └── validation/
│       ├── index.adoc        # Child: "Form Validation"
│       ├── flow.adoc         # Framework-specific
│       └── hilla.adoc        # Framework-specific
└── components/
    └── button.adoc           # Component (both frameworks)
```

### Framework Detection Test Cases
```typescript
// Test cases for detectFramework function
const testCases = [
  {
    path: "/components/button/flow.adoc",
    content: "= Button [badge-flow]#Flow#\n...",
    expected: "flow"
  },
  {
    path: "/components/button/hilla.adoc", 
    content: "= Button [badge-hilla]#Hilla#\n...",
    expected: "hilla"
  },
  {
    path: "/components/button/index.adoc",
    content: "= Button Overview\n...",
    expected: ""
  }
];
```

### Integration Test Scenarios
1. **End-to-End Pipeline**: AsciiDoc → Markdown → Embeddings → Search
2. **Framework Filtering**: Search "form validation" with framework="flow"
3. **Parent-Child Navigation**: Find child content from parent references
4. **URL Generation**: Verify correct Vaadin.com URLs

---

## 📝 Data Structures (core-types package)

### Core Interfaces
```typescript
/**
 * Represents a single processed and chunked piece of documentation.
 */
export interface DocumentChunk {
  chunk_id: string;
  parent_id: string | null;
  framework: 'flow' | 'hilla' | 'common';
  content: string;
  source_url: string;
  metadata?: {
    title?: string;
    [key: string]: any;
  };
}

/**
 * The structure returned by the REST retrieval API.
 */
export interface RetrievalResult extends DocumentChunk {
  relevance_score: number;
}

/**
 * Configuration for the ingestion pipeline.
 */
export interface IngestionConfig {
  repository: {
    url: string;
    branch: string;
    localPath: string;
  };
  processing: {
    includePatterns: string[];
    excludePatterns: string[];
  };
}
```

### Package Dependencies
```json
{
  "name": "core-types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"]
}
```

---

## ✅ Definition of Done

### Epic 1 Complete When:
- [ ] All packages created with proper structure
- [ ] Bun workspace properly configured
- [ ] Dependencies correctly established
- [ ] TypeScript compilation works across packages

### Epic 2 Complete When:
- [ ] `bun run ingest:all` executes full pipeline successfully
- [ ] Parent-child relationships created correctly (intra-file & cross-file)
- [ ] Framework and URL metadata stored properly
- [ ] Test suite achieves 95%+ accuracy on framework detection
- [ ] Hierarchical relationships validated through test queries

### Epic 3 Complete When:
- [ ] REST API implements hybrid search with framework filtering
- [ ] External API contract maintained 100%
- [ ] RRF fusion improves search relevance measurably
- [ ] Performance equals or exceeds current system

### Epic 4 Complete When:
- [ ] MCP server integrates with enhanced REST API
- [ ] getDocumentChunk tool functions correctly
- [ ] Agent demonstrates parent-child navigation capabilities
- [ ] Example workflows show improved contextual responses

### Project Complete When:
- [ ] All epics meet their definition of done
- [ ] End-to-end integration tests pass
- [ ] Performance benchmarks met or exceeded
- [ ] Documentation updated for new architecture

---

## 🚨 Risks & Mitigation

### Technical Risks
1. **Context Window Limitations**
   - **Risk**: Complex refactoring exceeds 128k token limit
   - **Mitigation**: Well-planned epic breakdown, detailed task lists

2. **LangChain Version Compatibility**  
   - **Risk**: Version conflicts between packages
   - **Mitigation**: Precise version pinning, peer dependencies

3. **Performance Degradation**
   - **Risk**: New hierarchy logic slows retrieval
   - **Mitigation**: Benchmark existing system, optimize critical paths

### Process Risks
1. **Scope Creep**
   - **Risk**: Adding features beyond brief requirements  
   - **Mitigation**: Strict adherence to epic definitions

2. **Integration Complexity**
   - **Risk**: Breaking existing MCP/REST contracts
   - **Mitigation**: Comprehensive API compatibility testing

---

## 🚨 CRITICAL: Single-Session Rule

**⚠️ EACH AGENT MUST COMPLETE ONLY ONE SESSION OF WORK ⚠️**

### Why This Rule Exists:
- **Context Window Degradation**: Agents make increasing mistakes as they approach the 128k token limit
- **Quality Assurance**: Fresh context in each session maintains code quality
- **Risk Mitigation**: Prevents cascading errors from context overflow

### What Constitutes "One Session":
- **Epic 1**: Complete entire epic (5-8 hours of focused work)
- **Epic 2.1**: Complete asciidoc-converter package only
- **Epic 2.2**: Complete embedding-generator package only  
- **Epic 3**: Complete entire epic (6-8 hours of focused work)
- **Epic 4**: Complete entire epic (4-6 hours of focused work)

### End-of-Session Requirements:
1. **Update all task checkboxes** with current status
2. **Document any blockers** encountered
3. **Note technical decisions** made during the session
4. **Commit all working code** (even if incomplete)
5. **Update "Last Updated" timestamp**
6. **Clearly state** what the next agent should start with

### ⛔ Do NOT:
- Attempt multiple epics in one session
- Continue working when approaching token limits
- Rush to "finish just one more task"
- Skip documentation of current state

## 📚 Session Handoff Guidelines

### Information to Preserve Between Sessions:
1. **Current Epic & Task Status**: ✅ Update ALL checkboxes before ending
2. **Technical Decisions Made**: Document in relevant epic section  
3. **Blocker Issues**: Add to risks section with mitigation plans
4. **Test Results**: Update validation criteria with actual results
5. **Dependencies Changed**: Update package.json changes made
6. **Code Committed**: Ensure all work is saved and version controlled
7. **Next Agent Instructions**: Clear directive for continuation point

### Starting New Session Checklist:
1. **📖 Read project-brief.md FIRST** - Contains the requirements and problem definition
2. **📋 Review this ENTIRE document completely** - Contains the execution plan
3. Check current epic status and active tasks
4. Review any blockers or risks added since last session
5. Verify test environment setup  
6. Understand exactly where previous agent left off
7. Continue from the EXACT next incomplete task (no skipping ahead)

---

## 🎯 Next Steps

### 🔥 CURRENT SESSION FOCUS: Epic 3 - Enhanced REST Service

**⚠️ Next agent should ONLY complete Epic 3 and then stop ⚠️**

#### Session Scope (Epic 3):
1. ✅ Epic 1 COMPLETED - Workspace structure ready
2. ✅ Epic 2 COMPLETED - Complete ingestion pipeline ready
3. **START HERE**: Implement enhanced REST service with hybrid search
4. Implement LangChain Pinecone vector store connection
5. Create hybrid search functionality with semantic and keyword search
6. Implement framework filtering logic for Flow/Hilla/common
7. Add Reciprocal Rank Fusion (RRF) for result combining
8. Maintain existing API contract (question, framework, stream)
9. Create test suite for search functionality
10. **Update this document** with Epic 3 progress
11. **Document handoff** for next agent (Epic 4)

#### Epic 2 Completed Deliverables:
- [x] Working 1-asciidoc-converter package with framework detection
- [x] Working 2-embedding-generator package with hierarchical chunking
- [x] Complete LangChain document processing pipeline
- [x] Hierarchical chunking with parent-child relationships (intra-file and cross-file)
- [x] OpenAI embeddings generation with batching
- [x] Pinecone integration with rich metadata storage
- [x] Test suite validating relationship accuracy
- [x] Updated PROJECT_PLAN.md with Epic 2 completion

#### End-of-Session Deliverables for Epic 3:
- [ ] Enhanced REST service with hybrid search
- [ ] LangChain Pinecone vector store integration
- [ ] Framework filtering implementation
- [ ] RRF fusion for improved search quality
- [ ] Maintained API contract compatibility
- [ ] Test suite for search functionality
- [ ] Updated PROJECT_PLAN.md with Epic 3 status

### Overall Project Success Metrics:
- **Accuracy**: >95% framework detection accuracy
- **Completeness**: All parent-child relationships correctly established  
- **Performance**: Search latency ≤ current system
- **Compatibility**: 100% external API contract maintenance

---

**🔄 Last Updated**: 2025-07-23 (Epic 2.2 completed)  
**📋 Total Tasks**: 33 across 4 epics  
**⏱️ Estimated Time**: 27-38 hours across 5-7 sessions  
**🎯 Current Focus**: Epic 3 ONLY - Enhanced REST Service  
**⚠️ Session Limit**: Complete Epic 3 and stop - DO NOT continue to Epic 4

**✅ Epic 1**: Completed - Project structure refactored
**✅ Epic 2.1**: Completed - AsciiDoc converter implemented with 100% framework detection accuracy  
**✅ Epic 2.2**: Completed - Embedding generator with hierarchical chunking and relationship building
**🔴 Epic 3**: Next - Enhanced REST service with hybrid search
**🔴 Epic 4**: Pending - Updated MCP server 