/**
 * This script creates test files for demonstrating the duplicate detector agent.
 * It creates multiple directories with duplicate and unique files.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const baseDir = path.join(__dirname, '..', 'test-files');
const dirs = [
  path.join(baseDir, 'dir1'),
  path.join(baseDir, 'dir2'),
  path.join(baseDir, 'dir3', 'subdir'),
];

// Create random content of specified size
function createRandomContent(sizeInBytes) {
  return crypto.randomBytes(sizeInBytes);
}

// Create a file with specified content
function createFile(filePath, content) {
  fs.writeFileSync(filePath, content);
  console.log(`Created file: ${filePath} (${content.length} bytes)`);
}

// Create test files and directories
async function createTestFiles() {
  console.log('Creating test files for duplicate detection...');
  
  // Create directories
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
  
  // Create some duplicate files across directories
  const duplicateContent1 = createRandomContent(1024); // 1KB
  const duplicateContent2 = createRandomContent(2048); // 2KB
  const duplicateContent3 = createRandomContent(4096); // 4KB
  
  // Create unique files
  const uniqueContent1 = createRandomContent(1536); // 1.5KB
  const uniqueContent2 = createRandomContent(3072); // 3KB
  const uniqueContent3 = createRandomContent(6144); // 6KB
  
  // Create files in directory 1
  createFile(path.join(dirs[0], 'duplicate1.txt'), duplicateContent1);
  createFile(path.join(dirs[0], 'duplicate2.txt'), duplicateContent2);
  createFile(path.join(dirs[0], 'unique1.txt'), uniqueContent1);
  
  // Create files in directory 2
  createFile(path.join(dirs[1], 'duplicate1_copy.txt'), duplicateContent1);
  createFile(path.join(dirs[1], 'unique2.txt'), uniqueContent2);
  createFile(path.join(dirs[1], 'duplicate3.txt'), duplicateContent3);
  
  // Create files in directory 3
  createFile(path.join(dirs[2], 'duplicate2_copy.txt'), duplicateContent2);
  createFile(path.join(dirs[2], 'duplicate3_copy.txt'), duplicateContent3);
  createFile(path.join(dirs[2], 'unique3.txt'), uniqueContent3);
  
  // Create some image files (they will be empty files with image extensions)
  createFile(path.join(dirs[0], 'image1.jpg'), duplicateContent1);
  createFile(path.join(dirs[1], 'image1_copy.jpg'), duplicateContent1);
  
  console.log('Finished creating test files');
}

// Run the function
createTestFiles().catch(console.error);