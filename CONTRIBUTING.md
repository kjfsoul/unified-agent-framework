# Contributing to the Unified Agent Framework

Thank you for considering contributing to the Unified Agent Framework! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/unified-agent-framework.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`
5. Make your changes
6. Run tests: `npm test`
7. Commit your changes: `git commit -m "Add your feature"`
8. Push to the branch: `git push origin feature/your-feature-name`
9. Submit a pull request

## Development Environment

- Node.js (version 16+)
- TypeScript
- Supabase account (for testing)

## Setting Up Local Environment

1. Copy `.env.example` to `.env`
2. Fill in the environment variables
3. Run `npm run dev` to start the development server

## Code Style

We use ESLint and Prettier to maintain code quality and consistency:

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix

# Format code
npm run format
```

## Adding New Agents

1. Create a new directory in `src/agents/your-agent-name`
2. Create an `index.ts` file with your agent implementation
3. Extend the `BaseAgent` class from `src/core/agent.ts`
4. Implement the `executeTask` method
5. Register your agent in `src/agents/index.ts`
6. Add tests for your agent

Example:

```typescript
// src/agents/your-agent/index.ts
import { BaseAgent, TaskContext } from '../../core/agent';

export class YourAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Your Agent',
      description: 'Description of your agent',
      version: '1.0.0',
      capabilities: ['yourTaskType1', 'yourTaskType2']
    });
  }
  
  public async executeTask(context: TaskContext): Promise<any> {
    const { executionId, taskType, parameters } = context;
    
    this.logger.info(`Executing task ${taskType}`, { executionId, parameters });
    await this.updateTaskStatus(executionId, 'running');
    
    try {
      let result;
      
      switch (taskType) {
        case 'yourTaskType1':
          result = await this.handleTaskType1(context);
          break;
        case 'yourTaskType2':
          result = await this.handleTaskType2(context);
          break;
        default:
          throw new Error(`Unsupported task type: ${taskType}`);
      }
      
      this.logger.info(`Task ${taskType} completed successfully`, { executionId });
      await this.updateTaskStatus(executionId, 'completed', result);
      return result;
    } catch (error) {
      this.logger.error(`Task ${taskType} failed: ${error.message}`, { executionId });
      await this.updateTaskStatus(executionId, 'failed', null, error.message);
      throw error;
    }
  }
  
  private async handleTaskType1(context: TaskContext): Promise<any> {
    // Implement task type 1 logic
    return { result: 'Task type 1 result' };
  }
  
  private async handleTaskType2(context: TaskContext): Promise<any> {
    // Implement task type 2 logic
    return { result: 'Task type 2 result' };
  }
}

// Export agent instance
export const yourAgent = new YourAgent();

export default yourAgent;
```

Then register your agent:

```typescript
// src/agents/index.ts
import { yourAgent } from './your-agent';

export function registerAgents(): void {
  // ... existing agents
  registry.registerAgent(yourAgent);
}

export {
  // ... existing exports
  yourAgent
};
```

## Adding Support for New Brands

1. Create a new brand configuration file in `src/brands/settings/your-brand.ts`
2. Add your brand to `src/brands/settings/index.ts`
3. Define brand-specific validators and tasks

## Running Tests

```bash
# Run all tests
npm test

# Run specific tests
npm test -- --testPathPattern=your-agent
```

## Pull Request Process

1. Ensure your code passes all tests and linting
2. Update documentation if needed
3. Add tests for new functionality
4. Ensure your PR includes only relevant changes
5. Link any related issues in your PR description
6. Wait for review and address any feedback

## Release Process

1. Bump version in `package.json`
2. Update `CHANGELOG.md`
3. Create a new release in GitHub with release notes
4. Tag the release with the version number

## Questions?

If you have any questions or need help, please open an issue or reach out to the maintainers.

Thank you for contributing!