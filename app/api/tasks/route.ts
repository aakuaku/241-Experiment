import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { TASKS } from '@/lib/experiment';

// API endpoint to get a balanced task assignment
// This ensures different participants get different tasks by prioritizing
// least-used tasks for balanced distribution
export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    if (!pool) {
      // Database not configured, fall back to random selection
      const randomTask = TASKS[Math.floor(Math.random() * TASKS.length)];
      return NextResponse.json({ task: randomTask }, { status: 200 });
    }
    
    // Query to find task distribution
    const taskDistributionQuery = await pool.query(`
      SELECT 
        task_id,
        COUNT(*) as usage_count
      FROM experiments
      GROUP BY task_id
      ORDER BY usage_count ASC, task_id ASC
    `);

    const allTaskIds = TASKS.map(t => t.id);
    const usedTaskIds = taskDistributionQuery.rows.map((row: any) => row.task_id);
    
    // Find tasks that haven't been used yet
    const unusedTasks = allTaskIds.filter(id => !usedTaskIds.includes(id));
    
    let selectedTaskId: string;
    
    if (unusedTasks.length > 0) {
      // If there are unused tasks, randomly select from those
      selectedTaskId = unusedTasks[Math.floor(Math.random() * unusedTasks.length)];
    } else {
      // If all tasks have been used, find the least-used one(s)
      const minUsage = taskDistributionQuery.rows.length > 0 
        ? parseInt(taskDistributionQuery.rows[0].usage_count) 
        : 0;
      const leastUsedTasks = taskDistributionQuery.rows
        .filter((row: any) => parseInt(row.usage_count) === minUsage)
        .map((row: any) => row.task_id);
      
      // If no data exists, select randomly from all tasks
      if (leastUsedTasks.length === 0) {
        selectedTaskId = allTaskIds[Math.floor(Math.random() * allTaskIds.length)];
      } else {
        // Randomly select from least-used tasks
        selectedTaskId = leastUsedTasks[Math.floor(Math.random() * leastUsedTasks.length)];
      }
    }
    
    const selectedTask = TASKS.find(t => t.id === selectedTaskId);
    
    if (!selectedTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ task: selectedTask }, { status: 200 });
  } catch (error: any) {
    console.error('Error selecting balanced task:', error);
    // Fallback to random selection
    const randomTask = TASKS[Math.floor(Math.random() * TASKS.length)];
    return NextResponse.json({ task: randomTask }, { status: 200 });
  }
}

