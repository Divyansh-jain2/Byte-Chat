// import pg from 'pg';
import * as pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: config.database.url,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10 seconds for initial connection
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  }
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// // Helper function to execute queries
// export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
//   const start = Date.now();
//   try {
//     const res = await pool.query<T>(text, params);
//     const duration = Date.now() - start;
    
//     if (process.env.NODE_ENV === 'development') {
//       // console.log('Executed query:', { text, duration: `${duration}ms`, rows: res.rowCount });
//     }
    
//     return res;
//   } 
//   catch (error) {
//     console.error('Database query error:', { text, error });
//     throw error;
//   }
// }


export async function query<T extends pg.QueryResultRow = any>(
  text: string, params?: any[] ): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      // console.log('Executed query:', { text, duration: `${duration}ms`, rows: res.rowCount });
    }
    
    return res;
  } 
  catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
}

// Graceful shutdown
export async function closePool() {
  await pool.end();
  console.log('Database pool closed');
}
