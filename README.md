# Unified Autonomous Agent Framework

A headless, brand-agnostic agent hub for automating tasks across multiple web applications.

## Overview

This framework provides a central agent system that can be called via API to run various automated tasks across different web applications. It's designed to be extensible, configurable, and easy to integrate with existing systems.

Key features:

- **Brand Agnostic**: Support for multiple brands/applications through configuration
- **Headless Design**: Pure API-based interface with no UI dependencies
- **Extensible Architecture**: Easy to add new agents and task types
- **Persistent Storage**: All logs, tasks, and results stored in Supabase
- **Real-time Monitoring**: Track task status and results through the API

## Supported Brands

The framework currently supports the following brands:

- **Mystic Arcana**: Tarot and astrology platform
- **EDM Shuffle**: EDM music discovery and engagement platform
- **BirthdayGen**: Personalized birthday content and messaging platform

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/unified-agent-framework.git
cd unified-agent-framework

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Build the project
npm run build
```

## Usage

### Start the server

```bash
npm start
```

### Running tasks via API

```bash
# Example: Validate a tarot deck
curl -X POST http://localhost:3000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "task": "validateTarotDeck",
    "brand": "mysticArcana",
    "parameters": {
      "deckId": "rider-waite",
      "validateImages": true
    }
  }'
```

### Check task status

```bash
# Example: Check task status
curl http://localhost:3000/api/agent/status/YOUR_EXECUTION_ID
```

### Get task result

```bash
# Example: Get task result
curl http://localhost:3000/api/agent/result/YOUR_EXECUTION_ID
```

## Development

### Running in development mode

```bash
npm run dev
```

### Linting and formatting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Run Prettier
npm run format

# Clean and optimize code
npm run clean
npm run optimize
```

### Running tests

```bash
npm test
```

## Architecture

The framework is built around these key components:

- **API Layer**: Express.js-based API for task submission and status checks
- **Task Orchestrator**: Manages task execution and scheduling
- **Agent Registry**: Tracks available agents and their capabilities
- **Core Infrastructure**: Common functionality for logging, error handling, etc.
- **Specialized Agents**: Implement specific task functionality
- **Persistence Layer**: Supabase integration for data storage

## Directory Structure

```
unified-agent-framework/
├── src/
│   ├── api/                    # API Layer
│   ├── orchestrator/           # Task Orchestrator
│   ├── registry/               # Agent Registry
│   ├── core/                   # Core Agent Infrastructure
│   ├── agents/                 # Specialized Agents
│   ├── db/                     # Database Integration
│   ├── brands/                 # Brand Configuration
│   ├── utils/                  # Utility functions
│   └── index.ts                # Main application entry point
├── scripts/                    # Build and deployment scripts
├── tests/                      # Automated tests
└── config/                     # Configuration files
```

## API Reference

### Agent Endpoints

- `POST /api/agent/run` - Run a task
- `GET /api/agent/status/:executionId` - Get task status
- `GET /api/agent/result/:executionId` - Get task result
- `DELETE /api/agent/cancel/:executionId` - Cancel a task

### Brand Endpoints

- `GET /api/brands` - List all brands
- `GET /api/brands/:key` - Get brand details
- `PUT /api/brands/:key` - Update brand configuration
- `POST /api/brands` - Create new brand

## Adding New Agents

1. Create a new directory in `src/agents/your-agent`
2. Implement agent class extending `BaseAgent`
3. Register the agent in `src/agents/index.ts`
4. Add task definitions to the database

## License

MIT