import { BaseAgent, TaskContext } from '../../core/agent';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

interface FileInfo {
  path: string;
  size: number;
  hash?: string;
  extension: string;
  lastModified: Date;
}

interface DuplicateGroup {
  files: FileInfo[];
  size: number;
  hash?: string;
}

interface DuplicateDetectionResult {
  duplicateGroups: DuplicateGroup[];
  totalFilesScanned: number;
  totalDuplicatesFound: number;
  totalSpaceSaveable: number;
}

export class DuplicateDetectorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Duplicate Detector Agent',
      description: 'Identifies duplicate files across directories',
      version: '1.0.0',
      capabilities: ['findDuplicateFiles']
    });
  }
  
  /**
   * Execute a task based on its type
   */
  public async executeTask(context: TaskContext): Promise<any> {
    const { executionId, taskType, parameters } = context;
    
    this.logger.info(`Executing task ${taskType}`, { executionId, parameters });
    await this.updateTaskStatus(executionId, 'running');
    
    try {
      if (taskType === 'findDuplicateFiles') {
        const result = await this.findDuplicateFiles(context);
        
        this.logger.info(`Task ${taskType} completed successfully`, { 
          executionId, 
          duplicatesFound: result.totalDuplicatesFound 
        });
        
        await this.updateTaskStatus(executionId, 'completed', result);
        return result;
      } else {
        throw new Error(`Unsupported task type: ${taskType}`);
      }
    } catch (error) {
      this.logger.error(`Task ${taskType} failed: ${(error as Error).message}`, { executionId });
      await this.updateTaskStatus(executionId, 'failed', null, (error as Error).message);
      throw error;
    }
  }
  
  /**
   * Find duplicate files across directories
   */
  private async findDuplicateFiles(context: TaskContext): Promise<DuplicateDetectionResult> {
    const { executionId, parameters } = context;
    const { directories, recursive = true, compareContent = false, fileTypes = [] } = parameters;
    
    if (!directories || !Array.isArray(directories) || directories.length === 0) {
      throw new Error('At least one directory path is required');
    }
    
    this.logActivity(executionId, 'info', `Starting duplicate file detection across ${directories.length} directories`);
    
    try {
      // Step 1: Collect all files from specified directories
      const allFiles: FileInfo[] = [];
      let scannedCount = 0;
      
      for (const directory of directories) {
        this.logActivity(executionId, 'info', `Scanning directory: ${directory}`);
        
        const files = await this.collectFiles(directory, recursive, fileTypes);
        allFiles.push(...files);
        
        scannedCount += files.length;
        this.logActivity(executionId, 'info', `Found ${files.length} files in ${directory}`);
      }
      
      this.logActivity(executionId, 'info', `Total files collected: ${allFiles.length}`);
      
      // Step 2: Group files by size (duplicate files must have the same size)
      const filesBySize = this.groupFilesBySize(allFiles);
      
      // Step 3: For each size group with multiple files, check for duplicates
      const duplicateGroups: DuplicateGroup[] = [];
      let totalDuplicates = 0;
      let totalSaveable = 0;
      
      for (const [size, files] of Object.entries(filesBySize)) {
        // Skip groups with only one file (no duplicates possible)
        if (files.length <= 1) continue;
        
        this.logActivity(executionId, 'info', `Checking ${files.length} files of size ${size} bytes for duplicates`);
        
        if (compareContent) {
          // If content comparison is enabled, compute hashes for files
          const fileGroups = await this.groupFilesByContent(files);
          
          for (const group of fileGroups) {
            if (group.length > 1) {
              // Found duplicates
              duplicateGroups.push({
                files: group,
                size: parseInt(size),
                hash: group[0].hash
              });
              
              totalDuplicates += group.length - 1;
              totalSaveable += (group.length - 1) * parseInt(size);
            }
          }
        } else {
          // If content comparison is disabled, treat all files of the same size as potential duplicates
          duplicateGroups.push({
            files,
            size: parseInt(size)
          });
          
          totalDuplicates += files.length - 1;
          totalSaveable += (files.length - 1) * parseInt(size);
        }
      }
      
      this.logActivity(executionId, 'info', `Duplicate detection complete. Found ${totalDuplicates} duplicate files`);
      
      // Format the result
      return {
        duplicateGroups: this.sortDuplicateGroups(duplicateGroups),
        totalFilesScanned: allFiles.length,
        totalDuplicatesFound: totalDuplicates,
        totalSpaceSaveable: totalSaveable
      };
    } catch (error) {
      this.logActivity(executionId, 'error', `Duplicate detection failed: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Collect all files from a directory and its subdirectories
   */
  private async collectFiles(
    directory: string, 
    recursive: boolean, 
    fileTypes: string[]
  ): Promise<FileInfo[]> {
    const result: FileInfo[] = [];
    
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory() && recursive) {
          // If entry is a directory and recursive is true, scan it
          const subDirFiles = await this.collectFiles(fullPath, recursive, fileTypes);
          result.push(...subDirFiles);
        } else if (entry.isFile()) {
          // Check file extension if fileTypes is specified
          const fileExt = path.extname(entry.name).toLowerCase();
          if (fileTypes.length > 0 && !fileTypes.includes(fileExt)) {
            continue;
          }
          
          const stats = await fs.stat(fullPath);
          
          result.push({
            path: fullPath,
            size: stats.size,
            extension: fileExt,
            lastModified: stats.mtime
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error scanning directory ${directory}: ${(error as Error).message}`);
      // Continue with other directories
    }
    
    return result;
  }
  
  /**
   * Group files by size
   */
  private groupFilesBySize(files: FileInfo[]): Record<string, FileInfo[]> {
    const result: Record<string, FileInfo[]> = {};
    
    for (const file of files) {
      const size = file.size.toString();
      
      if (!result[size]) {
        result[size] = [];
      }
      
      result[size].push(file);
    }
    
    return result;
  }
  
  /**
   * Group files by content (using hash)
   */
  private async groupFilesByContent(files: FileInfo[]): Promise<FileInfo[][]> {
    const filesByHash: Record<string, FileInfo[]> = {};
    
    // Calculate hash for each file
    for (const file of files) {
      try {
        const hash = await this.calculateFileHash(file.path);
        file.hash = hash;
        
        if (!filesByHash[hash]) {
          filesByHash[hash] = [];
        }
        
        filesByHash[hash].push(file);
      } catch (error) {
        this.logger.error(`Error calculating hash for ${file.path}: ${(error as Error).message}`);
        // Skip this file but continue with others
      }
    }
    
    // Return groups of files with the same hash
    return Object.values(filesByHash);
  }
  
  /**
   * Calculate MD5 hash of a file
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);
      
      stream.on('error', err => reject(err));
      
      stream.on('data', chunk => {
        hash.update(chunk);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
    });
  }
  
  /**
   * Sort duplicate groups by size (largest first)
   */
  private sortDuplicateGroups(groups: DuplicateGroup[]): DuplicateGroup[] {
    return groups.sort((a, b) => {
      // Sort by the space that could be saved (size * (count - 1))
      const aSavings = a.size * (a.files.length - 1);
      const bSavings = b.size * (b.files.length - 1);
      return bSavings - aSavings;
    });
  }
}

// Export agent instance
export const duplicateDetectorAgent = new DuplicateDetectorAgent();

export default duplicateDetectorAgent;