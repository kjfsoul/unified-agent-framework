# Duplicate File Detector Agent

This agent is designed to identify duplicate files across multiple directories. It provides an efficient workflow for finding and reporting duplicate files that can potentially be deleted to save disk space.

## Features

- Scan multiple directories for duplicate files
- Recursive directory scanning
- Content-based comparison (using file hashes)
- Filter by file extensions
- Detailed reporting with potential space savings

## Usage

The agent can be used via the API by sending a POST request to `/api/agent/run` with the following payload:

```json
{
  "task": "findDuplicateFiles",
  "parameters": {
    "directories": [
      "/path/to/directory1",
      "/path/to/directory2",
      "/path/to/directory3"
    ],
    "recursive": true,
    "compareContent": true,
    "fileTypes": [".jpg", ".png", ".pdf"]
  },
  "priority": "medium"
}
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `directories` | string[] | Yes | - | Array of directory paths to scan for duplicates |
| `recursive` | boolean | No | true | Whether to recursively scan subdirectories |
| `compareContent` | boolean | No | false | Whether to compare file content (using hash) or just rely on file sizes |
| `fileTypes` | string[] | No | [] | Array of file extensions to include (empty means all file types) |

## How It Works

1. The agent collects all files from the specified directories (and subdirectories if recursive is true)
2. It groups files by size (duplicate files must have the same size)
3. For files with the same size, if compareContent is true, it calculates and compares MD5 hash values
4. It generates a report with duplicate groups sorted by potential space savings

## Response Format

```json
{
  "duplicateGroups": [
    {
      "files": [
        {
          "path": "/path/to/file1.jpg",
          "size": 1024,
          "hash": "d41d8cd98f00b204e9800998ecf8427e",
          "extension": ".jpg",
          "lastModified": "2023-05-01T12:00:00.000Z"
        },
        {
          "path": "/path/to/file2.jpg",
          "size": 1024,
          "hash": "d41d8cd98f00b204e9800998ecf8427e",
          "extension": ".jpg",
          "lastModified": "2023-05-02T14:30:00.000Z"
        }
      ],
      "size": 1024,
      "hash": "d41d8cd98f00b204e9800998ecf8427e"
    }
  ],
  "totalFilesScanned": 100,
  "totalDuplicatesFound": 5,
  "totalSpaceSaveable": 10240
}
```

## Testing

Use the included test scripts to verify functionality:

1. First, create test files: `node scripts/create-test-files.js`
2. Test agent directly: `node scripts/test-duplicate-detector.js`
3. Test agent via API: `node scripts/test-api.js`

## Edge Cases and Error Handling

- **Permission errors**: The agent logs permission errors but continues scanning accessible files
- **File read errors**: If a file cannot be read, it's skipped but the process continues
- **Large files**: For very large files, hash computation may take significant time
- **Empty directories**: The agent handles empty directories gracefully

## Integration Ideas

- Connect with file management tools to enable one-click duplicate removal
- Generate visualization reports
- Schedule regular duplicate scans
- Store historical data to track duplicate accumulation over time