-- Database schema for 241 Experiment

-- Experiments table: stores main experiment records
CREATE TABLE IF NOT EXISTS experiments (
  id SERIAL PRIMARY KEY,
  participant_id VARCHAR(255) NOT NULL UNIQUE,
  task_id VARCHAR(100) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  total_time_spent INTEGER, -- in seconds
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Condition selections table: stores selections for each condition
CREATE TABLE IF NOT EXISTS condition_selections (
  id SERIAL PRIMARY KEY,
  experiment_id INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  condition VARCHAR(50) NOT NULL CHECK (condition IN ('A', 'B', 'C', 'Control')),
  selected_model VARCHAR(100) NOT NULL,
  real_model_id VARCHAR(100),
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_experiments_participant_id ON experiments(participant_id);
CREATE INDEX IF NOT EXISTS idx_experiments_task_id ON experiments(task_id);
CREATE INDEX IF NOT EXISTS idx_condition_selections_experiment_id ON condition_selections(experiment_id);
CREATE INDEX IF NOT EXISTS idx_condition_selections_condition ON condition_selections(condition);
CREATE INDEX IF NOT EXISTS idx_condition_selections_real_model_id ON condition_selections(real_model_id);

