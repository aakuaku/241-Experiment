# Environment Variables

Create a `.env.local` file in the root directory with your PostgreSQL connection
string:

```
DATABASE_URL=postgresql://username:password@localhost:5432/experiment_db
```

For production (e.g., Vercel, Railway, etc.), set the `DATABASE_URL` environment
variable in your hosting platform.

## Database Setup

1. Create a PostgreSQL database:

```bash
createdb experiment_db
```

2. Run the schema file to create tables:

```bash
psql experiment_db < database/schema.sql
```

Or connect to your database and run the SQL commands from `database/schema.sql`.

3. If you have an existing database, run the migration to add the
   `real_model_id` column:

```bash
psql experiment_db < database/migration_add_real_model.sql
```

This migration adds the `real_model_id` column to track which actual model was
selected even when anonymous names were shown.

## Database Schema

The database includes two main tables:

- **experiments**: Stores main experiment records

  - `id`: Primary key
  - `participant_id`: Unique participant identifier
  - `task_id`: The task assigned to the participant
  - `start_time`: When the experiment started
  - `end_time`: When the experiment ended
  - `total_time_spent`: Total time in seconds

- **condition_selections**: Stores individual condition selections
  - `id`: Primary key
  - `experiment_id`: Foreign key to experiments table
  - `condition`: The condition (A, B, C, or Control)
  - `selected_model`: The display name shown to the participant (e.g., "Model A"
    or "OpenAI GPT")
  - `real_model_id`: The actual model ID (e.g., "model-1") - allows tracking
    real model selections even when anonymous names were shown
  - `timestamp`: When the selection was made

## Accessing the Dashboard

After setting up the database, visit `/dashboard` to view experiment results and
statistics.
