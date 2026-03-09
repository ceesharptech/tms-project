-- Migration: Add profile_picture_url column to drivers table
-- Date: 2026-03-09
-- Purpose: Store public URL for driver's profile picture (Supabase Storage)

ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT NULL DEFAULT NULL;

COMMENT ON COLUMN drivers.profile_picture_url IS 'Public URL of driver profile picture stored in Supabase Storage. NULL if no photo uploaded.';
