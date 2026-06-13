import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

async function main() {
  // Update all tables: replace slug-value in client_id with the actual UUID from clients.id
  const tables = ['client_auth', 'runs', 'campaigns', 'password_reset_tokens']

  for (const table of tables) {
    const result = await sql.query(
      `UPDATE ${table} t SET client_id = c.id FROM clients c WHERE c.slug = t.client_id`
    )
    console.log(`${table}: updated ${result.rowCount ?? 0} rows`)
  }

  console.log('Done.')
}

main().catch(console.error)
