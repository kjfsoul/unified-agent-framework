import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client instance
let supabaseInstance: SupabaseClient | null = null;

/**
 * Initialize and return a Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and API key must be set in environment variables');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  return supabaseInstance;
}

/**
 * Check connection to Supabase
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('brands').select('count').limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking Supabase connection:', error);
    return false;
  }
}

/**
 * Initialize database tables if they don't exist yet
 * This is primarily for local development as production would use migrations
 */
export async function initializeTables(): Promise<void> {
  // No implementation needed for MVP as we assume tables already exist in Supabase
  // In the future, we could implement this for local development
  console.log('Database tables initialization skipped. Use migrations for schema changes.');
}
