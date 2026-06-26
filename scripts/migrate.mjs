import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

config({ path: '.env.local' })

const __dirname = dirname(fileURLToPath(import.meta.url))

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in .env.local')
  process.exit(1)
}

const { neon } = await import('@neondatabase/serverless')
const sql = neon(DATABASE_URL)

const migrations = [
  '0002_flat_giant_girl.sql',
  '0003_contact_emails.sql',
]

for (const file of migrations) {
  const filePath = resolve(__dirname, '../drizzle', file)
  const content = readFileSync(filePath, 'utf-8')

  const statements = content
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)

  console.log(`\nApplying ${file} (${statements.length} statement(s))...`)

  for (const stmt of statements) {
    try {
      await sql.query(stmt)
      console.log('  ✓', stmt.slice(0, 60).replace(/\n/g, ' '))
    } catch (e) {
      if (e.message?.includes('already exists') || e.message?.includes('duplicate')) {
        console.log('  ~ skipped (already exists):', stmt.slice(0, 60).replace(/\n/g, ' '))
      } else {
        console.error('  ✗ ERROR:', e.message)
        console.error('    Statement:', stmt)
        process.exit(1)
      }
    }
  }
}

console.log('\nDone.')
