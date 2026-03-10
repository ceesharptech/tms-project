-- Migration: 004_issue_offence_rpc.sql
-- Creates the atomic RPC function for issuing traffic offences.
-- All 8 steps (fetch driver, fetch offence type, calculate strikes,
-- determine penalty tier, calculate fine, insert offence, update driver,
-- insert audit log) execute inside a single PostgreSQL transaction.
-- If ANY step fails the entire transaction rolls back automatically.

CREATE OR REPLACE FUNCTION issue_offence_transaction(
  p_driver_id       UUID,
  p_officer_id      UUID,
  p_offence_type_id UUID,
  p_notes           TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver           RECORD;
  v_offence_type     RECORD;
  v_penalty_rule     RECORD;
  v_new_strike_count INTEGER;
  v_final_fine       NUMERIC(10,2);
  v_offence_id       UUID;
  v_prev_status      TEXT;
  v_new_status       TEXT;
BEGIN
  -- Step 1: Fetch driver current data (lock row for update)
  SELECT id, full_name, license_no, plate_no, strike_count, status, profile_picture_url
  INTO v_driver
  FROM drivers
  WHERE id = p_driver_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DRIVER_NOT_FOUND: Driver with id % does not exist', p_driver_id;
  END IF;

  -- Step 2: Fetch offence type data
  SELECT id, name, description, base_fine, strike_weight, severity, is_active
  INTO v_offence_type
  FROM offence_types
  WHERE id = p_offence_type_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OFFENCE_TYPE_NOT_FOUND: Offence type with id % does not exist', p_offence_type_id;
  END IF;

  IF NOT v_offence_type.is_active THEN
    RAISE EXCEPTION 'OFFENCE_TYPE_INACTIVE: Offence type "%" is no longer active', v_offence_type.name;
  END IF;

  -- Step 3: Calculate new strike count
  v_new_strike_count := v_driver.strike_count + v_offence_type.strike_weight;

  -- Step 4: Determine penalty tier
  SELECT id, min_strikes, max_strikes, fine_multiplier, status_flag
  INTO v_penalty_rule
  FROM penalty_rules
  WHERE v_new_strike_count BETWEEN min_strikes AND max_strikes
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_PENALTY_RULE: No penalty rule configured for % strikes. Contact administrator.', v_new_strike_count;
  END IF;

  -- Step 5: Calculate final fine
  v_final_fine := ROUND(v_offence_type.base_fine * v_penalty_rule.fine_multiplier, 2);

  -- Capture previous status before updating
  v_prev_status := v_driver.status;
  v_new_status  := v_penalty_rule.status_flag;

  -- Step 6: Insert offence record
  INSERT INTO offences (driver_id, officer_id, offence_type_id, fine_amount, strike_delta, issued_at, notes)
  VALUES (p_driver_id, p_officer_id, p_offence_type_id, v_final_fine, v_offence_type.strike_weight, NOW(), p_notes)
  RETURNING id INTO v_offence_id;

  -- Step 7: Update driver record
  UPDATE drivers
  SET strike_count = v_new_strike_count,
      status       = v_new_status,
      updated_at   = NOW()
  WHERE id = p_driver_id;

  -- Step 8: Insert audit log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, timestamp, metadata)
  VALUES (
    p_officer_id,
    'OFFENCE_ISSUED',
    'offence',
    v_offence_id,
    NOW(),
    jsonb_build_object(
      'driver_id',         p_driver_id,
      'driver_name',       v_driver.full_name,
      'offence_type_id',   p_offence_type_id,
      'offence_type',      v_offence_type.name,
      'base_fine',         v_offence_type.base_fine,
      'multiplier',        v_penalty_rule.fine_multiplier,
      'final_fine',        v_final_fine,
      'strike_delta',      v_offence_type.strike_weight,
      'prev_strike_count', v_driver.strike_count,
      'new_strike_count',  v_new_strike_count,
      'prev_status',       v_prev_status,
      'new_status',        v_new_status
    )
  );

  -- Return complete result JSON
  RETURN jsonb_build_object(
    'offence', jsonb_build_object(
      'id',               v_offence_id,
      'driver_id',        p_driver_id,
      'officer_id',       p_officer_id,
      'offence_type_id',  p_offence_type_id,
      'fine_amount',      v_final_fine,
      'strike_delta',     v_offence_type.strike_weight,
      'issued_at',        NOW(),
      'notes',            p_notes
    ),
    'driver', jsonb_build_object(
      'id',                  v_driver.id,
      'full_name',           v_driver.full_name,
      'license_no',          v_driver.license_no,
      'plate_no',            v_driver.plate_no,
      'profile_picture_url', v_driver.profile_picture_url,
      'strike_count',        v_new_strike_count,
      'status',              v_new_status
    ),
    'calculation', jsonb_build_object(
      'base_fine',         v_offence_type.base_fine,
      'multiplier',        v_penalty_rule.fine_multiplier,
      'final_fine',        v_final_fine,
      'offence_type_name', v_offence_type.name,
      'severity',          v_offence_type.severity,
      'strike_delta',      v_offence_type.strike_weight,
      'previous_strikes',  v_driver.strike_count,
      'new_strikes',       v_new_strike_count,
      'previous_status',   v_prev_status,
      'new_status',        v_new_status,
      'tier_changed',      (v_prev_status IS DISTINCT FROM v_new_status)
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise; PostgreSQL automatically rolls back the transaction
    RAISE;
END;
$$;
