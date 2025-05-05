import { BaseAgent, TaskContext } from '../../core/agent';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PlaylistValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  playlistInfo: {
    name: string;
    path: string;
    trackCount: number;
    totalDuration: number;
    genres: string[];
    artists: string[];
  };
}

export class PlaylistValidatorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Playlist Validator Agent',
      description: 'Validates music playlists for structure and metadata completeness',
      version: '1.0.0',
      capabilities: ['validatePlaylist']
    });
  }
  
  /**
   * Execute a task based on its type
   */
  public async executeTask(context: TaskContext): Promise<any> {
    const { executionId, taskType, parameters, brand } = context;
    
    this.logger.info(`Executing task ${taskType}`, { 
      executionId, 
      parameters,
      brand
    });
    
    await this.updateTaskStatus(executionId, 'running');
    
    try {
      if (taskType === 'validatePlaylist') {
        const result = await this.validatePlaylist(context);
        
        this.logger.info(`Task ${taskType} completed successfully`, { executionId });
        await this.updateTaskStatus(executionId, 'completed', result);
        return result;
      } else {
        throw new Error(`Unsupported task type: ${taskType}`);
      }
    } catch (error) {
      this.logger.error(`Task ${taskType} failed: ${(error as Error).message}`, { executionId });
      await this.updateTaskStatus(executionId, 'failed', null, (error as Error).message);
      throw error;
    }
  }
  
  /**
   * Validate a music playlist
   */
  private async validatePlaylist(context: TaskContext): Promise<PlaylistValidationResult> {
    const { executionId, parameters, brand } = context;
    
    // Extract parameters with defaults from brand config if needed
    let { playlistPath, validateMetadata = true } = parameters;
    
    // Get playlist requirements from brand config or use defaults
    const minTracks = this.getBrandConfigValue(context, 'validators.playlist.minTracks', 5);
    const maxTracks = this.getBrandConfigValue(context, 'validators.playlist.maxTracks', 100);
    const requiredMetadata = this.getBrandConfigValue(
      context, 
      'validators.playlist.requiredMetadata', 
      ['title', 'artist']
    );
    
    if (!playlistPath) {
      throw new Error('Playlist path is required');
    }
    
    // If path is relative and we have brand base path, make it absolute
    if (!path.isAbsolute(playlistPath) && brand) {
      const basePath = this.getBrandConfigValue(context, 'basePath', '');
      if (basePath) {
        playlistPath = path.join(basePath, playlistPath);
      }
    }
    
    this.logActivity(executionId, 'info', `Validating playlist: ${playlistPath}`);
    
    try {
      // Check if playlist file exists
      const stats = await fs.stat(playlistPath);
      
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${playlistPath}`);
      }
      
      // Read playlist file
      const content = await fs.readFile(playlistPath, 'utf8');
      let playlist;
      
      try {
        playlist = JSON.parse(content);
      } catch (error) {
        throw new Error(`Invalid playlist format: ${(error as Error).message}`);
      }
      
      // Validate playlist structure
      const validationResult = await this.validatePlaylistStructure(
        playlist,
        minTracks,
        maxTracks,
        requiredMetadata,
        validateMetadata
      );
      
      return {
        valid: validationResult.errors.length === 0,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        playlistInfo: {
          name: playlist.name || path.basename(playlistPath, path.extname(playlistPath)),
          path: playlistPath,
          trackCount: validationResult.trackCount,
          totalDuration: validationResult.totalDuration,
          genres: validationResult.genres,
          artists: validationResult.artists
        }
      };
    } catch (error) {
      this.logActivity(executionId, 'error', `Playlist validation failed: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Validate the playlist structure
   */
  private async validatePlaylistStructure(
    playlist: any,
    minTracks: number,
    maxTracks: number,
    requiredMetadata: string[],
    validateMetadata: boolean
  ): Promise<any> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let trackCount = 0;
    let totalDuration = 0;
    const genres = new Set<string>();
    const artists = new Set<string>();
    
    // Check basic playlist properties
    if (!playlist.name) {
      warnings.push('Playlist does not have a name');
    }
    
    if (!playlist.tracks || !Array.isArray(playlist.tracks)) {
      errors.push('Playlist does not contain a tracks array');
      return {
        valid: false,
        errors,
        warnings,
        trackCount: 0,
        totalDuration: 0,
        genres: [],
        artists: []
      };
    }
    
    // Check track count
    trackCount = playlist.tracks.length;
    
    if (trackCount < minTracks) {
      errors.push(`Playlist contains ${trackCount} tracks, minimum required is ${minTracks}`);
    }
    
    if (trackCount > maxTracks) {
      errors.push(`Playlist contains ${trackCount} tracks, maximum allowed is ${maxTracks}`);
    }
    
    // Validate each track
    for (let i = 0; i < trackCount; i++) {
      const track = playlist.tracks[i];
      
      if (!track) {
        errors.push(`Track at index ${i} is null or undefined`);
        continue;
      }
      
      // Check required metadata
      if (validateMetadata) {
        for (const field of requiredMetadata) {
          if (!track[field]) {
            errors.push(`Track at index ${i} is missing required metadata: ${field}`);
          }
        }
      }
      
      // Collect statistics
      if (track.duration) {
        totalDuration += Number(track.duration);
      }
      
      if (track.genre) {
        genres.add(track.genre);
      }
      
      if (track.artist) {
        artists.add(track.artist);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      trackCount,
      totalDuration,
      genres: Array.from(genres),
      artists: Array.from(artists)
    };
  }
}

// Export agent instance
export const playlistValidatorAgent = new PlaylistValidatorAgent();

export default playlistValidatorAgent;