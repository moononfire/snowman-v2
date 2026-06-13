import { neon } from '@neondatabase/serverless'

const sql = neon('postgresql://neondb_owner:npg_hNsqA4LVRr8C@ep-damp-frost-as6eb29k.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require')

const clients = await sql`SELECT id, slug, name FROM clients`
console.log('CLIENTS:', JSON.stringify(clients, null, 2))

const total = await sql`SELECT COUNT(*) as total FROM contacts`
console.log('TOTAL CONTACTS:', total[0].total)

const recentRuns = await sql`SELECT id, client_id, script, status, output_files, error_message, created_at FROM runs ORDER BY created_at DESC LIMIT 5`
console.log('RECENT RUNS:', JSON.stringify(recentRuns, null, 2))
