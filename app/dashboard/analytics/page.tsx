'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
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
  taskDistribution: Array<{
    task_id: string;
    count: string;
  }>;
  selectionsByCondition: Array<{
    condition: string;
    selected_model: string;
    count: string;
  }>;
  modelRatings: Array<{
    model_id: string;
    total_ratings: string;
    avg_rating: string;
    min_rating: string;
    max_rating: string;
  }>;
  conditionRatings: Array<{
    condition: string;
    total_ratings: string;
    avg_rating: string;
    min_rating: string;
    max_rating: string;
  }>;
  experimentsOverTime: Array<{
    date: string;
    count: string;
  }>;
  selectionsOverTime: Array<{
    date: string;
    model_id: string;
    count: string;
  }>;
  ratingsOverTime: Array<{
    date: string;
    model_id: string;
    avg_rating: string;
    count: string;
  }>;
  conditionSelectionsOverTime: Array<{
    date: string;
    condition: string;
    count: string;
  }>;
}

const COLORS = ['#4a90e2', '#50c878', '#ff6b6b', '#ffa726', '#ab47bc', '#26c6da'];

const getConditionName = (condition: string) => {
  switch (condition) {
    case 'A': return 'Real Brand + Benchmarks';
    case 'B': return 'Real Brand, No Benchmarks';
    case 'C': return 'Anonymous Brand + Benchmarks';
    case 'Control': return 'Anonymous Brand, No Benchmarks';
    default: return condition;
  }
};

const getRealModelName = (modelId: string | undefined): string => {
  if (!modelId) return 'Unknown';
  const model = MODELS.find(m => m.id === modelId);
  return model ? model.realBrand : modelId;
};

export default function Analytics() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 503) {
          throw new Error('Database not configured. Please check your DATABASE_URL in .env.local and ensure it contains real database credentials (not placeholders).');
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

  if (loading) {
    return (
      <main>
        <div className="container">
          <h1>Analytics Dashboard</h1>
          <p>Loading analytics data...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <div className="container">
          <h1>Analytics Dashboard</h1>
          <div className="info-box" style={{ backgroundColor: '#fee', borderLeftColor: '#e74c3c' }}>
            <p><strong>Error:</strong> {error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!dashboardData) {
    return (
      <main>
        <div className="container">
          <h1>Analytics Dashboard</h1>
          <p>No data available.</p>
        </div>
      </main>
    );
  }

  // Prepare data for charts
  const conditionChartData = dashboardData.conditionDistribution.map(item => ({
    name: `${item.condition} - ${getConditionName(item.condition)}`,
    condition: item.condition,
    selections: parseInt(item.count),
    participants: parseInt(item.participant_count),
  }));

  const modelChartData = dashboardData.modelDistribution.map(item => ({
    name: getRealModelName(item.selected_model),
    model: item.selected_model,
    selections: parseInt(item.count),
    participants: parseInt(item.participant_count),
  }));

  const taskChartData = dashboardData.taskDistribution.map(item => ({
    name: item.task_id,
    count: parseInt(item.count),
  }));

  const modelRatingsData = dashboardData.modelRatings.map(item => ({
    name: getRealModelName(item.model_id),
    model: item.model_id,
    avgRating: parseFloat(item.avg_rating),
    totalRatings: parseInt(item.total_ratings),
    minRating: parseInt(item.min_rating),
    maxRating: parseInt(item.max_rating),
  }));

  const conditionRatingsData = dashboardData.conditionRatings.map(item => ({
    name: `${item.condition} - ${getConditionName(item.condition)}`,
    condition: item.condition,
    avgRating: parseFloat(item.avg_rating),
    totalRatings: parseInt(item.total_ratings),
    minRating: parseInt(item.min_rating),
    maxRating: parseInt(item.max_rating),
  }));

  // Prepare selections by condition data for grouped bar chart
  const conditions = ['A', 'B', 'C', 'Control'];
  const models = Array.from(new Set(dashboardData.selectionsByCondition.map(s => s.selected_model)));
  const selectionsByConditionData = conditions.map(condition => {
    const data: any = { condition: `${condition} - ${getConditionName(condition)}` };
    models.forEach(model => {
      const selection = dashboardData.selectionsByCondition.find(
        s => s.condition === condition && s.selected_model === model
      );
      data[getRealModelName(model)] = selection ? parseInt(selection.count) : 0;
    });
    return data;
  });

  // Prepare experiments over time data
  const experimentsOverTimeData = dashboardData.experimentsOverTime.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: parseInt(item.count),
  }));

  // Prepare model selections over time data
  const allModels = Array.from(new Set(dashboardData.selectionsOverTime.map(s => s.model_id)));
  const dates = Array.from(new Set(dashboardData.selectionsOverTime.map(s => s.date))).sort();
  const selectionsOverTimeData = dates.map(date => {
    const data: any = { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
    allModels.forEach(model => {
      const selection = dashboardData.selectionsOverTime.find(
        s => s.date === date && s.model_id === model
      );
      data[getRealModelName(model)] = selection ? parseInt(selection.count) : 0;
    });
    return data;
  });

  // Prepare ratings over time data
  const ratingDates = Array.from(new Set(dashboardData.ratingsOverTime.map(r => r.date))).sort();
  const ratingsOverTimeData = ratingDates.map(date => {
    const data: any = { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
    allModels.forEach(model => {
      const rating = dashboardData.ratingsOverTime.find(
        r => r.date === date && r.model_id === model
      );
      data[getRealModelName(model)] = rating ? parseFloat(rating.avg_rating) : null;
    });
    return data;
  });

  // Prepare condition selections over time data
  const conditionDates = Array.from(new Set(dashboardData.conditionSelectionsOverTime.map(c => c.date))).sort();
  const conditionSelectionsOverTimeData = conditionDates.map(date => {
    const data: any = { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
    conditions.forEach(condition => {
      const selection = dashboardData.conditionSelectionsOverTime.find(
        c => c.date === date && c.condition === condition
      );
      data[getConditionName(condition)] = selection ? parseInt(selection.count) : 0;
    });
    return data;
  });

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0 }}>Analytics Dashboard</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link href="/dashboard" style={{ 
              color: '#4a90e2', 
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}>
              ← Back to Dashboard
            </Link>
            <Link href="/" style={{ 
              color: '#4a90e2', 
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}>
              ← Back to Experiment
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
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Condition Distribution - Pie Chart */}
        <div className="dashboard-section">
          <h2>Condition Distribution</h2>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={conditionChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="selections"
              >
                {conditionChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Condition Distribution - Bar Chart */}
        <div className="dashboard-section">
          <h2>Condition Distribution (Bar Chart)</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={conditionChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="condition" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="selections" fill="#4a90e2" name="Selections" />
              <Bar dataKey="participants" fill="#50c878" name="Participants" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Selection Distribution */}
        <div className="dashboard-section">
          <h2>Model Selection Distribution</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={modelChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="selections" fill="#4a90e2" name="Total Selections" />
              <Bar dataKey="participants" fill="#50c878" name="Unique Participants" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Ratings */}
        {modelRatingsData.length > 0 && (
          <div className="dashboard-section">
            <h2>Average Model Ratings</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={modelRatingsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgRating" fill="#ffa726" name="Average Rating" />
                <Bar dataKey="minRating" fill="#ff6b6b" name="Min Rating" />
                <Bar dataKey="maxRating" fill="#50c878" name="Max Rating" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Condition Ratings */}
        {conditionRatingsData.length > 0 && (
          <div className="dashboard-section">
            <h2>Average Ratings by Condition</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={conditionRatingsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="condition" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgRating" fill="#ab47bc" name="Average Rating" />
                <Bar dataKey="minRating" fill="#ff6b6b" name="Min Rating" />
                <Bar dataKey="maxRating" fill="#50c878" name="Max Rating" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Task Distribution */}
        <div className="dashboard-section">
          <h2>Task Distribution</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={taskChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#26c6da" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Selections by Condition - Grouped Bar Chart */}
        {selectionsByConditionData.length > 0 && models.length > 0 && (
          <div className="dashboard-section">
            <h2>Model Selections by Condition</h2>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={selectionsByConditionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="condition" angle={-45} textAnchor="end" height={120} />
                <YAxis />
                <Tooltip />
                <Legend />
                {models.map((model, index) => (
                  <Bar
                    key={model}
                    dataKey={getRealModelName(model)}
                    fill={COLORS[index % COLORS.length]}
                    name={getRealModelName(model)}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Experiments Over Time - Line Chart */}
        {experimentsOverTimeData.length > 0 && (
          <div className="dashboard-section">
            <h2>Experiments Over Time</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={experimentsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#4a90e2" strokeWidth={2} name="Experiments" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Model Selections Over Time - Line Chart */}
        {selectionsOverTimeData.length > 0 && allModels.length > 0 && (
          <div className="dashboard-section">
            <h2>Model Selections Over Time</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={selectionsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {allModels.map((model, index) => (
                  <Line
                    key={model}
                    type="monotone"
                    dataKey={getRealModelName(model)}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    name={getRealModelName(model)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Ratings Over Time - Line Chart */}
        {ratingsOverTimeData.length > 0 && allModels.length > 0 && (
          <div className="dashboard-section">
            <h2>Average Model Ratings Over Time</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={ratingsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                {allModels.map((model, index) => (
                  <Line
                    key={model}
                    type="monotone"
                    dataKey={getRealModelName(model)}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    name={getRealModelName(model)}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Condition Selections Over Time - Line Chart */}
        {conditionSelectionsOverTimeData.length > 0 && (
          <div className="dashboard-section">
            <h2>Condition Selections Over Time</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={conditionSelectionsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {conditions.map((condition, index) => (
                  <Line
                    key={condition}
                    type="monotone"
                    dataKey={getConditionName(condition)}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    name={getConditionName(condition)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </main>
  );
}

