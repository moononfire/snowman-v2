import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL)
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

if (!API_KEY) {
  console.error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
  process.exit(1)
}

async function searchPlace(name, address) {
  const query = `${name} ${address || ''}`.trim()
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': [
        'places.id', 'places.displayName', 'places.formattedAddress',
        'places.addressComponents', 'places.googleMapsUri',
        'places.location', 'places.rating', 'places.userRatingCount',
        'places.businessStatus', 'places.regularOpeningHours',
        'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
        'places.websiteUri',
      ].join(','),
    },
    body: JSON.stringify({ textQuery: query, pageSize: 1 }),
  })

  const data = await res.json()
  if (data.error) throw new Error(`API error: ${data.error.message}`)
  return data.places?.[0] || null
}

function extractCity(place) {
  let city = '', admin3 = '', postalTown = '', sublocality = ''
  for (const comp of place.addressComponents || []) {
    const types = comp.types || []
    if (types.includes('locality')) city = comp.longText || ''
    else if (types.includes('postal_town')) postalTown = comp.longText || ''
    else if (types.includes('administrative_area_level_3')) admin3 = comp.longText || ''
    else if (types.includes('sublocality') || types.includes('sublocality_level_1')) sublocality = comp.longText || ''
  }
  return city || postalTown || admin3 || sublocality || null
}

async function main() {
  const contacts = await sql`
    SELECT id, first_name, company, pre_call_note, city
    FROM contacts
    WHERE source = 'GOOGLE_SCRAPE' AND google_place_id IS NULL
    ORDER BY created_at DESC
  `

  console.log(`Found ${contacts.length} contacts to backfill`)

  let updated = 0, failed = 0, skipped = 0

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i]
    const name = c.company || c.first_name
    const searchAddr = c.pre_call_note || c.city || ''

    try {
      const place = await searchPlace(name, searchAddr)
      if (!place) {
        console.log(`[${i + 1}/${contacts.length}] SKIP ${name} — not found`)
        skipped++
        continue
      }

      const location = place.location || {}
      const hours = place.regularOpeningHours?.weekdayDescriptions || null
      const city = extractCity(place)

      await sql`
        UPDATE contacts SET
          google_place_id = ${place.id || null},
          google_maps_url = ${place.googleMapsUri || null},
          latitude = ${location.latitude || null},
          longitude = ${location.longitude || null},
          rating = ${place.rating || null},
          review_count = ${place.userRatingCount || null},
          business_status = ${place.businessStatus || null},
          opening_hours = ${hours ? JSON.stringify(hours) : null}::jsonb,
          address = ${place.formattedAddress || null},
          city = ${city || c.city || null},
          phone = COALESCE(${place.internationalPhoneNumber || null}, phone),
          website = COALESCE(${place.websiteUri || null}, website),
          updated_at = NOW()
        WHERE id = ${c.id}
      `

      console.log(`[${i + 1}/${contacts.length}] OK ${name} — ${place.rating || '?'}★ (${place.userRatingCount || 0} reviews)`)
      updated++

      // Rate limit — ~5 req/s
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      console.error(`[${i + 1}/${contacts.length}] ERR ${name}: ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${failed} failed`)
}

main().catch(console.error)
