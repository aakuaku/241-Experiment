import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { TASKS, getTasksByThemes } from '@/lib/experiment';

// Helper function to select a balanced task from available tasks
async function selectBalancedTaskFromPool(availableTasks: typeof TASKS) {
  // Check if database is available
  if (!pool) {
    // Database not configured, fall back to random selection
    return availableTasks[Math.floor(Math.random() * availableTasks.length)];
  }
  
  try {
    // Query to find task distribution
    const taskDistributionQuery = await pool.query(`
      SELECT 
        task_id,
        COUNT(*) as usage_count
      FROM experiments
      GROUP BY task_id
      ORDER BY usage_count ASC, task_id ASC
    `);

    const availableTaskIds = availableTasks.map(t => t.id);
    const usedTaskIds = taskDistributionQuery.rows.map((row: any) => row.task_id);
    
    // Find tasks that haven't been used yet (from available tasks)
    const unusedTasks = availableTaskIds.filter(id => !usedTaskIds.includes(id));
    
    let selectedTaskId: string;
    
    if (unusedTasks.length > 0) {
      // If there are unused tasks, randomly select from those
      selectedTaskId = unusedTasks[Math.floor(Math.random() * unusedTasks.length)];
    } else {
      // If all tasks have been used, find the least-used one(s) from available tasks
      const availableTaskUsage = taskDistributionQuery.rows
        .filter((row: any) => availableTaskIds.includes(row.task_id))
        .map((row: any) => ({
          taskId: row.task_id,
          usageCount: parseInt(row.usage_count)
        }));
      
      if (availableTaskUsage.length > 0) {
        const minUsage = Math.min(...availableTaskUsage.map(t => t.usageCount));
        const leastUsedTasks = availableTaskUsage
          .filter(t => t.usageCount === minUsage)
          .map(t => t.taskId);
        selectedTaskId = leastUsedTasks[Math.floor(Math.random() * leastUsedTasks.length)];
      } else {
        // If no data exists, select randomly from available tasks
        selectedTaskId = availableTaskIds[Math.floor(Math.random() * availableTaskIds.length)];
      }
    }
    
    const selectedTask = availableTasks.find(t => t.id === selectedTaskId);
    return selectedTask || availableTasks[Math.floor(Math.random() * availableTasks.length)];
  } catch (error: any) {
    console.error('Error selecting balanced task:', error);
    // Fallback to random selection
    return availableTasks[Math.floor(Math.random() * availableTasks.length)];
  }
}

// API endpoint to get a balanced task assignment
// This ensures different participants get different tasks by prioritizing
// least-used tasks for balanced distribution
export async function GET(request: NextRequest) {
  try {
    const selectedTask = await selectBalancedTaskFromPool(TASKS);
    return NextResponse.json({ task: selectedTask }, { status: 200 });
  } catch (error: any) {
    console.error('Error selecting balanced task:', error);
    // Fallback to random selection
    const randomTask = TASKS[Math.floor(Math.random() * TASKS.length)];
    return NextResponse.json({ task: randomTask }, { status: 200 });
  }
}

// Helper function to select 4 different tasks for 4 conditions
async function selectTasksForConditions(availableTasks: typeof TASKS, numConditions: number = 4): Promise<typeof TASKS> {
  if (availableTasks.length < numConditions) {
    // If we don't have enough tasks, we'll need to repeat some
    // But try to maximize diversity
    const selected: typeof TASKS = [];
    const shuffled = [...availableTasks].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < numConditions; i++) {
      selected.push(shuffled[i % shuffled.length]);
    }
    return selected;
  }
  
  // We have enough tasks, select 4 different ones
  const shuffled = [...availableTasks].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numConditions);
}

// POST endpoint to get balanced task assignments (one per condition) from selected themes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { themeIds } = body;
    
    if (!themeIds || !Array.isArray(themeIds) || themeIds.length === 0) {
      return NextResponse.json(
        { error: 'themeIds array is required' },
        { status: 400 }
      );
    }
    
    // Get tasks from selected themes
    const availableTasks = getTasksByThemes(themeIds);
    
    if (availableTasks.length === 0) {
      return NextResponse.json(
        { error: 'No tasks found for selected themes' },
        { status: 404 }
      );
    }
    
    // Select 4 different tasks (one for each condition)
    const conditionTasks = await selectTasksForConditions(availableTasks, 4);
    
    // Map tasks to conditions: B, A, C, Control
    const taskAssignments = {
      'B': conditionTasks[0],
      'A': conditionTasks[1],
      'C': conditionTasks[2],
      'Control': conditionTasks[3],
    };
    
    return NextResponse.json({ tasks: taskAssignments }, { status: 200 });
  } catch (error: any) {
    console.error('Error selecting tasks for conditions:', error);
    return NextResponse.json(
      { error: 'Failed to select tasks' },
      { status: 500 }
    );
  }
}

