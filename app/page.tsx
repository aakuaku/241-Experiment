'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  MODELS,
  TreatmentCondition,
  CONDITION_ORDER,
  getModelDisplayName,
  shouldShowBenchmarks,
  getConditionDescription,
  getConditionNumber,
  selectRandomTask,
  Task,
  ExperimentData,
  ConditionSelection,
  TASK_THEMES,
  TaskTheme,
  getTasksByThemes,
  TASKS,
} from '@/lib/experiment';
import { TaskDataTables } from '@/components/TaskDataTables';

type ExperimentPhase = 
  | 'consent'
  | 'theme-selection'
  | 'task-intro'
  | 'model-trial'
  | 'model-selection'
  | 'condition-complete'
  | 'complete';

export default function Home() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState<string>('');
  const [phase, setPhase] = useState<ExperimentPhase>('consent');
  const [consentChecked, setConsentChecked] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [tempSelectedThemes, setTempSelectedThemes] = useState<string[]>([]);
  const [tasksByCondition, setTasksByCondition] = useState<Record<TreatmentCondition, Task | null>>({
    'A': null,
    'B': null,
    'C': null,
    'Control': null,
  });
  const [currentConditionIndex, setCurrentConditionIndex] = useState(0);
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [modelInteractions, setModelInteractions] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selections, setSelections] = useState<ConditionSelection[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  
  // Store conversations per condition/model combination
  const [conversations, setConversations] = useState<Record<string, Array<{ role: 'user' | 'assistant'; content: string }>>>({});
  
  // Store ratings per condition/model combination
  const [ratings, setRatings] = useState<Record<string, number>>({});
  
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Helper to create conversation key
  const getConversationKey = (conditionIdx: number, modelIdx: number) => {
    return `condition-${conditionIdx}-model-${modelIdx}`;
  };

  // Helper function to format message content (convert markdown-style bold to HTML)
  const formatMessageContent = (content: string): string => {
    // Convert **text** to <strong>text</strong>
    // Also preserve line breaks by converting \n to <br/>
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  // Helper function to format description text with markdown-like formatting
  const formatDescription = (text: string) => {
    // Split by double newlines to get paragraphs
    const paragraphs = text.split('\n\n');
    const result: JSX.Element[] = [];
    
    paragraphs.forEach((para, idx) => {
      // Skip empty paragraphs
      if (!para.trim()) return;
      
      // Split by single newlines to check for mixed content
      const lines = para.split('\n');
      
      // Check if it's a heading (single line wrapped in **)
      if (lines.length === 1 && para.match(/^\*\*.*\*\*$/)) {
        const heading = para.replace(/\*\*/g, '');
        result.push(
          <h4 key={`para-${idx}`} style={{ marginTop: idx > 0 ? '1.5rem' : '0', marginBottom: '0.75rem', fontWeight: 600, fontSize: '1.15rem', color: '#333' }}>
            {heading}
          </h4>
        );
        return;
      }
      
      // Check if it contains a list (lines starting with -)
      const listItems = lines.filter(line => line.trim().startsWith('-'));
      if (listItems.length > 0) {
        // Find if there's a heading before the list
        const nonListLines = lines.filter(line => !line.trim().startsWith('-'));
        nonListLines.forEach(line => {
          if (line.trim()) {
            if (line.match(/^\*\*.*\*\*$/)) {
              const heading = line.replace(/\*\*/g, '');
              result.push(
                <h4 key={`heading-${idx}-${result.length}`} style={{ marginTop: idx > 0 || result.length > 0 ? '1.5rem' : '0', marginBottom: '0.75rem', fontWeight: 600, fontSize: '1.15rem', color: '#333' }}>
                  {heading}
                </h4>
              );
            } else {
              const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              result.push(
                <p key={`p-${idx}-${result.length}`} dangerouslySetInnerHTML={{ __html: formatted }} style={{ marginBottom: '0.5rem', fontSize: '1rem', lineHeight: '1.6', color: '#333' }} />
              );
            }
          }
        });
        
        // Add the list
        result.push(
          <ul key={`list-${idx}`} style={{ marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.6' }}>
            {listItems.map((item, itemIdx) => {
              const cleanItem = item.replace(/^-\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              return <li key={`item-${itemIdx}`} dangerouslySetInnerHTML={{ __html: cleanItem }} style={{ marginBottom: '0.5rem' }} />;
            })}
          </ul>
        );
        return;
      }
      
      // Regular paragraph with bold formatting
      const formatted = para
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
      
      result.push(
        <p key={`para-${idx}`} dangerouslySetInnerHTML={{ __html: formatted }} style={{ marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.6', color: '#333' }} />
      );
    });
    
    return result;
  };

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('experiment-state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.participantId) setParticipantId(state.participantId);
        if (state.phase) setPhase(state.phase);
        if (state.consentChecked !== undefined) setConsentChecked(state.consentChecked);
        // Handle both old format (task) and new format (tasksByCondition)
        if (state.tasksByCondition) {
          setTasksByCondition(state.tasksByCondition);
        } else if (state.task) {
          // Migrate old format: assign same task to all conditions
          setTasksByCondition({
            'A': state.task,
            'B': state.task,
            'C': state.task,
            'Control': state.task,
          });
        }
        if (state.currentConditionIndex !== undefined) setCurrentConditionIndex(state.currentConditionIndex);
        if (state.currentModelIndex !== undefined) setCurrentModelIndex(state.currentModelIndex);
        if (state.modelInteractions) setModelInteractions(new Set(state.modelInteractions));
        if (state.selectedModel) setSelectedModel(state.selectedModel);
        if (state.selections) setSelections(state.selections);
        if (state.startTime) setStartTime(state.startTime);
        if (state.conversations) setConversations(state.conversations);
        if (state.ratings) setRatings(state.ratings);
        
        // Load current conversation
        const currentKey = `condition-${state.currentConditionIndex || 0}-model-${state.currentModelIndex || 0}`;
        if (state.conversations && state.conversations[currentKey]) {
          setMessages(state.conversations[currentKey]);
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    } else {
      // Generate new participant ID if no saved state
      const id = `P${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setParticipantId(id);
    }
  }, []);
  
  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!participantId) return; // Don't save until participant ID is set
    
    const currentKey = `condition-${currentConditionIndex}-model-${currentModelIndex}`;
    const updatedConversations = {
      ...conversations,
      [currentKey]: messages,
    };
    
    const stateToSave = {
      participantId,
      phase,
      consentChecked,
      tasksByCondition,
      currentConditionIndex,
      currentModelIndex,
      modelInteractions: Array.from(modelInteractions),
      selectedModel,
      selections,
      startTime,
      conversations: updatedConversations,
      ratings,
    };
    
    localStorage.setItem('experiment-state', JSON.stringify(stateToSave));
  }, [participantId, phase, consentChecked, tasksByCondition, currentConditionIndex, currentModelIndex, modelInteractions, selectedModel, selections, startTime, messages, conversations, ratings]);

  const chatMessagesRef = useRef<HTMLDivElement>(null);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  // Auto-scroll to the latest AI response when messages change or loading state changes
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated
    if (chatMessagesRef.current) {
      setTimeout(() => {
        const lastMessage = chatMessagesRef.current?.lastElementChild;
        if (lastMessage) {
          const headerHeight = 80; // Height of floating header
          const elementRect = (lastMessage as HTMLElement).getBoundingClientRect();
          const elementPosition = elementRect.top + window.pageYOffset;
          const offsetPosition = elementPosition - headerHeight - 20; // 20px extra spacing
          
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [messages, isLoading]);

  const currentCondition = CONDITION_ORDER[currentConditionIndex];
  const currentModel = MODELS[currentModelIndex];
  const currentModelDisplayName = currentModel ? getModelDisplayName(currentModel, currentCondition) : '';
  const showBenchmarks = currentCondition ? shouldShowBenchmarks(currentCondition) : false;
  const currentTask = currentCondition ? tasksByCondition[currentCondition] : null;

  const handleConsentSubmit = () => {
    if (consentChecked) {
      setPhase('theme-selection');
    }
  };

  const handleThemeSelection = async (themeIds: string[]) => {
    if (themeIds.length === 0) {
      alert('Please select at least one theme to continue.');
      return;
    }
    
    setSelectedThemes(themeIds);
    
    try {
      // Fetch task assignments (one per condition) from the selected themes
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themeIds }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.tasks) {
          // Store tasks by condition
          setTasksByCondition({
            'B': data.tasks.B,
            'A': data.tasks.A,
            'C': data.tasks.C,
            'Control': data.tasks.Control,
          });
        } else {
          // Fallback: if API returns old format, assign same task to all conditions
          const fallbackTask = data.task || selectRandomTask(getTasksByThemes(themeIds));
          setTasksByCondition({
            'B': fallbackTask,
            'A': fallbackTask,
            'C': fallbackTask,
            'Control': fallbackTask,
          });
        }
      } else {
        // Fallback to random selection from selected themes
        const availableTasks = getTasksByThemes(themeIds);
        const conditionTasks = availableTasks.length >= 4 
          ? availableTasks.sort(() => Math.random() - 0.5).slice(0, 4)
          : Array(4).fill(null).map((_, i) => availableTasks[i % availableTasks.length]);
        
        setTasksByCondition({
          'B': conditionTasks[0],
          'A': conditionTasks[1],
          'C': conditionTasks[2],
          'Control': conditionTasks[3],
        });
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Fallback to random selection from selected themes
      const availableTasks = getTasksByThemes(themeIds);
      const conditionTasks = availableTasks.length >= 4 
        ? availableTasks.sort(() => Math.random() - 0.5).slice(0, 4)
        : Array(4).fill(null).map((_, i) => availableTasks[i % availableTasks.length]);
      
      setTasksByCondition({
        'B': conditionTasks[0],
        'A': conditionTasks[1],
        'C': conditionTasks[2],
        'Control': conditionTasks[3],
      });
    }
    
    setPhase('task-intro');
    setStartTime(Date.now());
  };

  const handleTaskIntroContinue = () => {
    setPhase('model-trial');
    setModelInteractions(new Set());
    setCurrentModelIndex(0);
    setMessages([]);
    setInputMessage('');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '80px';
    }
    
    // Add user message to conversation
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    // Mark that this model has been interacted with
    const modelId = MODELS[currentModelIndex].id;
    setModelInteractions(new Set([...Array.from(modelInteractions), modelId]));

    try {
      // Call the AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId: modelId,
          messages: newMessages,
          taskDescription: currentTask?.description,
          taskId: currentTask?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const finalMessages = [...newMessages, { role: 'assistant' as const, content: data.response }];
      setMessages(finalMessages);
      
      // Save conversation
      const key = getConversationKey(currentConditionIndex, currentModelIndex);
      setConversations(prev => ({
        ...prev,
        [key]: finalMessages,
      }));
    } catch (error) {
      console.error('Error calling AI API:', error);
      const errorMessages = [...newMessages, { 
        role: 'assistant' as const, 
        content: 'Sorry, I encountered an error. Please try again.' 
      }];
      setMessages(errorMessages);
      
      // Save conversation even with error
      const key = getConversationKey(currentConditionIndex, currentModelIndex);
      setConversations(prev => ({
        ...prev,
        [key]: errorMessages,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRatingSubmit = async (rating: number) => {
    const key = getConversationKey(currentConditionIndex, currentModelIndex);
    setRatings(prev => ({
      ...prev,
      [key]: rating,
    }));
    
    // Save rating to database
    try {
      const currentCondition = CONDITION_ORDER[currentConditionIndex];
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId,
          condition: currentCondition,
          modelId: MODELS[currentModelIndex].id,
          rating,
          taskId: currentTask?.id,
          startTime: startTime ? new Date(startTime).toISOString() : null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save rating:', errorData.error || errorData.details);
      }
    } catch (error) {
      console.error('Error saving rating:', error);
    }
  };

  const handleNextModel = () => {
    // Check if rating is submitted
    const ratingKey = getConversationKey(currentConditionIndex, currentModelIndex);
    if (!ratings[ratingKey]) {
      setToastMessage('Please rate this model\'s response before proceeding.');
      return;
    }
    
    if (currentModelIndex < MODELS.length - 1) {
      // Save current conversation before moving to next model
      const key = getConversationKey(currentConditionIndex, currentModelIndex);
      setConversations(prev => ({
        ...prev,
        [key]: messages,
      }));
      
      setCurrentModelIndex(currentModelIndex + 1);
      // Load conversation for next model if exists
      const nextKey = getConversationKey(currentConditionIndex, currentModelIndex + 1);
      const nextMessages = conversations[nextKey] || [];
      setMessages(nextMessages);
      setInputMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = '80px';
      }
    } else {
      // All models tried, move to selection
      setPhase('model-selection');
    }
  };
  
  // Navigate to next model (only forward navigation allowed)
  const handleNavigateToNextModel = () => {
    // Check if rating is submitted
    const ratingKey = getConversationKey(currentConditionIndex, currentModelIndex);
    if (!ratings[ratingKey]) {
      setToastMessage('Please rate this model\'s response before proceeding.');
      return;
    }
    
    if (currentModelIndex < MODELS.length - 1) {
      // Save current conversation before moving to next model
      const key = getConversationKey(currentConditionIndex, currentModelIndex);
      setConversations(prev => ({
        ...prev,
        [key]: messages,
      }));
      
      setCurrentModelIndex(currentModelIndex + 1);
      // Load conversation for next model if exists
      const nextKey = getConversationKey(currentConditionIndex, currentModelIndex + 1);
      const nextMessages = conversations[nextKey] || [];
      setMessages(nextMessages);
      setInputMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = '80px';
      }
    }
  };
  
  // Navigate to next condition (only forward navigation allowed)
  const handleNavigateToNextCondition = () => {
    if (currentConditionIndex < CONDITION_ORDER.length - 1) {
      // Save current conversation
      const currentKey = getConversationKey(currentConditionIndex, currentModelIndex);
      setConversations(prev => ({
        ...prev,
        [currentKey]: messages,
      }));
      
      // Navigate to next condition, starting with task intro
      setCurrentConditionIndex(currentConditionIndex + 1);
      setCurrentModelIndex(0);
      setPhase('task-intro'); // Show task intro for next condition
      setModelInteractions(new Set());
      setMessages([]);
      setInputMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = '80px';
      }
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const handleSelectionSubmit = () => {
    if (!selectedModel || !currentCondition) return;

    // Find the selected model to get both display name and real model ID
    const selectedModelData = MODELS.find(m => m.id === selectedModel);
    if (!selectedModelData) return;

    const displayName = getModelDisplayName(selectedModelData, currentCondition);

    const selection: ConditionSelection = {
      condition: currentCondition,
      selectedModel: displayName, // Display name shown to user
      realModelId: selectedModelData.id, // Real model ID
      timestamp: new Date().toISOString(),
    };

    const newSelections = [...selections, selection];
    setSelections(newSelections);

    // Move to next condition or complete
    if (currentConditionIndex < CONDITION_ORDER.length - 1) {
      setCurrentConditionIndex(currentConditionIndex + 1);
      setCurrentModelIndex(0);
      setSelectedModel(null);
      setPhase('task-intro'); // Show task intro for next condition
      setModelInteractions(new Set());
      setMessages([]);
      setInputMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = '80px';
      }
    } else {
      // All conditions complete
      handleExperimentComplete(newSelections);
    }
  };

  const handleExperimentComplete = async (finalSelections: ConditionSelection[]) => {
    if (!currentTask || !startTime) return;

    const endTime = Date.now();
    const totalTimeSpent = Math.round((endTime - startTime) / 1000);

    const experimentData: ExperimentData = {
      participantId,
      taskId: currentTask?.id || '',
      conditionSelections: finalSelections,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      totalTimeSpent,
    };

    try {
      // Save to database
      const response = await fetch('/api/experiments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(experimentData),
      });

      if (!response.ok) {
        throw new Error('Failed to save experiment data');
      }

      // Also save to localStorage as backup
      const existingData = localStorage.getItem('experiment-results');
      const results = existingData ? JSON.parse(existingData) : [];
      results.push(experimentData);
      localStorage.setItem('experiment-results', JSON.stringify(results));

      // Show thank you page
      router.push(`/thank-you?participantId=${participantId}`);
    } catch (error) {
      console.error('Error saving experiment:', error);
      // Fallback to localStorage only if database fails
      const existingData = localStorage.getItem('experiment-results');
      const results = existingData ? JSON.parse(existingData) : [];
      results.push(experimentData);
      localStorage.setItem('experiment-results', JSON.stringify(results));
      
      // Still show thank you page
      router.push(`/thank-you?participantId=${participantId}`);
    }
  };

  const handleReset = () => {
    // Clear all localStorage
    localStorage.removeItem('experiment-state');
    localStorage.removeItem('experiment-results');
    
    // Reset all state
    const newParticipantId = `P${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setParticipantId(newParticipantId);
    setPhase('consent');
    setConsentChecked(false);
    setSelectedThemes([]);
    setTempSelectedThemes([]);
    setTasksByCondition({
      'A': null,
      'B': null,
      'C': null,
      'Control': null,
    });
    setCurrentConditionIndex(0);
    setCurrentModelIndex(0);
    setModelInteractions(new Set());
    setSelectedModel(null);
    setSelections([]);
    setStartTime(null);
    setMessages([]);
    setInputMessage('');
    setConversations({});
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '80px';
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Consent Phase
  if (phase === 'consent') {
    return (
      <main>
        <div className="container">
          <h1>AI Model Selection Experiment</h1>
          
          <div className="consent-section">
            <h2>Research Consent</h2>
            <p>
              You are being invited to participate in a research study about decision-making 
              when selecting AI models for analysis tasks. This experiment uses short questions and should take approximately 15-20 minutes.
            </p>
            
            <div className="info-box">
              <p><strong>What you will do:</strong></p>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Select one or more task themes that interest you</li>
                <li>Ask short questions to 4 different AI models about a task</li>
                <li>Rate each model and select your preferred one</li>
                <li>Repeat this process across 4 different experimental conditions</li>
                <li><strong>Keep questions brief to finish quickly</strong></li>
              </ul>
            </div>

            <div className="info-box">
              <p><strong>Available Task Themes:</strong></p>
              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' }}>
                {TASK_THEMES.map((theme) => (
                  <div key={theme.id} style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>
                      {theme.name}
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#666', lineHeight: '1.4' }}>
                      {theme.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="info-box">
              <p><strong>Your participation is voluntary</strong> and you may withdraw at any time.</p>
              <p><strong>Confidentiality:</strong> Your responses will be anonymized and used only for research purposes.</p>
            </div>

            <div className="checkbox-container">
              <input
                type="checkbox"
                id="consent"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
              />
              <label htmlFor="consent">
                I have read and understood the information above, and I consent to participate in this research study.
              </label>
            </div>

            <div className="button-container">
              <button
                className="button"
                onClick={handleConsentSubmit}
                disabled={!consentChecked}
              >
                Continue to Experiment
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Theme Selection Phase
  if (phase === 'theme-selection') {
    const toggleTheme = (themeId: string) => {
      setTempSelectedThemes(prev => 
        prev.includes(themeId) 
          ? prev.filter(id => id !== themeId)
          : [...prev, themeId]
      );
    };

    return (
      <main>
        <div className="container">
          <h1>Select Task Themes</h1>
          <div className="theme-selection-section">
            <p style={{ fontSize: '1.1rem', marginBottom: '2rem', color: '#333', lineHeight: '1.6' }}>
              Please select one or more themes that interest you. A task will be assigned from your selected themes.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {TASK_THEMES.map((theme) => {
                const isSelected = tempSelectedThemes.includes(theme.id);
                const tasksInTheme = TASKS.filter(t => t.themeId === theme.id);
                
                return (
                  <div
                    key={theme.id}
                    onClick={() => toggleTheme(theme.id)}
                    style={{
                      border: `2px solid ${isSelected ? '#4a90e2' : '#ddd'}`,
                      borderRadius: '8px',
                      padding: '1.5rem',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f0f7ff' : '#fff',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#4a90e2';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#ddd';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTheme(theme.id)}
                        style={{ marginTop: '0.25rem', width: '20px', height: '20px', cursor: 'pointer' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#333', fontSize: '1.25rem' }}>
                          {theme.name}
                        </h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.95rem', lineHeight: '1.5' }}>
                          {theme.description}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#888', fontWeight: 500 }}>
                        Tasks in this theme ({tasksInTheme.length}):
                      </p>
                      <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#666' }}>
                        {tasksInTheme.map(task => (
                          <li key={task.id} style={{ marginBottom: '0.25rem' }}>
                            {task.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="button-container">
              <button
                className="button"
                onClick={() => handleThemeSelection(tempSelectedThemes)}
                disabled={tempSelectedThemes.length === 0}
                style={{
                  opacity: tempSelectedThemes.length === 0 ? 0.5 : 1,
                  cursor: tempSelectedThemes.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Continue with Selected Themes
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Task Introduction Phase
  if (phase === 'task-intro' && currentTask) {
    return (
      <main>
        <div className="container">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="toast-notification">
              <span>{toastMessage}</span>
              <button 
                className="toast-close-button"
                onClick={() => setToastMessage(null)}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          )}
          
          <h1>Your Task</h1>
          <div className="task-intro">
            <h2>{currentTask.title}</h2>
            <div className="task-description">
              <div style={{ marginBottom: '1.5rem', fontSize: '1.1rem', lineHeight: '1.6', color: '#333' }}>
                {formatDescription(currentTask.description.split('\n\n**Your task:**')[0])}
              </div>
              
              {currentTask.description.includes('**Your task:**') && (
                <div style={{ marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.6', color: '#333' }}>
                  {formatDescription('**Your task:**' + currentTask.description.split('**Your task:**')[1])}
                </div>
              )}
              
              <TaskDataTables taskId={currentTask.id} />
            </div>
            <div className="info-box" style={{ marginTop: '1.5rem' }}>
              <p><strong>Important:</strong> You will complete this task for {getConditionDescription(currentCondition)}. 
              In this condition, you'll try all 4 AI models and then select your preferred one.</p>
              <p style={{ marginTop: '0.75rem' }}><strong>How to interact:</strong> Review the data tables above, then ask short questions in the chat. The AI will help you analyze and draw insights. Keep your questions brief to finish quickly.</p>
              <p style={{ marginTop: '0.75rem' }}><strong>Important:</strong> To ensure fair comparison, please ask the same set of questions to each of the 4 AI models in this condition.</p>
            </div>
            <div className="info-box" style={{ marginTop: '1rem' }}>
              <p><strong>Understanding Benchmark Scores:</strong></p>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li><strong>MMLU (Massive Multitask Language Understanding):</strong> Measures general knowledge and reasoning across 57 academic subjects including math, physics, history, law, and more. Higher scores indicate better general knowledge and analytical ability.</li>
                <li><strong>CodeEval:</strong> Evaluates problem-solving and logical reasoning ability by testing how well models can solve programming problems. Higher scores indicate better analytical and problem-solving performance.</li>
                <li><strong>HumanEval:</strong> Tests reasoning and correctness by asking models to solve problems that require careful analysis. Higher scores indicate better analytical thinking and solution quality.</li>
              </ul>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                <em>Note: Some conditions will show these benchmark scores, while others will not.</em>
              </p>
            </div>
            <div className="button-container">
              <button className="button" onClick={handleTaskIntroContinue}>
                Start Experiment
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Model Trial Phase
  if (phase === 'model-trial' && currentCondition && currentModel && currentTask) {
    const hasInteracted = modelInteractions.has(currentModel.id);
    const progress = ((currentModelIndex + 1) / MODELS.length) * 100;
    const conditionProgress = ((currentConditionIndex + 1) / CONDITION_ORDER.length) * 100;
    
    // Check if current task is completed (user has interacted with the model)
    const taskCompleted = hasInteracted || messages.length > 0;

    return (
      <main>
        <div className="container">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="toast-notification">
              <span>{toastMessage}</span>
              <button 
                className="toast-close-button"
                onClick={() => setToastMessage(null)}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          )}
          
          {/* Progress indicators */}
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${conditionProgress}%` }}></div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '0.5rem', color: '#666' }}>
              Condition {getConditionNumber(currentCondition)} of {CONDITION_ORDER.length}: {getConditionDescription(currentCondition)}
            </p>
          </div>

          <div className="model-trial-header">
            <h1>Trying Model {currentModelIndex + 1} of {MODELS.length}</h1>
            <div className="model-card-large">
              <div className="model-title-large"><span className="model-badge">{currentModelDisplayName}</span></div>
              {showBenchmarks && (
                <>
                  <div className="benchmarks">
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#666' }}>Benchmark Scores</span>
                    </div>
                    <div className="benchmark-item">
                      <span className="benchmark-initial">• MMLU:</span>
                      <span className="benchmark-value">{currentModel.benchmarks.mmlu}%</span>
                      <span className="benchmark-separator">-</span>
                      <span className="benchmark-label">General knowledge across 57 subjects (math, science, history, etc.) - indicates analytical ability</span>
                    </div>
                    <div className="benchmark-item">
                      <span className="benchmark-initial">• CodeEval:</span>
                      <span className="benchmark-value">{currentModel.benchmarks.codeEval}%</span>
                      <span className="benchmark-separator">-</span>
                      <span className="benchmark-label">Problem-solving and logical reasoning ability</span>
                    </div>
                    {currentModel.benchmarks.humanEval && (
                      <div className="benchmark-item">
                        <span className="benchmark-initial">• HumanEval:</span>
                        <span className="benchmark-value">{currentModel.benchmarks.humanEval}%</span>
                        <span className="benchmark-separator">-</span>
                        <span className="benchmark-label">Analytical thinking and solution quality</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="task-section">
            <h2>Task: {currentTask.title}</h2>
            <div className="task-description">
              <div style={{ marginBottom: '1.5rem', fontSize: '1.1rem', lineHeight: '1.6', color: '#333' }}>
                {formatDescription(currentTask.description.split('\n\n**Your task:**')[0])}
              </div>
              
              {currentTask.description.includes('**Your task:**') && (
                <div style={{ marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.6', color: '#333' }}>
                  {formatDescription('**Your task:**' + currentTask.description.split('**Your task:**')[1])}
                </div>
              )}
              
              <TaskDataTables taskId={currentTask.id} />
            </div>
          </div>

          {hasInteracted || messages.length > 0 ? (
            <div className="chat-section">
              <h3>Conversation with <span className="model-badge">{currentModelDisplayName}</span></h3>
              <div className="chat-messages" ref={chatMessagesRef}>
                {messages.map((msg, idx) => (
                  <div key={idx} className={`chat-message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}>
                    <div className="message-role">{msg.role === 'user' ? 'You' : currentModelDisplayName}</div>
                    <div 
                      className="message-content" 
                      dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }}
                    />
                  </div>
                ))}
                {isLoading && (
                  <div className="chat-message assistant-message">
                    <div className="message-role">{currentModelDisplayName}</div>
                    <div className="message-content loading-message">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                    <div className="skeleton-loader">
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line skeleton-line-short"></div>
                      <div className="skeleton-line"></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Sample Questions - always visible */}
              {currentTask && currentTask.sampleQuestions && currentTask.sampleQuestions.length > 0 && (
                <div style={{ marginTop: '1.5rem', marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#555', marginBottom: '0.5rem', textAlign: 'left' }}>
                    Sample Questions:
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem', textAlign: 'left', fontStyle: 'italic' }}>
                    To ensure fair comparison, ask the same set of questions to each of the 4 AI models in this condition.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {currentTask.sampleQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setInputMessage(question);
                          // Scroll to send button after a brief delay to ensure input is set
                          setTimeout(() => {
                            sendButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        }}
                        style={{
                          fontSize: '0.85rem',
                          padding: '0.5rem 0.75rem',
                          textAlign: 'left',
                          backgroundColor: '#fff',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#1a1a1a',
                          transition: 'all 0.2s ease',
                          fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f7ff';
                          e.currentTarget.style.borderColor = '#4a90e2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fff';
                          e.currentTarget.style.borderColor = '#ddd';
                        }}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="chat-input-container">
                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
                  rows={1}
                  disabled={isLoading}
                />
                <button 
                  ref={sendButtonRef}
                  className="button send-button" 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                >
                  Send
                </button>
              </div>
              
              {taskCompleted && (
                <>
                  {/* Rating Section */}
                  <div className="rating-section" style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: '#333', textAlign: 'center' }}>
                      How well did this model perform on the task?
                    </h4>
                    <p style={{ textAlign: 'center', marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
                      Rate your experience with this model's responses (1 = Poor, 5 = Excellent)
                    </p>
                    <div className="rating-stars" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5].map((rating) => {
                        const currentKey = getConversationKey(currentConditionIndex, currentModelIndex);
                        const selectedRating = ratings[currentKey];
                        const isSelected = selectedRating && rating <= selectedRating;
                        return (
                          <button
                            key={rating}
                            onClick={() => handleRatingSubmit(rating)}
                            className={`rating-star ${isSelected ? 'selected' : ''}`}
                            style={{
                              fontSize: '2rem',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.25rem',
                              color: isSelected ? '#ffc107' : '#ddd',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.color = '#ffc107';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.color = '#ddd';
                                e.currentTarget.style.transform = 'scale(1)';
                              }
                            }}
                          >
                            ★
                          </button>
                        );
                      })}
                    </div>
                    {ratings[getConversationKey(currentConditionIndex, currentModelIndex)] && (
                      <p style={{ textAlign: 'center', marginTop: '0.75rem', color: '#666', fontSize: '0.9rem' }}>
                        You rated this model: {ratings[getConversationKey(currentConditionIndex, currentModelIndex)]}/5
                      </p>
                    )}
                  </div>
                  
                  <div className="button-container" style={{ marginTop: '1rem' }}>
                    <button className="button" onClick={handleNextModel}>
                      {currentModelIndex < MODELS.length - 1 
                        ? `Continue to Next Model (${currentModelIndex + 2}/${MODELS.length})`
                        : 'Proceed to Model Selection'}
                    </button>
                  </div>
                </>
              )}
              
              {/* Navigation buttons - only forward, only when task is completed */}
              {taskCompleted && (
                <div className="navigation-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {currentModelIndex < MODELS.length - 1 && (
                      <button 
                        className="button button-secondary" 
                        onClick={handleNavigateToNextModel}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                      >
                        Next Model →
                      </button>
                    )}
                    {currentConditionIndex < CONDITION_ORDER.length - 1 && currentModelIndex === MODELS.length - 1 && (
                      <button 
                        className="button button-secondary" 
                        onClick={handleNavigateToNextCondition}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                      >
                        Next Condition →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="interaction-section">
              <p style={{ textAlign: 'center', marginBottom: '1rem', color: '#666' }}>
                Start interacting with <span className="model-badge">{currentModelDisplayName}</span> to complete the task. Type your questions or requests below.
              </p>
              
              {/* Sample Questions */}
              {currentTask && currentTask.sampleQuestions && currentTask.sampleQuestions.length > 0 && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#555', marginBottom: '0.5rem', textAlign: 'left' }}>
                    Sample Questions:
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem', textAlign: 'left', fontStyle: 'italic' }}>
                    To ensure fair comparison, ask the same set of questions to each of the 4 AI models in this condition.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {currentTask.sampleQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setInputMessage(question);
                          // Scroll to send button after a brief delay to ensure input is set
                          setTimeout(() => {
                            sendButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        }}
                        style={{
                          fontSize: '0.85rem',
                          padding: '0.5rem 0.75rem',
                          textAlign: 'left',
                          backgroundColor: '#fff',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#1a1a1a',
                          transition: 'all 0.2s ease',
                          fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f7ff';
                          e.currentTarget.style.borderColor = '#4a90e2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fff';
                          e.currentTarget.style.borderColor = '#ddd';
                        }}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="chat-input-container">
                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
                  rows={1}
                  disabled={isLoading}
                />
                <button 
                  ref={sendButtonRef}
                  className="button send-button" 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Model Selection Phase
  if (phase === 'model-selection' && currentCondition && currentTask) {
    const conditionProgress = ((currentConditionIndex + 1) / CONDITION_ORDER.length) * 100;

    return (
      <main>
        <div className="container">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="toast-notification">
              <span>{toastMessage}</span>
              <button 
                className="toast-close-button"
                onClick={() => setToastMessage(null)}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          )}
          
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${conditionProgress}%` }}></div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '0.5rem', color: '#666' }}>
              {getConditionDescription(currentCondition)}
            </p>
          </div>

          <h1>Select Your Preferred Model</h1>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem' }}>
            You've tried all 4 models. Please select which one you preferred for this condition.
          </p>

          <div className="models-grid">
            {MODELS.map((model) => {
              const displayName = getModelDisplayName(model, currentCondition);
              const showBenchmarksForModel = shouldShowBenchmarks(currentCondition);
              const isSelected = selectedModel === model.id;

              return (
                <div
                  key={model.id}
                  className={`model-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleModelSelect(model.id)}
                >
                  <div className="model-title">{displayName}</div>
                  
                  {showBenchmarksForModel && (
                    <div className="benchmarks">
                      <div className="benchmark-item-selection">
                        <div className="benchmark-row-full">
                          <span className="benchmark-initial">• MMLU:</span>
                          <span className="benchmark-value">{model.benchmarks.mmlu}%</span>
                          <span className="benchmark-separator">-</span>
                          <span className="benchmark-label">General knowledge across 57 subjects (math, science, history, etc.) - indicates analytical ability</span>
                        </div>
                      </div>
                      <div className="benchmark-item-selection">
                        <div className="benchmark-row-full">
                          <span className="benchmark-initial">• CodeEval:</span>
                          <span className="benchmark-value">{model.benchmarks.codeEval}%</span>
                          <span className="benchmark-separator">-</span>
                          <span className="benchmark-label">Problem-solving and logical reasoning ability</span>
                        </div>
                      </div>
                      {model.benchmarks.humanEval && (
                        <div className="benchmark-item-selection">
                          <div className="benchmark-row-full">
                            <span className="benchmark-initial">• HumanEval:</span>
                            <span className="benchmark-value">{model.benchmarks.humanEval}%</span>
                            <span className="benchmark-separator">-</span>
                            <span className="benchmark-label">Analytical thinking and solution quality</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="button-container">
            <button
              className="button"
              onClick={handleSelectionSubmit}
              disabled={!selectedModel}
            >
              {currentConditionIndex < CONDITION_ORDER.length - 1 
                ? `Continue to Condition ${getConditionNumber(CONDITION_ORDER[currentConditionIndex + 1])}`
                : 'Complete Experiment'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <div>Loading...</div>;
}