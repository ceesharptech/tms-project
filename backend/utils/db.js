// backend/utils/db.js
// Unified database interface.
// When USE_LOCAL_DB=true  → exports a pg.Pool connected to LOCAL_DATABASE_URL
// Otherwise               → exports the existing Supabase client as-is
//
// Routes import:
//   const db = require('../utils/db')
//   const { isLocal } = require('../utils/db')

const isLocal = process.env.USE_LOCAL_DB === 'true'

let db

if (isLocal) {
  const { Pool } = require('pg')

  db = new Pool({ connectionString: process.env.LOCAL_DATABASE_URL })

  // Verify the connection is reachable on startup
  db.connect()
    .then((client) => {
      console.log('[DB] Running in LOCAL POSTGRES mode')
      client.release()
    })
    .catch((err) => {
      console.error('[DB] LOCAL POSTGRES connection failed:', err.message)
    })
} else {
  const { createClient } = require('@supabase/supabase-js')

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment'
    )
  }

  db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  console.log('[DB] Running in SUPABASE mode')
}

module.exports = db
module.exports.isLocal = isLocal
