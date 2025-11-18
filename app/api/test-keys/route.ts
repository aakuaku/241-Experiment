import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  const results: Record<string, any> = {};
  
  // Test OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const openaiModelsToTry = ['gpt-5.1', 'gpt-4o'];
      let response;
      let lastError: any = null;
      
      for (const modelName of openaiModelsToTry) {
        try {
          response = await openai.chat.completions.create({
            model: modelName,
            messages: [{ role: 'user', content: 'Say "Hello" if you can read this.' }],
            max_tokens: 10,
          });
          break; // Success
        } catch (err: any) {
          lastError = err;
          if (modelName === openaiModelsToTry[0]) {
            continue; // Try fallback
          }
          throw err;
        }
      }
      
      if (!response) {
        throw lastError || new Error('Both models failed');
      }
      
      results.openai = {
        status: 'success',
        message: response.choices[0]?.message?.content || 'No response',
      };
    } catch (error: any) {
      results.openai = {
        status: 'error',
        message: error.message || 'Unknown error',
      };
    }
  } else {
    results.openai = { status: 'error', message: 'API key not found in environment' };
  }

  // Test Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const claudeModelsToTry = ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'];
      let response;
      let lastError: any = null;
      
      for (const modelName of claudeModelsToTry) {
        try {
          response = await anthropic.messages.create({
            model: modelName,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say "Hello" if you can read this.' }],
          });
          break; // Success
        } catch (err: any) {
          lastError = err;
          if (modelName === claudeModelsToTry[0]) {
            continue; // Try fallback
          }
          throw err;
        }
      }
      
      if (!response) {
        throw lastError || new Error('Both models failed');
      }
      
      results.anthropic = {
        status: 'success',
        message: response.content[0]?.type === 'text' ? response.content[0].text : 'No response',
      };
    } catch (error: any) {
      results.anthropic = {
        status: 'error',
        message: error.message || 'Unknown error',
      };
    }
  } else {
    results.anthropic = { status: 'error', message: 'API key not found in environment' };
  }

  // Test Google Gemini
  if (process.env.GOOGLE_API_KEY) {
    try {
      const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const geminiModelsToTry = ['gemini-2.5-pro', 'gemini-2.0-flash'];
      let result;
      let lastError: any = null;
      
      for (const modelName of geminiModelsToTry) {
        try {
          const model = gemini.getGenerativeModel({ model: modelName });
          result = await model.generateContent('Say "Hello" if you can read this.');
          break; // Success
        } catch (err: any) {
          lastError = err;
          if (modelName === geminiModelsToTry[0]) {
            continue; // Try fallback
          }
          throw err;
        }
      }
      
      if (!result) {
        throw lastError || new Error('Both models failed');
      }
      
      const response = result.response;
      results.google = {
        status: 'success',
        message: response.text() || 'No response',
      };
    } catch (error: any) {
      results.google = {
        status: 'error',
        message: error.message || 'Unknown error',
      };
    }
  } else {
    results.google = { status: 'error', message: 'API key not found in environment' };
  }

  // Test xAI Grok
  if (process.env.XAI_API_KEY) {
    try {
      const grokModelsToTry = ['grok-3', 'grok-2'];
      let data;
      let lastError: any = null;
      
      for (const modelName of grokModelsToTry) {
        try {
          const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: modelName,
              messages: [{ role: 'user', content: 'Say "Hello" if you can read this.' }],
              max_tokens: 10,
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            if ((response.status === 404 || errorText.includes('not found')) && modelName !== grokModelsToTry[grokModelsToTry.length - 1]) {
              lastError = new Error(`HTTP ${response.status}: ${errorText}`);
              continue; // Try fallback
            }
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          data = await response.json();
          
          if (data.error) {
            if (data.error.message?.includes('not found') && modelName !== grokModelsToTry[grokModelsToTry.length - 1]) {
              lastError = new Error(data.error.message || 'Grok API error');
              continue; // Try fallback
            }
            throw new Error(data.error.message || 'Grok API error');
          }
          
          break; // Success
        } catch (err: any) {
          lastError = err;
          if (modelName === grokModelsToTry[0]) {
            continue; // Try fallback
          }
          throw err;
        }
      }
      
      if (!data) {
        throw lastError || new Error('Both models failed');
      }
      
      results.grok = {
        status: 'success',
        message: data.choices[0]?.message?.content || 'No response',
      };
    } catch (error: any) {
      results.grok = {
        status: 'error',
        message: error.message || 'Unknown error',
      };
    }
  } else {
    results.grok = { status: 'error', message: 'API key not found in environment' };
  }

  return NextResponse.json({ results }, { status: 200 });
}

