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
 * @param branch - Optional branch to checkout (defaults to config.docs.branch)
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function cloneOrPullRepo(branch?: string): Promise<boolean> {
  const targetBranch = branch || config.docs.branch || 'main';
  
  try {
    // Check if repo already exists locally
    if (fs.existsSync(config.docs.localPath)) {
      // Pull latest changes
      console.log(`Repository exists at ${config.docs.localPath}, pulling latest changes from branch '${targetBranch}'...`);
      await git.cwd(config.docs.localPath)
        .fetch()
        .checkout(targetBranch)
        .pull();
      console.log(`Repository updated successfully on branch '${targetBranch}'`);
    } else {
      // Clone the repository
      console.log(`Cloning repository from ${config.docs.repoUrl} (branch: ${targetBranch}) to ${config.docs.localPath}...`);
      await git.clone(config.docs.repoUrl, config.docs.localPath);
      // Checkout the specified branch if it's not the default
      if (targetBranch !== 'main') {
        await git.cwd(config.docs.localPath).checkout(targetBranch);
      }
      console.log(`Repository cloned successfully on branch '${targetBranch}'`);
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
 * @returns boolean - True if the file should be included, false otherwise
 */
function shouldIncludeFile(filePath: string, articlesDir: string): boolean {
  // Include patterns are relative to the articles directory
  const relativePath = path.relative(articlesDir, filePath);
  
  // If no include patterns are specified, include all files
  if (!config.docs.includePatterns || config.docs.includePatterns.length === 0) {
    return true;
  }
  
  // Check if the file matches any of the include patterns
  for (const pattern of config.docs.includePatterns) {
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
 * @returns boolean - True if the file should be excluded, false otherwise
 */
function shouldExcludeFile(filePath: string, articlesDir: string): boolean {
  // Exclude patterns are relative to the articles directory
  const relativePath = path.relative(articlesDir, filePath);
  
  // Get the filename without the directory
  const filename = path.basename(relativePath);
  
  // Check if the file matches any of the exclude patterns
  if (config.docs.excludePatterns) {
    for (const pattern of config.docs.excludePatterns) {
      // Check if the pattern matches the relative path or just the filename
      if (
        minimatch(relativePath, pattern) || 
        minimatch(filename, pattern)
      ) {
        console.log(`Excluding file ${relativePath} (matched exclude pattern: ${pattern})`);
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
          if (shouldIncludeFile(fullPath, articlesDir)) {
            // Then check if it should be excluded based on exclude patterns
            if (!shouldExcludeFile(fullPath, articlesDir)) {
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
    console.log(`Found ${files.length} AsciiDoc files (not included: ${notIncludedCount} files based on include patterns, excluded: ${excludedCount} files based on exclude patterns)`);
  } else {
    console.error(`Articles directory not found: ${articlesDir}`);
  }
  
  return files;
}
