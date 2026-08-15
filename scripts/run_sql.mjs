/** Executes a .sql file against DATABASE_URL, statement by statement. */
import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const file = process.argv[2];
if (!file) throw new Error('usage: node run_sql.mjs <file.sql>');

const sql = readFileSync(file, 'utf8');
const statements = sql
  .split(/;\s*(?:\n|$)/)
  .map(s => s.trim())
  .filter(Boolean);

const conn = await mysql.createConnection(process.env.DATABASE_URL);
let ok = 0;
for (const s of statements) {
  const [res] = await conn.query(s);
  ok += res.affectedRows ?? 0;
}
await conn.end();
console.log(`executed ${statements.length} statements, ${ok} rows affected`);
