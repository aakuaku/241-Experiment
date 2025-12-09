'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import * as Select from '@radix-ui/react-select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ErrorBar,
  ReferenceLine,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  Cell,
} from 'recharts';
import { MODELS } from '@/lib/experiment';

interface DashboardData {
  summary: {
    total_participants: string;
    total_selections: string;
    unique_tasks: string;
    avg_time_spent: string;
  };
  conditionDistribution: Array<{
    condition: string;
    count: string;
    participant_count: string;
  }>;
  modelDistribution: Array<{
    selected_model: string;
    count: string;
    participant_count: string;
  }>;
  selectionsByCondition: Array<{
    condition: string;
    selected_model: string;
    count: string;
  }>;
  factorialCells: Array<{
    condition: string;
    total_selections: string;
    n_participants: string;
  }>;
  treatmentTotals: Array<{
    brand_treatment: string;
    benchmark_treatment: string;
    total: string;
    n_participants: string;
  }>;
  brandEffect: Array<{
    brand_treatment: string;
    model_id: string;
    count: string;
  }>;
  benchmarkEffect: Array<{
    benchmark_treatment: string;
    model_id: string;
    count: string;
  }>;
  individualSelections: Array<{
    experiment_id: number;
    condition: string;
    brand_treated: number;
    benchmark_treated: number;
    model_id: string;
  }>;
  ratingsByTreatment: Array<{
    brand_treatment: string;
    benchmark_treatment: string;
    model_id: string;
    avg_rating: string;
    n_ratings: string;
    std_rating: string;
  }>;
  individualRatings: Array<{
    experiment_id: number;
    condition: string;
    brand_treated: number;
    benchmark_treated: number;
    model_id: string;
    rating: number;
  }>;
  modelRatings: Array<{
    model_id: string;
    total_ratings: string;
    avg_rating: string;
  }>;
  conditionRatings: Array<{
    condition: string;
    total_ratings: string;
    avg_rating: string;
  }>;
  ratingsWithSelections: Array<{
    experiment_id: number;
    condition: string;
    model_id: string;
    rating: number;
    was_selected: number;
    brand_treated: number;
    benchmark_treated: number;
  }>;
}

interface ATEResult {
  effect: number;
  se: number;
  ci_lower: number;
  ci_upper: number;
  p_value: number;
  n_treated: number;
  n_control: number;
  mean_treated: number;
  mean_control: number;
}

const COLORS = {
  primary: '#4a90e2',
  secondary: '#50c878',
  tertiary: '#ff6b6b',
  quaternary: '#ffa726',
  purple: '#ab47bc',
  teal: '#26c6da',
  brand: '#e74c3c',
  benchmark: '#3498db',
  positive: '#27ae60',
  negative: '#c0392b',
  neutral: '#95a5a6',
};

const MODEL_COLORS: Record<string, string> = {
  'model-1': '#4a90e2', // OpenAI GPT
  'model-2': '#50c878', // Anthropic Claude
  'model-3': '#ffa726', // Google Gemini
  'model-4': '#ab47bc', // Grok
};

const getConditionName = (condition: string) => {
  switch (condition) {
    case 'A': return 'Real Brand + Benchmarks';
    case 'B': return 'Real Brand Only';
    case 'C': return 'Anonymous + Benchmarks';
    case 'Control': return 'Anonymous Only';
    default: return condition;
  }
};

const getShortConditionName = (condition: string) => {
  switch (condition) {
    case 'A': return 'Brand+Bench';
    case 'B': return 'Brand Only';
    case 'C': return 'Anon+Bench';
    case 'Control': return 'Control';
    default: return condition;
  }
};

const getRealModelName = (modelId: string | undefined): string => {
  if (!modelId) return 'Unknown';
  const model = MODELS.find(m => m.id === modelId);
  return model ? model.realBrand : modelId;
};

// Standard normal CDF approximation (Abramowitz and Stegun)
const normalCDF = (z: number): number => {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);
  
  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);
  
  return 0.5 * (1.0 + sign * y);
};

// Calculate z-score for two proportions using pooled SE (for hypothesis testing H0: p1 = p2)
const calculateZScore = (p1: number, p2: number, n1: number, n2: number): number => {
  if (n1 === 0 || n2 === 0) return 0;
  // Pooled proportion under null hypothesis
  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
  // Pooled standard error
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
  if (se === 0) return 0;
  return (p1 - p2) / se;
};

// Calculate Neyman standard error for ATE (unpooled, for confidence intervals)
const calculateNeymanSE = (p1: number, p2: number, n1: number, n2: number): number => {
  if (n1 === 0 || n2 === 0) return 0;
  return Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
};

// Calculate two-tailed p-value from z-score
const zToTwoTailedP = (z: number): number => {
  // Two-tailed p-value: P(|Z| > |z|) = 2 * P(Z > |z|) = 2 * (1 - Φ(|z|))
  return 2 * (1 - normalCDF(Math.abs(z)));
};

export default function Analytics() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('model-1'); // Default to GPT for ATE

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 503) {
          throw new Error('Database not configured. Please check your DATABASE_URL.');
        }
        throw new Error(errorData.error || errorData.details || 'Failed to fetch dashboard data');
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('admin-authenticated');
    setIsAuthenticated(false);
    setDashboardData(null);
    window.location.href = '/login';
  };

  useEffect(() => {
    const authStatus = localStorage.getItem('admin-authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      fetchDashboardData();
    } else {
      window.location.href = '/login';
    }
  }, []);

  // Calculate Average Treatment Effects using Neyman framework
  const ateResults = useMemo(() => {
    if (!dashboardData?.individualSelections?.length) return null;

    const selections = dashboardData.individualSelections;
    const models = ['model-1', 'model-2', 'model-3', 'model-4'];
    
    // Calculate ATEs for each model
    const brandATEs: Record<string, ATEResult> = {};
    const benchmarkATEs: Record<string, ATEResult> = {};
    const interactionATEs: Record<string, ATEResult> = {};

    // Get cell data for interaction calculation
    // Cells: A (brand=1, bench=1), B (brand=1, bench=0), C (brand=0, bench=1), Control (brand=0, bench=0)
    const cellA = selections.filter(s => s.brand_treated === 1 && s.benchmark_treated === 1);
    const cellB = selections.filter(s => s.brand_treated === 1 && s.benchmark_treated === 0);
    const cellC = selections.filter(s => s.brand_treated === 0 && s.benchmark_treated === 1);
    const cellControl = selections.filter(s => s.brand_treated === 0 && s.benchmark_treated === 0);

    models.forEach(modelId => {
      // Brand ATE: Effect of showing real brand vs anonymous (marginal effect)
      const brandTreated = selections.filter(s => s.brand_treated === 1);
      const brandControl = selections.filter(s => s.brand_treated === 0);
      
      const p_brand_treated = brandTreated.length > 0 
        ? brandTreated.filter(s => s.model_id === modelId).length / brandTreated.length 
        : 0;
      const p_brand_control = brandControl.length > 0 
        ? brandControl.filter(s => s.model_id === modelId).length / brandControl.length 
        : 0;
      
      const brandEffect = p_brand_treated - p_brand_control;
      // Use Neyman SE for confidence intervals (unpooled variance estimator)
      const brandSE = calculateNeymanSE(p_brand_treated, p_brand_control, brandTreated.length, brandControl.length);
      // Use pooled SE z-test for p-value (testing H0: no difference)
      const brandZ = calculateZScore(p_brand_treated, p_brand_control, brandTreated.length, brandControl.length);
      
      brandATEs[modelId] = {
        effect: brandEffect,
        se: brandSE,
        ci_lower: brandEffect - 1.96 * brandSE,
        ci_upper: brandEffect + 1.96 * brandSE,
        p_value: zToTwoTailedP(brandZ),
        n_treated: brandTreated.length,
        n_control: brandControl.length,
        mean_treated: p_brand_treated,
        mean_control: p_brand_control,
      };

      // Benchmark ATE: Effect of showing benchmarks vs not (marginal effect)
      const benchTreated = selections.filter(s => s.benchmark_treated === 1);
      const benchControl = selections.filter(s => s.benchmark_treated === 0);
      
      const p_bench_treated = benchTreated.length > 0 
        ? benchTreated.filter(s => s.model_id === modelId).length / benchTreated.length 
        : 0;
      const p_bench_control = benchControl.length > 0 
        ? benchControl.filter(s => s.model_id === modelId).length / benchControl.length 
        : 0;
      
      const benchEffect = p_bench_treated - p_bench_control;
      const benchSE = calculateNeymanSE(p_bench_treated, p_bench_control, benchTreated.length, benchControl.length);
      const benchZ = calculateZScore(p_bench_treated, p_bench_control, benchTreated.length, benchControl.length);
      
      benchmarkATEs[modelId] = {
        effect: benchEffect,
        se: benchSE,
        ci_lower: benchEffect - 1.96 * benchSE,
        ci_upper: benchEffect + 1.96 * benchSE,
        p_value: zToTwoTailedP(benchZ),
        n_treated: benchTreated.length,
        n_control: benchControl.length,
        mean_treated: p_bench_treated,
        mean_control: p_bench_control,
      };

      // Interaction Effect: Does the brand effect differ based on benchmark presence?
      // Interaction = (Y_A - Y_B) - (Y_C - Y_Control) = Y_A - Y_B - Y_C + Y_Control
      // Or equivalently: (effect of brand when benchmark=1) - (effect of brand when benchmark=0)
      const p_A = cellA.length > 0 ? cellA.filter(s => s.model_id === modelId).length / cellA.length : 0;
      const p_B = cellB.length > 0 ? cellB.filter(s => s.model_id === modelId).length / cellB.length : 0;
      const p_C = cellC.length > 0 ? cellC.filter(s => s.model_id === modelId).length / cellC.length : 0;
      const p_Control = cellControl.length > 0 ? cellControl.filter(s => s.model_id === modelId).length / cellControl.length : 0;
      
      // Interaction effect using difference-in-differences
      const interactionEffect = (p_A - p_C) - (p_B - p_Control);
      
      // SE for interaction (approximate using delta method)
      const var_A = cellA.length > 0 ? (p_A * (1 - p_A)) / cellA.length : 0;
      const var_B = cellB.length > 0 ? (p_B * (1 - p_B)) / cellB.length : 0;
      const var_C = cellC.length > 0 ? (p_C * (1 - p_C)) / cellC.length : 0;
      const var_Control = cellControl.length > 0 ? (p_Control * (1 - p_Control)) / cellControl.length : 0;
      const interactionSE = Math.sqrt(var_A + var_B + var_C + var_Control);
      
      const interactionZ = interactionSE > 0 ? interactionEffect / interactionSE : 0;
      
      interactionATEs[modelId] = {
        effect: interactionEffect,
        se: interactionSE,
        ci_lower: interactionEffect - 1.96 * interactionSE,
        ci_upper: interactionEffect + 1.96 * interactionSE,
        p_value: zToTwoTailedP(interactionZ),
        n_treated: cellA.length + cellControl.length, // diagonal cells
        n_control: cellB.length + cellC.length, // off-diagonal cells
        mean_treated: (p_A + p_Control) / 2,
        mean_control: (p_B + p_C) / 2,
      };
    });

    // Calculate cell proportions for display
    const cellProportions = {
      A: { n: cellA.length },
      B: { n: cellB.length },
      C: { n: cellC.length },
      Control: { n: cellControl.length },
    };

    return { brandATEs, benchmarkATEs, interactionATEs, cellProportions };
  }, [dashboardData]);

  // Calculate factorial cell data for 2x2 visualization
  const factorialData = useMemo(() => {
    if (!dashboardData?.selectionsByCondition?.length) return null;

    const conditions = ['A', 'B', 'C', 'Control'];
    const models = ['model-1', 'model-2', 'model-3', 'model-4'];
    
    const cellData: Record<string, Record<string, number>> = {};
    const cellTotals: Record<string, number> = {};

    conditions.forEach(cond => {
      cellData[cond] = {};
      cellTotals[cond] = 0;
      models.forEach(model => {
        const selection = dashboardData.selectionsByCondition.find(
          s => s.condition === cond && s.selected_model === model
        );
        const count = selection ? parseInt(selection.count) : 0;
        cellData[cond][model] = count;
        cellTotals[cond] += count;
      });
    });

    return { cellData, cellTotals };
  }, [dashboardData]);

  // Interaction Plot Data - shows how brand effect varies by benchmark condition
  const interactionPlotData = useMemo(() => {
    if (!dashboardData?.individualSelections?.length) return [];
    
    const selections = dashboardData.individualSelections;
    const modelsList = ['model-1', 'model-2', 'model-3', 'model-4'];
    
    // Calculate selection rates for each cell of the 2x2 design for the selected model
    const cellA = selections.filter(s => s.brand_treated === 1 && s.benchmark_treated === 1);
    const cellB = selections.filter(s => s.brand_treated === 1 && s.benchmark_treated === 0);
    const cellC = selections.filter(s => s.brand_treated === 0 && s.benchmark_treated === 1);
    const cellControl = selections.filter(s => s.brand_treated === 0 && s.benchmark_treated === 0);
    
    const p_A = cellA.length > 0 ? cellA.filter(s => s.model_id === selectedModel).length / cellA.length * 100 : 0;
    const p_B = cellB.length > 0 ? cellB.filter(s => s.model_id === selectedModel).length / cellB.length * 100 : 0;
    const p_C = cellC.length > 0 ? cellC.filter(s => s.model_id === selectedModel).length / cellC.length * 100 : 0;
    const p_Control = cellControl.length > 0 ? cellControl.filter(s => s.model_id === selectedModel).length / cellControl.length * 100 : 0;
    
    return [
      {
        benchmark: 'Without Benchmarks',
        'Real Brand': Math.round(p_B * 100) / 100,
        'Anonymous': Math.round(p_Control * 100) / 100,
      },
      {
        benchmark: 'With Benchmarks',
        'Real Brand': Math.round(p_A * 100) / 100,
        'Anonymous': Math.round(p_C * 100) / 100,
      },
    ];
  }, [dashboardData, selectedModel]);

  // Forest Plot Data - all effects with CIs for selected model
  const forestPlotData = useMemo(() => {
    if (!ateResults) return [];
    
    const brand = ateResults.brandATEs[selectedModel];
    const bench = ateResults.benchmarkATEs[selectedModel];
    const interaction = ateResults.interactionATEs[selectedModel];
    
    return [
      {
        effect: 'Brand Effect',
        estimate: Math.round(brand.effect * 10000) / 100,
        ci_lower: Math.round(brand.ci_lower * 10000) / 100,
        ci_upper: Math.round(brand.ci_upper * 10000) / 100,
        significant: brand.p_value < 0.05,
      },
      {
        effect: 'Benchmark Effect',
        estimate: Math.round(bench.effect * 10000) / 100,
        ci_lower: Math.round(bench.ci_lower * 10000) / 100,
        ci_upper: Math.round(bench.ci_upper * 10000) / 100,
        significant: bench.p_value < 0.05,
      },
      {
        effect: 'Interaction',
        estimate: Math.round(interaction.effect * 10000) / 100,
        ci_lower: Math.round(interaction.ci_lower * 10000) / 100,
        ci_upper: Math.round(interaction.ci_upper * 10000) / 100,
        significant: interaction.p_value < 0.05,
      },
    ];
  }, [ateResults, selectedModel]);

  // Cell Means Data - selection rates in each 2x2 cell for heatmap
  const cellMeansData = useMemo(() => {
    if (!dashboardData?.individualSelections?.length) return [];
    
    const selections = dashboardData.individualSelections;
    const modelsList = ['model-1', 'model-2', 'model-3', 'model-4'];
    const results: Array<{model: string; condition: string; rate: number; n: number}> = [];
    
    const conditions = [
      { key: 'A', brand: 1, bench: 1, label: 'Brand + Bench' },
      { key: 'B', brand: 1, bench: 0, label: 'Brand Only' },
      { key: 'C', brand: 0, bench: 1, label: 'Anon + Bench' },
      { key: 'Control', brand: 0, bench: 0, label: 'Control' },
    ];
    
    modelsList.forEach(modelId => {
      conditions.forEach(cond => {
        const cellSelections = selections.filter(
          s => s.brand_treated === cond.brand && s.benchmark_treated === cond.bench
        );
        const rate = cellSelections.length > 0 
          ? cellSelections.filter(s => s.model_id === modelId).length / cellSelections.length * 100 
          : 0;
        results.push({
          model: getRealModelName(modelId),
          condition: cond.label,
          rate: Math.round(rate * 100) / 100,
          n: cellSelections.length,
        });
      });
    });
    
    return results;
  }, [dashboardData]);

  // Rating ATE Analysis - treatment effects on model ratings
  const ratingATEResults = useMemo(() => {
    if (!dashboardData?.individualRatings?.length) return null;

    const ratings = dashboardData.individualRatings;
    const modelsList = ['model-1', 'model-2', 'model-3', 'model-4'];
    
    // Calculate average rating by treatment for each model
    const brandRatingATEs: Record<string, {effect: number; se: number; ci_lower: number; ci_upper: number; mean_treated: number; mean_control: number; n_treated: number; n_control: number}> = {};
    const benchmarkRatingATEs: Record<string, {effect: number; se: number; ci_lower: number; ci_upper: number; mean_treated: number; mean_control: number; n_treated: number; n_control: number}> = {};

    modelsList.forEach(modelId => {
      // Brand effect on ratings
      const brandTreatedRatings = ratings.filter(r => r.brand_treated === 1 && r.model_id === modelId).map(r => r.rating);
      const brandControlRatings = ratings.filter(r => r.brand_treated === 0 && r.model_id === modelId).map(r => r.rating);
      
      const meanBrandTreated = brandTreatedRatings.length > 0 
        ? brandTreatedRatings.reduce((a, b) => a + b, 0) / brandTreatedRatings.length 
        : 0;
      const meanBrandControl = brandControlRatings.length > 0 
        ? brandControlRatings.reduce((a, b) => a + b, 0) / brandControlRatings.length 
        : 0;
      
      // Calculate SE for difference in means
      const varTreated = brandTreatedRatings.length > 1 
        ? brandTreatedRatings.reduce((sum, x) => sum + Math.pow(x - meanBrandTreated, 2), 0) / (brandTreatedRatings.length - 1)
        : 0;
      const varControl = brandControlRatings.length > 1 
        ? brandControlRatings.reduce((sum, x) => sum + Math.pow(x - meanBrandControl, 2), 0) / (brandControlRatings.length - 1)
        : 0;
      
      const brandSE = Math.sqrt(
        (varTreated / Math.max(brandTreatedRatings.length, 1)) + 
        (varControl / Math.max(brandControlRatings.length, 1))
      );
      
      const brandEffect = meanBrandTreated - meanBrandControl;
      
      brandRatingATEs[modelId] = {
        effect: brandEffect,
        se: brandSE,
        ci_lower: brandEffect - 1.96 * brandSE,
        ci_upper: brandEffect + 1.96 * brandSE,
        mean_treated: meanBrandTreated,
        mean_control: meanBrandControl,
        n_treated: brandTreatedRatings.length,
        n_control: brandControlRatings.length,
      };

      // Benchmark effect on ratings
      const benchTreatedRatings = ratings.filter(r => r.benchmark_treated === 1 && r.model_id === modelId).map(r => r.rating);
      const benchControlRatings = ratings.filter(r => r.benchmark_treated === 0 && r.model_id === modelId).map(r => r.rating);
      
      const meanBenchTreated = benchTreatedRatings.length > 0 
        ? benchTreatedRatings.reduce((a, b) => a + b, 0) / benchTreatedRatings.length 
        : 0;
      const meanBenchControl = benchControlRatings.length > 0 
        ? benchControlRatings.reduce((a, b) => a + b, 0) / benchControlRatings.length 
        : 0;
      
      const varBenchTreated = benchTreatedRatings.length > 1 
        ? benchTreatedRatings.reduce((sum, x) => sum + Math.pow(x - meanBenchTreated, 2), 0) / (benchTreatedRatings.length - 1)
        : 0;
      const varBenchControl = benchControlRatings.length > 1 
        ? benchControlRatings.reduce((sum, x) => sum + Math.pow(x - meanBenchControl, 2), 0) / (benchControlRatings.length - 1)
        : 0;
      
      const benchSE = Math.sqrt(
        (varBenchTreated / Math.max(benchTreatedRatings.length, 1)) + 
        (varBenchControl / Math.max(benchControlRatings.length, 1))
      );
      
      const benchEffect = meanBenchTreated - meanBenchControl;
      
      benchmarkRatingATEs[modelId] = {
        effect: benchEffect,
        se: benchSE,
        ci_lower: benchEffect - 1.96 * benchSE,
        ci_upper: benchEffect + 1.96 * benchSE,
        mean_treated: meanBenchTreated,
        mean_control: meanBenchControl,
        n_treated: benchTreatedRatings.length,
        n_control: benchControlRatings.length,
      };
    });

    // Overall treatment effects on ratings (across all models)
    const allBrandTreated = ratings.filter(r => r.brand_treated === 1).map(r => r.rating);
    const allBrandControl = ratings.filter(r => r.brand_treated === 0).map(r => r.rating);
    const allBenchTreated = ratings.filter(r => r.benchmark_treated === 1).map(r => r.rating);
    const allBenchControl = ratings.filter(r => r.benchmark_treated === 0).map(r => r.rating);

    const overallBrandEffect = {
      treated_mean: allBrandTreated.length > 0 ? allBrandTreated.reduce((a, b) => a + b, 0) / allBrandTreated.length : 0,
      control_mean: allBrandControl.length > 0 ? allBrandControl.reduce((a, b) => a + b, 0) / allBrandControl.length : 0,
      n_treated: allBrandTreated.length,
      n_control: allBrandControl.length,
    };

    const overallBenchEffect = {
      treated_mean: allBenchTreated.length > 0 ? allBenchTreated.reduce((a, b) => a + b, 0) / allBenchTreated.length : 0,
      control_mean: allBenchControl.length > 0 ? allBenchControl.reduce((a, b) => a + b, 0) / allBenchControl.length : 0,
      n_treated: allBenchTreated.length,
      n_control: allBenchControl.length,
    };

    return { brandRatingATEs, benchmarkRatingATEs, overallBrandEffect, overallBenchEffect };
  }, [dashboardData]);

  // Rating chart data
  const ratingByTreatmentData = useMemo(() => {
    if (!dashboardData?.individualRatings?.length) return [];
    
    const ratings = dashboardData.individualRatings;
    const modelsList = ['model-1', 'model-2', 'model-3', 'model-4'];
    
    return modelsList.map(modelId => {
      const brandTreated = ratings.filter(r => r.brand_treated === 1 && r.model_id === modelId).map(r => r.rating);
      const brandControl = ratings.filter(r => r.brand_treated === 0 && r.model_id === modelId).map(r => r.rating);

      return {
        model: getRealModelName(modelId),
        'Real Brand': brandTreated.length > 0
          ? Math.round(brandTreated.reduce((a, b) => a + b, 0) / brandTreated.length * 100) / 100
          : 0,
        'Anonymous': brandControl.length > 0
          ? Math.round(brandControl.reduce((a, b) => a + b, 0) / brandControl.length * 100) / 100
          : 0,
      };
    });
  }, [dashboardData]);

  // Model Presentation Order Analysis - check for primacy/recency bias
  const presentationOrderAnalysis = useMemo(() => {
    if (!dashboardData?.ratingsWithSelections?.length) return null;

    const data = dashboardData.ratingsWithSelections;
    
    // Model IDs directly correspond to presentation order:
    // model-1 = 1st shown, model-2 = 2nd shown, etc.
    const positionStats: Record<number, { 
      ratings: number[]; 
      selected: number; 
      total: number;
      modelName: string;
    }> = {
      1: { ratings: [], selected: 0, total: 0, modelName: getRealModelName('model-1') },
      2: { ratings: [], selected: 0, total: 0, modelName: getRealModelName('model-2') },
      3: { ratings: [], selected: 0, total: 0, modelName: getRealModelName('model-3') },
      4: { ratings: [], selected: 0, total: 0, modelName: getRealModelName('model-4') },
    };

    data.forEach(row => {
      const position = parseInt(row.model_id.replace('model-', ''));
      if (position >= 1 && position <= 4) {
        positionStats[position].ratings.push(row.rating);
        positionStats[position].total++;
        if (row.was_selected === 1) {
          positionStats[position].selected++;
        }
      }
    });

    const chartData = Object.entries(positionStats).map(([pos, stats]) => ({
      position: `Position ${pos}`,
      positionNum: parseInt(pos),
      model: stats.modelName,
      avgRating: stats.ratings.length > 0 
        ? Math.round(stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length * 100) / 100 
        : 0,
      selectionRate: stats.total > 0 
        ? Math.round((stats.selected / stats.total) * 10000) / 100 
        : 0,
      count: stats.total,
    }));

    return chartData;
  }, [dashboardData]);

  // Rating-Selection Analysis: Does higher rating predict selection?
  const ratingSelectionAnalysis = useMemo(() => {
    if (!dashboardData?.ratingsWithSelections?.length) return null;

    const data = dashboardData.ratingsWithSelections;
    
    // Selection rate by rating level
    const selectionByRating: Record<number, { selected: number; total: number }> = {};
    for (let r = 1; r <= 5; r++) {
      selectionByRating[r] = { selected: 0, total: 0 };
    }
    
    data.forEach(row => {
      const rating = row.rating;
      if (rating >= 1 && rating <= 5) {
        selectionByRating[rating].total++;
        if (row.was_selected === 1) {
          selectionByRating[rating].selected++;
        }
      }
    });

    const selectionRateByRating = Object.entries(selectionByRating).map(([rating, counts]) => ({
      rating: parseInt(rating),
      selectionRate: counts.total > 0 ? Math.round((counts.selected / counts.total) * 10000) / 100 : 0,
      count: counts.total,
      selected: counts.selected,
    }));

    // Selection rate by rating AND treatment
    const selectionByRatingAndBrand: Record<string, { selected: number; total: number }> = {};
    data.forEach(row => {
      const key = `${row.rating}-${row.brand_treated === 1 ? 'brand' : 'anon'}`;
      if (!selectionByRatingAndBrand[key]) {
        selectionByRatingAndBrand[key] = { selected: 0, total: 0 };
      }
      selectionByRatingAndBrand[key].total++;
      if (row.was_selected === 1) {
        selectionByRatingAndBrand[key].selected++;
      }
    });

    // Analyze "tied" ratings - when participant gave same rating to multiple models
    // Group by experiment_id + condition to find ties
    const sessionRatings: Record<string, Array<{model_id: string; rating: number; was_selected: number; brand_treated: number}>> = {};
    data.forEach(row => {
      const sessionKey = `${row.experiment_id}-${row.condition}`;
      if (!sessionRatings[sessionKey]) {
        sessionRatings[sessionKey] = [];
      }
      sessionRatings[sessionKey].push({
        model_id: row.model_id,
        rating: row.rating,
        was_selected: row.was_selected,
        brand_treated: row.brand_treated,
      });
    });

    // Find sessions with ties (same max rating for multiple models)
    let tiedSessions = 0;
    let totalSessions = 0;
    const tieBreakers: Record<string, number> = {};

    Object.values(sessionRatings).forEach(session => {
      if (session.length < 2) return;
      totalSessions++;
      
      const maxRating = Math.max(...session.map(s => s.rating));
      const topRated = session.filter(s => s.rating === maxRating);
      
      if (topRated.length > 1) {
        tiedSessions++;
        // Among tied models, which one was selected?
        const selected = topRated.find(s => s.was_selected === 1);
        if (selected) {
          const modelName = getRealModelName(selected.model_id);
          tieBreakers[modelName] = (tieBreakers[modelName] || 0) + 1;
        }
      }
    });

    // Did participants select the highest-rated model?
    let selectedHighestRated = 0;
    let selectedNotHighest = 0;
    Object.values(sessionRatings).forEach(session => {
      if (session.length < 2) return;
      
      const maxRating = Math.max(...session.map(s => s.rating));
      const selected = session.find(s => s.was_selected === 1);
      
      if (selected) {
        if (selected.rating === maxRating) {
          selectedHighestRated++;
        } else {
          selectedNotHighest++;
        }
      }
    });

    return {
      selectionRateByRating,
      tiedSessions,
      totalSessions,
      tieBreakers,
      selectedHighestRated,
      selectedNotHighest,
      highestRatedSelectionRate: totalSessions > 0 
        ? Math.round((selectedHighestRated / totalSessions) * 10000) / 100 
        : 0,
    };
  }, [dashboardData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Causal Inference Analytics</h1>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Causal Inference Analytics</h1>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-700"><strong>Error:</strong> {error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!dashboardData) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Causal Inference Analytics</h1>
          <p className="text-gray-600">No data available.</p>
        </div>
      </main>
    );
  }

  // Prepare data for charts
  const models = ['model-1', 'model-2', 'model-3', 'model-4'];

  // ATE visualization data (rounded to 2 decimal places for cleaner display)
  const ateChartData = models.map(modelId => ({
    model: getRealModelName(modelId),
    modelId,
    brandATE: ateResults?.brandATEs[modelId]?.effect ? Math.round(ateResults.brandATEs[modelId].effect * 10000) / 100 : 0,
    brandError: ateResults?.brandATEs[modelId]?.se ? Math.round(ateResults.brandATEs[modelId].se * 1.96 * 10000) / 100 : 0,
    benchmarkATE: ateResults?.benchmarkATEs[modelId]?.effect ? Math.round(ateResults.benchmarkATEs[modelId].effect * 10000) / 100 : 0,
    benchmarkError: ateResults?.benchmarkATEs[modelId]?.se ? Math.round(ateResults.benchmarkATEs[modelId].se * 1.96 * 10000) / 100 : 0,
    interactionATE: ateResults?.interactionATEs[modelId]?.effect ? Math.round(ateResults.interactionATEs[modelId].effect * 10000) / 100 : 0,
    interactionError: ateResults?.interactionATEs[modelId]?.se ? Math.round(ateResults.interactionATEs[modelId].se * 1.96 * 10000) / 100 : 0,
  }));

  // 2x2 Factorial visualization data
  const factorial2x2Data = [
    {
      name: 'With Benchmarks',
      'Real Brand': factorialData?.cellTotals['A'] || 0,
      'Anonymous': factorialData?.cellTotals['C'] || 0,
    },
    {
      name: 'Without Benchmarks',
      'Real Brand': factorialData?.cellTotals['B'] || 0,
      'Anonymous': factorialData?.cellTotals['Control'] || 0,
    },
  ];

  // Model selection by condition
  const modelByConditionData = ['A', 'B', 'C', 'Control'].map(condition => {
    const data: any = { condition: getShortConditionName(condition) };
    models.forEach(model => {
      const selection = dashboardData.selectionsByCondition.find(
        s => s.condition === condition && s.selected_model === model
      );
      data[getRealModelName(model)] = selection ? parseInt(selection.count) : 0;
    });
    return data;
  });

  // Selection proportions by treatment (rounded to 2 decimal places)
  const selectionProportionsByBrand = models.map(modelId => {
    const brandData = dashboardData.brandEffect || [];
    const realBrandTotal = brandData.filter(b => b.brand_treatment === 'real_brand').reduce((sum, b) => sum + parseInt(b.count), 0);
    const anonTotal = brandData.filter(b => b.brand_treatment === 'anonymous_brand').reduce((sum, b) => sum + parseInt(b.count), 0);

    const realBrandCount = brandData.find(b => b.brand_treatment === 'real_brand' && b.model_id === modelId);
    const anonCount = brandData.find(b => b.brand_treatment === 'anonymous_brand' && b.model_id === modelId);

    const realBrandPct = realBrandCount && realBrandTotal > 0 
      ? Math.round((parseInt(realBrandCount.count) / realBrandTotal) * 10000) / 100 
      : 0;
    const anonPct = anonCount && anonTotal > 0 
      ? Math.round((parseInt(anonCount.count) / anonTotal) * 10000) / 100 
      : 0;

    return {
      model: getRealModelName(modelId),
      modelId,
      'Real Brand': realBrandPct,
      'Anonymous': anonPct,
    };
  });

  const selectionProportionsByBenchmark = models.map(modelId => {
    const benchData = dashboardData.benchmarkEffect || [];
    const withBenchTotal = benchData.filter(b => b.benchmark_treatment === 'with_benchmark').reduce((sum, b) => sum + parseInt(b.count), 0);
    const withoutBenchTotal = benchData.filter(b => b.benchmark_treatment === 'without_benchmark').reduce((sum, b) => sum + parseInt(b.count), 0);

    const withBenchCount = benchData.find(b => b.benchmark_treatment === 'with_benchmark' && b.model_id === modelId);
    const withoutBenchCount = benchData.find(b => b.benchmark_treatment === 'without_benchmark' && b.model_id === modelId);

    const withBenchPct = withBenchCount && withBenchTotal > 0 
      ? Math.round((parseInt(withBenchCount.count) / withBenchTotal) * 10000) / 100 
      : 0;
    const withoutBenchPct = withoutBenchCount && withoutBenchTotal > 0 
      ? Math.round((parseInt(withoutBenchCount.count) / withoutBenchTotal) * 10000) / 100 
      : 0;

    return {
      model: getRealModelName(modelId),
      modelId,
      'With Benchmarks': withBenchPct,
      'Without Benchmarks': withoutBenchPct,
    };
  });

  const selectedATE = ateResults ? {
    brand: ateResults.brandATEs[selectedModel],
    benchmark: ateResults.benchmarkATEs[selectedModel],
    interaction: ateResults.interactionATEs[selectedModel],
  } : null;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>
              Causal Inference Analytics
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '1rem' }}>
              AI Model Selection: Brand vs Performance Effects
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link href="/dashboard" style={{ color: '#4a90e2', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
              ← Dashboard
            </Link>
            <Link href="/dashboard/export" style={{ color: '#4a90e2', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
              Export Data
            </Link>
            <button
              onClick={handleSignOut}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#666',
                background: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Study Design Overview */}
        <section style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem', 
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
            Study Design: 2×2 Factorial Randomized Experiment
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            This study employs a <strong>2×2 within-subjects factorial design</strong> to identify the <strong>causal effects</strong> of 
            brand visibility and benchmark information on AI model selection behavior. Each participant experiences <strong>all four conditions</strong> in 
            a fixed order (B → A → C → Control), enabling within-subject comparison while controlling for individual differences.
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '2rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ backgroundColor: '#fef3c7', padding: '1.5rem', borderRadius: '8px', border: '2px solid #f59e0b' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#92400e', fontSize: '1.1rem' }}>Treatment 1: Brand Visibility</h3>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#78350f' }}>
                <li><strong>Treated:</strong> Real brand names shown (OpenAI GPT, Anthropic Claude, etc.)</li>
                <li><strong>Control:</strong> Anonymous labels (Model A, Model B, etc.)</li>
              </ul>
            </div>
            <div style={{ backgroundColor: '#dbeafe', padding: '1.5rem', borderRadius: '8px', border: '2px solid #3b82f6' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e40af', fontSize: '1.1rem' }}>Treatment 2: Benchmark Scores</h3>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#1e3a8a' }}>
                <li><strong>Treated:</strong> Performance benchmarks displayed (MMLU, Code Eval, etc.)</li>
                <li><strong>Control:</strong> No benchmark information shown</li>
              </ul>
            </div>
          </div>

          {/* 2x2 Design Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '1rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}></th>
                  <th style={{ padding: '1rem', backgroundColor: '#fef3c7', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                    Real Brand (Treated)
                  </th>
                  <th style={{ padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                    Anonymous (Control)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '1rem', backgroundColor: '#dbeafe', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                    With Benchmarks (Treated)
                  </td>
                  <td style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <strong>Condition A</strong><br />
                    <span style={{ color: '#64748b' }}>n = {factorialData?.cellTotals['A'] || 0}</span>
                  </td>
                  <td style={{ padding: '1rem', backgroundColor: '#fefce8', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <strong>Condition C</strong><br />
                    <span style={{ color: '#64748b' }}>n = {factorialData?.cellTotals['C'] || 0}</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '1rem', backgroundColor: '#fce7f3', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                    Without Benchmarks (Control)
                  </td>
                  <td style={{ padding: '1rem', backgroundColor: '#fef3c7', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <strong>Condition B</strong><br />
                    <span style={{ color: '#64748b' }}>n = {factorialData?.cellTotals['B'] || 0}</span>
                  </td>
                  <td style={{ padding: '1rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <strong>Control</strong><br />
                    <span style={{ color: '#64748b' }}>n = {factorialData?.cellTotals['Control'] || 0}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '1rem', fontStyle: 'italic' }}>
            Total selections: {dashboardData.summary.total_selections} from {dashboardData.summary.total_participants} participants
          </p>

          {/* Design Considerations */}
          <div style={{ 
            backgroundColor: '#fef3c7', 
            padding: '1.5rem', 
            borderRadius: '8px', 
            marginTop: '1.5rem',
            border: '1px solid #fcd34d'
          }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#92400e', fontSize: '1rem' }}>Experiment Flow & Design Considerations</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', color: '#78350f', fontSize: '0.9rem', fontWeight: 600 }}>
                  Participant Journey (Per Condition):
                </p>
                <ol style={{ margin: 0, paddingLeft: '1.2rem', color: '#78350f', fontSize: '0.85rem', lineHeight: 1.7 }}>
                  <li>See task description</li>
                  <li>Try Model 1 → Chat → Rate (1-5)</li>
                  <li>Try Model 2 → Chat → Rate (1-5)</li>
                  <li>Try Model 3 → Chat → Rate (1-5)</li>
                  <li>Try Model 4 → Chat → Rate (1-5)</li>
                  <li><strong>View all ratings → Select preferred model</strong></li>
                </ol>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', color: '#78350f', fontSize: '0.9rem', fontWeight: 600 }}>
                  Design Caveats to Consider:
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#78350f', fontSize: '0.85rem', lineHeight: 1.7 }}>
                  <li><strong>Fixed condition order:</strong> B → A → C → Control (potential learning/fatigue effects)</li>
                  <li><strong>Fixed model order:</strong> Models always shown 1→2→3→4 (primacy/recency bias)</li>
                  <li><strong>Different tasks:</strong> Each condition uses a different task from selected themes</li>
                  <li><strong>Within-subjects:</strong> Same participant in all conditions (carryover effects possible)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Causal Identification Framework */}
          <div style={{ 
            backgroundColor: '#f8fafc', 
            padding: '1.5rem', 
            borderRadius: '8px',
            marginTop: '1.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Causal Identification & Interpretation (Potential Outcomes Framework)</h4>
            <div style={{ color: '#475569', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Research Question:</strong> Do people choose AI models based on <em>brand recognition</em> or <em>objective performance metrics</em>?
              </p>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Identification Strategy:</strong> This within-subjects design exposes each participant to all four treatment combinations 
                in a fixed order (B → A → C → Control). While this controls for individual-level confounders, 
                potential order/carryover effects should be considered when interpreting results. 
                The factorial design enables estimation of main effects and interactions.
              </p>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Estimand Definitions:</strong>
              </p>
              <ul style={{ margin: '0 0 1rem 0', paddingLeft: '1.2rem' }}>
                <li><strong>τ<sub>brand</sub></strong> = E[Y<sub>i</sub>(brand=1) - Y<sub>i</sub>(brand=0)] — Average effect of revealing brand identity</li>
                <li><strong>τ<sub>bench</sub></strong> = E[Y<sub>i</sub>(bench=1) - Y<sub>i</sub>(bench=0)] — Average effect of showing performance metrics</li>
                <li><strong>τ<sub>interaction</sub></strong> = (τ<sub>brand|bench=1</sub> - τ<sub>brand|bench=0</sub>) — Effect modification test</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Interpreting Results:</strong>
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li>If <strong>τ̂<sub>brand</sub> &gt; 0</strong>: Brand visibility <em>increases</em> selection probability (brand-driven behavior)</li>
                <li>If <strong>τ̂<sub>brand</sub> &lt; 0</strong>: Brand visibility <em>decreases</em> selection (brand aversion or competitor preference)</li>
                <li>If <strong>τ̂<sub>bench</sub> ≠ 0</strong>: Performance information causally influences choice (rational decision-making)</li>
                <li>If <strong>τ̂<sub>interaction</sub> ≠ 0</strong>: Treatment effects are heterogeneous — brand effect depends on benchmark presence</li>
                <li>If all effects ≈ 0: Selection appears random or driven by unobserved factors (e.g., UI position)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Average Treatment Effects */}
        <section style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem', 
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
            Average Treatment Effects (ATE)
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            The ATE measures the <strong>causal effect</strong> of each treatment on the probability of selecting a 
            specific model. A positive ATE means the treatment <em>increases</em> the likelihood of selection; 
            a negative ATE means it <em>decreases</em> selection. 95% confidence intervals are shown.
          </p>

          {/* Model Selector */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 500, color: '#374151' }}>Select Model:</label>
            <Select.Root value={selectedModel} onValueChange={setSelectedModel}>
              <Select.Trigger
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  minWidth: '200px',
                  gap: '0.5rem',
                  outline: 'none',
                }}
              >
                <Select.Value />
                <Select.Icon>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 10px 38px -10px rgba(22, 23, 24, 0.35), 0 10px 20px -15px rgba(22, 23, 24, 0.2)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    zIndex: 1000,
                  }}
                  position="popper"
                  sideOffset={4}
                >
                  <Select.Viewport style={{ padding: '0.25rem' }}>
                    {models.map(m => (
                      <Select.Item
                        key={m}
                        value={m}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          outline: 'none',
                          fontSize: '1rem',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Select.ItemText>{getRealModelName(m)}</Select.ItemText>
                        <Select.ItemIndicator>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 6L5 9L10 3" stroke="#4a90e2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
              (Cards below show effects for the selected model)
            </span>
          </div>

          {/* Detailed ATE for Selected Model */}
          {selectedATE && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Brand Effect Card */}
              <div style={{
                backgroundColor: selectedATE.brand.effect >= 0 ? '#f0fdf4' : '#fef2f2',
                padding: '1.5rem',
                borderRadius: '8px',
                border: `2px solid ${selectedATE.brand.effect >= 0 ? '#22c55e' : '#ef4444'}`
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
                  Brand Main Effect
                </h3>
                <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.85rem' }}>
                  τ̂<sub>brand</sub> for {getRealModelName(selectedModel)}
                </p>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: selectedATE.brand.effect >= 0 ? '#16a34a' : '#dc2626' }}>
                  {selectedATE.brand.effect >= 0 ? '+' : ''}{(selectedATE.brand.effect * 100).toFixed(2)} pp
                </div>
                <div style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  95% CI: [{(selectedATE.brand.ci_lower * 100).toFixed(2)}, {(selectedATE.brand.ci_upper * 100).toFixed(2)}]
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  SE: {(selectedATE.brand.se * 100).toFixed(2)} pp
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  p = {selectedATE.brand.p_value < 0.001 ? '<0.001' : selectedATE.brand.p_value.toFixed(3)}
                  {selectedATE.brand.p_value < 0.05 && <span style={{ color: '#16a34a', marginLeft: '0.5rem', fontWeight: 600 }}>*</span>}
                  {selectedATE.brand.p_value < 0.01 && <span style={{ color: '#16a34a' }}>*</span>}
                  {selectedATE.brand.p_value < 0.001 && <span style={{ color: '#16a34a' }}>*</span>}
                </div>
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                  <div style={{ color: '#475569' }}>
                    <div>E[Y(1)] = {(selectedATE.brand.mean_treated * 100).toFixed(1)}% (n={selectedATE.brand.n_treated})</div>
                    <div>E[Y(0)] = {(selectedATE.brand.mean_control * 100).toFixed(1)}% (n={selectedATE.brand.n_control})</div>
                  </div>
                </div>
              </div>

              {/* Benchmark Effect Card */}
              <div style={{
                backgroundColor: selectedATE.benchmark.effect >= 0 ? '#f0fdf4' : '#fef2f2',
                padding: '1.5rem',
                borderRadius: '8px',
                border: `2px solid ${selectedATE.benchmark.effect >= 0 ? '#22c55e' : '#ef4444'}`
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
                  Benchmark Main Effect
                </h3>
                <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.85rem' }}>
                  τ̂<sub>bench</sub> for {getRealModelName(selectedModel)}
                </p>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: selectedATE.benchmark.effect >= 0 ? '#16a34a' : '#dc2626' }}>
                  {selectedATE.benchmark.effect >= 0 ? '+' : ''}{(selectedATE.benchmark.effect * 100).toFixed(2)} pp
                </div>
                <div style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  95% CI: [{(selectedATE.benchmark.ci_lower * 100).toFixed(2)}, {(selectedATE.benchmark.ci_upper * 100).toFixed(2)}]
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  SE: {(selectedATE.benchmark.se * 100).toFixed(2)} pp
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  p = {selectedATE.benchmark.p_value < 0.001 ? '<0.001' : selectedATE.benchmark.p_value.toFixed(3)}
                  {selectedATE.benchmark.p_value < 0.05 && <span style={{ color: '#16a34a', marginLeft: '0.5rem', fontWeight: 600 }}>*</span>}
                  {selectedATE.benchmark.p_value < 0.01 && <span style={{ color: '#16a34a' }}>*</span>}
                  {selectedATE.benchmark.p_value < 0.001 && <span style={{ color: '#16a34a' }}>*</span>}
                </div>
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                  <div style={{ color: '#475569' }}>
                    <div>E[Y(1)] = {(selectedATE.benchmark.mean_treated * 100).toFixed(1)}% (n={selectedATE.benchmark.n_treated})</div>
                    <div>E[Y(0)] = {(selectedATE.benchmark.mean_control * 100).toFixed(1)}% (n={selectedATE.benchmark.n_control})</div>
                  </div>
                </div>
              </div>

              {/* Interaction Effect Card */}
              <div style={{
                backgroundColor: Math.abs(selectedATE.interaction.effect) < 0.01 ? '#f8fafc' : (selectedATE.interaction.effect >= 0 ? '#fef3c7' : '#fce7f3'),
                padding: '1.5rem',
                borderRadius: '8px',
                border: `2px solid ${Math.abs(selectedATE.interaction.effect) < 0.01 ? '#94a3b8' : (selectedATE.interaction.effect >= 0 ? '#f59e0b' : '#ec4899')}`
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
                  Interaction Effect
                </h3>
                <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.85rem' }}>
                  τ̂<sub>brand×bench</sub> for {getRealModelName(selectedModel)}
                </p>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: Math.abs(selectedATE.interaction.effect) < 0.01 ? '#64748b' : (selectedATE.interaction.effect >= 0 ? '#b45309' : '#be185d') }}>
                  {selectedATE.interaction.effect >= 0 ? '+' : ''}{(selectedATE.interaction.effect * 100).toFixed(2)} pp
                </div>
                <div style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  95% CI: [{(selectedATE.interaction.ci_lower * 100).toFixed(2)}, {(selectedATE.interaction.ci_upper * 100).toFixed(2)}]
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  SE: {(selectedATE.interaction.se * 100).toFixed(2)} pp
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  p = {selectedATE.interaction.p_value < 0.001 ? '<0.001' : selectedATE.interaction.p_value.toFixed(3)}
                  {selectedATE.interaction.p_value < 0.05 && <span style={{ color: '#b45309', marginLeft: '0.5rem', fontWeight: 600 }}>*</span>}
                  {selectedATE.interaction.p_value < 0.01 && <span style={{ color: '#b45309' }}>*</span>}
                  {selectedATE.interaction.p_value < 0.001 && <span style={{ color: '#b45309' }}>*</span>}
                </div>
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
                  Tests if brand effect differs by benchmark condition
                </div>
              </div>
            </div>
          )}

          {/* ATE Chart for All Models */}
          <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.1rem' }}>
            Estimated Treatment Effects Across All Models (percentage points)
          </h3>
          <ResponsiveContainer width="100%" height={650}>
            <BarChart data={ateChartData} layout="vertical" margin={{ left: 20, right: 40, top: 30, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[-40, 40]}
                tickFormatter={(v) => `${Number(v).toFixed(1)} pp`}
                label={{ value: 'Effect Size (percentage points)', position: 'bottom', offset: -5 }}
              />
              <YAxis dataKey="model" type="category" width={140} />
              <Tooltip
                formatter={(value: number, name: string) => [`${value.toFixed(2)} pp`, name]}
                labelFormatter={(label) => `Model: ${label}`}
              />
              <Legend wrapperStyle={{ paddingTop: '30px' }} />
              <ReferenceLine x={0} stroke="#1e293b" strokeWidth={2} label={{ value: 'No Effect', position: 'top' }} />
              <Bar dataKey="brandATE" fill={COLORS.brand} name="Brand Main Effect (τ_brand)">
                <ErrorBar dataKey="brandError" width={4} strokeWidth={2} stroke="#991b1b" />
              </Bar>
              <Bar dataKey="benchmarkATE" fill={COLORS.benchmark} name="Benchmark Main Effect (τ_bench)">
                <ErrorBar dataKey="benchmarkError" width={4} strokeWidth={2} stroke="#1e40af" />
              </Bar>
              <Bar dataKey="interactionATE" fill="#f59e0b" name="Interaction Effect (τ_brand×bench)">
                <ErrorBar dataKey="interactionError" width={4} strokeWidth={2} stroke="#92400e" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Interpretation */}
          <div style={{ 
            backgroundColor: '#f8fafc', 
            padding: '1.5rem', 
            borderRadius: '8px', 
            marginTop: '1.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#1e293b' }}>Statistical Methods & Interpretation</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569', lineHeight: 1.8 }}>
              <li><strong>ATE Estimation</strong>: τ̂ = E[Y(1)] - E[Y(0)], the difference in mean outcomes under treatment vs. control (Neyman, 1923)</li>
              <li><strong>Standard Errors</strong>: Computed using Neyman's variance estimator for randomized experiments</li>
              <li><strong>Confidence Intervals</strong>: 95% CIs using the normal approximation: τ̂ ± 1.96 × SE(τ̂)</li>
              <li><strong>Hypothesis Testing</strong>: Two-proportion z-test with pooled variance under H₀: τ = 0</li>
              <li><strong>Interaction Effect</strong>: Tests effect modification — whether the brand effect differs based on benchmark visibility</li>
              <li><strong>Significance</strong>: * p &lt; 0.05, ** p &lt; 0.01, *** p &lt; 0.001</li>
            </ul>
            <p style={{ marginTop: '1rem', marginBottom: 0, color: '#64748b', fontSize: '0.9rem' }}>
              <em>Note: "pp" = percentage points. CIs that include zero indicate effects not distinguishable from no effect at α = 0.05.</em>
            </p>
          </div>
        </section>

        {/* Summary & Key Findings */}
        <section style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem', 
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
            Summary & Key Findings
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#0369a1' }}>
                {dashboardData.summary.total_participants}
              </div>
              <div style={{ color: '#0c4a6e', fontWeight: 500 }}>Total Participants</div>
            </div>
            <div style={{ backgroundColor: '#f0fdf4', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#15803d' }}>
                {dashboardData.summary.total_selections}
              </div>
              <div style={{ color: '#14532d', fontWeight: 500 }}>Total Selections</div>
            </div>
            <div style={{ backgroundColor: '#fef3c7', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#b45309' }}>
                4
              </div>
              <div style={{ color: '#78350f', fontWeight: 500 }}>Conditions (2x2)</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            <div style={{ 
              backgroundColor: '#f8fafc', 
              padding: '1.5rem', 
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>How to Interpret Treatment Effects</h4>
              <div style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.9rem' }}>
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  <li><strong>Brand Effect &gt; 0</strong>: Real brand names <em>increase</em> selection</li>
                  <li><strong>Brand Effect &lt; 0</strong>: Real brand names <em>decrease</em> selection</li>
                  <li><strong>Benchmark Effect &gt; 0</strong>: Performance scores <em>increase</em> selection</li>
                  <li><strong>Interaction ≠ 0</strong>: Brand effect varies by benchmark visibility</li>
                  <li><strong>All effects ≈ 0</strong>: No detectable treatment influence</li>
                </ul>
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#eff6ff', 
              padding: '1.5rem', 
              borderRadius: '8px',
              border: '1px solid #bfdbfe'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#1e40af' }}>Key Charts to Examine</h4>
              <div style={{ color: '#1e3a8a', lineHeight: 1.8, fontSize: '0.9rem' }}>
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  <li><strong>ATE Forest Plot</strong>: Main causal estimates with confidence intervals</li>
                  <li><strong>2×2 Cell Table</strong>: Selection rates by treatment combination</li>
                  <li><strong>Interaction Plot</strong>: Non-parallel lines = interaction effect</li>
                  <li><strong>Rating → Selection</strong>: Does higher rating predict selection?</li>
                  <li><strong>Order Analysis</strong>: Check for position bias (validity threat)</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ 
            backgroundColor: '#fefce8', 
            padding: '1rem', 
            borderRadius: '8px',
            border: '1px solid #fef08a',
            marginTop: '1.5rem'
          }}>
            <p style={{ margin: 0, color: '#854d0e', fontSize: '0.9rem', lineHeight: 1.7 }}>
              <strong>Reading the Results:</strong> Look for effects where the 95% CI does not cross zero (statistically significant). 
              Compare effect sizes across models to identify heterogeneous treatment effects. 
              Check the "Order Analysis" section to assess whether model presentation order may confound results.
            </p>
          </div>
        </section>

        {/* Cell Means Comparison - Selection Rates by 2x2 Cell */}
        <section style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem', 
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
            Selection Rates by Experimental Cell (2×2 Design)
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            This table shows the selection rate for each model within each cell of the factorial design. 
            Comparing across rows reveals brand effects; comparing across columns reveals benchmark effects.
          </p>

          {/* Cell Means Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                    Model
                  </th>
                  <th style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    Brand + Bench (A)
                  </th>
                  <th style={{ padding: '0.75rem', backgroundColor: '#fef3c7', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    Brand Only (B)
                  </th>
                  <th style={{ padding: '0.75rem', backgroundColor: '#fefce8', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    Anon + Bench (C)
                  </th>
                  <th style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    Control
                  </th>
                </tr>
              </thead>
              <tbody>
                {models.map((modelId, idx) => {
                  const modelName = getRealModelName(modelId);
                  const cellA = cellMeansData.find(d => d.model === modelName && d.condition === 'Brand + Bench');
                  const cellB = cellMeansData.find(d => d.model === modelName && d.condition === 'Brand Only');
                  const cellC = cellMeansData.find(d => d.model === modelName && d.condition === 'Anon + Bench');
                  const cellControl = cellMeansData.find(d => d.model === modelName && d.condition === 'Control');
                  
                  return (
                    <tr key={modelId} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 500 }}>
                        {modelName}
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        {cellA?.rate.toFixed(1)}%
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        {cellB?.rate.toFixed(1)}%
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        {cellC?.rate.toFixed(1)}%
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        {cellControl?.rate.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ 
            backgroundColor: '#dbeafe', 
            padding: '1rem', 
            borderRadius: '6px', 
            marginTop: '1.5rem',
            border: '1px solid #93c5fd'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af', fontSize: '0.95rem' }}>How to Read This Table</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#1e3a8a', fontSize: '0.9rem', lineHeight: 1.7 }}>
              <li><strong>Brand Effect:</strong> Compare columns A vs C (with benchmarks) or B vs Control (without benchmarks)</li>
              <li><strong>Benchmark Effect:</strong> Compare columns A vs B (with brand) or C vs Control (without brand)</li>
              <li><strong>Interaction:</strong> If (A - C) ≠ (B - Control), there's an interaction between treatments</li>
            </ul>
          </div>
        </section>

        {/* Selection Proportions by Treatment */}
        <section style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem', 
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
            Model Selection Proportions by Treatment
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            These charts show the percentage of selections each model received under different treatment conditions. 
            Differences between bars indicate treatment effects.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
            {/* By Brand Treatment */}
            <div>
              <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.1rem' }}>
                Selection Rate by Brand Treatment
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={selectionProportionsByBrand}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" angle={-20} textAnchor="end" height={60} interval={0} fontSize={12} />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, '']} />
                  <Legend />
                  <Bar dataKey="Real Brand" fill="#f59e0b" />
                  <Bar dataKey="Anonymous" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* By Benchmark Treatment */}
            <div>
              <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.1rem' }}>
                Selection Rate by Benchmark Treatment
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={selectionProportionsByBenchmark}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" angle={-20} textAnchor="end" height={60} interval={0} fontSize={12} />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, '']} />
                  <Legend />
                  <Bar dataKey="With Benchmarks" fill="#3b82f6" />
                  <Bar dataKey="Without Benchmarks" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Model Selection by All Conditions */}
        <section style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem', 
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
            Model Selection Across All Conditions
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            This visualization shows raw selection counts across all four experimental conditions. 
            Compare across conditions to observe how the combination of treatments affects model preference.
          </p>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={modelByConditionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="condition" />
              <YAxis label={{ value: 'Selection Count', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {models.map((model, idx) => (
                <Bar key={model} dataKey={getRealModelName(model)} fill={Object.values(MODEL_COLORS)[idx]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>

          <div style={{ 
            backgroundColor: '#fffbeb', 
            padding: '1.5rem', 
            borderRadius: '8px', 
            marginTop: '1.5rem',
            border: '1px solid #fcd34d'
          }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#92400e' }}>Key Observations</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#78350f', lineHeight: 1.8 }}>
              <li><strong>Brand+Bench (A)</strong>: Both treatments active - participants see real names AND performance data</li>
              <li><strong>Brand Only (B)</strong>: Only brand names visible - tests pure brand effect</li>
              <li><strong>Anon+Bench (C)</strong>: Only benchmarks visible - tests pure performance effect</li>
              <li><strong>Control</strong>: Baseline with no brand or performance information</li>
            </ul>
          </div>
        </section>

        {/* Interaction Plot & Forest Plot */}
        <section style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem', 
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
            Treatment Effect Heterogeneity Analysis
          </h2>
          <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            These visualizations help identify whether treatment effects vary across conditions (effect modification)
            and provide a clear summary of all estimated effects with confidence intervals.
          </p>

          {/* Model Selector for this section */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <label style={{ fontWeight: 500, color: '#374151' }}>Select Model:</label>
            <Select.Root value={selectedModel} onValueChange={setSelectedModel}>
              <Select.Trigger
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  minWidth: '200px',
                  gap: '0.5rem',
                  outline: 'none',
                }}
              >
                <Select.Value />
                <Select.Icon>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 10px 38px -10px rgba(22, 23, 24, 0.35), 0 10px 20px -15px rgba(22, 23, 24, 0.2)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    zIndex: 1000,
                  }}
                  position="popper"
                  sideOffset={4}
                >
                  <Select.Viewport style={{ padding: '0.25rem' }}>
                    {models.map(m => (
                      <Select.Item
                        key={m}
                        value={m}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          outline: 'none',
                          fontSize: '1rem',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Select.ItemText>{getRealModelName(m)}</Select.ItemText>
                        <Select.ItemIndicator>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 6L5 9L10 3" stroke="#4a90e2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
              (Charts below show data for the selected model)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
            {/* Interaction Plot */}
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151', fontSize: '1.1rem' }}>
                Interaction Plot for {getRealModelName(selectedModel)}
              </h3>
              <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.85rem' }}>
                Non-parallel lines indicate an interaction effect between brand and benchmark treatments
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={interactionPlotData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="benchmark" />
                  <YAxis 
                    tickFormatter={(v) => `${v}%`} 
                    domain={[0, 'auto']}
                    label={{ value: 'Selection Rate (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, '']} />
                  <Legend />
                  <Line 
                    type="linear" 
                    dataKey="Real Brand" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    dot={{ r: 6, fill: '#f59e0b' }}
                  />
                  <Line 
                    type="linear" 
                    dataKey="Anonymous" 
                    stroke="#94a3b8" 
                    strokeWidth={3}
                    dot={{ r: 6, fill: '#94a3b8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '6px', 
                marginTop: '1rem',
                fontSize: '0.85rem',
                color: '#64748b'
              }}>
                <strong>Interpretation:</strong> If lines are parallel → no interaction (additive effects). 
                If lines cross or diverge → interaction present (effect of brand depends on benchmark visibility).
              </div>
            </div>

            {/* Forest Plot */}
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151', fontSize: '1.1rem' }}>
                Forest Plot: Effect Estimates for {getRealModelName(selectedModel)}
              </h3>
              <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.85rem' }}>
                Point estimates with 95% confidence intervals (percentage points)
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={forestPlotData} 
                  layout="vertical" 
                  margin={{ left: 100, right: 30, top: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    domain={['auto', 'auto']} 
                    tickFormatter={(v) => `${v} pp`}
                  />
                  <YAxis dataKey="effect" type="category" width={100} />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'estimate') return [`${value.toFixed(2)} pp`, 'Estimate'];
                      return [value, name];
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div style={{ 
                            backgroundColor: 'white', 
                            padding: '0.75rem', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
                          }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
                            <p style={{ margin: '0.25rem 0 0 0' }}>Estimate: {data.estimate.toFixed(2)} pp</p>
                            <p style={{ margin: '0.25rem 0 0 0' }}>95% CI: [{data.ci_lower.toFixed(2)}, {data.ci_upper.toFixed(2)}]</p>
                            <p style={{ margin: '0.25rem 0 0 0', color: data.significant ? '#16a34a' : '#64748b' }}>
                              {data.significant ? 'Statistically significant' : 'Not significant'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={0} stroke="#1e293b" strokeWidth={2} />
                  <Bar dataKey="estimate" fill="#4a90e2">
                    {forestPlotData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.significant ? '#16a34a' : '#94a3b8'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '6px', 
                marginTop: '1rem',
                fontSize: '0.85rem',
                color: '#64748b'
              }}>
                <strong>Interpretation:</strong> Green bars = statistically significant (p &lt; 0.05). 
                Gray bars = not significant. Effects not crossing zero indicate a detectable causal impact.
              </div>
            </div>
          </div>
        </section>

        {/* Rating Analysis - Secondary Outcome */}
        {ratingATEResults && ratingByTreatmentData.length > 0 && (
          <section style={{ 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            padding: '2rem', 
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
              Treatment Effects on Model Ratings (Secondary Outcome)
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              In addition to selection behavior, participants rated each model on a 1-5 scale. 
              This secondary outcome helps understand whether treatments affect <strong>perceived quality</strong> 
              independently of selection. Analyzing ratings can reveal mechanisms: do people select models 
              because they rate them higher, or do brand/benchmark treatments directly affect both?
            </p>

            {/* Overall Rating Effects */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{ 
                backgroundColor: '#fef3c7', 
                padding: '1.5rem', 
                borderRadius: '8px',
                border: '1px solid #f59e0b'
              }}>
                <h3 style={{ margin: '0 0 0.75rem 0', color: '#92400e', fontSize: '1.1rem' }}>
                  Brand Effect on Ratings
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#78350f' }}>Real Brand Mean:</span>
                  <strong style={{ color: '#92400e' }}>{ratingATEResults.overallBrandEffect.treated_mean.toFixed(2)} / 5</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#78350f' }}>Anonymous Mean:</span>
                  <strong style={{ color: '#92400e' }}>{ratingATEResults.overallBrandEffect.control_mean.toFixed(2)} / 5</strong>
                </div>
                <div style={{ 
                  marginTop: '1rem', 
                  paddingTop: '0.75rem', 
                  borderTop: '1px solid #fcd34d',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ color: '#78350f' }}>Difference:</span>
                  <strong style={{ 
                    color: (ratingATEResults.overallBrandEffect.treated_mean - ratingATEResults.overallBrandEffect.control_mean) >= 0 ? '#16a34a' : '#dc2626'
                  }}>
                    {(ratingATEResults.overallBrandEffect.treated_mean - ratingATEResults.overallBrandEffect.control_mean) >= 0 ? '+' : ''}
                    {(ratingATEResults.overallBrandEffect.treated_mean - ratingATEResults.overallBrandEffect.control_mean).toFixed(3)}
                  </strong>
                </div>
                <div style={{ color: '#92400e', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  n = {ratingATEResults.overallBrandEffect.n_treated} treated, {ratingATEResults.overallBrandEffect.n_control} control
                </div>
              </div>

              <div style={{ 
                backgroundColor: '#dbeafe', 
                padding: '1.5rem', 
                borderRadius: '8px',
                border: '1px solid #3b82f6'
              }}>
                <h3 style={{ margin: '0 0 0.75rem 0', color: '#1e40af', fontSize: '1.1rem' }}>
                  Benchmark Effect on Ratings
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#1e3a8a' }}>With Benchmarks Mean:</span>
                  <strong style={{ color: '#1e40af' }}>{ratingATEResults.overallBenchEffect.treated_mean.toFixed(2)} / 5</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#1e3a8a' }}>No Benchmarks Mean:</span>
                  <strong style={{ color: '#1e40af' }}>{ratingATEResults.overallBenchEffect.control_mean.toFixed(2)} / 5</strong>
                </div>
                <div style={{ 
                  marginTop: '1rem', 
                  paddingTop: '0.75rem', 
                  borderTop: '1px solid #93c5fd',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ color: '#1e3a8a' }}>Difference:</span>
                  <strong style={{ 
                    color: (ratingATEResults.overallBenchEffect.treated_mean - ratingATEResults.overallBenchEffect.control_mean) >= 0 ? '#16a34a' : '#dc2626'
                  }}>
                    {(ratingATEResults.overallBenchEffect.treated_mean - ratingATEResults.overallBenchEffect.control_mean) >= 0 ? '+' : ''}
                    {(ratingATEResults.overallBenchEffect.treated_mean - ratingATEResults.overallBenchEffect.control_mean).toFixed(3)}
                  </strong>
                </div>
                <div style={{ color: '#1e40af', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  n = {ratingATEResults.overallBenchEffect.n_treated} treated, {ratingATEResults.overallBenchEffect.n_control} control
                </div>
              </div>
            </div>

            {/* Rating by Model and Treatment */}
            <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.1rem' }}>
              Average Rating by Model and Brand Treatment
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratingByTreatmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis domain={[0, 5]} tickFormatter={(v) => `${v}`} label={{ value: 'Rating (1-5)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(2)}`, '']} />
                <Legend />
                <Bar dataKey="Real Brand" fill="#f59e0b" />
                <Bar dataKey="Anonymous" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>

            {/* Interpretation */}
            <div style={{ 
              backgroundColor: '#f0fdf4', 
              padding: '1rem', 
              borderRadius: '6px', 
              marginTop: '1.5rem',
              border: '1px solid #86efac'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '0.95rem' }}>Causal Interpretation for Ratings</h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#15803d', fontSize: '0.9rem', lineHeight: 1.7 }}>
                <li><strong>If brand increases ratings:</strong> Brand recognition enhances perceived quality (halo effect)</li>
                <li><strong>If benchmarks increase ratings:</strong> Performance info helps users evaluate quality more accurately</li>
                <li><strong>If both increase ratings AND selection:</strong> Treatments affect perceived quality, which may mediate selection</li>
                <li><strong>If ratings unchanged but selection differs:</strong> Treatments affect choice through non-quality channels (e.g., trust, familiarity)</li>
              </ul>
            </div>
          </section>
        )}

        {/* Rating-Selection Relationship Analysis */}
        {ratingSelectionAnalysis && (
          <section style={{ 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            padding: '2rem', 
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
              Rating → Selection Relationship (Mechanism Analysis)
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              <strong>Key insight:</strong> Participants rate each model BEFORE making their final selection. 
              This allows us to analyze whether ratings predict selection, and what happens when ratings are tied.
              Understanding this relationship helps identify whether treatments affect selection through perceived quality (ratings) 
              or through other channels (brand trust, familiarity, etc.).
            </p>

            {/* Key Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{ 
                backgroundColor: '#f0fdf4', 
                padding: '1.5rem', 
                borderRadius: '8px',
                border: '1px solid #86efac',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#16a34a' }}>
                  {ratingSelectionAnalysis.highestRatedSelectionRate}%
                </div>
                <div style={{ color: '#166534', fontWeight: 500, marginTop: '0.5rem' }}>
                  Selected Highest-Rated Model
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {ratingSelectionAnalysis.selectedHighestRated} of {ratingSelectionAnalysis.totalSessions} sessions
                </div>
              </div>

              <div style={{ 
                backgroundColor: '#fef3c7', 
                padding: '1.5rem', 
                borderRadius: '8px',
                border: '1px solid #fcd34d',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#b45309' }}>
                  {ratingSelectionAnalysis.tiedSessions}
                </div>
                <div style={{ color: '#92400e', fontWeight: 500, marginTop: '0.5rem' }}>
                  Sessions with Rating Ties
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Multiple models had same highest rating
                </div>
              </div>

              <div style={{ 
                backgroundColor: '#fef2f2', 
                padding: '1.5rem', 
                borderRadius: '8px',
                border: '1px solid #fecaca',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#dc2626' }}>
                  {ratingSelectionAnalysis.selectedNotHighest}
                </div>
                <div style={{ color: '#991b1b', fontWeight: 500, marginTop: '0.5rem' }}>
                  Selected Non-Highest Rated
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Chose model rated lower than another
                </div>
              </div>
            </div>

            {/* Selection Rate by Rating */}
            <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.1rem' }}>
              Selection Probability by Rating Given
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
              How likely is a model to be selected based on the rating it received?
            </p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={ratingSelectionAnalysis.selectionRateByRating} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="rating"
                  label={{ value: 'Rating Given (1-5)', position: 'bottom', offset: 10 }}
                />
                <YAxis 
                  tickFormatter={(v) => `${v}%`} 
                  domain={[0, 100]}
                  label={{ value: 'Selection Rate (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'selectionRate') return [`${value.toFixed(1)}%`, 'Selection Rate'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Rating: ${label}/5`}
                />
                <Bar dataKey="selectionRate" fill="#4a90e2" name="Selection Rate">
                  {ratingSelectionAnalysis.selectionRateByRating.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.rating >= 4 ? '#16a34a' : entry.rating >= 3 ? '#f59e0b' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Tie-Breaker Analysis */}
            {Object.keys(ratingSelectionAnalysis.tieBreakers).length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.1rem' }}>
                  Tie-Breaker Analysis: When Ratings Are Equal
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  In {ratingSelectionAnalysis.tiedSessions} sessions, multiple models received the same highest rating. 
                  Which models were selected in these "tie" situations?
                </p>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                  gap: '1rem' 
                }}>
                  {Object.entries(ratingSelectionAnalysis.tieBreakers)
                    .sort(([,a], [,b]) => b - a)
                    .map(([model, count]) => (
                      <div 
                        key={model}
                        style={{ 
                          backgroundColor: '#f8fafc', 
                          padding: '1rem', 
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                          {model}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4a90e2' }}>
                          {count}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          times selected in ties
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Interpretation */}
            <div style={{ 
              backgroundColor: '#dbeafe', 
              padding: '1.5rem', 
              borderRadius: '8px', 
              marginTop: '2rem',
              border: '1px solid #93c5fd'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#1e40af', fontSize: '1rem' }}>
                What This Tells Us About Causality
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#1e3a8a', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <li>
                  <strong>If {ratingSelectionAnalysis.highestRatedSelectionRate}% select highest-rated:</strong> 
                  {ratingSelectionAnalysis.highestRatedSelectionRate > 80 
                    ? ' Ratings strongly predict selection - perceived quality is the primary driver' 
                    : ratingSelectionAnalysis.highestRatedSelectionRate > 50
                    ? ' Ratings partially predict selection - other factors also influence choice'
                    : ' Ratings weakly predict selection - other factors dominate decision-making'}
                </li>
                <li>
                  <strong>Tie-breakers reveal:</strong> When quality (ratings) is equal, which model wins? 
                  This isolates the effect of brand/benchmarks beyond perceived quality.
                </li>
                <li>
                  <strong>{ratingSelectionAnalysis.selectedNotHighest} non-highest selections:</strong> 
                  These cases show when other factors override perceived quality - 
                  potential evidence of brand effects or benchmark information influence.
                </li>
              </ul>
            </div>
          </section>
        )}

        {/* Presentation Order Analysis - Moved to end as validity check */}
        {presentationOrderAnalysis && presentationOrderAnalysis.length > 0 && (
          <section style={{ 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            padding: '2rem', 
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
              Model Presentation Order Analysis (Potential Bias Check)
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              <strong>Important:</strong> Models are always presented in the same order within each condition. 
              This could introduce <strong>primacy bias</strong> (favoring first-seen models) or <strong>recency bias</strong> (favoring last-seen models).
              Comparing average ratings and selection rates by position helps identify if order effects confound the treatment effects.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
              {/* Selection Rate by Position */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.1rem' }}>
                  Selection Rate by Presentation Position
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={presentationOrderAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="position" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(v) => `${v}%`} 
                      domain={[0, 'auto']}
                      label={{ value: 'Selection Rate (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'selectionRate') return [`${value.toFixed(1)}%`, 'Selection Rate'];
                        return [value, name];
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{ 
                              backgroundColor: 'white', 
                              padding: '0.75rem', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '0.9rem'
                            }}>
                              <p style={{ margin: 0, fontWeight: 600 }}>{data.position}: {data.model}</p>
                              <p style={{ margin: '0.25rem 0 0 0' }}>Selection Rate: {data.selectionRate.toFixed(1)}%</p>
                              <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>n = {data.count}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="selectionRate" name="Selection Rate">
                      {presentationOrderAnalysis.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={MODEL_COLORS[`model-${entry.positionNum}`] || '#94a3b8'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Average Rating by Position */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.1rem' }}>
                  Average Rating by Presentation Position
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={presentationOrderAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="position" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      domain={[0, 5]}
                      label={{ value: 'Avg Rating (1-5)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{ 
                              backgroundColor: 'white', 
                              padding: '0.75rem', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '0.9rem'
                            }}>
                              <p style={{ margin: 0, fontWeight: 600 }}>{data.position}: {data.model}</p>
                              <p style={{ margin: '0.25rem 0 0 0' }}>Avg Rating: {data.avgRating.toFixed(2)}/5</p>
                              <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>n = {data.count}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="avgRating" name="Avg Rating">
                      {presentationOrderAnalysis.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={MODEL_COLORS[`model-${entry.positionNum}`] || '#94a3b8'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary Table */}
            <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'left' }}>Position</th>
                    <th style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'left' }}>Model (Always Same)</th>
                    <th style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'center' }}>Avg Rating</th>
                    <th style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'center' }}>Selection Rate</th>
                    <th style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'center' }}>n</th>
                  </tr>
                </thead>
                <tbody>
                  {presentationOrderAnalysis.map((row, idx) => (
                    <tr key={row.position} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{row.position} (shown {row.positionNum === 1 ? 'first' : row.positionNum === 4 ? 'last' : `${row.positionNum}nd/3rd`})</td>
                      <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 500 }}>{row.model}</td>
                      <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>{row.avgRating.toFixed(2)}/5</td>
                      <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>{row.selectionRate.toFixed(1)}%</td>
                      <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ 
              backgroundColor: '#fef2f2', 
              padding: '1rem', 
              borderRadius: '6px', 
              marginTop: '1.5rem',
              border: '1px solid #fecaca'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '0.95rem' }}>Caution: Confounded Effects</h4>
              <p style={{ margin: 0, color: '#7f1d1d', fontSize: '0.9rem', lineHeight: 1.7 }}>
                <strong>Position and Model Identity are perfectly confounded.</strong> We cannot separate whether differences 
                are due to presentation order (primacy/recency) or intrinsic model quality. For example, if Position 1 
                (OpenAI GPT) has higher selection rates, it could be because:
              </p>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem', color: '#7f1d1d', fontSize: '0.9rem', lineHeight: 1.7 }}>
                <li>Primacy effect (first-seen model is favored)</li>
                <li>OpenAI GPT genuinely provides better responses</li>
                <li>Brand recognition (if in branded conditions)</li>
              </ul>
              <p style={{ margin: '0.75rem 0 0 0', color: '#7f1d1d', fontSize: '0.9rem' }}>
                <strong>Recommendation:</strong> Future studies should randomize model presentation order to disentangle these effects.
              </p>
            </div>
          </section>
        )}

        {/* Dynamic Results Summary */}
        <section style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #4a90e2'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
            Results Summary & Interpretation
          </h2>
          
          {/* Sample Size & Data Quality */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              1. Sample Size & Data Overview
            </h3>
            <p style={{ color: '#475569', lineHeight: 1.8, marginBottom: '1rem' }}>
              This experiment collected data from <strong>{dashboardData.summary.total_participants} participants</strong>, 
              resulting in <strong>{dashboardData.summary.total_selections} model selections</strong> across all conditions. 
              {parseInt(dashboardData.summary.total_participants) >= 30 
                ? ' The sample size meets the minimum threshold for statistical inference.'
                : ' Note: Sample size is relatively small; results should be interpreted with caution.'}
            </p>
            {ateResults?.cellProportions && (
              <p style={{ color: '#475569', lineHeight: 1.8 }}>
                Cell sizes: Condition A (n={ateResults.cellProportions.A.n}), 
                Condition B (n={ateResults.cellProportions.B.n}), 
                Condition C (n={ateResults.cellProportions.C.n}), 
                Control (n={ateResults.cellProportions.Control.n}).
                {Math.min(ateResults.cellProportions.A.n, ateResults.cellProportions.B.n, ateResults.cellProportions.C.n, ateResults.cellProportions.Control.n) < 10
                  ? ' Warning: Some cells have very small sample sizes, which limits statistical power.'
                  : ''}
              </p>
            )}
          </div>

          {/* Main Effects Summary */}
          {ateResults && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                2. Treatment Effects on Model Selection
              </h3>
              
              {/* Summarize effects for each model */}
              {models.map(modelId => {
                const brand = ateResults.brandATEs[modelId];
                const bench = ateResults.benchmarkATEs[modelId];
                const interaction = ateResults.interactionATEs[modelId];
                const modelName = getRealModelName(modelId);
                
                const brandSig = brand.p_value < 0.05;
                const benchSig = bench.p_value < 0.05;
                const interactionSig = interaction.p_value < 0.05;
                
                return (
                  <div key={modelId} style={{ 
                    backgroundColor: '#f8fafc', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    borderLeft: `4px solid ${MODEL_COLORS[modelId]}`
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1rem' }}>
                      {modelName}
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569', fontSize: '0.9rem', lineHeight: 1.8 }}>
                      <li>
                        <strong>Brand Effect:</strong> {brand.effect >= 0 ? '+' : ''}{(brand.effect * 100).toFixed(1)} pp 
                        {brandSig 
                          ? <span style={{ color: '#16a34a', fontWeight: 600 }}> (p = {brand.p_value < 0.001 ? '<0.001' : brand.p_value.toFixed(3)}, significant)</span>
                          : <span style={{ color: '#64748b' }}> (p = {brand.p_value.toFixed(3)}, not significant)</span>
                        }
                        {brandSig && (
                          <span> — Showing real brand name {brand.effect > 0 ? 'increases' : 'decreases'} selection by {Math.abs(brand.effect * 100).toFixed(1)} percentage points.</span>
                        )}
                      </li>
                      <li>
                        <strong>Benchmark Effect:</strong> {bench.effect >= 0 ? '+' : ''}{(bench.effect * 100).toFixed(1)} pp 
                        {benchSig 
                          ? <span style={{ color: '#16a34a', fontWeight: 600 }}> (p = {bench.p_value < 0.001 ? '<0.001' : bench.p_value.toFixed(3)}, significant)</span>
                          : <span style={{ color: '#64748b' }}> (p = {bench.p_value.toFixed(3)}, not significant)</span>
                        }
                        {benchSig && (
                          <span> — Showing benchmark scores {bench.effect > 0 ? 'increases' : 'decreases'} selection by {Math.abs(bench.effect * 100).toFixed(1)} percentage points.</span>
                        )}
                      </li>
                      <li>
                        <strong>Interaction:</strong> {interaction.effect >= 0 ? '+' : ''}{(interaction.effect * 100).toFixed(1)} pp 
                        {interactionSig 
                          ? <span style={{ color: '#b45309', fontWeight: 600 }}> (p = {interaction.p_value < 0.001 ? '<0.001' : interaction.p_value.toFixed(3)}, significant)</span>
                          : <span style={{ color: '#64748b' }}> (p = {interaction.p_value.toFixed(3)}, not significant)</span>
                        }
                        {interactionSig && (
                          <span> — The brand effect {interaction.effect > 0 ? 'is stronger' : 'is weaker'} when benchmarks are shown.</span>
                        )}
                      </li>
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rating-Selection Relationship Summary */}
          {ratingSelectionAnalysis && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                3. Rating → Selection Relationship
              </h3>
              <p style={{ color: '#475569', lineHeight: 1.8, marginBottom: '1rem' }}>
                <strong>{ratingSelectionAnalysis.highestRatedSelectionRate}%</strong> of participants selected the model they rated highest. 
                {ratingSelectionAnalysis.highestRatedSelectionRate > 80 
                  ? ' This strong correlation suggests that perceived quality (as measured by ratings) is the primary driver of selection decisions. Treatments that affect ratings likely affect selection through this quality perception mechanism.'
                  : ratingSelectionAnalysis.highestRatedSelectionRate > 50
                  ? ' This moderate correlation indicates that while ratings matter, other factors also influence selection. Some participants chose models they did not rate highest, suggesting brand or benchmark information may directly affect choice beyond quality perceptions.'
                  : ' This weak correlation suggests that factors other than perceived quality strongly influence selection decisions. Brand recognition or benchmark information may be driving choices independently of how participants rated model performance.'}
              </p>
              {ratingSelectionAnalysis.tiedSessions > 0 && (
                <p style={{ color: '#475569', lineHeight: 1.8, marginBottom: '1rem' }}>
                  In <strong>{ratingSelectionAnalysis.tiedSessions} sessions</strong> ({Math.round(ratingSelectionAnalysis.tiedSessions / ratingSelectionAnalysis.totalSessions * 100)}%), 
                  participants gave the same highest rating to multiple models, creating a "tie." 
                  {Object.keys(ratingSelectionAnalysis.tieBreakers).length > 0 && (
                    <span> Among tied models, <strong>{Object.entries(ratingSelectionAnalysis.tieBreakers).sort(([,a], [,b]) => b - a)[0][0]}</strong> was most frequently selected, 
                    suggesting this model may benefit from factors beyond perceived quality (e.g., brand recognition, presentation order).</span>
                  )}
                </p>
              )}
              {ratingSelectionAnalysis.selectedNotHighest > 0 && (
                <p style={{ color: '#475569', lineHeight: 1.8 }}>
                  Notably, <strong>{ratingSelectionAnalysis.selectedNotHighest} selections</strong> ({Math.round(ratingSelectionAnalysis.selectedNotHighest / ratingSelectionAnalysis.totalSessions * 100)}%) 
                  were for models that the participant did NOT rate highest. These cases represent clear evidence that factors other than 
                  perceived quality influenced the final decision.
                </p>
              )}
            </div>
          )}

          {/* Rating Treatment Effects Summary */}
          {ratingATEResults && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                4. Treatment Effects on Ratings (Mechanism Evidence)
              </h3>
              <p style={{ color: '#475569', lineHeight: 1.8, marginBottom: '1rem' }}>
                <strong>Brand effect on ratings:</strong> Models received an average rating of {ratingATEResults.overallBrandEffect.treated_mean.toFixed(2)}/5 
                when shown with real brand names vs. {ratingATEResults.overallBrandEffect.control_mean.toFixed(2)}/5 when anonymous 
                (difference: {(ratingATEResults.overallBrandEffect.treated_mean - ratingATEResults.overallBrandEffect.control_mean) >= 0 ? '+' : ''}
                {(ratingATEResults.overallBrandEffect.treated_mean - ratingATEResults.overallBrandEffect.control_mean).toFixed(3)}).
                {Math.abs(ratingATEResults.overallBrandEffect.treated_mean - ratingATEResults.overallBrandEffect.control_mean) > 0.2
                  ? ' This suggests brand visibility affects perceived quality, potentially creating a "halo effect."'
                  : ' The small difference suggests brand visibility has minimal impact on perceived quality.'}
              </p>
              <p style={{ color: '#475569', lineHeight: 1.8 }}>
                <strong>Benchmark effect on ratings:</strong> Models received an average rating of {ratingATEResults.overallBenchEffect.treated_mean.toFixed(2)}/5 
                when shown with benchmark scores vs. {ratingATEResults.overallBenchEffect.control_mean.toFixed(2)}/5 without 
                (difference: {(ratingATEResults.overallBenchEffect.treated_mean - ratingATEResults.overallBenchEffect.control_mean) >= 0 ? '+' : ''}
                {(ratingATEResults.overallBenchEffect.treated_mean - ratingATEResults.overallBenchEffect.control_mean).toFixed(3)}).
                {Math.abs(ratingATEResults.overallBenchEffect.treated_mean - ratingATEResults.overallBenchEffect.control_mean) > 0.2
                  ? ' Showing performance metrics changes how participants evaluate model quality.'
                  : ' Benchmark information has minimal impact on quality ratings.'}
              </p>
            </div>
          )}

          {/* Overall Conclusions */}
          <div style={{ 
            backgroundColor: '#f0fdf4', 
            padding: '1.5rem', 
            borderRadius: '8px',
            border: '2px solid #22c55e'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#166534', fontSize: '1.1rem' }}>
              Key Conclusions
            </h3>
            <div style={{ color: '#15803d', lineHeight: 1.8 }}>
              {ateResults && (() => {
                // Determine which models have significant effects
                const sigBrandModels = models.filter(m => ateResults.brandATEs[m].p_value < 0.05);
                const sigBenchModels = models.filter(m => ateResults.benchmarkATEs[m].p_value < 0.05);
                const sigInteractionModels = models.filter(m => ateResults.interactionATEs[m].p_value < 0.05);
                
                return (
                  <ol style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    <li style={{ marginBottom: '0.75rem' }}>
                      <strong>Brand Effects: </strong>
                      {sigBrandModels.length === 0 
                        ? 'No statistically significant brand effects were detected for any model. Brand visibility does not appear to causally influence model selection in this sample.'
                        : `Significant brand effects were found for ${sigBrandModels.map(m => getRealModelName(m)).join(', ')}. ${sigBrandModels.some(m => ateResults.brandATEs[m].effect > 0) ? 'Showing real brand names increases selection probability for some models, suggesting brand recognition matters.' : 'Interestingly, brand visibility decreases selection for some models, possibly indicating brand aversion.'}`
                      }
                    </li>
                    <li style={{ marginBottom: '0.75rem' }}>
                      <strong>Benchmark Effects: </strong>
                      {sigBenchModels.length === 0 
                        ? 'No statistically significant benchmark effects were detected. Performance information does not appear to causally influence selection decisions.'
                        : `Significant benchmark effects were found for ${sigBenchModels.map(m => getRealModelName(m)).join(', ')}. ${sigBenchModels.some(m => ateResults.benchmarkATEs[m].effect > 0) ? 'Showing performance metrics helps high-performing models get selected more often.' : 'Showing benchmarks actually decreases selection for some models, perhaps due to disappointment when scores are lower than expected.'}`
                      }
                    </li>
                    <li style={{ marginBottom: '0.75rem' }}>
                      <strong>Interaction Effects: </strong>
                      {sigInteractionModels.length === 0 
                        ? 'No significant interactions detected. Brand and benchmark effects operate independently.'
                        : `Significant interactions found for ${sigInteractionModels.map(m => getRealModelName(m)).join(', ')}. The effect of brand depends on whether benchmarks are shown.`
                      }
                    </li>
                    <li>
                      <strong>Overall: </strong>
                      {sigBrandModels.length === 0 && sigBenchModels.length === 0
                        ? 'Neither brand visibility nor benchmark information significantly influenced model selection in this experiment. Selection appears driven primarily by actual model performance or other factors not manipulated here.'
                        : sigBrandModels.length > sigBenchModels.length
                        ? 'Brand recognition appears to be a stronger driver of model selection than performance information. People may rely more on brand familiarity than objective metrics when choosing AI models.'
                        : sigBenchModels.length > sigBrandModels.length
                        ? 'Performance information appears to be a stronger driver of model selection than brand recognition. People seem to value objective metrics when making AI model choices.'
                        : 'Both brand and benchmark information influence model selection, suggesting people use a combination of familiarity and performance metrics when choosing AI models.'
                      }
                    </li>
                  </ol>
                );
              })()}
            </div>
          </div>

          {/* Limitations */}
          <div style={{ 
            backgroundColor: '#fef3c7', 
            padding: '1.5rem', 
            borderRadius: '8px',
            marginTop: '1.5rem',
            border: '1px solid #fcd34d'
          }}>
            <h3 style={{ margin: '0 0 0.75rem 0', color: '#92400e', fontSize: '1rem' }}>
              Important Limitations
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#78350f', fontSize: '0.9rem', lineHeight: 1.8 }}>
              <li>Fixed presentation order (models and conditions) may introduce order effects that confound treatment estimates.</li>
              <li>Within-subjects design means potential carryover effects between conditions.</li>
              <li>Different tasks across conditions introduce heterogeneity that may affect comparisons.</li>
              <li>Sample size may limit statistical power to detect small but meaningful effects.</li>
              <li>Results may not generalize to other AI models, tasks, or populations.</li>
            </ul>
          </div>
        </section>

        {/* Power Analysis Reference */}
        <section style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#64748b' }}>
            Power Analysis Reference
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.7, marginBottom: '1rem' }}>
            Based on the pre-experiment power analysis, this study was designed to detect:
          </p>
          <ul style={{ color: '#64748b', paddingLeft: '1.5rem', lineHeight: 1.8 }}>
            <li><strong>Brand effect:</strong> ~30% increase in probability of choosing a specific model</li>
            <li><strong>Benchmark effect:</strong> ~20% increase in probability of choosing based on performance</li>
            <li><strong>Baseline:</strong> 33% probability (random choice among models)</li>
          </ul>
          <p style={{ color: '#64748b', lineHeight: 1.7, marginTop: '1rem', fontStyle: 'italic' }}>
            Statistical significance threshold: α = 0.05 (two-tailed tests)
          </p>
        </section>

      </div>
    </main>
  );
}
