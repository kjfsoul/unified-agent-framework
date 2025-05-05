/**
 * This script creates test files for demonstrating brand-specific agent functionality.
 * It creates files for each brand: Mystic Arcana, EDM Shuffle, and BirthdayGen.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const baseDir = path.join(__dirname, '..', 'test-files');
const brandDirs = {
  mysticArcana: path.join(baseDir, 'mystic-arcana'),
  edmShuffle: path.join(baseDir, 'edm-shuffle'),
  birthdayGen: path.join(baseDir, 'birthday-gen')
};

// Create directories
function createDirectories() {
  // Create base directory
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  // Create brand directories
  for (const dir of Object.values(brandDirs)) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  // Create subdirectories for Mystic Arcana (tarot deck structure)
  const deckDir = path.join(brandDirs.mysticArcana, 'rider-waite');
  const majorArcanaDir = path.join(deckDir, 'major-arcana');
  const minorArcanaDir = path.join(deckDir, 'minor-arcana');
  const suits = ['cups', 'pentacles', 'swords', 'wands'];
  
  fs.mkdirSync(deckDir, { recursive: true });
  fs.mkdirSync(majorArcanaDir, { recursive: true });
  fs.mkdirSync(minorArcanaDir, { recursive: true });
  
  for (const suit of suits) {
    fs.mkdirSync(path.join(minorArcanaDir, suit), { recursive: true });
  }
  
  console.log('All directories created successfully.');
}

// Create tarot card files for Mystic Arcana
function createTarotCards() {
  const deckDir = path.join(brandDirs.mysticArcana, 'rider-waite');
  const majorArcanaDir = path.join(deckDir, 'major-arcana');
  const minorArcanaDir = path.join(deckDir, 'minor-arcana');
  
  // Create metadata.json
  const metadata = {
    name: 'Rider-Waite Tarot Deck',
    description: 'The classic Rider-Waite tarot deck',
    creator: 'Arthur Edward Waite',
    artist: 'Pamela Colman Smith',
    year: 1909
  };
  
  fs.writeFileSync(
    path.join(deckDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  console.log('Created tarot deck metadata.json');
  
  // Create major arcana cards (22 cards)
  const majorArcanaCards = [
    'the-fool', 'the-magician', 'the-high-priestess', 'the-empress', 'the-emperor',
    'the-hierophant', 'the-lovers', 'the-chariot', 'strength', 'the-hermit',
    'wheel-of-fortune', 'justice', 'the-hanged-man', 'death', 'temperance',
    'the-devil', 'the-tower', 'the-star', 'the-moon', 'the-sun',
    'judgement', 'the-world'
  ];
  
  for (const card of majorArcanaCards) {
    // Create empty files as placeholders for card images
    fs.writeFileSync(
      path.join(majorArcanaDir, `${card}.jpg`),
      crypto.randomBytes(1024) // 1KB random data
    );
  }
  console.log(`Created ${majorArcanaCards.length} major arcana cards`);
  
  // Create minor arcana cards (14 cards per suit)
  const suits = ['cups', 'pentacles', 'swords', 'wands'];
  const ranks = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'page', 'knight', 'queen', 'king'];
  
  for (const suit of suits) {
    const suitDir = path.join(minorArcanaDir, suit);
    
    for (const rank of ranks) {
      fs.writeFileSync(
        path.join(suitDir, `${rank}-of-${suit}.jpg`),
        crypto.randomBytes(1024) // 1KB random data
      );
    }
    
    console.log(`Created ${ranks.length} cards for ${suit}`);
  }
}

// Create playlist files for EDM Shuffle
function createPlaylists() {
  const playlistDir = brandDirs.edmShuffle;
  
  // Create a valid playlist
  const validPlaylist = {
    name: 'Summer House Mix 2025',
    description: 'Hot summer tracks for beach parties',
    created: '2025-05-01T12:00:00Z',
    tracks: [
      {
        title: 'Sunset Bliss',
        artist: 'DJ Horizon',
        duration: 184,
        bpm: 128,
        genre: 'house'
      },
      {
        title: 'Ocean Drive',
        artist: 'Wave Machine',
        duration: 212,
        bpm: 124,
        genre: 'deep-house'
      },
      {
        title: 'Ibiza Nights',
        artist: 'Sara Sunset',
        duration: 198,
        bpm: 126,
        genre: 'house'
      },
      {
        title: 'Miami Heat',
        artist: 'Club Tropicana',
        duration: 224,
        bpm: 130,
        genre: 'tech-house'
      },
      {
        title: 'Dawn Rise',
        artist: 'Morning Glory',
        duration: 246,
        bpm: 122,
        genre: 'progressive-house'
      }
    ]
  };
  
  // Create an invalid playlist (missing required metadata)
  const invalidPlaylist = {
    name: 'Invalid Playlist',
    tracks: [
      {
        title: 'Just a Title',
        // Missing artist
        duration: 180,
        // Missing bpm
        genre: 'unknown'
      },
      {
        // Missing title
        artist: 'No Title Artist',
        duration: 120,
        bpm: 140,
        // Missing genre
      }
    ]
  };
  
  fs.writeFileSync(
    path.join(playlistDir, 'valid-playlist.json'),
    JSON.stringify(validPlaylist, null, 2)
  );
  
  fs.writeFileSync(
    path.join(playlistDir, 'invalid-playlist.json'),
    JSON.stringify(invalidPlaylist, null, 2)
  );
  
  console.log('Created playlist files for EDM Shuffle');
}

// Create message templates for BirthdayGen
function createMessageTemplates() {
  const templateDir = brandDirs.birthdayGen;
  
  // Create a valid message template
  const validTemplate = 
    'Happy Birthday {{name}}! 🎂\n\n' +
    'Wishing you a fantastic {{age}} birthday filled with joy and laughter!\n\n' +
    '{{message}}\n\n' +
    'Best wishes,\n' +
    '{{sender}}';
  
  // Create an invalid template (missing required placeholders)
  const invalidTemplate = 
    'Happy Birthday! 🎂\n\n' +
    'Wishing you a fantastic birthday filled with joy and laughter!\n\n' +
    'Best wishes,\n' +
    '{{sender}}';
  
  fs.writeFileSync(
    path.join(templateDir, 'valid-template.txt'),
    validTemplate
  );
  
  fs.writeFileSync(
    path.join(templateDir, 'invalid-template.txt'),
    invalidTemplate
  );
  
  console.log('Created message templates for BirthdayGen');
}

// Create all test files
async function createAllTestFiles() {
  console.log('Creating brand-specific test files...');
  
  // Create directory structure
  createDirectories();
  
  // Create files for each brand
  createTarotCards();
  createPlaylists();
  createMessageTemplates();
  
  console.log('All brand-specific test files created successfully.');
}

// Run the script
createAllTestFiles().catch(console.error);