-- Migration: Add last_evaluation column to projects table
-- Date: 2026-02-05

ALTER TABLE projects ADD COLUMN last_evaluation TEXT;
