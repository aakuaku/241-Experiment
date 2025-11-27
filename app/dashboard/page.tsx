'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
}

interface Experiment {
  id: number;
  participant_id: string;
  task_id: string;
  start_time: string;
  end_time: string;
  total_time_spent: number;
  created_at: string;
  condition_selections: Array<{
    condition: string;
    selectedModel: string;
    realModelId?: string;
    timestamp: string;
  }>;
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
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

  const fetchExperiments = async () => {
    try {
      const response = await fetch('/api/experiments');
      if (!response.ok) throw new Error('Failed to fetch experiments');
      const data = await response.json();
      setExperiments(data);
    } catch (err: any) {
      console.error('Error fetching experiments:', err);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('admin-authenticated');
    setIsAuthenticated(false);
    setDashboardData(null);
    setExperiments([]);
    // Redirect to login page
    window.location.href = '/login';
  };

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem('admin-authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      fetchDashboardData();
      fetchExperiments();
    } else {
      // Redirect to login page if not authenticated
      window.location.href = '/login';
    }
  }, []);

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

  const getModelDisplayName = (modelId: string | undefined, displayName: string): string => {
    const realName = getRealModelName(modelId);
    if (realName === displayName) {
      return realName;
    }
    return `${displayName} (${realName})`;
  };

  const formatTimeToHours = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0h';
    const hours = seconds / 3600;
    if (hours < 1) {
      const minutes = Math.round(seconds / 60);
      return `${minutes}m`;
    }
    // Show hours with 2 decimal places if less than 1 hour, otherwise round to 1 decimal
    if (hours < 10) {
      return `${hours.toFixed(2)}h`;
    }
    return `${hours.toFixed(1)}h`;
  };


  if (loading) {
    return (
      <main>
        <div className="container">
          <h1>Admin Dashboard</h1>
          
          {/* Summary Statistics Skeleton */}
          <div className="dashboard-section">
            <div className="skeleton-h2"></div>
            <div className="stats-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-stat-value"></div>
                  <div className="skeleton-stat-label"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Condition Distribution Skeleton */}
          <div className="dashboard-section">
            <div className="skeleton-h2"></div>
            <div style={{ marginTop: '1rem' }}>
              <div className="skeleton-table-header" style={{ marginBottom: '1rem', height: '2.5rem' }}></div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-table-row"></div>
              ))}
            </div>
          </div>

          {/* Model Selection Distribution Skeleton */}
          <div className="dashboard-section">
            <div className="skeleton-h2"></div>
            <div style={{ marginTop: '1rem' }}>
              <div className="skeleton-table-header" style={{ marginBottom: '1rem', height: '2.5rem' }}></div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-table-row"></div>
              ))}
            </div>
          </div>

          {/* Selections by Condition Skeleton */}
          <div className="dashboard-section">
            <div className="skeleton-h2"></div>
            <div style={{ marginTop: '1rem' }}>
              <div className="skeleton-table-header" style={{ marginBottom: '1rem', height: '2.5rem' }}></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-table-row"></div>
              ))}
            </div>
          </div>

          {/* Task Distribution Skeleton */}
          <div className="dashboard-section">
            <div className="skeleton-h2"></div>
            <div style={{ marginTop: '1rem' }}>
              <div className="skeleton-table-header" style={{ marginBottom: '1rem', height: '2.5rem' }}></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-table-row"></div>
              ))}
            </div>
          </div>

          {/* All Experiments Skeleton */}
          <div className="dashboard-section">
            <div className="skeleton-h2"></div>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <div className="skeleton-table-header" style={{ marginBottom: '1rem', height: '2.5rem' }}></div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton-table-row"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <div className="container">
          <h1>Admin Dashboard</h1>
          <div className="info-box" style={{ backgroundColor: '#fee', borderLeftColor: '#e74c3c' }}>
            <p><strong>Error:</strong> {error}</p>
            <p style={{ marginTop: '0.75rem' }}>To fix this issue:</p>
            <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Make sure PostgreSQL is running on your system</li>
              <li>Update your <code>.env.local</code> file with your actual database credentials</li>
              <li>The DATABASE_URL should be in format: <code>postgresql://your_user:your_password@localhost:5432/experiment_db</code></li>
              <li>Run the schema SQL file to initialize the database tables</li>
            </ol>
            <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#666' }}>
              <strong>Note:</strong> The experiment will still work without a database - data will be saved to localStorage as a fallback.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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

        {dashboardData && (
          <>
            {/* Summary Statistics */}
            <div className="dashboard-section">
              <h2>Summary Statistics</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{dashboardData.summary.total_participants}</div>
                  <div className="stat-label">Total Participants</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{dashboardData.summary.total_selections}</div>
                  <div className="stat-label">Total Selections</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{dashboardData.summary.unique_tasks}</div>
                  <div className="stat-label">Unique Tasks</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {formatTimeToHours(Math.round(parseFloat(dashboardData.summary.avg_time_spent || '0')))}
                  </div>
                  <div className="stat-label">Avg Time Spent</div>
                </div>
              </div>
            </div>

            {/* Condition Distribution */}
            <div className="dashboard-section">
              <h2>Condition Distribution</h2>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Condition</th>
                    <th>Description</th>
                    <th>Selections</th>
                    <th>Participants</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.conditionDistribution.map((item) => (
                    <tr key={item.condition}>
                      <td>{item.condition}</td>
                      <td>{getConditionName(item.condition)}</td>
                      <td>{item.count}</td>
                      <td>{item.participant_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Model Selection Distribution */}
            <div className="dashboard-section">
              <h2>Model Selection Distribution</h2>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Total Selections</th>
                    <th>Unique Participants</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.modelDistribution.map((item) => (
                    <tr key={item.selected_model}>
                      <td>{getRealModelName(item.selected_model)}</td>
                      <td>{item.count}</td>
                      <td>{item.participant_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selections by Condition */}
            <div className="dashboard-section">
              <h2>Model Selections by Condition</h2>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Condition</th>
                    <th>Model</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.selectionsByCondition.map((item, idx) => (
                    <tr key={`${item.condition}-${item.selected_model}-${idx}`}>
                      <td>{item.condition} - {getConditionName(item.condition)}</td>
                      <td>{getRealModelName(item.selected_model)}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Task Distribution */}
            <div className="dashboard-section">
              <h2>Task Distribution</h2>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.taskDistribution.map((item) => (
                    <tr key={item.task_id}>
                      <td>{item.task_id}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Model Ratings */}
            {dashboardData.modelRatings && dashboardData.modelRatings.length > 0 && (
              <div className="dashboard-section">
                <h2>Model Ratings</h2>
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Average Rating</th>
                      <th>Total Ratings</th>
                      <th>Min Rating</th>
                      <th>Max Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.modelRatings.map((item) => (
                      <tr key={item.model_id}>
                        <td>{getRealModelName(item.model_id)}</td>
                        <td>
                          <strong>{parseFloat(item.avg_rating).toFixed(2)}</strong>
                          <span style={{ color: '#666', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                            ({'★'.repeat(Math.round(parseFloat(item.avg_rating)))})
                          </span>
                        </td>
                        <td>{item.total_ratings}</td>
                        <td>{item.min_rating}</td>
                        <td>{item.max_rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Condition Ratings */}
            {dashboardData.conditionRatings && dashboardData.conditionRatings.length > 0 && (
              <div className="dashboard-section">
                <h2>Ratings by Condition</h2>
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Condition</th>
                      <th>Description</th>
                      <th>Average Rating</th>
                      <th>Total Ratings</th>
                      <th>Min Rating</th>
                      <th>Max Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.conditionRatings.map((item) => (
                      <tr key={item.condition}>
                        <td>{item.condition}</td>
                        <td>{getConditionName(item.condition)}</td>
                        <td>
                          <strong>{parseFloat(item.avg_rating).toFixed(2)}</strong>
                          <span style={{ color: '#666', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                            ({'★'.repeat(Math.round(parseFloat(item.avg_rating)))})
                          </span>
                        </td>
                        <td>{item.total_ratings}</td>
                        <td>{item.min_rating}</td>
                        <td>{item.max_rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Individual Experiments */}
        <div className="dashboard-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>All Experiments</h2>
            <Link href="/dashboard/analytics" style={{ 
              color: '#4a90e2', 
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '0.5rem 1rem',
              background: '#f0f7ff',
              border: '1px solid #4a90e2',
              borderRadius: '6px',
            }}>
              View Analytics
            </Link>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Participant ID</th>
                  <th>Task</th>
                  <th>Conditions</th>
                  <th>Time Spent</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {experiments.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.participant_id}</td>
                    <td>{exp.task_id}</td>
                    <td>
                      {exp.condition_selections?.map((sel, idx) => (
                        <span key={idx} style={{ display: 'block' }}>
                          {sel.condition}: {getModelDisplayName(sel.realModelId, sel.selectedModel)}
                        </span>
                      ))}
                    </td>
                    <td>{formatTimeToHours(exp.total_time_spent || 0)}</td>
                    <td>{new Date(exp.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

