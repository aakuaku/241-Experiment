import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if database is available
    if (!pool) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }
    // Get summary statistics
    const summaryQuery = await pool.query(`
      SELECT 
        COUNT(DISTINCT e.participant_id) as total_participants,
        COUNT(cs.id) as total_selections,
        COUNT(DISTINCT e.task_id) as unique_tasks,
        AVG(e.total_time_spent) as avg_time_spent
      FROM experiments e
      LEFT JOIN condition_selections cs ON e.id = cs.experiment_id
    `);

    // Get condition distribution
    const conditionQuery = await pool.query(`
      SELECT 
        condition,
        COUNT(*) as count,
        COUNT(DISTINCT experiment_id) as participant_count
      FROM condition_selections
      GROUP BY condition
      ORDER BY condition
    `);

    // Get model selection distribution (using real model IDs)
    const modelQuery = await pool.query(`
      SELECT 
        COALESCE(real_model_id, selected_model) as selected_model,
        COUNT(*) as count,
        COUNT(DISTINCT experiment_id) as participant_count
      FROM condition_selections
      GROUP BY COALESCE(real_model_id, selected_model)
      ORDER BY count DESC
    `);

    // Get task distribution
    const taskQuery = await pool.query(`
      SELECT 
        task_id,
        COUNT(*) as count
      FROM experiments
      GROUP BY task_id
      ORDER BY count DESC
    `);

    // Get selections by condition (using real model IDs)
    const selectionsByConditionQuery = await pool.query(`
      SELECT 
        cs.condition,
        COALESCE(cs.real_model_id, cs.selected_model) as selected_model,
        COUNT(*) as count
      FROM condition_selections cs
      GROUP BY cs.condition, COALESCE(cs.real_model_id, cs.selected_model)
      ORDER BY cs.condition, count DESC
    `);

    // Get average ratings per model
    const modelRatingsQuery = await pool.query(`
      SELECT 
        mr.model_id,
        COUNT(*) as total_ratings,
        AVG(mr.rating) as avg_rating,
        MIN(mr.rating) as min_rating,
        MAX(mr.rating) as max_rating
      FROM model_ratings mr
      GROUP BY mr.model_id
      ORDER BY avg_rating DESC
    `);

    // Get average ratings per condition
    const conditionRatingsQuery = await pool.query(`
      SELECT 
        mr.condition,
        COUNT(*) as total_ratings,
        AVG(mr.rating) as avg_rating,
        MIN(mr.rating) as min_rating,
        MAX(mr.rating) as max_rating
      FROM model_ratings mr
      GROUP BY mr.condition
      ORDER BY mr.condition
    `);

    // Get experiments over time (daily aggregation)
    const experimentsOverTimeQuery = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM experiments
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    // Get model selections over time (daily aggregation)
    const selectionsOverTimeQuery = await pool.query(`
      SELECT 
        DATE(cs.created_at) as date,
        COALESCE(cs.real_model_id, cs.selected_model) as model_id,
        COUNT(*) as count
      FROM condition_selections cs
      GROUP BY DATE(cs.created_at), COALESCE(cs.real_model_id, cs.selected_model)
      ORDER BY DATE(cs.created_at) ASC, count DESC
    `);

    // Get average ratings over time (daily aggregation)
    const ratingsOverTimeQuery = await pool.query(`
      SELECT 
        DATE(mr.timestamp) as date,
        mr.model_id,
        AVG(mr.rating) as avg_rating,
        COUNT(*) as count
      FROM model_ratings mr
      GROUP BY DATE(mr.timestamp), mr.model_id
      ORDER BY DATE(mr.timestamp) ASC
    `);

    // Get condition selections over time (daily aggregation)
    const conditionSelectionsOverTimeQuery = await pool.query(`
      SELECT 
        DATE(cs.created_at) as date,
        cs.condition,
        COUNT(*) as count
      FROM condition_selections cs
      GROUP BY DATE(cs.created_at), cs.condition
      ORDER BY DATE(cs.created_at) ASC
    `);

    return NextResponse.json({
      summary: summaryQuery.rows[0],
      conditionDistribution: conditionQuery.rows,
      modelDistribution: modelQuery.rows,
      taskDistribution: taskQuery.rows,
      selectionsByCondition: selectionsByConditionQuery.rows,
      modelRatings: modelRatingsQuery.rows,
      conditionRatings: conditionRatingsQuery.rows,
      experimentsOverTime: experimentsOverTimeQuery.rows,
      selectionsOverTime: selectionsOverTimeQuery.rows,
      ratingsOverTime: ratingsOverTimeQuery.rows,
      conditionSelectionsOverTime: conditionSelectionsOverTimeQuery.rows,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error.message },
      { status: 500 }
    );
  }
}

