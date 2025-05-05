/**
 * This script tests the brand-specific agents by directly running them.
 * It bypasses the API layer to demonstrate the core functionality.
 */

const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import agents from compiled TypeScript
async function runTests() {
  try {
    // Dynamically import agents to handle TypeScript compilation
    const { 
      tarotValidatorAgent, 
      playlistValidatorAgent, 
      messageValidatorAgent 
    } = require('../dist/agents');
    
    const { brandConfig } = require('../dist/brands');
    
    // Base directory for test files
    const baseDir = path.join(__dirname, '..', 'test-files');
    
    console.log('Testing brand-specific agents...\n');
    
    // 1. Test Tarot Validator (Mystic Arcana)
    await testTarotValidator(tarotValidatorAgent, brandConfig, baseDir);
    
    // 2. Test Playlist Validator (EDM Shuffle)
    await testPlaylistValidator(playlistValidatorAgent, brandConfig, baseDir);
    
    // 3. Test Message Validator (BirthdayGen)
    await testMessageValidator(messageValidatorAgent, brandConfig, baseDir);
    
    console.log('All tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

async function testTarotValidator(agent, brandConfig, baseDir) {
  console.log('=== Testing Tarot Validator Agent (Mystic Arcana) ===');
  
  try {
    // Get brand config
    const mysticArcanaConfig = await brandConfig.getBrandConfig('mysticArcana');
    
    // Create context
    const context = {
      executionId: uuidv4(),
      taskType: 'validateTarotDeck',
      brand: 'mysticArcana',
      parameters: {
        deckId: 'rider-waite',
        basePath: path.join(baseDir, 'mystic-arcana'),
        validateImages: true
      },
      priority: 'medium',
      brandConfig: mysticArcanaConfig.config
    };
    
    console.log(`Testing tarot deck validation for ${context.parameters.deckId}...`);
    
    // Execute task
    const result = await agent.executeTask(context);
    
    // Print results
    console.log('\nTarot Deck Validation Results:');
    console.log(`- Valid: ${result.valid}`);
    console.log(`- Card Count: ${result.deckInfo.cardCount}`);
    console.log(`- Major Arcana: ${result.deckInfo.majorArcanaCount}`);
    console.log(`- Minor Arcana: ${JSON.stringify(result.deckInfo.minorArcanaCount)}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach((warning, i) => console.log(`  ${i + 1}. ${warning}`));
    }
    
    console.log('\nTarot Validator test completed.\n');
  } catch (error) {
    console.error('Error testing Tarot Validator:', error);
  }
}

async function testPlaylistValidator(agent, brandConfig, baseDir) {
  console.log('=== Testing Playlist Validator Agent (EDM Shuffle) ===');
  
  try {
    // Get brand config
    const edmShuffleConfig = await brandConfig.getBrandConfig('edmShuffle');
    
    // Create context for valid playlist
    const validContext = {
      executionId: uuidv4(),
      taskType: 'validatePlaylist',
      brand: 'edmShuffle',
      parameters: {
        playlistPath: path.join(baseDir, 'edm-shuffle', 'valid-playlist.json'),
        validateMetadata: true
      },
      priority: 'medium',
      brandConfig: edmShuffleConfig.config
    };
    
    console.log('Testing valid playlist validation...');
    
    // Execute task for valid playlist
    const validResult = await agent.executeTask(validContext);
    
    // Print results for valid playlist
    console.log('\nValid Playlist Validation Results:');
    console.log(`- Valid: ${validResult.valid}`);
    console.log(`- Name: ${validResult.playlistInfo.name}`);
    console.log(`- Track Count: ${validResult.playlistInfo.trackCount}`);
    console.log(`- Total Duration: ${validResult.playlistInfo.totalDuration} seconds`);
    console.log(`- Genres: ${validResult.playlistInfo.genres.join(', ')}`);
    console.log(`- Artists: ${validResult.playlistInfo.artists.join(', ')}`);
    
    // Create context for invalid playlist
    const invalidContext = {
      executionId: uuidv4(),
      taskType: 'validatePlaylist',
      brand: 'edmShuffle',
      parameters: {
        playlistPath: path.join(baseDir, 'edm-shuffle', 'invalid-playlist.json'),
        validateMetadata: true
      },
      priority: 'medium',
      brandConfig: edmShuffleConfig.config
    };
    
    console.log('\nTesting invalid playlist validation...');
    
    // Execute task for invalid playlist
    const invalidResult = await agent.executeTask(invalidContext);
    
    // Print results for invalid playlist
    console.log('\nInvalid Playlist Validation Results:');
    console.log(`- Valid: ${invalidResult.valid}`);
    
    if (invalidResult.errors.length > 0) {
      console.log('\nErrors:');
      invalidResult.errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    console.log('\nPlaylist Validator test completed.\n');
  } catch (error) {
    console.error('Error testing Playlist Validator:', error);
  }
}

async function testMessageValidator(agent, brandConfig, baseDir) {
  console.log('=== Testing Message Validator Agent (BirthdayGen) ===');
  
  try {
    // Get brand config
    const birthdayGenConfig = await brandConfig.getBrandConfig('birthdayGen');
    
    // Create context for valid template
    const validContext = {
      executionId: uuidv4(),
      taskType: 'validateMessageTemplate',
      brand: 'birthdayGen',
      parameters: {
        templatePath: path.join(baseDir, 'birthday-gen', 'valid-template.txt')
      },
      priority: 'medium',
      brandConfig: birthdayGenConfig.config
    };
    
    console.log('Testing valid message template validation...');
    
    // Execute task for valid template
    const validResult = await agent.executeTask(validContext);
    
    // Print results for valid template
    console.log('\nValid Template Validation Results:');
    console.log(`- Valid: ${validResult.valid}`);
    console.log(`- Name: ${validResult.templateInfo.name}`);
    console.log(`- Length: ${validResult.templateInfo.length}`);
    console.log(`- Placeholders: ${validResult.templateInfo.placeholders.join(', ')}`);
    
    // Create context for invalid template
    const invalidContext = {
      executionId: uuidv4(),
      taskType: 'validateMessageTemplate',
      brand: 'birthdayGen',
      parameters: {
        templatePath: path.join(baseDir, 'birthday-gen', 'invalid-template.txt')
      },
      priority: 'medium',
      brandConfig: birthdayGenConfig.config
    };
    
    console.log('\nTesting invalid message template validation...');
    
    // Execute task for invalid template
    const invalidResult = await agent.executeTask(invalidContext);
    
    // Print results for invalid template
    console.log('\nInvalid Template Validation Results:');
    console.log(`- Valid: ${invalidResult.valid}`);
    
    if (invalidResult.errors.length > 0) {
      console.log('\nErrors:');
      invalidResult.errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    console.log('\nMessage Validator test completed.\n');
  } catch (error) {
    console.error('Error testing Message Validator:', error);
  }
}

// Run the tests
runTests();