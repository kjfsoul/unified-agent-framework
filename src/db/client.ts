import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let supabaseInstance: SupabaseClient | null = null;

/**
 * Initialize and return a Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  return supabaseInstance;
}

/**
 * Initialize the database connection
 */
export async function initializeDatabase(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    
    // Test connection
    const { data, error } = await client.from('agents').select('id').limit(1);
    
    if (error) {
      console.error('Failed to connect to Supabase:', error.message);
      throw error;
    }
    
    console.log('Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export default {
  getSupabaseClient,
  initializeDatabase
};