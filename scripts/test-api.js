/**
 * This script tests the duplicate detector agent through the API.
 * It sends a request to the API and waits for the result.
 */

const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

async function testApi() {
  console.log('Testing duplicate detector agent through API...');
  
  // Base directory for test files
  const baseDir = path.join(__dirname, '..', 'test-files');
  
  // API endpoint
  const apiUrl = 'http://localhost:3000/api/agent/run';
  
  // Create request payload
  const payload = {
    task: 'findDuplicateFiles',
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
    // Step 1: Submit the task
    console.log('Submitting task to API...');
    const submitResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!submitResponse.ok) {
      const errorData = await submitResponse.json();
      throw new Error(`API error: ${errorData.message}`);
    }
    
    const submitData = await submitResponse.json();
    const executionId = submitData.executionId;
    console.log(`Task submitted successfully. Execution ID: ${executionId}`);
    
    // Step 2: Poll for result
    console.log('Polling for result...');
    let result = null;
    let attempts = 0;
    const maxAttempts = 20;
    const pollInterval = 1000; // 1 second
    
    while (!result && attempts < maxAttempts) {
      attempts++;
      console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
      
      const resultResponse = await fetch(`http://localhost:3000/api/agent/result/${executionId}`);
      const resultData = await resultResponse.json();
      
      if (resultData.status === 'completed') {
        result = resultData.result;
        break;
      } else if (resultData.status === 'failed') {
        throw new Error(`Task failed: ${resultData.error}`);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    if (!result) {
      throw new Error('Task did not complete in the expected time');
    }
    
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
    console.error('Error testing API:', error);
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
testApi().catch(console.error);