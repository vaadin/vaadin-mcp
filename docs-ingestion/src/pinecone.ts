/**
 * Pinecone integration for storing and retrieving embeddings
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from './config';
import type { DocumentWithEmbedding } from './embeddings';
import { nanoid } from 'nanoid';

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
    // Create a prefix based on source for ID
    const sourcePrefix = doc.metadata.source ? 
      doc.metadata.source.replace(/[^a-zA-Z0-9]/g, '_') : 
      'unknown';
    
    // Create a unique ID with source prefix
    const id = `${sourcePrefix}#${nanoid()}`;
    
    // Prepare metadata, only including the specified fields
    const { embedding, ...restDoc } = doc;
    const metadata = {
      text: doc.text,
      title: doc.metadata.title || '',
      processed_at: new Date().toISOString(),
      source: doc.metadata.source || '',
      url: doc.metadata.url || '',
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
 * Delete documents from Pinecone by source using ID prefixes
 * @param source - Source path to delete
 * @returns Promise with number of documents deleted
 */
export async function deleteFromPineconeBySource(source: string): Promise<void> {
  console.log(`Deleting documents with source ${source} from Pinecone...`);
  
  try {
    // Format source for prefix
    const sourcePrefix = source.replace(/^\//, '').replace(/[^a-zA-Z0-9]/g, '_');
    
    // Use listPaginated to get all vector IDs with the source prefix
    let allVectorIds: string[] = [];
    let paginationToken: string | undefined;
    
    do {
      const listResult = await index.listPaginated({ 
        prefix: `${sourcePrefix}#`,
        paginationToken 
      });
      
      // Extract vector IDs from the result
      const vectorIds = listResult.vectors?.map(vector => vector.id).filter((id): id is string => id !== undefined) || [];
      allVectorIds = [...allVectorIds, ...vectorIds];
      
      // Get pagination token for next page if it exists
      paginationToken = listResult.pagination?.next;
      
      // Delete the current batch of vectors
      if (vectorIds.length > 0) {
        await index.deleteMany(vectorIds);
        console.log(`Deleted batch of ${vectorIds.length} vectors`);
      }
      
    } while (paginationToken);
    
    console.log(`Successfully deleted ${allVectorIds.length} documents with source prefix ${sourcePrefix} from Pinecone`);
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
