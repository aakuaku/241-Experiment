# AI Model Selection Experiment

A research experiment interface to study how brand reputation and benchmark
visibility influence developers' model selection behavior.

## Experiment Design

### Treatment Conditions (Sequential Flow)

Participants go through **all 4 conditions sequentially**:

1. **Condition 1 (Treatment B)**: Real Brand, No Benchmarks

   - Participants see real brand names but without benchmark information
   - Tests whether developers rely on brand reputation alone when no technical
     data is provided

2. **Condition 2 (Treatment A)**: Real Brand + Benchmark Scores

   - Participants see real brand names along with benchmark data (MMLU,
     CodeEval, HumanEval)
   - Tests real-world decision settings where both brand and performance data
     are visible

3. **Condition 3 (Treatment C)**: Anonymous Brand + Benchmark Scores

   - Models are labeled generically ("Model A," "Model B," etc.) but include
     benchmark results
   - Isolates the influence of technical performance when brand identity is
     hidden

4. **Condition 4 (Control)**: Anonymous Brand, No Benchmarks
   - Participants see anonymous model names without benchmark data
   - Provides baseline measure of preference when neither brand nor performance
     cues are available

### Experiment Flow

1. **Consent**: Participants read and consent to participate
2. **Task Introduction**: A random developer task is selected and shown to the
   participant
3. **For each condition** (4 conditions total):
   - Participant tries the same task with **all 4 AI models** sequentially
   - After trying all 4 models, participant selects their preferred one
   - System advances to next condition
4. **Completion**: Thank you page and data collection

### Models Used

1. OpenAI GPT (Model A)
2. Anthropic Claude (Model B)
3. Google Gemini (Model C)
4. Grok (Model D)

### Task Pool

The experiment includes 8 different developer tasks that are randomly assigned:

- Coding tasks (write functions, implement algorithms)
- Debugging tasks (identify and fix bugs)
- Explanation tasks (explain code logic)
- Refactoring tasks (optimize and improve code)
- Documentation tasks (write clear documentation)

Each participant uses the **same task across all 4 conditions** to ensure
consistency.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env.local
# Edit .env.local with your database connection string
```

3. Set up the database:

```bash
createdb experiment_db
psql experiment_db < database/schema.sql
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Access the dashboard at
[http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## Features

- **Sequential Condition Flow**: Participants go through all 4 conditions in
  order
- **Task-Based Interaction**: Participants perform a real developer task with
  each model
- **Random Task Assignment**: Each participant receives a randomly selected task
- **Multiple Model Trials**: Participants try all 4 models in each condition
  before selecting
- **Progress Tracking**: Visual progress indicators show condition and model
  progress
- **Comprehensive Data Collection**: Records all condition selections, task
  assignments, and timing
- **PostgreSQL Database**: All data stored in PostgreSQL for reliable data
  collection
- **Dashboard**: Admin dashboard to view experiment results and statistics
- **Clean UI**: Professional, neutral design to avoid bias
- **Consent Flow**: Includes informed consent process
- **Backup Storage**: Falls back to localStorage if database connection fails

## Data Collection

### Database Storage

Results are stored in PostgreSQL with the following schema:

**experiments table:**

- `participant_id`: Unique participant identifier
- `task_id`: The task assigned to the participant
- `start_time`: When the experiment started
- `end_time`: When the experiment ended
- `total_time_spent`: Total time in seconds

**condition_selections table:**

- `experiment_id`: Foreign key to experiments
- `condition`: The condition (A, B, C, or Control)
- `selected_model`: The model selected for this condition
- `timestamp`: When the selection was made

### API Endpoints

- `POST /api/experiments`: Save experiment data
- `GET /api/experiments`: Retrieve experiment data (with optional filters)
- `GET /api/dashboard`: Get dashboard statistics and aggregated data

### Dashboard

Visit `/dashboard` to view:

- Summary statistics (total participants, selections, etc.)
- Condition distribution
- Model selection distribution
- Task distribution
- Model selections by condition
- Individual experiment records

Each participant generates 4 condition selections (one per condition), allowing
for comparison across conditions.

## Documentation

- [Database Setup Guide](./DATABASE_SETUP.md) - Detailed instructions for
  setting up PostgreSQL

## Testing

To test the experiment flow, run the development server and go through all 4
conditions. The task is randomly selected but remains consistent throughout the
experiment for each participant.

To test with a specific task, you can modify the `selectRandomTask()` function
in `lib/experiment.ts`:

```typescript
export function selectRandomTask(): Task {
  return TASKS[0]; // Force first task for testing
}
```

## License

Research purposes only.
