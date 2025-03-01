/**
 * Git operations for managing the Vaadin docs repository
 */

import simpleGit from 'simple-git';
import { config } from './config';
import fs from 'fs';
import path from 'path';

// Initialize simple-git
const git = simpleGit();

/**
 * Clone or pull the Vaadin docs repository
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function cloneOrPullRepo(): Promise<boolean> {
  try {
    // Check if repo already exists locally
    if (fs.existsSync(config.github.localPath)) {
      // Pull latest changes
      console.log(`Repository exists at ${config.github.localPath}, pulling latest changes...`);
      await git.cwd(config.github.localPath).pull();
      console.log('Repository updated successfully');
    } else {
      // Clone the repository
      console.log(`Cloning repository from ${config.github.repoUrl} to ${config.github.localPath}...`);
      await git.clone(config.github.repoUrl, config.github.localPath);
      console.log('Repository cloned successfully');
    }
    return true;
  } catch (error) {
    console.error('Git operation failed:', error);
    return false;
  }
}

/**
 * Get all AsciiDoc files from the articles directory
 * @returns string[] - Array of file paths
 */
export function getAsciiDocFiles(): string[] {
  const files: string[] = [];
  const articlesDir = path.join(config.github.localPath, config.github.articlesPath);
  
  function getFiles(dir: string) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          getFiles(fullPath);
        } else if (item.endsWith('.asciidoc') || item.endsWith('.adoc')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }
  
  if (fs.existsSync(articlesDir)) {
    getFiles(articlesDir);
    console.log(`Found ${files.length} AsciiDoc files`);
  } else {
    console.error(`Articles directory not found: ${articlesDir}`);
  }
  
  return files;
}
