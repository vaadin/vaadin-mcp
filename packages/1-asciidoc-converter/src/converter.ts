/**
 * Main converter that orchestrates the AsciiDoc to Markdown conversion process
 */

import fs from 'fs';
import path from 'path';
import type { IngestionConfig, ProcessedMetadata, Framework } from 'core-types';
import { cloneOrPullRepo, getAsciiDocFiles } from './repository-manager.js';
import { detectFramework, isComponentFile } from './framework-detector.js';
import { generateVaadinUrl, parseMetadata, generateFrontmatter } from './url-generator.js';
import { processAsciiDoc, extractTitle } from './asciidoc-processor.js';

export interface ConversionResult {
  inputFile: string;
  outputFiles: string[];
  framework: Framework[];
  success: boolean;
  error?: string;
}

/**
 * Convert a single AsciiDoc file to Markdown with frontmatter
 * @param filePath - Path to the AsciiDoc file
 * @param config - Ingestion configuration
 * @param outputDir - Output directory for markdown files
 * @param framework - Optional specific framework to process for
 * @returns Conversion result
 */
export async function convertFile(
  filePath: string,
  config: IngestionConfig,
  outputDir: string,
  framework?: Framework
): Promise<ConversionResult> {
  const result: ConversionResult = {
    inputFile: filePath,
    outputFiles: [],
    framework: [],
    success: false
  };

  try {
    console.log(`Converting ${filePath}${framework ? ` for ${framework}` : ''}`);
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Parse existing metadata and clean content
    const { content: cleanContent, metadata: existingMetadata } = parseMetadata(content);
    
    // Detect framework if not specified
    const detectedFramework = framework || detectFramework(filePath, cleanContent);
    
    // Extract title from content
    const title = extractTitle(cleanContent);
    
    // Generate source URL
    const sourceUrl = generateVaadinUrl(filePath, config.repository.localPath);

    // Use explicit version from config (preferred) or fallback to branch parsing
    const vaadinVersion = config.repository.vaadinVersion 
      || config.repository.branch.match(/v(\d+)/)?.[1];

    // Create processed metadata
    const processedMetadata: ProcessedMetadata = {
      framework: detectedFramework,
      source_url: sourceUrl,
      title,
      vaadin_version: vaadinVersion,
      ...existingMetadata
    };
    
    // Process AsciiDoc to Markdown
    const markdownContent = await processAsciiDoc(
      cleanContent,
      filePath,
      detectedFramework,
      config.repository.localPath
    );
    
    // Generate frontmatter
    const frontmatter = generateFrontmatter(processedMetadata);
    
    // Combine frontmatter and content
    const finalContent = frontmatter + markdownContent;
    
    // Generate output path (preserve directory structure)
    const relativePath = path.relative(
      path.join(config.repository.localPath, 'articles'),
      filePath
    );
    const outputFileName = relativePath.replace(/\.adoc$|\.asciidoc$/, '.md');
    const frameworkSuffix = framework ? `-${framework}` : '';
    const outputFile = path.join(
      outputDir,
      outputFileName.replace('.md', `${frameworkSuffix}.md`)
    );
    
    // Ensure output directory exists
    const outputFileDir = path.dirname(outputFile);
    fs.mkdirSync(outputFileDir, { recursive: true });
    
    // Write the markdown file
    fs.writeFileSync(outputFile, finalContent, 'utf8');
    
    result.outputFiles.push(outputFile);
    result.framework.push(detectedFramework);
    result.success = true;
    
    console.log(`✓ Converted ${filePath} → ${outputFile}`);
    
  } catch (error) {
    console.error(`✗ Failed to convert ${filePath}:`, error);
    result.error = error instanceof Error ? error.message : String(error);
  }
  
  return result;
}

/**
 * Convert all AsciiDoc files to Markdown with frontmatter
 * @param config - Ingestion configuration
 * @param outputDir - Output directory for markdown files (defaults to packages/1-asciidoc-converter/dist/markdown/)
 * @returns Promise with conversion results
 */
export async function convertDocumentation(
  config: IngestionConfig,
  outputDir?: string
): Promise<ConversionResult[]> {
  const defaultOutputDir = path.join(process.cwd(), 'packages/1-asciidoc-converter/dist/markdown');
  const targetOutputDir = outputDir || defaultOutputDir;
  
  console.log('Starting AsciiDoc to Markdown conversion...');
  console.log(`Output directory: ${targetOutputDir}`);
  
  // Clone or pull the repository
  const repoSuccess = await cloneOrPullRepo(config);
  if (!repoSuccess) {
    throw new Error('Failed to clone or pull repository');
  }
  
  // Get all AsciiDoc files
  const files = getAsciiDocFiles(config);
  if (files.length === 0) {
    throw new Error('No AsciiDoc files found');
  }
  
  console.log(`Found ${files.length} AsciiDoc files to convert`);
  
  // Clean output directory
  if (fs.existsSync(targetOutputDir)) {
    fs.rmSync(targetOutputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetOutputDir, { recursive: true });
  
  // Process each file
  const results: ConversionResult[] = [];
  
  for (const file of files) {
    if (isComponentFile(file)) {
      // Component files should be processed for both frameworks
      const flowResult = await convertFile(file, config, targetOutputDir, 'flow');
      const hillaResult = await convertFile(file, config, targetOutputDir, 'hilla');
      results.push(flowResult, hillaResult);
    } else {
      // Regular files are processed with auto-detected framework
      const result = await convertFile(file, config, targetOutputDir);
      results.push(result);
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalOutputFiles = results.reduce((sum, r) => sum + r.outputFiles.length, 0);
  
  console.log(`\nConversion complete!`);
  console.log(`✓ ${successful} successful conversions`);
  console.log(`✗ ${failed} failed conversions`);
  console.log(`📁 ${totalOutputFiles} markdown files created in ${targetOutputDir}`);
  
  return results;
} 