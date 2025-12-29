-- Migration: Add locale field to users table
-- Story 1.5: Regional Preferences and i18n Infrastructure
-- AC-1.5.1: Locale Selection on Settings Page
-- AC-1.5.6: Default Locale (en-US)

ALTER TABLE "users" ADD COLUMN "locale" varchar(10) DEFAULT 'en-US' NOT NULL;
