import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { ExperimentData } from '@/lib/experiment';

export async function POST(request: NextRequest) {
  try {
    const data: ExperimentData = await request.json();
    
    // Validate required fields
    if (!data.participantId || !data.taskId || !data.conditionSelections || !data.startTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if database is available
    if (!pool) {
      // Database not configured, save to localStorage as fallback
      // Note: This is handled on the client side, but we should still return success
      console.warn('Database not configured, data will be saved to localStorage only');
      return NextResponse.json({ 
        success: true, 
        experimentId: null,
        warning: 'Database not configured, data saved to localStorage only'
      }, { status: 201 });
    }

    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if experiment already exists (created by ratings API)
      let experimentResult = await client.query(
        'SELECT id FROM experiments WHERE participant_id = $1',
        [data.participantId]
      );

      let experimentId: number;

      if (experimentResult.rows.length === 0) {
        // Insert new experiment record
        experimentResult = await client.query(
          `INSERT INTO experiments (participant_id, task_id, start_time, end_time, total_time_spent)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            data.participantId,
            data.taskId,
            new Date(data.startTime),
            data.endTime ? new Date(data.endTime) : null,
            data.totalTimeSpent || null,
          ]
        );
        experimentId = experimentResult.rows[0].id;
      } else {
        // Update existing experiment record with end_time and total_time_spent
        experimentId = experimentResult.rows[0].id;
        await client.query(
          `UPDATE experiments 
           SET end_time = $1, total_time_spent = $2
           WHERE id = $3`,
          [
            data.endTime ? new Date(data.endTime) : null,
            data.totalTimeSpent || null,
            experimentId,
          ]
        );
      }

      // Insert condition selections
      for (const selection of data.conditionSelections) {
        await client.query(
          `INSERT INTO condition_selections (experiment_id, condition, selected_model, real_model_id, timestamp)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            experimentId,
            selection.condition,
            selection.selectedModel,
            selection.realModelId,
            new Date(selection.timestamp),
          ]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({ success: true, experimentId }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error saving experiment data:', error);
    return NextResponse.json(
      { error: 'Failed to save experiment data', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    if (!pool) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const participantId = searchParams.get('participantId');
    const condition = searchParams.get('condition');

    let query = `
      SELECT 
        e.id,
        e.participant_id,
        e.task_id,
        e.start_time,
        e.end_time,
        e.total_time_spent,
        e.created_at,
        json_agg(
          json_build_object(
            'condition', cs.condition,
            'selectedModel', cs.selected_model,
            'realModelId', cs.real_model_id,
            'timestamp', cs.timestamp
          ) ORDER BY cs.timestamp
        ) as condition_selections
      FROM experiments e
      LEFT JOIN condition_selections cs ON e.id = cs.experiment_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (participantId) {
      query += ` AND e.participant_id = $${paramIndex}`;
      params.push(participantId);
      paramIndex++;
    }

    if (condition) {
      query += ` AND cs.condition = $${paramIndex}`;
      params.push(condition);
      paramIndex++;
    }

    query += ` GROUP BY e.id ORDER BY e.created_at DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching experiment data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiment data', details: error.message },
      { status: 500 }
    );
  }
}

