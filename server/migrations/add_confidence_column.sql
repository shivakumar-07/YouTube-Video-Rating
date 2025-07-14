-- Migration: Add confidence column to analysis_results table
-- This adds a confidence field to track the reliability of sentiment ratings

ALTER TABLE analysis_results 
ADD COLUMN IF NOT EXISTS confidence REAL NOT NULL DEFAULT 0;
 
-- Add a comment to document the column
COMMENT ON COLUMN analysis_results.confidence IS 'Confidence level of the rating (0-1), based on sample size and sentiment distribution'; 