/**
 * Default brand configuration for EDM Shuffle
 */
export const edmShuffleConfig = {
  name: 'EDM Shuffle',
  key: 'edmShuffle',
  description: 'EDM music discovery and engagement platform',
  basePath: '/Users/kfitz/Documents/Projects/EDMShuffle',
  apiUrl: 'https://edmshuffle.com/api',
  
  validators: {
    routes: {
      baseUrl: 'https://edmshuffle.com',
      criticalPaths: ['/', '/playlists', '/artists', '/tracks']
    },
    playlist: {
      minTracks: 5,
      maxTracks: 100,
      requiredMetadata: ['title', 'artist', 'bpm', 'genre']
    }
  },
  
  taskSettings: {
    default: {
      priority: 'medium',
      timeout: 60000,
      retries: 3
    },
    taskOverrides: {
      analyzeTrackLibrary: {
        priority: 'high',
        timeout: 180000
      },
      generateWeeklyPlaylist: {
        priority: 'high',
        parameters: {
          includeNewReleases: true,
          trackCount: 25
        }
      }
    }
  },
  
  customData: {
    genres: ['house', 'techno', 'trance', 'dubstep', 'drum-and-bass', 'ambient', 'hardstyle'],
    audioPlatforms: ['spotify', 'soundcloud', 'beatport', 'bandcamp'],
    featuredArtists: ['deadmau5', 'charlotte de witte', 'eric prydz', 'nina kraviz', 'carl cox']
  }
};

export default edmShuffleConfig;