-- Migration: Add real_model_id column to condition_selections table
-- This allows us to track which actual model was selected even when anonymous names were shown

ALTER TABLE condition_selections 
ADD COLUMN IF NOT EXISTS real_model_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_condition_selections_real_model_id ON condition_selections(real_model_id);

