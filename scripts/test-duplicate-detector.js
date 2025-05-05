/**
 * This script tests the duplicate detector agent by directly running it.
 * It bypasses the API layer to demonstrate the core functionality.
 */

const path = require('path');
const { duplicateDetectorAgent } = require('../dist/agents/duplicate-detector');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function runDuplicateDetection() {
  console.log('Testing duplicate detector agent...');
  
  // Base directory for test files
  const baseDir = path.join(__dirname, '..', 'test-files');
  
  // Create test context
  const context = {
    executionId: uuidv4(),
    taskType: 'findDuplicateFiles',
    parameters: {
      directories: [
        path.join(baseDir, 'dir1'),
        path.join(baseDir, 'dir2'),
        path.join(baseDir, 'dir3'),
      ],
      recursive: true,
      compareContent: true,
      fileTypes: [] // All file types
    },
    priority: 'medium'
  };
  
  try {
    // Execute the task
    console.log(`Starting duplicate detection with execution ID: ${context.executionId}`);
    console.log(`Scanning directories: ${context.parameters.directories.join(', ')}`);
    
    const result = await duplicateDetectorAgent.executeTask(context);
    
    // Print results
    console.log('Duplicate detection completed successfully!');
    console.log(`\nSummary:`);
    console.log(`- Total files scanned: ${result.totalFilesScanned}`);
    console.log(`- Total duplicates found: ${result.totalDuplicatesFound}`);
    console.log(`- Total space saveable: ${formatBytes(result.totalSpaceSaveable)}`);
    
    console.log(`\nDuplicate Groups (${result.duplicateGroups.length}):`);
    for (let i = 0; i < result.duplicateGroups.length; i++) {
      const group = result.duplicateGroups[i];
      console.log(`\nGroup ${i + 1}: ${group.files.length} files, ${formatBytes(group.size)} each`);
      
      for (const file of group.files) {
        console.log(`  - ${file.path}`);
      }
    }
  } catch (error) {
    console.error('Error running duplicate detection:', error);
  }
}

// Helper to format bytes into a readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Run the test script
runDuplicateDetection().catch(console.error);