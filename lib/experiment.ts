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
  conditionSelections?: ConditionSelection[]; // Optional - can be empty when creating experiment at start
  startTime: string;
  endTime?: string;
  totalTimeSpent?: number; // in seconds
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

// Task pool for the experiment
export const TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Analyze Customer Feedback Data',
    type: 'data-analysis',
    description: 'You have received customer feedback data from your product over the past month. The data includes sample feedback comments and overall statistics showing ratings distribution.\n\nReview the data in the tables below and use the AI assistant to ask questions that will help you: Identify patterns and themes in the feedback, understand what customers like most and least about the product, discover insights that could improve customer satisfaction. Ask multiple questions to explore different aspects of the data and get recommendations.',
    sampleQuestions: [
      'What are the most common themes in the negative feedback?',
      'Which features received the most positive comments?',
      'What patterns do you notice in the ratings distribution?',
      'What recommendations would you give to improve customer satisfaction?'
    ],
  },
  {
    id: 'task-2',
    title: 'Compare Marketing Strategies',
    type: 'comparison',
    description: 'Your company is deciding between two marketing strategies for your next campaign. Both strategies have the same budget but different approaches, expected reach, and previous performance metrics.\n\nReview the strategy comparison table below and use the AI assistant to ask questions that will help you: Compare the strengths and weaknesses of each strategy, understand the trade-offs between short-term and long-term approaches, evaluate which strategy might be more effective for your goals. Ask questions to explore different factors and get recommendations based on your analysis.',
    sampleQuestions: [
      'What are the key differences between these two marketing strategies?',
      'Which strategy would be better for short-term sales growth?',
      'What risks should we consider for each approach?',
      'What factors should we prioritize in making this decision?'
    ],
  },
  {
    id: 'task-3',
    title: 'Interpret Market Research Results',
    type: 'interpretation',
    description: 'A market research study has been conducted on consumer preferences for eco-friendly products. The research reveals interesting patterns between what people say they prefer versus what they actually purchase.\n\nReview the data tables below showing preference vs. behavior gaps and income factors. Use the AI assistant to ask questions that will help you: Understand why there\'s a gap between stated preferences and actual behavior, identify factors that explain demographic differences, discover implications for businesses trying to promote eco-friendly products. Ask multiple questions to explore different aspects of this data and uncover insights.',
    sampleQuestions: [
      'Why do you think there\'s a gap between what people say they prefer and what they actually buy?',
      'How does income level affect purchasing behavior?',
      'What might explain the differences across age groups?',
      'What strategies could businesses use to bridge this gap?'
    ],
  },
  {
    id: 'task-4',
    title: 'Synthesize Multiple Data Sources',
    type: 'synthesis',
    description: 'You need to make a decision about expanding your business to a new market. You have access to multiple data sources including sales data from similar launches, economic indicators, competitor analysis, and internal capacity information.\n\nReview the data tables below showing market comparisons and economic indicators. Use the AI assistant to ask questions that will help you: Identify key factors that should influence your expansion decision, weigh the risks and opportunities from different perspectives, synthesize information from multiple sources to make an informed recommendation. Ask questions to explore different aspects of the data and get guidance on your decision.',
    sampleQuestions: [
      'What are the most important factors to consider for market expansion?',
      'What risks should we be most concerned about?',
      'How do the economic indicators compare across markets?',
      'What recommendation would you make based on all this data?'
    ],
  },
  {
    id: 'task-5',
    title: 'Evaluate Business Proposal',
    type: 'evaluation',
    description: 'A startup has pitched a business idea to you seeking investment. The proposal includes details about their product concept, market size claims, business model, competitive landscape, and funding requirements.\n\nReview the proposal summary table below. Use the AI assistant to ask questions that will help you: Analyze the strengths and weaknesses of the business idea, assess the feasibility and market potential, identify potential risks and concerns, develop your overall assessment and recommendation. Ask questions to explore different aspects of the proposal and get guidance on your evaluation.',
    sampleQuestions: [
      'What are the strongest aspects of this business proposal?',
      'What concerns or risks should I be aware of?',
      'Does the market size claim seem realistic?',
      'What questions should I ask the founders before investing?'
    ],
  },
  {
    id: 'task-6',
    title: 'Analyze User Behavior Patterns',
    type: 'data-analysis',
    description: 'You have user behavior data from your website. A recent change was made to the checkout process, and you\'ve noticed some interesting patterns in the metrics - some improved while others declined.\n\nReview the website metrics comparison and device breakdown tables below. Use the AI assistant to ask questions that will help you: Understand what might be causing these changes, identify concerning trends or patterns, discover insights about user behavior across different devices, get suggestions on how to improve the situation. Ask multiple questions to thoroughly analyze the data and find actionable insights.',
    sampleQuestions: [
      'What might explain the changes in conversion rate after the checkout update?',
      'Are there differences in behavior across device types?',
      'What trends in the data are concerning?',
      'What changes would you recommend to improve the metrics?'
    ],
  },
  {
    id: 'task-7',
    title: 'Compare Product Features',
    type: 'comparison',
    description: 'Your team is deciding between two feature additions for your product. Each feature has different development requirements, expected adoption rates, costs, and strategic value.\n\nReview the feature comparison table below. Use the AI assistant to ask questions that will help you: Compare the trade-offs between development time and adoption, evaluate the strategic value and competitive advantage of each, analyze which feature might provide better ROI, make a recommendation on which to prioritize. Ask questions to explore different factors and get guidance on your decision.',
    sampleQuestions: [
      'What are the main trade-offs between these two features?',
      'Which feature would provide better return on investment?',
      'How important is the development time vs. expected adoption?',
      'What would you recommend prioritizing and why?'
    ],
  },
  {
    id: 'task-8',
    title: 'Interpret Survey Results',
    type: 'interpretation',
    description: 'A survey was conducted among employees about work-life balance, and separate productivity metrics were collected. The results show interesting patterns regarding satisfaction, work arrangements, and performance.\n\nReview the survey results and productivity metrics tables below. Use the AI assistant to ask questions that will help you: Explain what the data reveals about employee preferences and satisfaction, identify contradictions or surprising findings, understand the relationship between work arrangements and productivity, suggest actions the organization might consider. Ask multiple questions to thoroughly interpret the results and discover insights.',
    sampleQuestions: [
      'What patterns do you see between work arrangements and satisfaction?',
      'Are there any surprising findings in this data?',
      'How does productivity relate to work-life balance satisfaction?',
      'What actions should the organization consider based on these results?'
    ],
  },
];

// Randomly select a task (client-side fallback)
export function selectRandomTask(): Task {
  return TASKS[Math.floor(Math.random() * TASKS.length)];
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