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
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Say "Hello" if you can read this.' }],
        max_tokens: 10,
      });
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
      const response = await anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "Hello" if you can read this.' }],
      });
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
      // Try different model names - starting with newest Gemini 2.0 models
      const modelsToTry = ['gemini-2.0-flash-exp', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
      let result;
      let lastError: any = null;
      
      for (const modelName of modelsToTry) {
        try {
          const model = gemini.getGenerativeModel({ model: modelName });
          result = await model.generateContent('Say "Hello" if you can read this.');
          break; // Success
        } catch (err: any) {
          lastError = err;
          if (!err.message?.includes('not found') && !err.message?.includes('404')) {
            throw err; // Non-404 error, don't try other models
          }
          continue; // Try next model
        }
      }
      
      if (!result) {
        throw lastError || new Error('No Gemini model available');
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
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'grok-3',
          messages: [{ role: 'user', content: 'Say "Hello" if you can read this.' }],
          max_tokens: 10,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Grok API error');
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

