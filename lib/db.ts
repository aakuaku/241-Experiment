import { Pool } from 'pg';

let pool: Pool | null = null;

// Only create pool if DATABASE_URL is provided and doesn't contain placeholder values
if (process.env.DATABASE_URL && 
    !process.env.DATABASE_URL.includes('username') && 
    !process.env.DATABASE_URL.includes('password')) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  } catch (error) {
    console.warn('Database connection failed, will use fallback mode:', error);
  }
} else {
  console.warn('DATABASE_URL not configured or contains placeholders. Database features will be disabled.');
}

export default pool;

