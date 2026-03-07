-- =============================================================
-- Migration 001 — Initial Schema
-- Project: DDITS (Digital Driver Identification & Traffic
--          Offence Penalty System)
-- Applied:  2026-03-07
-- =============================================================
-- NOTE: The `contact` column on `drivers` is stored as JSONB
-- (not VARCHAR as in the spec sketch) to support the structured
-- {phone, email} payload from the seed data and future UI.
-- =============================================================

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Table: users
-- Stores officer and admin accounts.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id      VARCHAR(6)   UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(20)  NOT NULL CHECK (role IN ('officer', 'admin')),
  full_name       VARCHAR(255),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: offence_types
-- Catalog of traffic violation types (admin-managed).
-- ============================================================
CREATE TABLE IF NOT EXISTS offence_types (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100)  NOT NULL,
  description   TEXT,
  base_fine     DECIMAL(10,2) NOT NULL,
  strike_weight INTEGER       NOT NULL,
  severity      VARCHAR(20)   NOT NULL CHECK (severity IN ('Minor', 'Moderate', 'Severe')),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: penalty_rules
-- Strike-range tiers that control fine multipliers and
-- automatic status escalation.
-- ============================================================
CREATE TABLE IF NOT EXISTS penalty_rules (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  min_strikes      INTEGER       NOT NULL,
  max_strikes      INTEGER       NOT NULL,
  fine_multiplier  DECIMAL(4,2)  NOT NULL,
  status_flag      VARCHAR(50),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: drivers
-- Driver profiles with optional face embedding (Phase 3+).
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       VARCHAR(255) NOT NULL,
  license_no      VARCHAR(50)  UNIQUE NOT NULL,
  plate_no        VARCHAR(20),
  contact         JSONB,         -- { "phone": "...", "email": "..." }
  status          VARCHAR(20)  NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active', 'Flagged', 'Suspended')),
  face_embedding  JSONB,         -- { "embedding": [...], "model": "ArcFace", "enrolled_at": "..." }
  strike_count    INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: offences
-- Immutable violation records — no DELETE policy.
-- ============================================================
CREATE TABLE IF NOT EXISTS offences (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id        UUID          NOT NULL REFERENCES drivers(id),
  officer_id       UUID          NOT NULL REFERENCES users(id),
  offence_type_id  UUID          NOT NULL REFERENCES offence_types(id),
  fine_amount      DECIMAL(10,2) NOT NULL,
  strike_delta     INTEGER       NOT NULL,
  issued_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  notes            TEXT
);

-- ============================================================
-- Table: audit_logs
-- Immutable system activity log — no UPDATE or DELETE policy.
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         REFERENCES users(id),
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50)  NOT NULL,
  entity_id    UUID,
  timestamp    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  metadata     JSONB
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_drivers_license_no   ON drivers(license_no);
CREATE INDEX IF NOT EXISTS idx_drivers_plate_no     ON drivers(plate_no);
CREATE INDEX IF NOT EXISTS idx_offences_driver_id   ON offences(driver_id);
CREATE INDEX IF NOT EXISTS idx_offences_issued_at   ON offences(issued_at);
CREATE INDEX IF NOT EXISTS idx_offences_officer_id  ON offences(officer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id   ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS Helper Functions
-- Used in policies to read claims forwarded by PostgREST.
-- The service_role key used by the backend bypasses all RLS.
-- ============================================================
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    ''
  );
$$;

CREATE OR REPLACE FUNCTION auth_sub()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  );
$$;

-- ============================================================
-- Row Level Security — users
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_record" ON users
  FOR SELECT USING (auth_sub() = id::text);

CREATE POLICY "users_select_admin_all" ON users
  FOR SELECT USING (auth_role() = 'admin');

-- ============================================================
-- Row Level Security — drivers
-- ============================================================
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_select_authenticated" ON drivers
  FOR SELECT USING (auth_sub() <> '');

CREATE POLICY "drivers_insert_admin" ON drivers
  FOR INSERT WITH CHECK (auth_role() = 'admin');

CREATE POLICY "drivers_update_admin" ON drivers
  FOR UPDATE USING (auth_role() = 'admin');

CREATE POLICY "drivers_delete_admin" ON drivers
  FOR DELETE USING (auth_role() = 'admin');

-- ============================================================
-- Row Level Security — offences
-- ============================================================
ALTER TABLE offences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offences_select_own" ON offences
  FOR SELECT USING (officer_id::text = auth_sub());

CREATE POLICY "offences_select_admin_all" ON offences
  FOR SELECT USING (auth_role() = 'admin');

CREATE POLICY "offences_insert_authenticated" ON offences
  FOR INSERT WITH CHECK (auth_sub() <> '');

-- No DELETE policy — offences are immutable

-- ============================================================
-- Row Level Security — offence_types
-- ============================================================
ALTER TABLE offence_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offence_types_select_all" ON offence_types
  FOR SELECT USING (auth_sub() <> '');

CREATE POLICY "offence_types_insert_admin" ON offence_types
  FOR INSERT WITH CHECK (auth_role() = 'admin');

CREATE POLICY "offence_types_update_admin" ON offence_types
  FOR UPDATE USING (auth_role() = 'admin');

CREATE POLICY "offence_types_delete_admin" ON offence_types
  FOR DELETE USING (auth_role() = 'admin');

-- ============================================================
-- Row Level Security — penalty_rules
-- ============================================================
ALTER TABLE penalty_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "penalty_rules_select_all" ON penalty_rules
  FOR SELECT USING (auth_sub() <> '');

CREATE POLICY "penalty_rules_insert_admin" ON penalty_rules
  FOR INSERT WITH CHECK (auth_role() = 'admin');

CREATE POLICY "penalty_rules_update_admin" ON penalty_rules
  FOR UPDATE USING (auth_role() = 'admin');

CREATE POLICY "penalty_rules_delete_admin" ON penalty_rules
  FOR DELETE USING (auth_role() = 'admin');

-- ============================================================
-- Row Level Security — audit_logs
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_authenticated" ON audit_logs
  FOR SELECT USING (auth_sub() <> '');

CREATE POLICY "audit_logs_insert_authenticated" ON audit_logs
  FOR INSERT WITH CHECK (auth_sub() <> '');

-- No UPDATE or DELETE policy — audit_logs are immutable

-- ============================================================
-- Seed Data
-- ============================================================

-- Users (passwords hashed with bcrypt cost-factor 10 via pgcrypto)
INSERT INTO users (officer_id, email, password_hash, role, full_name)
VALUES
  ('000001', 'eniolaamusu6@gmail.com',
   crypt('Allowme2006!', gen_salt('bf', 10)), 'admin',   'System Administrator'),
  ('100001', 'officer@ddits.com',
   crypt('Officer123!',  gen_salt('bf', 10)), 'officer', 'John Mensah'),
  ('100002', 'officer2@ddits.com',
   crypt('Officer123!',  gen_salt('bf', 10)), 'officer', 'Amina Bello');

-- Penalty rules (3 escalation tiers)
INSERT INTO penalty_rules (min_strikes, max_strikes, fine_multiplier, status_flag)
VALUES
  (0, 2,   1.00, 'Active'),
  (3, 5,   1.50, 'Warning'),
  (6, 999, 2.00, 'Flagged');

-- Offence types (15 categories)
INSERT INTO offence_types (name, description, base_fine, strike_weight, severity)
VALUES
  ('Speeding',
   'Driving above the legally permitted speed limit on highways or urban roads.',
   20000, 2, 'Moderate'),
  ('Running a Red Light',
   'Failing to stop at a traffic light when it shows red.',
   30000, 3, 'Severe'),
  ('Driving Without Seatbelt',
   'Operating a vehicle without wearing a seatbelt.',
   10000, 1, 'Minor'),
  ('Using Phone While Driving',
   'Using a handheld mobile device while operating a vehicle.',
   15000, 2, 'Moderate'),
  ('Driving Without Valid License',
   'Operating a vehicle without a valid driver''s license.',
   25000, 3, 'Severe'),
  ('Illegal Parking',
   'Parking in restricted or unauthorized areas.',
   5000, 1, 'Minor'),
  ('Driving Against Traffic',
   'Driving in the opposite direction of designated traffic flow.',
   40000, 3, 'Severe'),
  ('Failure to Obey Traffic Signs',
   'Ignoring regulatory or warning traffic signs on the road.',
   15000, 2, 'Moderate'),
  ('Overloading Passengers',
   'Carrying more passengers than the vehicle is legally permitted.',
   20000, 2, 'Moderate'),
  ('Driving Without Vehicle Registration',
   'Operating a vehicle without valid registration documents.',
   25000, 3, 'Severe'),
  ('Failure to Use Helmet (Motorcyclist)',
   'Riding a motorcycle without wearing an approved safety helmet.',
   10000, 1, 'Minor'),
  ('Reckless Driving',
   'Operating a vehicle with willful disregard for safety rules.',
   50000, 3, 'Severe'),
  ('Expired Vehicle Insurance',
   'Driving a vehicle without valid third-party insurance coverage.',
   20000, 2, 'Moderate'),
  ('Obstructing Traffic',
   'Stopping or parking a vehicle blocking normal traffic flow.',
   10000, 1, 'Minor'),
  ('Driving Under the Influence',
   'Operating a vehicle while impaired by alcohol or drugs.',
   45000, 3, 'Severe');

-- Drivers (20 records)
INSERT INTO drivers (full_name, license_no, plate_no, contact, status, strike_count)
VALUES
  ('Chinedu Okafor',     'LAG-23-482731', 'ABC-1023', '{"phone":"+2348012345678","email":"chinedu.okafor@gmail.com"}',    'Active',  0),
  ('Aisha Bello',        'KAN-19-763452', 'KJA-4589', '{"phone":"+2348098765432","email":"aisha.bello@yahoo.com"}',       'Active',  1),
  ('Tunde Adeyemi',      'OYO-21-654987', 'IBD-3345', '{"phone":"+2348034567890","email":"tunde.adeyemi@outlook.com"}',   'Flagged', 4),
  ('Ngozi Nwankwo',      'ENU-18-345219', 'ENU-7781', '{"phone":"+2348067891234","email":"ngozi.nwankwo@gmail.com"}',     'Active',  0),
  ('Ibrahim Musa',       'KAD-20-918273', 'KAD-6622', '{"phone":"+2348123456789","email":"ibrahim.musa@yahoo.com"}',      'Active',  2),
  ('Blessing Eze',       'IMO-22-774512', 'OWR-5544', '{"phone":"+2348145678901","email":"blessing.eze@gmail.com"}',      'Active',  0),
  ('Yusuf Abdullahi',    'KTS-17-129834', 'KTS-9901', '{"phone":"+2348176543210","email":"yusuf.abdullahi@outlook.com"}', 'Flagged', 5),
  ('Adaobi Okoye',       'ANM-24-564738', 'ANM-4432', '{"phone":"+2348187654321","email":"adaobi.okoye@gmail.com"}',      'Active',  0),
  ('Emeka Obi',          'RIV-16-837261', 'PHC-2247', '{"phone":"+2348091122334","email":"emeka.obi@yahoo.com"}',         'Active',  3),
  ('Fatima Sani',        'SOK-15-998877', 'SOK-7712', '{"phone":"+2348023456781","email":"fatima.sani@gmail.com"}',       'Active',  0),
  ('Oluwaseun Adebayo',  'OND-23-221144', 'AKR-6678', '{"phone":"+2348135792468","email":"oluwaseun.adebayo@outlook.com"}','Active', 0),
  ('Samuel Etim',        'CRS-18-556677', 'CAL-8821', '{"phone":"+2348167894501","email":"samuel.etim@gmail.com"}',       'Active',  0),
  ('Grace Onah',         'BEN-21-334455', 'BEN-1290', '{"phone":"+2348076543298","email":"grace.onah@yahoo.com"}',        'Flagged', 2),
  ('Hassan Garba',       'ZAM-19-778899', 'ZAM-4410', '{"phone":"+2348112233445","email":"hassan.garba@gmail.com"}',      'Active',  0),
  ('Victoria Udo',       'AKW-20-667788', 'UYO-3321', '{"phone":"+2348198765402","email":"victoria.udo@outlook.com"}',    'Active',  0),
  ('Daniel Ojo',         'EKI-22-112358', 'ADO-5577', '{"phone":"+2348031122445","email":"daniel.ojo@gmail.com"}',        'Active',  0),
  ('Maryam Lawal',       'KWA-18-445566', 'ILR-9002', '{"phone":"+2348056677889","email":"maryam.lawal@yahoo.com"}',      'Active',  0),
  ('Chukwuemeka Nnamdi', 'ABJ-24-778812', 'ABJ-3210', '{"phone":"+2348102345678","email":"chukwuemeka.nnamdi@gmail.com"}','Active',  0),
  ('Rukayat Ajibola',    'OGN-17-665544', 'ABK-7788', '{"phone":"+2348181122334","email":"rukayat.ajibola@outlook.com"}', 'Active',  0),
  ('Peter Nwosu',        'EBN-16-990011', 'EBN-5543', '{"phone":"+2348045566778","email":"peter.nwosu@gmail.com"}',       'Active',  0);
