'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ExportData() {
  const [data, setData] = useState<any[]>([]);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('experiment-results');
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  const handleExport = () => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    // Flatten the data: one row per condition selection
    const flattenedData: any[] = [];
    data.forEach((participant) => {
      participant.conditionSelections?.forEach((selection: any) => {
        flattenedData.push({
          participantId: participant.participantId,
          taskId: participant.taskId,
          condition: selection.condition,
          selectedModel: selection.selectedModel,
          selectionTimestamp: selection.timestamp,
          startTime: participant.startTime,
          endTime: participant.endTime,
          totalTimeSpent: participant.totalTimeSpent,
        });
      });
    });

    const csv = [
      ['Participant ID', 'Task ID', 'Condition', 'Selected Model', 'Selection Timestamp', 'Start Time', 'End Time', 'Total Time Spent (seconds)'],
      ...flattenedData.map((row) => [
        row.participantId,
        row.taskId || 'N/A',
        row.condition,
        row.selectedModel,
        row.selectionTimestamp,
        row.startTime,
        row.endTime,
        row.totalTimeSpent || 'N/A',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setExported(true);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all experiment data?')) {
      localStorage.removeItem('experiment-results');
      setData([]);
      setExported(false);
    }
  };

  return (
    <main>
      <div className="container">
        <h1>Experiment Data Export</h1>
        <p>Total participants: <strong>{data.length}</strong></p>

        {data.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2>Data Summary</h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              Showing {data.reduce((sum, p) => sum + (p.conditionSelections?.length || 0), 0)} total condition selections from {data.length} participants.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Participant ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Task</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Condition</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Selected Model</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Total Time</th>
                </tr>
              </thead>
              <tbody>
                {data.map((participant, idx) => {
                  const selections = participant.conditionSelections || [];
                  return selections.map((selection: any, selIdx: number) => (
                    <tr key={`${idx}-${selIdx}`} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      {selIdx === 0 && (
                        <>
                          <td style={{ padding: '0.75rem' }} rowSpan={selections.length}>
                            {participant.participantId}
                          </td>
                          <td style={{ padding: '0.75rem' }} rowSpan={selections.length}>
                            {participant.taskId || 'N/A'}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '0.75rem' }}>{selection.condition}</td>
                      <td style={{ padding: '0.75rem' }}>{selection.selectedModel}</td>
                      {selIdx === 0 && (
                        <td style={{ padding: '0.75rem' }} rowSpan={selections.length}>
                          {participant.totalTimeSpent || 'N/A'}s
                        </td>
                      )}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="button-container" style={{ marginTop: '2rem', gap: '1rem' }}>
          <button className="button" onClick={handleExport} disabled={data.length === 0}>
            Export as CSV
          </button>
          <button
            className="button"
            onClick={handleClear}
            disabled={data.length === 0}
            style={{ backgroundColor: '#e74c3c' }}
          >
            Clear Data
          </button>
        </div>

        {exported && (
          <div className="info-box" style={{ marginTop: '1rem' }}>
            <p>CSV file downloaded successfully!</p>
          </div>
        )}

        <div style={{ marginTop: '2rem' }}>
          <Link href="/" style={{ color: '#4a90e2', textDecoration: 'none' }}>
            ← Back to Experiment
          </Link>
        </div>
      </div>
    </main>
  );
}
