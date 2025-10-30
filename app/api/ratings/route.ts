import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { participantId, condition, modelId, rating, taskId, startTime } = await request.json();

    if (!participantId || !condition || !modelId || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, condition, modelId, rating' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // If database is not configured, return success (client-side fallback)
    if (!pool) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    // Get experiment ID for this participant
    let experimentResult = await pool.query(
      'SELECT id FROM experiments WHERE participant_id = $1',
      [participantId]
    );

    let experimentId: number;

    // If experiment doesn't exist, create it
    if (experimentResult.rows.length === 0) {
      // Create experiment record if we have the necessary information
      if (taskId && startTime) {
        const newExperimentResult = await pool.query(
          `INSERT INTO experiments (participant_id, task_id, start_time)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [participantId, taskId, new Date(startTime)]
        );
        experimentId = newExperimentResult.rows[0].id;
      } else {
        // If we don't have taskId and startTime, we can't create the experiment
        // This shouldn't happen in normal flow, but handle gracefully
        return NextResponse.json(
          { error: 'Experiment not found for this participant. Please complete the experiment first.' },
          { status: 404 }
        );
      }
    } else {
      experimentId = experimentResult.rows[0].id;
    }

    // Insert rating
    await pool.query(
      `INSERT INTO model_ratings (experiment_id, condition, model_id, rating, timestamp)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [experimentId, condition, modelId, rating]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving rating:', error);
    return NextResponse.json(
      { error: 'Failed to save rating', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId');

    let query = `
      SELECT 
        mr.id,
        mr.experiment_id,
        mr.condition,
        mr.model_id,
        mr.rating,
        mr.timestamp,
        e.participant_id
      FROM model_ratings mr
      JOIN experiments e ON mr.experiment_id = e.id
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (participantId) {
      query += ` WHERE e.participant_id = $${paramCount}`;
      params.push(participantId);
      paramCount++;
    }

    query += ' ORDER BY mr.timestamp DESC';

    const result = await pool.query(query, params);

    return NextResponse.json({ ratings: result.rows });
  } catch (error: any) {
    console.error('Error fetching ratings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ratings', details: error.message },
      { status: 500 }
    );
  }
}

