/**
 * Pinecone integration for storing and retrieving embeddings
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from './config';
import type { DocumentWithEmbedding } from './embeddings';

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey!,
});

// Get the index
const index = pinecone.index(config.pinecone.index!);

/**
 * Store documents with embeddings in Pinecone
 * @param documents - Array of documents with embeddings
 * @returns Promise with number of documents stored
 */
export async function storeInPinecone(documents: DocumentWithEmbedding[]): Promise<number> {
  console.log(`Storing ${documents.length} documents in Pinecone...`);
  
  let storedCount = 0;
  
  // Prepare vectors for Pinecone
  const vectors = documents.map((doc, i) => {
    // Create a unique ID based on source and chunk information
    const sourceId = doc.metadata.source ? 
      doc.metadata.source.replace(/[^a-zA-Z0-9]/g, '_') : 
      'unknown';
    
    const chunkType = doc.metadata.chunk_type || 'unknown';
    const sectionIndex = doc.metadata.section_index !== undefined ? 
      doc.metadata.section_index : 
      '';
    const paragraphIndex = doc.metadata.paragraph_index !== undefined ? 
      doc.metadata.paragraph_index : 
      '';
    
    const id = `vaadin_${sourceId}_${chunkType}_${sectionIndex}_${paragraphIndex}_${Date.now()}_${i}`;
    
    // Prepare metadata, removing the embedding
    const { embedding, ...restDoc } = doc;
    const metadata = {
      ...restDoc.metadata,
      text: doc.text,
      chunk_type: doc.metadata.chunk_type,
      heading: doc.metadata.heading || '',
      title: doc.metadata.title || '',
      processed_at: new Date().toISOString(),
    };
    
    return {
      id,
      values: doc.embedding,
      metadata
    };
  });
  
  // Upsert in batches
  for (let i = 0; i < vectors.length; i += config.pinecone.batchSize) {
    const batch = vectors.slice(i, i + config.pinecone.batchSize);
    
    try {
      console.log(`Upserting batch ${i / config.pinecone.batchSize + 1}/${Math.ceil(vectors.length / config.pinecone.batchSize)}`);
      
      await index.upsert(batch);
      storedCount += batch.length;
      
      // Simple rate limiting
      if (i + config.pinecone.batchSize < vectors.length) {
        await new Promise(resolve => setTimeout(resolve, config.pinecone.rateLimitDelay));
      }
    } catch (error) {
      console.error(`Error upserting batch starting at index ${i}:`, error);
      
      // Implement exponential backoff for rate limiting errors
      if (error instanceof Error && error.message.includes('rate')) {
        const delay = 1000 * Math.pow(2, Math.floor(i / config.pinecone.batchSize) % 5); // Exponential backoff up to 32 seconds
        console.log(`Rate limited. Waiting for ${delay}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        i -= config.pinecone.batchSize; // Retry this batch
      }
    }
  }
  
  console.log(`Successfully stored ${storedCount} documents in Pinecone`);
  return storedCount;
}

/**
 * Delete documents from Pinecone by source
 * @param source - Source path to delete
 * @returns Promise with number of documents deleted
 */
export async function deleteFromPineconeBySource(source: string): Promise<void> {
  console.log(`Deleting documents with source ${source} from Pinecone...`);
  
  try {
    // Format source for filter
    const formattedSource = source.replace(/^\//, ''); // Remove leading slash if present
    
    // Delete by metadata filter
    await index.deleteMany({
      filter: {
        source: { $eq: formattedSource }
      }
    });
    
    console.log(`Successfully deleted documents with source ${source} from Pinecone`);
  } catch (error) {
    // Check if it's a 404 error (index not found)
    if (error instanceof Error && error.message && error.message.includes('404')) {
      console.warn(`Warning: Pinecone index not found when trying to delete documents. This may be expected for first-time runs.`);
      // Continue processing without failing
      return;
    }
    
    console.error(`Error deleting documents with source ${source} from Pinecone:`, error);
    throw error;
  }
}
