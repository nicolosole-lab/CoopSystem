import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ 
  connectionString: "postgresql://neondb_owner:npg_cMP9HZR3VDpU@ep-broad-pine-ab9yxg4b-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

const createSessionTable = `
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
`;

async function createTable() {
  try {
    await pool.query(createSessionTable);
    console.log('Session table created successfully!');
  } catch (error) {
    console.error('Failed to create session table:', error);
  } finally {
    await pool.end();
  }
}

createTable();