/**
 * Repository operations for managing and retrieving Vaadin documentation files
 */

import simpleGit from 'simple-git';
import { config } from './config';
import fs from 'fs';
import path from 'path';
import { minimatch } from 'minimatch';

// Initialize simple-git
const git = simpleGit();

/**
 * Clone or pull the Vaadin docs repository
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function cloneOrPullRepo(): Promise<boolean> {
  try {
    // Check if repo already exists locally
    if (fs.existsSync(config.docs.localPath)) {
      // Pull latest changes
      console.log(`Repository exists at ${config.docs.localPath}, pulling latest changes...`);
      await git.cwd(config.docs.localPath).pull();
      console.log('Repository updated successfully');
    } else {
      // Clone the repository
      console.log(`Cloning repository from ${config.docs.repoUrl} to ${config.docs.localPath}...`);
      await git.clone(config.docs.repoUrl, config.docs.localPath);
      console.log('Repository cloned successfully');
    }
    return true;
  } catch (error) {
    console.error('Git operation failed:', error);
    return false;
  }
}

/**
 * Check if a file should be skipped based on skip patterns
 * @param filePath - Full path to the file
 * @param articlesDir - Base articles directory path
 * @returns boolean - True if the file should be skipped, false otherwise
 */
function shouldSkipFile(filePath: string, articlesDir: string): boolean {
  // Skip patterns are relative to the articles directory
  const relativePath = path.relative(articlesDir, filePath);
  
  // Get the filename without the directory
  const filename = path.basename(relativePath);
  
  // Check if the file matches any of the skip patterns
  if (config.docs.skipPatterns) {
    for (const pattern of config.docs.skipPatterns) {
      // Check if the pattern matches the relative path or just the filename
      if (
        minimatch(relativePath, pattern) || 
        minimatch(filename, pattern)
      ) {
        console.log(`Skipping file ${relativePath} (matched pattern: ${pattern})`);
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get all AsciiDoc files from the articles directory
 * @returns string[] - Array of file paths
 */
export function getAsciiDocFiles(): string[] {
  const files: string[] = [];
  const articlesDir = path.join(config.docs.localPath, config.docs.articlesPath);
  let skippedCount = 0;
  
  function getFiles(dir: string) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          getFiles(fullPath);
        } else if ((item.endsWith('.asciidoc') || item.endsWith('.adoc')) && 
                  !shouldSkipFile(fullPath, articlesDir)) {
          files.push(fullPath);
        } else if (item.endsWith('.asciidoc') || item.endsWith('.adoc')) {
          // Count skipped files
          skippedCount++;
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }
  
  if (fs.existsSync(articlesDir)) {
    getFiles(articlesDir);
    console.log(`Found ${files.length} AsciiDoc files (skipped ${skippedCount} files based on skip patterns)`);
  } else {
    console.error(`Articles directory not found: ${articlesDir}`);
  }
  
  return files;
}
