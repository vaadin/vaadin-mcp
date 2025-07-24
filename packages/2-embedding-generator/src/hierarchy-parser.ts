/**
 * File Hierarchy Parser
 * 
 * Understands the directory structure to create cross-file parent-child relationships.
 * For example: forms.adoc is parent to forms/binding.adoc
 */

import path from 'path';
import fs from 'fs';

export interface FileHierarchy {
  filePath: string;
  parentPath: string | null;
  children: string[];
  level: number;
}

export interface DirectoryStructure {
  [filePath: string]: FileHierarchy;
}

/**
 * Parses the file system structure to understand parent-child relationships
 * @param markdownDir - The directory containing processed markdown files
 * @returns A map of file paths to their hierarchy information
 */
export function parseFileHierarchy(markdownDir: string): DirectoryStructure {
  const structure: DirectoryStructure = {};
  
  // Get all markdown files recursively
  const markdownFiles = findMarkdownFiles(markdownDir);
  
  for (const filePath of markdownFiles) {
    const relativePath = path.relative(markdownDir, filePath);
    const hierarchy = analyzeFilePosition(relativePath, markdownFiles, markdownDir);
    structure[relativePath] = hierarchy;
  }
  
  return structure;
}

/**
 * Recursively finds all markdown files in a directory
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Analyzes a file's position in the hierarchy
 */
function analyzeFilePosition(
  relativePath: string, 
  allFiles: string[], 
  markdownDir: string
): FileHierarchy {
  const pathSegments = relativePath.split(path.sep);
  const level = pathSegments.length - 1; // 0 for root level files
  
  // Determine parent file
  const parentPath = findParentFile(relativePath, allFiles, markdownDir);
  
  // Find direct children
  const children = findChildFiles(relativePath, allFiles, markdownDir);
  
  return {
    filePath: relativePath,
    parentPath,
    children,
    level
  };
}

/**
 * Finds the parent file for a given file based on directory structure
 * Example: forms/binding.md -> forms.md
 */
function findParentFile(
  relativePath: string, 
  allFiles: string[], 
  markdownDir: string
): string | null {
  const pathSegments = relativePath.split(path.sep);
  
  // Root level files have no parent
  if (pathSegments.length === 1) {
    return null;
  }
  
  // Look for parent file in the parent directory
  const parentDir = pathSegments.slice(0, -1).join(path.sep);
  const fileName = pathSegments[pathSegments.length - 1];
  
  // Check for index files first (index-flow.md, index-hilla.md, index.md)
  const possibleParentPaths = [
    path.join(parentDir, 'index.md'),
    path.join(parentDir, 'index-flow.md'),
    path.join(parentDir, 'index-hilla.md')
  ];
  
  for (const parentPath of possibleParentPaths) {
    const fullParentPath = path.join(markdownDir, parentPath);
    if (allFiles.includes(fullParentPath)) {
      return parentPath;
    }
  }
  
  // If no index file, look for a file with the same name as the directory
  if (pathSegments.length >= 2) {
    const grandParentDir = pathSegments.slice(0, -2).join(path.sep);
    const parentDirName = pathSegments[pathSegments.length - 2];
    
    const namedParentPath = grandParentDir 
      ? path.join(grandParentDir, `${parentDirName}.md`)
      : `${parentDirName}.md`;
    
    const fullNamedParentPath = path.join(markdownDir, namedParentPath);
    if (allFiles.includes(fullNamedParentPath)) {
      return namedParentPath;
    }
  }
  
  return null;
}

/**
 * Finds direct child files for a given file
 */
function findChildFiles(
  relativePath: string, 
  allFiles: string[], 
  markdownDir: string
): string[] {
  const children: string[] = [];
  const pathWithoutExt = relativePath.replace(/\.md$/, '');
  
  // Look for files in a subdirectory with the same name
  for (const filePath of allFiles) {
    const relativeFilePath = path.relative(markdownDir, filePath);
    const filePathSegments = relativeFilePath.split(path.sep);
    
    // Check if this file is in a subdirectory that matches our base name
    if (filePathSegments.length > 1) {
      const potentialParentPath = filePathSegments.slice(0, -1).join(path.sep);
      if (potentialParentPath === pathWithoutExt) {
        children.push(relativeFilePath);
      }
    }
  }
  
  return children;
}

/**
 * Gets the parent file path for a given file (if any)
 */
export function getParentFilePath(filePath: string, structure: DirectoryStructure): string | null {
  const hierarchy = structure[filePath];
  return hierarchy?.parentPath || null;
}

/**
 * Gets all child file paths for a given file
 */
export function getChildFilePaths(filePath: string, structure: DirectoryStructure): string[] {
  const hierarchy = structure[filePath];
  return hierarchy?.children || [];
}

/**
 * Checks if a file has a parent (is not a root-level file)
 */
export function hasParent(filePath: string, structure: DirectoryStructure): boolean {
  return getParentFilePath(filePath, structure) !== null;
} 