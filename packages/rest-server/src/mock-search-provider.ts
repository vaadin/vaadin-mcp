/**
 * Mock search provider for testing - completely separated from production code
 */

import type { RetrievalResult } from 'core-types';
import type { SearchProvider, SemanticResult, KeywordResult } from './search-interfaces.js';

/**
 * Mock test data that simulates what would be in Pinecone
 */
const MOCK_PINECONE_DATA = [
  // Top-level parent chunks
  {
    id: 'forms-index',
    content: 'Vaadin provides comprehensive form handling capabilities for both Flow and Hilla frameworks. Forms are essential for user data input and include features like data binding, validation, and submission handling.',
    metadata: {
      chunk_id: 'forms-index',
      parent_id: null,
      framework: 'common',
      source_url: 'https://vaadin.com/docs/latest/forms',
      title: 'Forms Overview',
      heading: 'Introduction to Forms'
    },
    score: 0.95
  },
  {
    id: 'forms-binding-1',
    content: 'Form data binding in Vaadin Flow allows you to connect form fields to Java objects using the Binder class. The Binder automatically handles validation and data conversion.',
    metadata: {
      chunk_id: 'forms-binding-1',
      parent_id: 'forms-index',
      framework: 'flow',
      source_url: 'https://vaadin.com/docs/latest/flow/forms/binding',
      title: 'Form Data Binding',
      heading: 'Basic Binding Concepts'
    },
    score: 0.95
  },
  {
    id: 'forms-validation-1',
    content: 'Form validation in Vaadin Hilla uses TypeScript interfaces and decorators to ensure data integrity. You can use built-in validators or create custom validation logic.',
    metadata: {
      chunk_id: 'forms-validation-1',
      parent_id: 'forms-index',
      framework: 'hilla',
      source_url: 'https://vaadin.com/docs/latest/hilla/forms/validation',
      title: 'Form Validation',
      heading: 'Validation Strategies'
    },
    score: 0.88
  },
  {
    id: 'grid-basic-1',
    content: 'The Grid component is a powerful data presentation component that supports sorting, filtering, and lazy loading. It works with any data provider.',
    metadata: {
      chunk_id: 'grid-basic-1',
      parent_id: null,
      framework: 'common',
      source_url: 'https://vaadin.com/docs/latest/components/grid',
      title: 'Grid Component',
      heading: 'Grid Basics'
    },
    score: 0.92
  },
  {
    id: 'button-styling-1',
    content: 'Button components in Vaadin can be styled using CSS custom properties and theme variants. You can create primary, secondary, and tertiary buttons.',
    metadata: {
      chunk_id: 'button-styling-1',
      parent_id: 'components-button',
      framework: 'common',
      source_url: 'https://vaadin.com/docs/latest/components/button',
      title: 'Button Styling',
      heading: 'Theme Variants'
    },
    score: 0.85
  },
  {
    id: 'grid-columns-flow',
    content: 'In Vaadin Flow, Grid columns can be configured programmatically using addColumn() method. You can set headers, renderers, and sort properties.',
    metadata: {
      chunk_id: 'grid-columns-flow',
      parent_id: 'grid-basic-1',
      framework: 'flow',
      source_url: 'https://vaadin.com/docs/latest/flow/components/grid/columns',
      title: 'Grid Columns - Flow',
      heading: 'Column Configuration'
    },
    score: 0.90
  },
  {
    id: 'grid-columns-hilla',
    content: 'In Vaadin Hilla, Grid columns are typically configured using TypeScript and decorative markup. Column definitions can include type information.',
    metadata: {
      chunk_id: 'grid-columns-hilla',
      parent_id: 'grid-basic-1',
      framework: 'hilla',
      source_url: 'https://vaadin.com/docs/latest/hilla/components/grid/columns',
      title: 'Grid Columns - Hilla',
      heading: 'TypeScript Column Setup'
    },
    score: 0.87
  }
];

export class MockSearchProvider implements SearchProvider {
  
  /**
   * Mock semantic search implementation
   */
  async semanticSearch(
    query: string,
    k: number,
    framework: string,
    vaadinVersion?: string
  ): Promise<SemanticResult[]> {
    // Handle empty query
    if (!query || query.trim() === '') {
      return [];
    }
    
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    // Filter by framework if specified
    let filteredData = MOCK_PINECONE_DATA;
    if (framework === 'flow') {
      filteredData = MOCK_PINECONE_DATA.filter(item => 
        item.metadata.framework === 'flow' || 
        item.metadata.framework === 'common' ||
        item.metadata.framework === ''
      );
    } else if (framework === 'hilla') {
      filteredData = MOCK_PINECONE_DATA.filter(item => 
        item.metadata.framework === 'hilla' || 
        item.metadata.framework === 'common' ||
        item.metadata.framework === ''
      );
    }
    
    // Score based on keyword matches
    const scoredResults = filteredData.map(item => {
      const content = item.content.toLowerCase();
      const title = (item.metadata.title || '').toLowerCase();
      const heading = (item.metadata.heading || '').toLowerCase();
      
      let score = 0;
      for (const word of queryWords) {
        if (content.includes(word)) score += 0.3;
        if (title.includes(word)) score += 0.4;
        if (heading.includes(word)) score += 0.3;
      }
      
      return {
        id: item.metadata.chunk_id,
        content: item.content,
        metadata: item.metadata,
        score: Math.min(score, 1.0), // Cap at 1.0
        source: 'semantic' as const
      };
    });
    
    // Sort by score and return top k
    return scoredResults
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  /**
   * Mock keyword search implementation
   */
  async keywordSearch(
    query: string,
    k: number,
    framework: string,
    vaadinVersion?: string
  ): Promise<KeywordResult[]> {
    // Handle empty query or query with only short terms
    if (!query || query.trim() === '') {
      return [];
    }
    
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
    
    if (queryTerms.length === 0) {
      return [];
    }
    
    // Filter by framework if specified
    let filteredData = MOCK_PINECONE_DATA;
    if (framework === 'flow') {
      filteredData = MOCK_PINECONE_DATA.filter(item => 
        item.metadata.framework === 'flow' || 
        item.metadata.framework === 'common' ||
        item.metadata.framework === ''
      );
    } else if (framework === 'hilla') {
      filteredData = MOCK_PINECONE_DATA.filter(item => 
        item.metadata.framework === 'hilla' || 
        item.metadata.framework === 'common' ||
        item.metadata.framework === ''
      );
    }
    
    // Score based on exact term frequency
    const results = [];
    
    for (const item of filteredData) {
      const content = item.content.toLowerCase();
      let keywordScore = 0;
      
      for (const term of queryTerms) {
        const termFreq = (content.match(new RegExp(term, 'g')) || []).length;
        keywordScore += termFreq * (1 / Math.log(1 + queryTerms.indexOf(term)));
      }
      
      if (keywordScore > 0) {
        results.push({
          id: item.metadata.chunk_id,
          content: item.content,
          metadata: item.metadata,
          score: keywordScore,
          source: 'keyword' as const
        });
      }
    }
    
    // Sort by keyword score and return top k
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  /**
   * Mock chunk retrieval by ID
   */
  async getDocumentChunk(chunkId: string): Promise<RetrievalResult | null> {
    const item = MOCK_PINECONE_DATA.find(item => item.metadata.chunk_id === chunkId);
    
    if (!item) {
      return null;
    }
    
    return {
      chunk_id: item.metadata.chunk_id,
      parent_id: item.metadata.parent_id,
      framework: item.metadata.framework as 'flow' | 'hilla' | 'common',
      content: item.content,
      source_url: item.metadata.source_url,
      metadata: {
        title: item.metadata.title,
        heading: item.metadata.heading,
      },
      relevance_score: item.score
    };
  }
} 