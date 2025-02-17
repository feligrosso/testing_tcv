import OpenAI from 'openai';
import { queueService } from './QueueService';
import { ChatCompletionMessage, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';

interface SlideGenerationTask {
  title?: string;
  rawData: string;
  soWhat?: string;
  source?: string;
  audience?: string;
  style?: string;
  focusArea?: string;
  dataContext?: string;
}

interface SubTask {
  type: 'title' | 'keyPoints' | 'visualization' | 'summary' | 'recommendations';
  prompt: string;
  priority: number;
}

interface DataSummary {
  overview: string;
  keyMetrics: string[];
  trends: string[];
}

interface RequestConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

interface ConsultingFramework {
  type: 'mece' | 'pyramid' | 'hypothesis' | 'driver-tree';
  elements: string[];
}

interface ActionTitle {
  title: string;
  supportingData: string[];
  businessImplication: string;
}

interface VisualizationRecommendation {
  type: string;
  rationale: string;
  keyElements: string[];
  dataHighlights: string[];
  alternativeOptions?: string[];
}

interface OperationTiming {
  startTime: number;
  endTime?: number;
  duration?: number;
  operation: string;
  subOperations?: OperationTiming[];
}

export class SlideGenerationService {
  private openai: OpenAI;
  private static CHUNK_SIZE = 4000;
  private static MAX_RETRIES = 3;
  private static TIMEOUT = 30000;
  private static DEFAULT_MODEL = 'gpt-3.5-turbo';
  private modelCapabilities: Map<string, boolean> | null = null;
  private operationTimings: OperationTiming[] = [];
  private static readonly RETRY_DELAY = 1000;

  constructor(apiKey: string) {
    console.log('Initializing SlideGenerationService:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
      timestamp: new Date().toISOString()
    });

    if (!apiKey) {
      console.error('API Key Missing in Service Constructor');
      throw new Error('OpenAI API key is required to initialize the service');
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey,
        maxRetries: SlideGenerationService.MAX_RETRIES,
        timeout: SlideGenerationService.TIMEOUT
      });

      console.log('OpenAI Client Initialized:', {
        maxRetries: SlideGenerationService.MAX_RETRIES,
        timeout: SlideGenerationService.TIMEOUT,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('OpenAI Client Initialization Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to initialize OpenAI client: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    
    // Remove model capability testing from constructor
    this.modelCapabilities = new Map([
      ['gpt-3.5-turbo-basic', true],
      ['gpt-4-basic', true],
      ['gpt-3.5-turbo-16k-basic', true]
    ]);
  }

  private async validateConnection(): Promise<void> {
    try {
      // Simple test call to validate the API key
      await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      });
      console.log('OpenAI Connection Validated Successfully');
    } catch (error) {
      console.error('OpenAI Connection Validation Failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, retryCount = 0): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;

      console.log('OpenAI Operation Complete:', {
        durationMs: duration,
        retryCount,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error: any) {
      console.error('OpenAI Operation Failed:', {
            error: error.message,
        code: error.code,
            type: error.type,
        status: error.status,
        retryCount,
        timestamp: new Date().toISOString()
      });

      if (retryCount < SlideGenerationService.MAX_RETRIES && 
          (error.code === 'ECONNREFUSED' || 
           error.code === 'ENOTFOUND' || 
           error.status === 503)) {
        const delay = Math.min(SlideGenerationService.RETRY_DELAY * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, retryCount + 1);
      }

      throw error;
    }
  }

  private generateUUID(): string {
    // Generate 16 random bytes
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // Set version (4) and variant bits
    array[6] = (array[6] & 0x0f) | 0x40;  // Version 4
    array[8] = (array[8] & 0x3f) | 0x80;  // Variant 1
    
    // Convert to hex string with proper UUID format
    return Array.from(array)
      .map((b, i) => {
        const hex = b.toString(16).padStart(2, '0');
        // Add dashes according to UUID format
        if (i === 4 || i === 6 || i === 8 || i === 10) return '-' + hex;
        return hex;
      })
      .join('');
  }

  private startTiming(operation: string): OperationTiming {
    const timing: OperationTiming = {
      startTime: Date.now(),
      operation
    };
    this.operationTimings.push(timing);
    return timing;
  }

  private endTiming(timing: OperationTiming) {
    timing.endTime = Date.now();
    timing.duration = timing.endTime - timing.startTime;
    console.log(`API Operation Timing - ${timing.operation}:`, {
      durationMs: timing.duration,
      timestamp: new Date().toISOString()
    });
  }

  // Add helper method to clean JSON responses
  private cleanJsonResponse(content: string): string {
    // Remove markdown code blocks if present
    if (content.includes('```')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
    // Remove any leading/trailing whitespace
    content = content.trim();
    
    // If the content starts with a newline or contains markdown, clean it
    if (content.startsWith('\n') || content.includes('```')) {
      content = content.replace(/^\n+|\n+$/g, '');
    }
    
    // Attempt to find JSON object if there's additional text
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      content = content.slice(jsonStart, jsonEnd + 1);
    }
    
    return content;
  }

  private async executeSubTask(subTask: SubTask): Promise<any> {
    const timing = this.startTiming(`subtask_${subTask.type}`);
    try {
      const modelToUse = this.selectAppropriateModel(subTask.type);

      console.log('SubTask Request:', {
        type: subTask.type,
        model: modelToUse,
        promptLength: subTask.prompt.length,
        timestamp: new Date().toISOString()
      });

      const response = await this.executeWithRetry(() => 
        this.openai.chat.completions.create({
          model: modelToUse,
          messages: [
            { 
              role: 'system',
              content: 'You are an expert management consultant creating high-impact presentation slides. Respond with raw JSON only. Do not use markdown formatting, code blocks, or any other formatting. The response must be a valid JSON object that can be parsed directly.'
            },
            { 
              role: 'user',
              content: subTask.prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 400
        })
      );

      const rawContent = response.choices[0].message.content || '{}';
      
      // Log raw response for debugging
      console.log('Raw API Response:', {
        type: subTask.type,
        content: rawContent.slice(0, 100) + '...',
        hasMarkdown: rawContent.includes('```'),
        timestamp: new Date().toISOString()
      });

      // Clean response if needed
      const cleanContent = this.cleanJsonResponse(rawContent);
      
      try {
        const jsonResponse = JSON.parse(cleanContent);
        return {
          type: subTask.type,
          content: JSON.stringify(jsonResponse),
          timing: timing
        };
      } catch (e) {
        console.error('JSON Parsing Error:', {
          type: subTask.type,
          error: e instanceof Error ? e.message : 'Unknown error',
          rawContent: rawContent.slice(0, 100) + '...',
          cleanContent: cleanContent.slice(0, 100) + '...',
          timestamp: new Date().toISOString()
        });
        return {
          type: subTask.type,
          content: JSON.stringify(this.getFallbackResponse(subTask.type)),
          timing: timing
        };
      }
    } catch (error: any) {
      console.error('SubTask Error:', {
        type: subTask.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      this.endTiming(timing);
    }
  }

  private getFallbackResponse(type: SubTask['type']) {
    const fallbacks = {
      title: { title: 'Analysis Results' },
      keyPoints: { points: ['Data analysis in progress'] },
      recommendations: { recommendations: ['Analysis pending'] },
      visualization: { type: 'Bar Chart', keyElements: [] },
      summary: { overview: 'Analysis pending', keyPoints: [] }
    };
    return fallbacks[type];
  }

  private normalizeResponse(type: SubTask['type'], response: any): any {
    // Ensure consistent response structure
    switch (type) {
      case 'title':
        return {
          title: response.title || 'Analysis Results'
        };
      case 'keyPoints':
        // Handle both points and key_points formats
        return {
          points: response.points || response.key_points || ['No key points available']
        };
      case 'visualization':
        return {
          type: response.type || 'Bar Chart',
          keyElements: response.keyElements || []
        };
      case 'recommendations':
        // Handle both array and object formats
        const recs = Array.isArray(response.recommendations) 
          ? response.recommendations 
          : [response.recommendations];
        return {
          recommendations: recs.map((r: any) => typeof r === 'object' ? r.description || r : r)
        };
      default:
        return response;
    }
  }

  private async validatePromptEffectiveness(prompt: string, response: any): Promise<void> {
    try {
        // Log prompt characteristics
        console.log('Prompt Analysis:', {
            type: 'diagnostic',
            promptLength: prompt.length,
            containsFramework: prompt.includes('framework'),
            containsMetrics: prompt.includes('metrics'),
            containsContext: prompt.includes('Context:'),
            timestamp: new Date().toISOString()
        });

        // Log response quality metrics
        console.log('Response Quality Metrics:', {
            type: 'diagnostic',
            hasActionableInsight: response.title?.length > 50,
            containsNumbers: /\d+/.test(response.title || ''),
            hasComparison: /increased|decreased|grew|declined|compared|versus|vs\./.test(response.title || ''),
            hasBusinessImplication: /suggest|indicate|reveal|demonstrate|imply/.test(response.title || ''),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Prompt validation error:', error);
    }
  }

  private async testTwoPassAnalysis(data: string): Promise<void> {
    try {
        const startTime = Date.now();
        
        // Log first pass metrics
        console.log('First Pass Analysis:', {
            type: 'diagnostic',
            dataSize: data.length,
            processingTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
        });

        // Log second pass refinement
        console.log('Second Pass Refinement:', {
            type: 'diagnostic',
            refinementTime: Date.now() - startTime,
            totalProcessingTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Two-pass analysis validation error:', error);
    }
  }

  private async summarizeData(data: string): Promise<DataSummary> {
    try {
      console.log('Starting data summarization...', {
        type: 'diagnostic',
        dataLength: data.length,
        timestamp: new Date().toISOString()
      });

      const messages = [
        {
          role: 'system' as const,
          content: `You are an expert data analyst. You must respond with valid JSON following this exact format:
          {
            "overview": "brief overview text",
            "keyMetrics": ["metric1", "metric2"],
            "trends": ["trend1", "trend2"]
          }`
        },
        {
          role: 'user' as const,
          content: `Analyze this data: ${data}`
        }
      ];

      const requestConfig = {
        model: 'gpt-3.5-turbo-16k',
        maxTokens: 500,
        temperature: 0.3,
        messages
      };

      console.log('Data Summarization Request Config:', requestConfig);

      const response = await this.openai.chat.completions.create({
        model: requestConfig.model,
        messages: requestConfig.messages,
        temperature: requestConfig.temperature,
        max_tokens: requestConfig.maxTokens
      });

      console.log('OpenAI API Response Metadata:', {
        model: response.model,
        objectType: response.object,
        completionTokens: response.usage?.completion_tokens,
        promptTokens: response.usage?.prompt_tokens
      });

      const content = response.choices[0].message.content || '{}';
      try {
        return JSON.parse(content);
      } catch (e) {
        console.error('JSON parsing error:', e);
        return {
          overview: '',
          keyMetrics: [],
          trends: []
        };
      }
    } catch (error: any) {
      console.error('Data summarization error details:', {
        errorType: error.type,
        errorCode: error.code,
        errorParam: error.param,
        errorMessage: error.message,
        requestId: error.request_id,
        httpStatus: error.status
      });

      return {
        overview: '',
        keyMetrics: [],
        trends: []
      };
    }
  }

  private splitData(data: string): string[] {
    // Improved data splitting that preserves data structure
    const lines = data.split('\n');
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;
    const header = lines[0]; // Preserve header for each chunk

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (currentLength + line.length > SlideGenerationService.CHUNK_SIZE) {
        chunks.push([header, ...currentChunk].join('\n'));
        currentChunk = [line];
        currentLength = header.length + line.length;
      } else {
        currentChunk.push(line);
        currentLength += line.length;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push([header, ...currentChunk].join('\n'));
    }

    return chunks;
  }

  private getConsultingFramework(data: DataSummary): ConsultingFramework {
    // Determine best framework based on data characteristics
    const hasTrends = data.trends.length > 0;
    const hasMetrics = data.keyMetrics.length > 0;
    const hasComparisons = data.overview.includes('compared') || data.overview.includes('versus');

    if (hasTrends && hasMetrics) {
      return {
        type: 'driver-tree',
        elements: ['Metrics', 'Trends', 'Drivers', 'Implications']
      };
    } else if (hasComparisons) {
      return {
        type: 'mece',
        elements: ['Categories', 'Comparisons', 'Insights']
      };
    } else {
      return {
        type: 'pyramid',
        elements: ['Conclusion', 'Supporting Points', 'Data Foundation']
      };
    }
  }

  private async generateActionTitle(data: DataSummary, framework: ConsultingFramework): Promise<ActionTitle> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert management consultant crafting action-oriented slide titles. 
          You must respond with valid JSON following this exact format:
          {
            "title": "Your action-oriented title here",
            "supportingData": ["key data point 1", "key data point 2"],
            "businessImplication": "Clear business implication"
          }

          Follow these principles:
          1. Lead with the business implication
          2. Include specific numbers and trends
          3. Show clear cause-and-effect relationships
          4. Make it actionable and forward-looking
          5. Keep it under 2 lines but comprehensive
          Framework being used: ${framework.type}`
        },
        {
          role: 'user',
          content: `Create an action title based on this data summary:
          Overview: ${data.overview}
          Key Metrics: ${data.keyMetrics.join(', ')}
          Trends: ${data.trends.join(', ')}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const content = response.choices[0].message.content || '{}';
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error('JSON parsing error:', e);
      return {
        title: 'Analysis Results',
        supportingData: [],
        businessImplication: ''
      };
    }
  }

  private async recommendVisualization(data: DataSummary, framework: ConsultingFramework): Promise<VisualizationRecommendation> {
    console.log('Visualization Request Config:', {
      model: 'gpt-4',
      dataLength: JSON.stringify(data).length,
      frameworkType: framework.type,
      timestamp: new Date().toISOString()
    });

    try {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert in data visualization following consulting best practices.
            You must respond with valid JSON following this exact format:
            {
              "type": "chart_type",
              "rationale": "explanation",
              "keyElements": ["element1", "element2"],
              "dataHighlights": ["highlight1", "highlight2"],
              "alternativeOptions": ["option1", "option2"]
            }
            
          Key principles:
          1. Highlight what's important - guide the reader to essential messages
          2. Use bold elements only for emphasis
          3. Ensure self-explanatory visualizations
          4. Avoid pie charts unless absolutely necessary
          5. Consider the story you're telling`
        },
        {
          role: 'user',
          content: `Recommend the best visualization based on:
          Overview: ${data.overview}
          Key Metrics: ${data.keyMetrics.join(', ')}
          Trends: ${data.trends.join(', ')}
            Framework: ${framework.type}`
        }
      ],
      temperature: 0.7,
        max_tokens: 500
      });

      console.log('Visualization Response Details:', {
        model: response.model,
        responseLength: response.choices[0].message.content?.length || 0,
        isValidJson: this.isValidJson(response.choices[0].message.content || ''),
        timestamp: new Date().toISOString()
    });

    return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error: any) {
      console.error('Visualization Error Details:', {
        errorType: error.type,
        errorCode: error.code,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Add helper method for JSON validation
  private isValidJson(str: string): boolean {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
  }

  private async createSubTasks(task: SlideGenerationTask): Promise<SubTask[]> {
    const timing = this.startTiming('create_subtasks');
    try {
      console.log('Starting SubTasks Creation:', {
        dataLength: task.rawData.length,
        timestamp: new Date().toISOString()
      });

      // Run data analysis and visualization tasks in parallel
      const [analysisResult, visualizationResult] = await Promise.all([
        // Data Analysis Task
        this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert data analyst and management consultant. Respond with raw JSON only. Do not use markdown formatting or code blocks. The response must be a valid JSON object that can be parsed directly.'
            },
            {
              role: 'user',
              content: `Analyze this data and respond with a JSON object in this exact format (no markdown, no code blocks):
              {
                "overview": "brief overview text",
                "keyMetrics": ["metric1", "metric2"],
                "trends": ["trend1", "trend2"],
                "framework": {
                  "type": "pyramid|mece|driver-tree",
                  "elements": ["element1", "element2"]
                }
              }
              
              Data: ${task.rawData}`
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        }),
        
        // Visualization Task
        this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
              content: 'You are an expert in data visualization. Respond with raw JSON only. Do not use markdown formatting or code blocks. The response must be a valid JSON object that can be parsed directly.'
          },
          { 
            role: 'user', 
              content: `Recommend a visualization by responding with a JSON object in this exact format (no markdown, no code blocks):
              {
                "type": "chart_type",
                "keyElements": ["element1", "element2"]
              }
              
              Data: ${task.rawData}`
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      ]);

      // Log raw responses
      const analysisRaw = analysisResult.choices[0].message.content || '{}';
      const visualizationRaw = visualizationResult.choices[0].message.content || '{}';

      console.log('Analysis Raw Response:', {
        content: analysisRaw.slice(0, 100) + '...',
        hasMarkdown: analysisRaw.includes('```'),
        length: analysisRaw.length,
        timestamp: new Date().toISOString()
      });

      console.log('Visualization Raw Response:', {
        content: visualizationRaw.slice(0, 100) + '...',
        hasMarkdown: visualizationRaw.includes('```'),
        length: visualizationRaw.length,
        timestamp: new Date().toISOString()
      });

      // Clean and parse responses
      const analysisClean = this.cleanJsonResponse(analysisRaw);
      const visualizationClean = this.cleanJsonResponse(visualizationRaw);

      console.log('Cleaned Responses:', {
        analysisModified: analysisRaw !== analysisClean,
        visualizationModified: visualizationRaw !== visualizationClean,
        timestamp: new Date().toISOString()
      });

      const analysis = JSON.parse(analysisClean);
      const visualization = JSON.parse(visualizationClean);
      
      // Create optimized subtasks with pre-analyzed data
      const subTasks: SubTask[] = [
        {
          type: 'title',
          prompt: `Create a title based on this JSON data (respond with raw JSON, no markdown): ${JSON.stringify({
            overview: analysis.overview,
            metrics: analysis.keyMetrics,
            framework: analysis.framework
          })}`,
          priority: 4
        },
        {
          type: 'keyPoints',
          prompt: `Generate 3 key points based on this JSON data (respond with raw JSON, no markdown): ${JSON.stringify({
            metrics: analysis.keyMetrics,
            trends: analysis.trends
          })}`,
          priority: 3
        },
        {
          type: 'visualization',
          prompt: `Use this visualization config (respond with raw JSON, no markdown): ${JSON.stringify(visualization)}`,
          priority: 2
        },
        {
          type: 'recommendations',
          prompt: `Provide 2 recommendations based on this overview (respond with raw JSON, no markdown): ${analysis.overview}`,
          priority: 1
        }
      ];

      return subTasks;
    } catch (error: any) {
      console.error('SubTasks Creation Error:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      this.endTiming(timing);
    }
  }

  async generateSlide(task: SlideGenerationTask) {
    const timing = this.startTiming('generate_slide');
    const taskId = this.generateUUID();
    
    try {
      const subTaskTiming = this.startTiming('create_subtasks');
      const subTasks = await this.createSubTasks(task);
      this.endTiming(subTaskTiming);

      console.log('Starting Parallel Processing:', {
        numberOfTasks: subTasks.length,
        taskTypes: subTasks.map(t => t.type),
        timestamp: new Date().toISOString()
      });

      const processingTiming = this.startTiming('process_subtasks');
      const results = await Promise.all(
        subTasks.map(subTask => 
              queueService.enqueue(
                `${taskId}-${subTask.type}`,
                () => this.executeSubTask(subTask),
                subTask.priority
              )
            )
          );
      this.endTiming(processingTiming);

      // Parse and normalize results
      const titleResult = results.find(r => r.type === 'title');
      const keyPointsResult = results.find(r => r.type === 'keyPoints');
      const visualizationResult = results.find(r => r.type === 'visualization');
      const recommendationsResult = results.find(r => r.type === 'recommendations');

      console.log('Raw Results:', {
        title: titleResult?.content,
        keyPoints: keyPointsResult?.content,
        visualization: visualizationResult?.content,
        recommendations: recommendationsResult?.content,
        timestamp: new Date().toISOString()
      });

      // Parse and normalize each result
      const parsedTitle = this.normalizeResponse('title', 
        this.safeJsonParse(titleResult?.content, this.getFallbackResponse('title'))
      );
      
      const parsedKeyPoints = this.normalizeResponse('keyPoints',
        this.safeJsonParse(keyPointsResult?.content, this.getFallbackResponse('keyPoints'))
      );
      
      const parsedVisualization = this.normalizeResponse('visualization',
        this.safeJsonParse(visualizationResult?.content, this.getFallbackResponse('visualization'))
      );
      
      const parsedRecommendations = this.normalizeResponse('recommendations',
        this.safeJsonParse(recommendationsResult?.content, this.getFallbackResponse('recommendations'))
      );

      console.log('Normalized Results:', {
        title: parsedTitle,
        keyPoints: parsedKeyPoints,
        visualization: parsedVisualization,
        recommendations: parsedRecommendations,
        timestamp: new Date().toISOString()
      });

      const result = {
        title: parsedTitle.title,
        subtitle: task.soWhat || 'Key Insights',
        visualType: parsedVisualization.type,
        visualHighlights: parsedVisualization.keyElements,
        keyPoints: (parsedKeyPoints.points || []).slice(0, 3),
        recommendations: (parsedRecommendations.recommendations || []).slice(0, 2),
        source: task.source || 'Data Analysis',
        audience: task.audience || 'General business audience',
        style: task.style || 'Professional'
      };

      return result;
    } catch (error: any) {
      console.error('Slide Generation Error:', {
        error: error.message,
        timings: this.operationTimings,
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      this.endTiming(timing);
    }
  }

  private selectAppropriateModel(taskType: SubTask['type']): string {
    // Use faster models by default
    return 'gpt-3.5-turbo';
  }

  // Helper method for safe JSON parsing
  private safeJsonParse(content: string | undefined, defaultValue: any): any {
    if (!content) return defaultValue;
    try {
        return JSON.parse(content);
    } catch (e) {
        return defaultValue;
    }
  }
}

export const createSlideGenerationService = (apiKey: string) => {
  return new SlideGenerationService(apiKey);
}; 