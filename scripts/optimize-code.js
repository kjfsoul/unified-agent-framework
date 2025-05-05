#!/usr/bin/env node

/**
 * This script analyzes and optimizes JavaScript/TypeScript code.
 * It finds unused exports, detects circular dependencies, and handles memory leaks.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  console.log(`${colors.cyan}Starting code optimization...${colors.reset}`);
  
  // Install dependencies
  installDependencies();
  
  // Find unused exports
  findUnusedExports();
  
  // Detect circular dependencies
  detectCircularDependencies();
  
  // Detect potential memory leaks
  detectMemoryLeaks();
  
  console.log(`${colors.green}Code optimization completed!${colors.reset}`);
}

/**
 * Install dependencies
 */
function installDependencies() {
  console.log(`${colors.blue}Checking dependencies...${colors.reset}`);
  
  try {
    // Check if madge and depcheck are installed
    const packageJson = require(path.join(rootDir, 'package.json'));
    const devDependencies = packageJson.devDependencies || {};
    const dependencies = packageJson.dependencies || {};
    
    const missingPackages = [];
    
    if (!devDependencies.madge && !dependencies.madge) {
      missingPackages.push('madge');
    }
    
    if (!devDependencies.depcheck && !dependencies.depcheck) {
      missingPackages.push('depcheck');
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
 * Find unused exports in the code
 */
function findUnusedExports() {
  console.log(`${colors.blue}Finding unused exports...${colors.reset}`);
  
  try {
    // First compile the TypeScript code
    execSync('npx tsc --noEmit', { cwd: rootDir, stdio: 'inherit' });
    
    // Use depcheck to find unused dependencies and exports
    console.log(`${colors.blue}Running depcheck...${colors.reset}`);
    
    const depcheck = require('depcheck');
    
    const options = {
      ignoreBinPackage: false,
      skipMissing: false,
      ignorePatterns: ['dist', 'node_modules', '*.test.ts'],
      ignoreMatches: [],
      parsers: {
        '**/*.ts': depcheck.parser.typescript,
        '**/*.js': depcheck.parser.es6,
      },
      detectors: [
        depcheck.detector.requireCallExpression,
        depcheck.detector.importDeclaration,
      ],
      specials: [
        depcheck.special.eslint,
        depcheck.special.webpack,
      ],
    };
    
    depcheck(rootDir, options, (result) => {
      if (Object.keys(result.dependencies).length > 0) {
        console.log(`${colors.yellow}Unused dependencies:${colors.reset}`);
        Object.keys(result.dependencies).forEach((dep) => {
          console.log(`  - ${dep}`);
        });
      } else {
        console.log(`${colors.green}No unused dependencies found.${colors.reset}`);
      }
      
      if (Object.keys(result.devDependencies).length > 0) {
        console.log(`${colors.yellow}Unused dev dependencies:${colors.reset}`);
        Object.keys(result.devDependencies).forEach((dep) => {
          console.log(`  - ${dep}`);
        });
      } else {
        console.log(`${colors.green}No unused dev dependencies found.${colors.reset}`);
      }
    });
  } catch (error) {
    console.error(`${colors.red}Error finding unused exports:${colors.reset}`, error);
  }
}

/**
 * Detect circular dependencies in the code
 */
function detectCircularDependencies() {
  console.log(`${colors.blue}Detecting circular dependencies...${colors.reset}`);
  
  try {
    const madge = require('madge');
    
    madge(srcDir, {
      fileExtensions: ['ts', 'js'],
      excludeRegExp: [/\.test\.ts$/],
    }).then((res) => {
      const circular = res.circular();
      
      if (circular.length > 0) {
        console.log(`${colors.yellow}Found ${circular.length} circular dependencies:${colors.reset}`);
        
        circular.forEach((path, i) => {
          console.log(`  ${i + 1}. ${path.join(' -> ')}`);
        });
      } else {
        console.log(`${colors.green}No circular dependencies found.${colors.reset}`);
      }
    });
  } catch (error) {
    console.error(`${colors.red}Error detecting circular dependencies:${colors.reset}`, error);
  }
}

/**
 * Detect potential memory leaks in the code
 */
function detectMemoryLeaks() {
  console.log(`${colors.blue}Checking for potential memory leaks...${colors.reset}`);
  
  // Get all .ts and .js files in src directory
  const files = getFilesRecursive(srcDir, ['.ts', '.js']);
  
  const issues = [];
  
  for (const file of files) {
    const fileContents = fs.readFileSync(file, 'utf8');
    
    // Check for patterns that might cause memory leaks
    const patterns = [
      {
        pattern: /setInterval\([^,]+,[^)]+\)/g,
        description: 'setInterval without clearInterval',
        check: (match) => !fileContents.includes('clearInterval') && match,
      },
      {
        pattern: /setTimeout\([^,]+,[^)]+\)/g,
        description: 'setTimeout without clearTimeout',
        check: (match) => !fileContents.includes('clearTimeout') && match,
      },
      {
        pattern: /new\s+Map\(\)/g,
        description: 'Map created without clear method',
        check: (match) => !fileContents.includes('.clear()') && match,
      },
      {
        pattern: /addEventListener\(/g,
        description: 'addEventListener without removeEventListener',
        check: (match) => !fileContents.includes('removeEventListener') && match,
      },
      {
        pattern: /\.on\(['"]/g,
        description: 'Event listener without removal',
        check: (match) => !fileContents.includes('.off(') && !fileContents.includes('.removeListener(') && match,
      },
    ];
    
    // Check each pattern
    for (const { pattern, description, check } of patterns) {
      const matches = fileContents.match(pattern);
      
      if (matches && check(matches)) {
        issues.push({
          file,
          description,
          count: matches.length,
        });
      }
    }
  }
  
  // Print issues
  if (issues.length > 0) {
    console.log(`${colors.yellow}Found ${issues.length} potential memory leak issues:${colors.reset}`);
    
    for (const { file, description, count } of issues) {
      const relativePath = path.relative(rootDir, file);
      console.log(`  ${colors.yellow}[${count} instances]${colors.reset} ${relativePath}: ${description}`);
    }
  } else {
    console.log(`${colors.green}No potential memory leak issues found.${colors.reset}`);
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