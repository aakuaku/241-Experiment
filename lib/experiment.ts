// Experiment configuration and types

export type TreatmentCondition = 
  | 'A' // Real Brand + Benchmark Scores
  | 'B' // Real Brand, No Benchmarks
  | 'C' // Anonymous Brand + Benchmark Scores
  | 'Control'; // Anonymous Brand, No Benchmarks

export interface ModelData {
  id: string;
  realBrand: string;
  anonymousBrand: string;
  benchmarks: {
    mmlu: number;
    codeEval: number;
    humanEval?: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'data-analysis' | 'comparison' | 'interpretation' | 'synthesis' | 'evaluation';
  sampleQuestions: string[];
  themeId: string; // ID of the theme this task belongs to
}

export interface TaskTheme {
  id: string;
  name: string;
  description: string;
  taskIds: string[]; // IDs of tasks in this theme
}

export interface ConditionSelection {
  condition: TreatmentCondition;
  selectedModel: string; // Display name shown to user (e.g., "Model A" or "OpenAI GPT")
  realModelId: string; // Actual model ID (e.g., "model-1")
  timestamp: string;
}

export interface ExperimentData {
  participantId: string;
  taskId: string;
  conditionSelections: ConditionSelection[];
  startTime: string;
  endTime: string;
  totalTimeSpent: number; // in seconds
}

// The 4 AI models used in the experiment
export const MODELS: ModelData[] = [
  {
    id: 'model-1',
    realBrand: 'OpenAI GPT',
    anonymousBrand: 'Model A',
    benchmarks: {
      mmlu: 88.8,
      codeEval: 90.0,
      humanEval: 87.0,
    },
  },
  {
    id: 'model-2',
    realBrand: 'Anthropic Claude',
    anonymousBrand: 'Model B',
    benchmarks: {
      mmlu: 88.8,
      codeEval: 84.0,
      humanEval: 84.0,
    },
  },
  {
    id: 'model-3',
    realBrand: 'Google Gemini',
    anonymousBrand: 'Model C',
    benchmarks: {
      mmlu: 87.2,
      codeEval: 88.0,
      humanEval: 86.0,
    },
  },
  {
    id: 'model-4',
    realBrand: 'Grok',
    anonymousBrand: 'Model D',
    benchmarks: {
      mmlu: 87.5,
      codeEval: 82.0,
      humanEval: 81.0,
    },
  },
];

// Condition order: B -> A -> C -> Control
export const CONDITION_ORDER: TreatmentCondition[] = ['B', 'A', 'C', 'Control'];

// Task themes - grouping tasks by domain
export const TASK_THEMES: TaskTheme[] = [
  {
    id: 'customer-product',
    name: 'Customer & Product Insights',
    description: 'Tasks focused on understanding customer behavior, feedback, and product development decisions.',
    taskIds: ['task-1', 'task-6', 'task-7'],
  },
  {
    id: 'business-strategy',
    name: 'Business Strategy & Planning',
    description: 'Tasks involving strategic business decisions, marketing, expansion, and investment evaluation.',
    taskIds: ['task-2', 'task-4', 'task-5'],
  },
  {
    id: 'market-research',
    name: 'Market Research & Analysis',
    description: 'Tasks focused on interpreting market research data and consumer behavior patterns.',
    taskIds: ['task-3'],
  },
  {
    id: 'organizational',
    name: 'Organizational Analysis',
    description: 'Tasks related to understanding organizational dynamics, employee satisfaction, and workplace insights.',
    taskIds: ['task-8'],
  },
  {
    id: 'technology',
    name: 'Technology',
    description: 'Tasks focused on technology decisions, platform comparisons, and technical investment analysis.',
    taskIds: ['task-9'],
  },
  {
    id: 'politics',
    name: 'Politics',
    description: 'Tasks involving policy analysis, political systems evaluation, and comparative governance studies.',
    taskIds: ['task-10'],
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Tasks related to financial analysis, investment strategies, and portfolio management decisions.',
    taskIds: ['task-11'],
  },
];

// Task pool for the experiment
export const TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Analyze Customer Feedback',
    type: 'data-analysis',
    themeId: 'customer-product',
    description: 'You have customer feedback data from your product. Ask short questions to understand what customers like and dislike, and get quick recommendations.',
    sampleQuestions: [
      'What are the main complaints?',
      'What do customers like most?',
      'How can we improve satisfaction?'
    ],
  },
  {
    id: 'task-2',
    title: 'Compare Marketing Strategies',
    type: 'comparison',
    themeId: 'business-strategy',
    description: 'Choose between two marketing strategies with the same budget. Ask short questions to compare them and decide which is better.',
    sampleQuestions: [
      'What are the main differences?',
      'Which is better for short-term growth?',
      'What are the risks?'
    ],
  },
  {
    id: 'task-3',
    title: 'Interpret Market Research',
    type: 'interpretation',
    themeId: 'market-research',
    description: 'Research shows people say they prefer eco-friendly products but don\'t always buy them. Ask short questions to understand why and what businesses can do.',
    sampleQuestions: [
      'Why is there a gap between preference and purchase?',
      'How does income affect buying behavior?',
      'What can businesses do about this?'
    ],
  },
  {
    id: 'task-4',
    title: 'Market Expansion Decision',
    type: 'synthesis',
    themeId: 'business-strategy',
    description: 'Decide whether to expand to a new market. Ask short questions about risks, opportunities, and key factors.',
    sampleQuestions: [
      'What are the main risks?',
      'What are the opportunities?',
      'Should we expand?'
    ],
  },
  {
    id: 'task-5',
    title: 'Evaluate Business Proposal',
    type: 'evaluation',
    themeId: 'business-strategy',
    description: 'A startup wants investment. Ask short questions to evaluate the proposal and decide if you should invest.',
    sampleQuestions: [
      'What are the strengths?',
      'What are the risks?',
      'Should I invest?'
    ],
  },
  {
    id: 'task-6',
    title: 'Analyze User Behavior',
    type: 'data-analysis',
    themeId: 'customer-product',
    description: 'Your website checkout was updated. Some metrics improved, others declined. Ask short questions to understand why and how to fix it.',
    sampleQuestions: [
      'Why did conversion rate change?',
      'Are there device differences?',
      'How can we improve?'
    ],
  },
  {
    id: 'task-7',
    title: 'Compare Product Features',
    type: 'comparison',
    themeId: 'customer-product',
    description: 'Choose between two new features for your product. Ask short questions to compare them and decide which to build first.',
    sampleQuestions: [
      'What are the trade-offs?',
      'Which has better ROI?',
      'Which should we prioritize?'
    ],
  },
  {
    id: 'task-8',
    title: 'Interpret Employee Survey',
    type: 'interpretation',
    themeId: 'organizational',
    description: 'Employee survey shows patterns about work arrangements and satisfaction. Ask short questions to understand the results and what to do.',
    sampleQuestions: [
      'What patterns do you see?',
      'What\'s surprising?',
      'What should we do?'
    ],
  },
  {
    id: 'task-9',
    title: 'Choose Cloud Platform',
    type: 'evaluation',
    themeId: 'technology',
    description: 'Decide which cloud platform (AWS, Azure, Google Cloud) to use. Ask short questions to compare and choose the best option.',
    sampleQuestions: [
      'What are the key differences?',
      'Which is most cost-effective?',
      'Which should we choose?'
    ],
  },
  {
    id: 'task-10',
    title: 'Single-Payer Healthcare Analysis',
    type: 'evaluation',
    themeId: 'politics',
    description: 'Would single-payer healthcare reduce costs for families? Ask short questions to compare costs and quality.',
    sampleQuestions: [
      'How do costs compare?',
      'What about quality?',
      'Would it save money?'
    ],
  },
  {
    id: 'task-11',
    title: 'Cryptocurrency Investment Decision',
    type: 'evaluation',
    themeId: 'finance',
    description: 'Should portfolios include cryptocurrency in 2025? Ask short questions about risks, returns, and allocation.',
    sampleQuestions: [
      'How do returns compare to stocks?',
      'What are the risks?',
      'What percentage should we allocate?'
    ],
  },
];

// Get tasks by theme IDs
export function getTasksByThemes(themeIds: string[]): Task[] {
  return TASKS.filter(task => themeIds.includes(task.themeId));
}

// Get theme by ID
export function getThemeById(themeId: string): TaskTheme | undefined {
  return TASK_THEMES.find(theme => theme.id === themeId);
}

// Get all tasks for a theme
export function getTasksForTheme(themeId: string): Task[] {
  return TASKS.filter(task => task.themeId === themeId);
}

// Randomly select a task from given tasks (client-side fallback)
export function selectRandomTask(tasks: Task[] = TASKS): Task {
  return tasks[Math.floor(Math.random() * tasks.length)];
}

// Select a task ensuring balanced distribution (server-side)
// This function queries the database to find the least-used task
export async function selectBalancedTask(): Promise<Task> {
  try {
    // This would be called from an API route
    // For now, return random selection as fallback
    return selectRandomTask();
  } catch {
    return selectRandomTask();
  }
}

// Get display name for a model based on condition
export function getModelDisplayName(model: ModelData, condition: TreatmentCondition): string {
  if (condition === 'A' || condition === 'B') {
    return model.realBrand;
  }
  return model.anonymousBrand;
}

// Check if benchmarks should be shown based on condition
export function shouldShowBenchmarks(condition: TreatmentCondition): boolean {
  return condition === 'A' || condition === 'C';
}

// Get condition description for display
export function getConditionDescription(condition: TreatmentCondition): string {
  switch (condition) {
    case 'A':
      return 'Condition 2: Real Brand + Benchmark Scores';
    case 'B':
      return 'Condition 1: Real Brand, No Benchmarks';
    case 'C':
      return 'Condition 3: Anonymous Brand + Benchmark Scores';
    case 'Control':
      return 'Condition 4: Anonymous Brand, No Benchmarks (Control)';
  }
}

// Get condition number for progress tracking
export function getConditionNumber(condition: TreatmentCondition): number {
  return CONDITION_ORDER.indexOf(condition) + 1;
}