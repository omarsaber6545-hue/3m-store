import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let pool = null;
let initialized = false;

export async function getDb() {
  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL or POSTGRES_URL environment variables not defined! DB operations will fail.");
    return null;
  }
  
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  if (!initialized) {
    await initSchema(pool);
    initialized = true;
  }

  return pool;
}

async function initSchema(p) {
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255),
        avatar VARCHAR(255),
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        points INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        last_daily_claim DATE,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create coupons table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        code VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50),
        value NUMERIC(10, 2),
        min_purchase NUMERIC(10, 2),
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        expiry_date TIMESTAMP
      );
    `);

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        product_name VARCHAR(255),
        price NUMERIC(10, 2),
        discount NUMERIC(10, 2),
        final_price NUMERIC(10, 2),
        coupon_code VARCHAR(255),
        payment_method VARCHAR(255),
        transaction_id VARCHAR(255),
        status VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create tickets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        subject VARCHAR(255),
        description TEXT,
        status VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        order_id VARCHAR(255) REFERENCES orders(id) ON DELETE SET NULL,
        rating INTEGER,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create claims table
    await client.query(`
      CREATE TABLE IF NOT EXISTS claims (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        reward_type VARCHAR(255),
        amount INTEGER,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default coupon
    const couponCheck = await client.query("SELECT * FROM coupons WHERE code = '3M20'");
    if (couponCheck.rows.length === 0) {
      await client.query("INSERT INTO coupons (code, type, value, min_purchase, max_uses, current_uses, active, expiry_date) VALUES ('3M20', 'percentage', 20.00, 0.00, 100, 0, true, NOW() + INTERVAL '1 year')");
    }

    await client.query('COMMIT');
    console.log("✅ PostgreSQL schema initialized successfully.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("❌ Failed to initialize PostgreSQL schema:", e);
    throw e;
  } finally {
    client.release();
  }
}
