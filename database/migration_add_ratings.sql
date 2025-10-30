-- Migration to add model ratings table

CREATE TABLE IF NOT EXISTS model_ratings (
  id SERIAL PRIMARY KEY,
  experiment_id INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  condition VARCHAR(50) NOT NULL CHECK (condition IN ('A', 'B', 'C', 'Control')),
  model_id VARCHAR(100) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_model_ratings_experiment_id ON model_ratings(experiment_id);
CREATE INDEX IF NOT EXISTS idx_model_ratings_condition ON model_ratings(condition);
CREATE INDEX IF NOT EXISTS idx_model_ratings_model_id ON model_ratings(model_id);

