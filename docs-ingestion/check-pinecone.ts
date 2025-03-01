#!/usr/bin/env bun

/**
 * Check Pinecone index status script for Vaadin Documentation Ingestion Pipeline
 * This script checks the status of the Pinecone index and displays information about it
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from './src/config';

// Check if the required environment variables are set
if (!config.pinecone.apiKey) {
  console.error('PINECONE_API_KEY environment variable is required');
  process.exit(1);
}

if (!config.pinecone.index) {
  console.error('PINECONE_INDEX environment variable is required');
  process.exit(1);
}

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey || '',
});

/**
 * Main function to check the Pinecone index status
 */
async function main() {
  console.log('Checking Pinecone index status...');
  
  try {
    // Get the index
    const index = pinecone.index(config.pinecone.index || '');
    
    // Get index stats
    const stats = await index.describeIndexStats();
    
    console.log('\nPinecone Index Information:');
    console.log(`Index Name: ${config.pinecone.index}`);
    console.log(`Total Vector Count: ${stats.totalRecordCount}`);
    console.log(`Dimension: ${stats.dimension}`);
    
    // Display namespaces if any
    if (stats.namespaces && Object.keys(stats.namespaces).length > 0) {
      console.log('\nNamespaces:');
      for (const [namespace, data] of Object.entries(stats.namespaces)) {
        console.log(`  ${namespace}: ${data.recordCount} vectors`);
      }
    } else {
      console.log('\nNo namespaces found.');
    }
    
    // Query a sample vector to check if the index is working
    console.log('\nPerforming a test query...');
    
    // Create a random vector with the same dimension as the index
    const dimension = stats.dimension || 1536; // Default to 1536 if dimension is not available
    const vector = Array.from({ length: dimension }, () => Math.random());
    
    // Query the index
    const queryResponse = await index.query({
      vector,
      topK: 1,
      includeMetadata: true,
    });
    
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      console.log('Test query successful!');
      console.log(`Found ${queryResponse.matches.length} matches.`);
      
      // Display the first match
      const firstMatch = queryResponse.matches[0];
      console.log('\nSample Match:');
      console.log(`ID: ${firstMatch.id}`);
      console.log(`Score: ${firstMatch.score}`);
      
      // Display metadata if available
      if (firstMatch.metadata) {
        console.log('Metadata:');
        const metadata = firstMatch.metadata as any;
        console.log(`  Title: ${metadata.title || 'N/A'}`);
        console.log(`  Source: ${metadata.source || 'N/A'}`);
        console.log(`  Heading: ${metadata.heading || 'N/A'}`);
      }
    } else {
      console.log('Test query returned no results. This could be normal if the index is empty.');
    }
    
    console.log('\nPinecone index check completed successfully.');
  } catch (error) {
    console.error('Error checking Pinecone index:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
