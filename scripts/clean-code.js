#!/usr/bin/env node

/**
 * This script cleans and optimizes the codebase by:
 * 1. Removing any commented-out code
 * 2. Running ESLint to fix formatting issues
 * 3. Running Prettier to standardize code style
 * 4. Scanning for potential performance issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const excludeDirs = ['node_modules', 'dist', '.git', 'test-files'];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Main function
 */
async function main() {
  console.log(`${colors.cyan}Starting code cleanup and optimization...${colors.reset}`);
  
  // Step 1: Install dependencies if needed
  installDependencies();
  
  // Step 2: Run ESLint to fix issues
  runEslint();
  
  // Step 3: Run Prettier to standardize code style
  runPrettier();
  
  // Step 4: Remove commented-out code
  await removeCommentedCode();
  
  // Step 5: Check for performance issues
  checkPerformanceIssues();
  
  console.log(`${colors.green}Code cleanup and optimization completed!${colors.reset}`);
}

/**
 * Install dependencies if they aren't already installed
 */
function installDependencies() {
  console.log(`${colors.blue}Checking dependencies...${colors.reset}`);
  
  try {
    // Check if eslint and prettier are installed
    const packageJson = require(path.join(rootDir, 'package.json'));
    const devDependencies = packageJson.devDependencies || {};
    const dependencies = packageJson.dependencies || {};
    
    const missingPackages = [];
    
    if (!devDependencies.eslint && !dependencies.eslint) {
      missingPackages.push('eslint');
    }
    
    if (!devDependencies.prettier && !dependencies.prettier) {
      missingPackages.push('prettier');
    }
    
    if (!devDependencies['@typescript-eslint/parser'] && !dependencies['@typescript-eslint/parser']) {
      missingPackages.push('@typescript-eslint/parser');
    }
    
    if (!devDependencies['@typescript-eslint/eslint-plugin'] && !dependencies['@typescript-eslint/eslint-plugin']) {
      missingPackages.push('@typescript-eslint/eslint-plugin');
    }
    
    if (missingPackages.length > 0) {
      console.log(`${colors.yellow}Installing missing dependencies: ${missingPackages.join(', ')}${colors.reset}`);
      execSync(`npm install --save-dev ${missingPackages.join(' ')}`, { stdio: 'inherit', cwd: rootDir });
    } else {
      console.log(`${colors.green}All dependencies are installed.${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}Failed to check dependencies:${colors.reset}`, error);
  }
}

/**
 * Run ESLint to fix issues
 */
function runEslint() {
  console.log(`${colors.blue}Running ESLint to fix issues...${colors.reset}`);
  
  try {
    execSync('npx eslint --fix "src/**/*.{ts,js}"', { stdio: 'inherit', cwd: rootDir });
    console.log(`${colors.green}ESLint completed successfully.${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}ESLint found issues:${colors.reset}`);
    // Don't exit, as we want to run all steps even if some have issues
  }
}

/**
 * Run Prettier to standardize code style
 */
function runPrettier() {
  console.log(`${colors.blue}Running Prettier to standardize code style...${colors.reset}`);
  
  try {
    execSync('npx prettier --write "src/**/*.{ts,js}"', { stdio: 'inherit', cwd: rootDir });
    console.log(`${colors.green}Prettier completed successfully.${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Prettier failed:${colors.reset}`, error);
  }
}

/**
 * Remove commented-out code
 */
async function removeCommentedCode() {
  console.log(`${colors.blue}Scanning for commented-out code...${colors.reset}`);
  
  // Get all .ts and .js files in src directory
  const files = getFilesRecursive(srcDir, ['.ts', '.js']);
  
  let totalLinesRemoved = 0;
  
  for (const file of files) {
    const linesRemoved = await removeCommentsFromFile(file);
    if (linesRemoved > 0) {
      totalLinesRemoved += linesRemoved;
      console.log(`${colors.yellow}Removed ${linesRemoved} commented-out lines from ${file}${colors.reset}`);
    }
  }
  
  console.log(`${colors.green}Removed a total of ${totalLinesRemoved} commented-out lines.${colors.reset}`);
}

/**
 * Remove comments from a file
 */
async function removeCommentsFromFile(filePath) {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const lines = fileContents.split('\n');
  const newLines = [];
  let inMultilineComment = false;
  let linesRemoved = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check for multiline comments
    if (inMultilineComment) {
      if (line.includes('*/')) {
        line = line.substring(line.indexOf('*/') + 2);
        inMultilineComment = false;
        linesRemoved++;
      } else {
        linesRemoved++;
        continue;
      }
    }
    
    // Check for multiline comment start
    if (line.includes('/*')) {
      if (line.includes('*/')) {
        // Single-line /* ... */ comment
        line = line.replace(/\/\*.*?\*\//g, '');
      } else {
        // Start of multiline comment
        line = line.substring(0, line.indexOf('/*'));
        inMultilineComment = true;
      }
    }
    
    // Check for single-line comments (skip JSDoc comments)
    if (line.trim().startsWith('//') && !line.trim().startsWith('///') && !line.trim().startsWith('//!')) {
      linesRemoved++;
      continue;
    }
    
    // Remove inline comments (but preserve comments in strings)
    let inString = false;
    let stringChar = '';
    let newLine = '';
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1] || '';
      
      // Check if in string
      if ((char === "'" || char === '"' || char === '`') && (j === 0 || line[j - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }
      
      // Check for inline comment
      if (!inString && char === '/' && nextChar === '/') {
        // Skip rest of line
        break;
      }
      
      newLine += char;
    }
    
    // Add line (if not empty)
    if (newLine.trim() !== '') {
      newLines.push(newLine);
    } else if (line.trim() === '') {
      // Preserve empty lines
      newLines.push('');
    } else {
      linesRemoved++;
    }
  }
  
  // Only write file if changes were made
  if (linesRemoved > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'));
  }
  
  return linesRemoved;
}

/**
 * Check for performance issues in the code
 */
function checkPerformanceIssues() {
  console.log(`${colors.blue}Checking for performance issues...${colors.reset}`);
  
  // Get all .ts and .js files in src directory
  const files = getFilesRecursive(srcDir, ['.ts', '.js']);
  
  const issues = [];
  
  for (const file of files) {
    const fileContents = fs.readFileSync(file, 'utf8');
    
    // Check for inefficient patterns
    const patterns = [
      { pattern: /\+\s*''/, description: 'String concatenation with empty string', severity: 'low' },
      { pattern: /for\s*\(let\s+i\s*=\s*0;[^;]*\.length;/, description: 'Loop with .length in condition (cache length)', severity: 'medium' },
      { pattern: /new\s+Array\([^)]*\)\.fill/, description: 'Consider using Array.from', severity: 'low' },
      { pattern: /Object\.keys\([^)]*\)\.forEach/, description: 'Consider using for...in loop', severity: 'low' },
      { pattern: /JSON\.parse\(JSON\.stringify\(/, description: 'Inefficient deep clone', severity: 'high' },
      { pattern: /\.map\([^)]*\)\.filter\(/, description: 'Sequential map and filter (.filter().map() is more efficient)', severity: 'medium' },
      { pattern: /\{\s*\[\s*[a-zA-Z0-9_$]+\s*\]\s*:[^{}:,]+\s*\}/g, description: 'Object literal with computed property (consider variable)', severity: 'low' },
    ];
    
    for (const { pattern, description, severity } of patterns) {
      if (pattern.test(fileContents)) {
        issues.push({ file, description, severity });
      }
    }
  }
  
  // Print issues
  if (issues.length > 0) {
    console.log(`${colors.yellow}Found ${issues.length} potential performance issues:${colors.reset}`);
    
    for (const { file, description, severity } of issues) {
      const relativePath = path.relative(rootDir, file);
      const severityColor = severity === 'high' ? colors.red : severity === 'medium' ? colors.yellow : colors.cyan;
      console.log(`  ${severityColor}[${severity}]${colors.reset} ${relativePath}: ${description}`);
    }
  } else {
    console.log(`${colors.green}No performance issues found.${colors.reset}`);
  }
}

/**
 * Get all files recursively from a directory
 */
function getFilesRecursive(dir, extensions) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip excluded directories
      if (excludeDirs.includes(file)) {
        continue;
      }
      
      // Recursively get files from subdirectories
      results = results.concat(getFilesRecursive(filePath, extensions));
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  
  return results;
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Script failed:${colors.reset}`, error);
  process.exit(1);
});