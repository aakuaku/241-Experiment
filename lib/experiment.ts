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
    title: 'Analyze Customer Feedback Data',
    type: 'data-analysis',
    themeId: 'customer-product',
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
    themeId: 'business-strategy',
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
    themeId: 'market-research',
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
    themeId: 'business-strategy',
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
    themeId: 'business-strategy',
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
    themeId: 'customer-product',
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
    themeId: 'customer-product',
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
    themeId: 'organizational',
    description: 'A survey was conducted among employees about work-life balance, and separate productivity metrics were collected. The results show interesting patterns regarding satisfaction, work arrangements, and performance.\n\nReview the survey results and productivity metrics tables below. Use the AI assistant to ask questions that will help you: Explain what the data reveals about employee preferences and satisfaction, identify contradictions or surprising findings, understand the relationship between work arrangements and productivity, suggest actions the organization might consider. Ask multiple questions to thoroughly interpret the results and discover insights.',
    sampleQuestions: [
      'What patterns do you see between work arrangements and satisfaction?',
      'Are there any surprising findings in this data?',
      'How does productivity relate to work-life balance satisfaction?',
      'What actions should the organization consider based on these results?'
    ],
  },
  {
    id: 'task-9',
    title: 'Cloud Computing Investment',
    type: 'evaluation',
    themeId: 'technology',
    description: 'You need to make an investment decision about which cloud platform to adopt for your organization. Based on current market share data, pricing trends, and enterprise adoption rates, which cloud platform (AWS, Azure, Google Cloud) offers the best long-term investment opportunity?\n\nReview the data tables below showing market share, pricing trends, and adoption rates. Use the AI assistant to ask questions that will help you: Compare the technical capabilities of each platform, analyze financial performance and pricing models, evaluate enterprise adoption trends and market position, assess long-term investment potential and strategic value. Support your analysis with technical capabilities and financial performance data to make an informed recommendation.',
    sampleQuestions: [
      'What are the key technical differences between AWS, Azure, and Google Cloud?',
      'How do the pricing models compare across the three platforms?',
      'What does the market share data tell us about enterprise adoption trends?',
      'Which platform offers the best long-term investment opportunity and why?'
    ],
  },
  {
    id: 'task-10',
    title: 'Single-Payer Healthcare',
    type: 'evaluation',
    themeId: 'politics',
    description: 'You are analyzing whether a single-payer healthcare system would reduce overall costs for American families compared to the current system. This is a complex policy question that requires examining multiple factors including costs, quality, and international comparisons.\n\nReview the data tables below showing healthcare costs, administrative expenses, and international comparisons. Use the AI assistant to ask questions that will help you: Compare costs between single-payer and current systems, analyze administrative cost differences, evaluate care quality metrics from international examples, assess economic projections and potential savings. Present your argument with comparative international data, economic projections, and evidence on administrative costs and care quality.',
    sampleQuestions: [
      'How do healthcare costs compare between single-payer systems and the current US system?',
      'What do international examples tell us about administrative costs in single-payer systems?',
      'How does care quality in single-payer systems compare to the current US system?',
      'What are the economic projections for cost savings under a single-payer system?'
    ],
  },
  {
    id: 'task-11',
    title: 'Cryptocurrency Portfolio Allocation',
    type: 'evaluation',
    themeId: 'finance',
    description: 'You are evaluating whether traditional investment portfolios should include cryptocurrency exposure in 2025. This decision requires careful analysis of regulatory developments, institutional adoption, risk-adjusted returns, and correlation with traditional assets.\n\nReview the data tables below showing cryptocurrency performance, regulatory developments, and institutional adoption trends. Use the AI assistant to ask questions that will help you: Analyze risk-adjusted returns compared to traditional assets, evaluate correlation patterns with stocks and bonds, assess regulatory developments and their impact, examine institutional adoption trends and market maturity. Based on regulatory developments and institutional adoption, provide data-driven allocation recommendations for portfolio inclusion.',
    sampleQuestions: [
      'How do cryptocurrency risk-adjusted returns compare to traditional asset classes?',
      'What is the correlation between cryptocurrencies and traditional assets like stocks and bonds?',
      'How have recent regulatory developments affected cryptocurrency investment viability?',
      'What allocation percentage would you recommend for cryptocurrency in a traditional portfolio?'
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