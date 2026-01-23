/**
 * Repository operations for managing and retrieving Vaadin documentation files
 */

import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { minimatch } from 'minimatch';
import type { IngestionConfig } from 'core-types';

// Initialize simple-git
const git = simpleGit();

/**
 * Clone or pull the Vaadin docs repository
 * @param config - Ingestion configuration
 * @param branch - Optional branch to checkout (defaults to config.repository.branch)
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function cloneOrPullRepo(config: IngestionConfig, branch?: string): Promise<boolean> {
  const targetBranch = branch || config.repository.branch || 'main';
  
  try {
    // Check if repo already exists locally
    if (fs.existsSync(config.repository.localPath)) {
      // Pull latest changes
      console.debug(`Repository exists at ${config.repository.localPath}, pulling latest changes from branch '${targetBranch}'...`);
      await git.cwd(config.repository.localPath)
        .fetch()
        .checkout(targetBranch)
        .pull();
      console.debug(`Repository updated successfully on branch '${targetBranch}'`);
    } else {
      // Clone the repository
      console.debug(`Cloning repository from ${config.repository.url} (branch: ${targetBranch}) to ${config.repository.localPath}...`);
      await git.clone(config.repository.url, config.repository.localPath);
      // Checkout the specified branch if it's not the default
      if (targetBranch !== 'main') {
        await git.cwd(config.repository.localPath).checkout(targetBranch);
      }
      console.debug(`Repository cloned successfully on branch '${targetBranch}'`);
    }
    return true;
  } catch (error) {
    console.error('Git operation failed:', error);
    return false;
  }
}

/**
 * Check if a file should be included based on include patterns
 * @param filePath - Full path to the file
 * @param articlesDir - Base articles directory path
 * @param includePatterns - Array of patterns to include
 * @returns boolean - True if the file should be included, false otherwise
 */
function shouldIncludeFile(filePath: string, articlesDir: string, includePatterns: string[]): boolean {
  // Include patterns are relative to the articles directory
  const relativePath = path.relative(articlesDir, filePath);
  
  // If no include patterns are specified, include all files
  if (!includePatterns || includePatterns.length === 0) {
    return true;
  }
  
  // Check if the file matches any of the include patterns
  for (const pattern of includePatterns) {
    if (minimatch(relativePath, pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a file should be excluded based on exclude patterns
 * @param filePath - Full path to the file
 * @param articlesDir - Base articles directory path
 * @param excludePatterns - Array of patterns to exclude
 * @returns boolean - True if the file should be excluded, false otherwise
 */
function shouldExcludeFile(filePath: string, articlesDir: string, excludePatterns: string[]): boolean {
  // Exclude patterns are relative to the articles directory
  const relativePath = path.relative(articlesDir, filePath);
  
  // Get the filename without the directory
  const filename = path.basename(relativePath);
  
  // Check if the file matches any of the exclude patterns
  if (excludePatterns) {
    for (const pattern of excludePatterns) {
      // Check if the pattern matches the relative path or just the filename
      if (
        minimatch(relativePath, pattern) ||
        minimatch(filename, pattern)
      ) {
        console.debug(`Excluding file ${relativePath} (matched exclude pattern: ${pattern})`);
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get all AsciiDoc files from the articles directory
 * @param config - Ingestion configuration
 * @returns string[] - Array of file paths
 */
export function getAsciiDocFiles(config: IngestionConfig): string[] {
  const files: string[] = [];
  const articlesDir = path.join(config.repository.localPath, 'articles');
  let excludedCount = 0;
  let notIncludedCount = 0;
  
  function getFiles(dir: string) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          getFiles(fullPath);
        } else if ((item.endsWith('.asciidoc') || item.endsWith('.adoc'))) {
          // First check if the file should be included based on include patterns
          if (shouldIncludeFile(fullPath, articlesDir, config.processing.includePatterns)) {
            // Then check if it should be excluded based on exclude patterns
            if (!shouldExcludeFile(fullPath, articlesDir, config.processing.excludePatterns)) {
              files.push(fullPath);
            } else {
              // Count excluded files
              excludedCount++;
            }
          } else {
            // Count not included files (not matching include patterns)
            notIncludedCount++;
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }
  
  if (fs.existsSync(articlesDir)) {
    getFiles(articlesDir);
    console.debug(`Found ${files.length} AsciiDoc files (not included: ${notIncludedCount} files based on include patterns, excluded: ${excludedCount} files based on exclude patterns)`);
  } else {
    console.error(`Articles directory not found: ${articlesDir}`);
  }
  
  return files;
} 