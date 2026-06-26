import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

// First delete list_contacts referencing duplicates
const deletedListContacts = await sql`
  DELETE FROM list_contacts
  WHERE contact_id IN (
    SELECT id FROM contacts
    WHERE google_place_id IS NOT NULL
      AND id NOT IN (
        SELECT DISTINCT ON (client_id, google_place_id) id
        FROM contacts
        WHERE google_place_id IS NOT NULL
        ORDER BY client_id, google_place_id, created_at ASC
      )
  )
`
console.log('Deleted list_contacts references to duplicates')

// Then delete duplicate contacts
const deleted = await sql`
  DELETE FROM contacts
  WHERE google_place_id IS NOT NULL
    AND id NOT IN (
      SELECT DISTINCT ON (client_id, google_place_id) id
      FROM contacts
      WHERE google_place_id IS NOT NULL
      ORDER BY client_id, google_place_id, created_at ASC
    )
`
console.log('Deleted duplicate contacts')
console.log('Done!')
