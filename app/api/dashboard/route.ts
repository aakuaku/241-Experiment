import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // ============================================
    // CAUSAL INFERENCE: Treatment Effect Queries
    // ============================================

    // Get factorial design cell data (2x2 design)
    // Brand: Real (A, B) vs Anonymous (C, Control)
    // Benchmark: With (A, C) vs Without (B, Control)
    const factorialCellsQuery = await pool.query(`
      SELECT 
        condition,
        COUNT(*) as total_selections,
        COUNT(DISTINCT experiment_id) as n_participants
      FROM condition_selections
      GROUP BY condition
    `);

    // Get model selection counts by treatment groups for ATE calculation
    // This helps calculate if showing real brand vs anonymous affects model choice
    const treatmentGroupSelectionsQuery = await pool.query(`
      SELECT 
        CASE 
          WHEN condition IN ('A', 'B') THEN 'real_brand'
          ELSE 'anonymous_brand'
        END as brand_treatment,
        CASE 
          WHEN condition IN ('A', 'C') THEN 'with_benchmark'
          ELSE 'without_benchmark'
        END as benchmark_treatment,
        COALESCE(real_model_id, selected_model) as model_id,
        COUNT(*) as count,
        COUNT(DISTINCT experiment_id) as n_participants
      FROM condition_selections
      GROUP BY 
        CASE WHEN condition IN ('A', 'B') THEN 'real_brand' ELSE 'anonymous_brand' END,
        CASE WHEN condition IN ('A', 'C') THEN 'with_benchmark' ELSE 'without_benchmark' END,
        COALESCE(real_model_id, selected_model)
    `);

    // Get selection proportions by brand treatment (for brand ATE)
    const brandEffectQuery = await pool.query(`
      SELECT 
        CASE 
          WHEN condition IN ('A', 'B') THEN 'real_brand'
          ELSE 'anonymous_brand'
        END as brand_treatment,
        COALESCE(real_model_id, selected_model) as model_id,
        COUNT(*) as count
      FROM condition_selections
      GROUP BY 
        CASE WHEN condition IN ('A', 'B') THEN 'real_brand' ELSE 'anonymous_brand' END,
        COALESCE(real_model_id, selected_model)
      ORDER BY brand_treatment, count DESC
    `);

    // Get selection proportions by benchmark treatment (for benchmark ATE)
    const benchmarkEffectQuery = await pool.query(`
      SELECT 
        CASE 
          WHEN condition IN ('A', 'C') THEN 'with_benchmark'
          ELSE 'without_benchmark'
        END as benchmark_treatment,
        COALESCE(real_model_id, selected_model) as model_id,
        COUNT(*) as count
      FROM condition_selections
      GROUP BY 
        CASE WHEN condition IN ('A', 'C') THEN 'with_benchmark' ELSE 'without_benchmark' END,
        COALESCE(real_model_id, selected_model)
      ORDER BY benchmark_treatment, count DESC
    `);

    // Get totals by treatment groups for proportion calculation
    const treatmentTotalsQuery = await pool.query(`
      SELECT 
        CASE 
          WHEN condition IN ('A', 'B') THEN 'real_brand'
          ELSE 'anonymous_brand'
        END as brand_treatment,
        CASE 
          WHEN condition IN ('A', 'C') THEN 'with_benchmark'
          ELSE 'without_benchmark'
        END as benchmark_treatment,
        COUNT(*) as total,
        COUNT(DISTINCT experiment_id) as n_participants
      FROM condition_selections
      GROUP BY 
        CASE WHEN condition IN ('A', 'B') THEN 'real_brand' ELSE 'anonymous_brand' END,
        CASE WHEN condition IN ('A', 'C') THEN 'with_benchmark' ELSE 'without_benchmark' END
    `);

    // Get individual-level data for proper ATE calculation with confidence intervals
    // Each row represents one selection decision
    const individualSelectionsQuery = await pool.query(`
      SELECT 
        cs.experiment_id,
        cs.condition,
        CASE WHEN cs.condition IN ('A', 'B') THEN 1 ELSE 0 END as brand_treated,
        CASE WHEN cs.condition IN ('A', 'C') THEN 1 ELSE 0 END as benchmark_treated,
        COALESCE(cs.real_model_id, cs.selected_model) as model_id
      FROM condition_selections cs
    `);

    // Get ratings by treatment group for ATE on ratings
    const ratingsByTreatmentQuery = await pool.query(`
      SELECT 
        CASE 
          WHEN mr.condition IN ('A', 'B') THEN 'real_brand'
          ELSE 'anonymous_brand'
        END as brand_treatment,
        CASE 
          WHEN mr.condition IN ('A', 'C') THEN 'with_benchmark'
          ELSE 'without_benchmark'
        END as benchmark_treatment,
        mr.model_id,
        AVG(mr.rating) as avg_rating,
        COUNT(*) as n_ratings,
        STDDEV(mr.rating) as std_rating
      FROM model_ratings mr
      GROUP BY 
        CASE WHEN mr.condition IN ('A', 'B') THEN 'real_brand' ELSE 'anonymous_brand' END,
        CASE WHEN mr.condition IN ('A', 'C') THEN 'with_benchmark' ELSE 'without_benchmark' END,
        mr.model_id
    `);

    // Get individual ratings for detailed analysis
    const individualRatingsQuery = await pool.query(`
      SELECT 
        mr.experiment_id,
        mr.condition,
        CASE WHEN mr.condition IN ('A', 'B') THEN 1 ELSE 0 END as brand_treated,
        CASE WHEN mr.condition IN ('A', 'C') THEN 1 ELSE 0 END as benchmark_treated,
        mr.model_id,
        mr.rating
      FROM model_ratings mr
    `);

    // Get ratings joined with selections to analyze rating-selection relationship
    const ratingsWithSelectionsQuery = await pool.query(`
      SELECT 
        mr.experiment_id,
        mr.condition,
        mr.model_id,
        mr.rating,
        CASE WHEN cs.real_model_id = mr.model_id THEN 1 ELSE 0 END as was_selected,
        CASE WHEN mr.condition IN ('A', 'B') THEN 1 ELSE 0 END as brand_treated,
        CASE WHEN mr.condition IN ('A', 'C') THEN 1 ELSE 0 END as benchmark_treated
      FROM model_ratings mr
      LEFT JOIN condition_selections cs 
        ON mr.experiment_id = cs.experiment_id 
        AND mr.condition = cs.condition
    `);

    const response = NextResponse.json({
      summary: summaryQuery.rows[0],
      conditionDistribution: conditionQuery.rows,
      modelDistribution: modelQuery.rows,
      taskDistribution: taskQuery.rows,
      selectionsByCondition: selectionsByConditionQuery.rows,
      modelRatings: modelRatingsQuery.rows,
      conditionRatings: conditionRatingsQuery.rows,
      // Causal inference data
      ratingsByTreatment: ratingsByTreatmentQuery.rows,
      individualRatings: individualRatingsQuery.rows,
      ratingsWithSelections: ratingsWithSelectionsQuery.rows,
      factorialCells: factorialCellsQuery.rows,
      treatmentGroupSelections: treatmentGroupSelectionsQuery.rows,
      brandEffect: brandEffectQuery.rows,
      benchmarkEffect: benchmarkEffectQuery.rows,
      treatmentTotals: treatmentTotalsQuery.rows,
      individualSelections: individualSelectionsQuery.rows,
    }, { status: 200 });

    // Prevent caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error.message },
      { status: 500 }
    );
  }
}

