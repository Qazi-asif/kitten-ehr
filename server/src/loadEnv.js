import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Pin the process timezone so a developer machine behaves identically to
// production (Vercel runs UTC). Date handling must not depend on this — all
// date parsing goes through utils/dateFields.js — but leaving it unset let
// several timezone bugs pass local verification while staying broken in prod.
process.env.TZ = process.env.TZ || 'UTC';
