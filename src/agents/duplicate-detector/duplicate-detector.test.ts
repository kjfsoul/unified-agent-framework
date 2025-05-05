import { DuplicateDetectorAgent } from './index';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Mock fs module
jest.mock('fs/promises');

describe('DuplicateDetectorAgent', () => {
  let agent: DuplicateDetectorAgent;
  
  beforeEach(() => {
    agent = new DuplicateDetectorAgent();
    
    // Reset all mocks
    jest.resetAllMocks();
  });
  
  describe('executeTask', () => {
    it('should throw error for unsupported task types', async () => {
      const context = {
        executionId: uuidv4(),
        taskType: 'unsupportedTask',
        parameters: {},
        priority: 'medium'
      };
      
      await expect(agent.executeTask(context)).rejects.toThrow('Unsupported task type');
    });
    
    it('should throw error if no directories are provided', async () => {
      const context = {
        executionId: uuidv4(),
        taskType: 'findDuplicateFiles',
        parameters: {},
        priority: 'medium'
      };
      
      await expect(agent.executeTask(context)).rejects.toThrow('directory path is required');
    });
  });
  
  describe('findDuplicateFiles', () => {
    it('should identify duplicate files across directories', async () => {
      // Mock file system functions
      const mockStats = (size: number, isDirectory = false) => ({
        isDirectory: () => isDirectory,
        isFile: () => !isDirectory,
        size,
        mtime: new Date()
      });
      
      // Mock readdir to return files
      (fs.readdir as jest.Mock).mockImplementation((dir, options) => {
        if (dir === '/test/dir1') {
          return Promise.resolve([
            { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
            { name: 'file2.txt', isDirectory: () => false, isFile: () => true }
          ]);
        } else if (dir === '/test/dir2') {
          return Promise.resolve([
            { name: 'file1_copy.txt', isDirectory: () => false, isFile: () => true },
            { name: 'file3.txt', isDirectory: () => false, isFile: () => true }
          ]);
        }
        return Promise.resolve([]);
      });
      
      // Mock stat to return file stats
      (fs.stat as jest.Mock).mockImplementation((filePath) => {
        if (filePath === '/test/dir1/file1.txt' || filePath === '/test/dir2/file1_copy.txt') {
          return Promise.resolve(mockStats(1024)); // Same size = potential duplicate
        } else if (filePath === '/test/dir1/file2.txt') {
          return Promise.resolve(mockStats(2048));
        } else if (filePath === '/test/dir2/file3.txt') {
          return Promise.resolve(mockStats(3072));
        } else if (filePath === '/test/dir1' || filePath === '/test/dir2') {
          return Promise.resolve(mockStats(0, true)); // Directories
        }
        return Promise.reject(new Error('File not found'));
      });
      
      // Mock createReadStream
      jest.spyOn(fs, 'createReadStream').mockImplementation((filePath: any) => {
        // Create a mock stream that emits the same data for duplicate files
        const mockStream: any = {
          on: (event: string, callback: any) => {
            if (event === 'data') {
              if (filePath === '/test/dir1/file1.txt' || filePath === '/test/dir2/file1_copy.txt') {
                callback(Buffer.from('same content'));
              } else {
                callback(Buffer.from('different content'));
              }
            } else if (event === 'end') {
              setTimeout(() => callback(), 10);
            }
            return mockStream;
          }
        };
        return mockStream;
      });
      
      // Set up test context
      const context = {
        executionId: uuidv4(),
        taskType: 'findDuplicateFiles',
        parameters: {
          directories: ['/test/dir1', '/test/dir2'],
          recursive: false,
          compareContent: true
        },
        priority: 'medium'
      };
      
      // Create a mock for updateTaskStatus
      (agent as any).updateTaskStatus = jest.fn();
      (agent as any).logActivity = jest.fn();
      
      // Execute the task
      const result = await agent.executeTask(context);
      
      // Verify results
      expect(result.totalFilesScanned).toBe(4);
      expect(result.duplicateGroups.length).toBeGreaterThan(0);
      expect(result.duplicateGroups[0].files.length).toBe(2);
      
      // Should contain both duplicate files
      const filePaths = result.duplicateGroups[0].files.map((f: any) => f.path);
      expect(filePaths).toContain('/test/dir1/file1.txt');
      expect(filePaths).toContain('/test/dir2/file1_copy.txt');
    });
  });
});