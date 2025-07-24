#!/usr/bin/env bun

/**
 * Quick test script to verify optimized metadata structure
 */

import { createSearchProvider } from './src/search-factory.js';
import { HybridSearchService } from './src/hybrid-search-service.js';

async function testMetadataStructure() {
  console.log('🔍 Testing optimized metadata structure...\n');
  
  // Use mock provider for consistent testing
  process.env.MOCK_PINECONE = 'true';
  
  const searchProvider = createSearchProvider();
  const searchService = new HybridSearchService(searchProvider);
  
  try {
    // Test search results
    const searchResults = await searchService.hybridSearch('forms', { maxResults: 1 });
    
    if (searchResults.length > 0) {
      const result = searchResults[0];
      
      console.log('📄 Search Result Structure:');
      console.log('chunk_id:', result.chunk_id);
      console.log('parent_id:', result.parent_id);
      console.log('framework:', result.framework);
      console.log('source_url:', result.source_url);
      console.log('relevance_score:', result.relevance_score);
      console.log('content length:', result.content.length, 'chars');
      console.log('\n📝 Optimized Metadata:');
      console.log('title:', result.metadata?.title);
      console.log('heading:', result.metadata?.heading);
      console.log('Total metadata keys:', Object.keys(result.metadata || {}).length);
      console.log('Metadata keys:', Object.keys(result.metadata || {}));
      
      // Verify no redundant fields
      const redundantFields = ['chunk_id', 'parent_id', 'framework', 'source_url', 'content'];
      const foundRedundant = redundantFields.filter(field => 
        result.metadata && Object.prototype.hasOwnProperty.call(result.metadata, field)
      );
      
      if (foundRedundant.length > 0) {
        console.log('\n❌ Found redundant fields in metadata:', foundRedundant);
      } else {
        console.log('\n✅ No redundant fields found in metadata');
      }
    }
    
    // Test getDocumentChunk
    const chunk = await searchService.getDocumentChunk('forms-index');
    
    if (chunk) {
      console.log('\n📄 GetDocumentChunk Result Structure:');
      console.log('chunk_id:', chunk.chunk_id);
      console.log('parent_id:', chunk.parent_id);
      console.log('framework:', chunk.framework);
      console.log('source_url:', chunk.source_url);
      console.log('relevance_score:', chunk.relevance_score);
      console.log('\n📝 Optimized Metadata:');
      console.log('title:', chunk.metadata?.title);
      console.log('heading:', chunk.metadata?.heading);
      console.log('Total metadata keys:', Object.keys(chunk.metadata || {}).length);
      
      // Verify no redundant fields
      const redundantFields = ['chunk_id', 'parent_id', 'framework', 'source_url', 'content'];
      const foundRedundant = redundantFields.filter(field => 
        chunk.metadata && Object.prototype.hasOwnProperty.call(chunk.metadata, field)
      );
      
      if (foundRedundant.length > 0) {
        console.log('\n❌ Found redundant fields in chunk metadata:', foundRedundant);
      } else {
        console.log('\n✅ No redundant fields found in chunk metadata');
      }
    }
    
    console.log('\n🎉 Metadata optimization test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testMetadataStructure(); 