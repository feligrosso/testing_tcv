import OpenAI from 'openai';
import { queueService } from './QueueService';
import { randomUUID } from 'crypto';
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

export class SlideGenerationService {
  private openai: OpenAI;
  private static CHUNK_SIZE = 2000;
  private static MAX_RETRIES = 3;
  private static TIMEOUT = 60000;
  private static DEFAULT_MODEL = 'gpt-3.5-turbo';
  private modelCapabilities: Map<string, boolean> | null = null;

  constructor() {
    // Vercel environment validation
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 0,
      timeout: SlideGenerationService.TIMEOUT,
    });
    
    // Enhanced initialization logging
    console.log('OpenAI Service Details:', {
      baseURL: this.openai.baseURL,
      defaultModel: SlideGenerationService.DEFAULT_MODEL,
      timestamp: new Date().toISOString()
    });

    // Test model capabilities
    this.validateModelCapabilities();
  }

  private async validateModelCapabilities() {
    try {
      const models = ['gpt-3.5-turbo', 'gpt-4', 'gpt-3.5-turbo-16k'];
      const capabilities = new Map<string, boolean>();

      for (const model of models) {
        try {
          // Only test basic completion
          const basicTest = await this.openai.chat.completions.create({
            model,
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 5
          });
          capabilities.set(`${model}-basic`, true);
        } catch (error: any) {
          capabilities.set(`${model}-basic`, false);
          console.error(`Model ${model} test failed:`, error.message);
        }
      }

      console.log('Model Capabilities Analysis:', {
        capabilities: Object.fromEntries(capabilities),
        timestamp: new Date().toISOString()
      });

      // Store results for later use
      this.modelCapabilities = capabilities;
    } catch (error: any) {
      console.error('Model capability validation failed:', {
        error: error.message,
        type: error.type,
        code: error.code,
        timestamp: new Date().toISOString()
      });
    }
  }

  private generateTaskId(task: SlideGenerationTask): string {
    // Use randomUUID instead of crypto.createHash for better compatibility
    return randomUUID();
  }

  private async executeSubTask(subTask: SubTask): Promise<any> {
    const startTime = Date.now();
    try {
      const modelToUse = this.selectAppropriateModel(subTask.type);

      const requestConfig: ChatCompletionCreateParamsNonStreaming = {
        model: modelToUse,
        messages: [
          { 
            role: 'system' as const, 
            content: `You are an expert management consultant creating high-impact presentation slides.
            You must respond with valid JSON exactly matching the format specified in the user's prompt.
            Do not include any additional text or explanations outside the JSON structure.` 
          },
          { 
            role: 'user' as const, 
            content: subTask.prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 400
      };

      console.log('SubTask Request Details:', {
        type: subTask.type,
        model: modelToUse,
        timestamp: new Date().toISOString(),
        promptLength: subTask.prompt.length
      });

      const response = await this.openai.chat.completions.create(requestConfig);
      
      console.log('SubTask Response Details:', {
        type: subTask.type,
        model: response.model,
        responseLength: response.choices[0].message.content?.length || 0,
        finishReason: response.choices[0].finish_reason,
        timestamp: new Date().toISOString()
      });

      const content = response.choices[0].message.content || '{}';
      
      try {
        const jsonResponse = JSON.parse(content);
        return {
          type: subTask.type,
          content: JSON.stringify(jsonResponse)
        };
      } catch (e) {
        console.error('Invalid JSON response:', {
          content: content.slice(0, 100) + '...',
          error: e instanceof Error ? e.message : 'Unknown error'
        });
        return {
          type: subTask.type,
          content: JSON.stringify(this.getFallbackResponse(subTask.type))
        };
      }
    } catch (error: any) {
      console.error('SubTask Error Details:', {
        type: subTask.type,
        errorType: error.type,
        errorCode: error.code,
        errorMessage: error.message,
        modelUsed: this.selectAppropriateModel(subTask.type),
        timestamp: new Date().toISOString()
      });

      return {
        type: subTask.type,
        content: JSON.stringify(this.getFallbackResponse(subTask.type))
      };
    }
  }

  private getFallbackResponse(type: SubTask['type']) {
    const fallbacks = {
      title: { title: 'Analysis Results' },
      keyPoints: { points: ['Data analysis in progress'] },
      recommendations: { recommendations: ['Analysis pending'] },
      visualization: { visualType: 'Bar Chart', highlights: [] },
      summary: { overview: 'Analysis pending', keyPoints: [] }
    };
    return fallbacks[type];
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
    // Run initial analysis in parallel
    const [dataSummary, framework] = await Promise.all([
        this.summarizeData(task.rawData),
        this.getConsultingFramework({
            overview: '',
            keyMetrics: [],
            trends: []
        }) // Start with empty summary to avoid waiting
    ]);

    // Run second phase analysis in parallel
    const [actionTitle, visualization] = await Promise.all([
        this.generateActionTitle(dataSummary, framework),
        this.recommendVisualization(dataSummary, framework)
    ]);
    
    const dataChunks = this.splitData(task.rawData);
    const subTasks: SubTask[] = [];

    const contextPrompt = `
Context:
- Audience: ${task.audience || 'General business audience'}
- Style: ${task.style || 'Professional'}
- Focus Area: ${task.focusArea || 'General analysis'}
- Data Context: ${task.dataContext || 'Business data'}
- Framework: ${framework.type}
- Business Implication: ${actionTitle.businessImplication}
`;

    // Simplified prompts for faster processing
    subTasks.push({
        type: 'title',
        prompt: `Create a concise JSON title response: {"title": "${actionTitle.title}", "supportingPoints": ${JSON.stringify(actionTitle.supportingData)}}`,
        priority: 4
    });

    // Process only the first chunk for speed
    const firstChunk = dataChunks[0];
    subTasks.push({
        type: 'keyPoints',
        prompt: `Generate a JSON with 3 key insights. Format: {"points": ["Point 1", "Point 2", "Point 3"]}. Data: ${firstChunk}`,
        priority: 3
    });

    subTasks.push({
        type: 'visualization',
        prompt: `Create JSON visualization spec: {"visualType": "${visualization.type}", "highlights": ${JSON.stringify(visualization.keyElements)}}`,
        priority: 2
    });

    subTasks.push({
        type: 'recommendations',
        prompt: `Create JSON with 2 recommendations: {"recommendations": ["Recommendation 1", "Recommendation 2"]}`,
        priority: 1
    });

    return subTasks;
  }

  async generateSlide(task: SlideGenerationTask) {
    const taskId = this.generateTaskId(task);
    
    try {
        // Create subtasks with optimized prompts
        const subTasks = await this.createSubTasks(task);
        
        // Process all tasks in parallel for speed
        const results = await Promise.all(
            subTasks.map(subTask => 
                queueService.enqueue(
                    `${taskId}-${subTask.type}`,
                    () => this.executeSubTask(subTask),
                    subTask.priority
                )
            )
        );

        // Parse results
        const titleResult = results.find(r => r.type === 'title')?.content;
        const keyPointsResult = results.find(r => r.type === 'keyPoints')?.content;
        const visualizationResult = results.find(r => r.type === 'visualization')?.content;
        const recommendationsResult = results.find(r => r.type === 'recommendations')?.content;

        // Use faster parsing with default values
        const parsedTitle = this.safeJsonParse(titleResult, { title: task.title || 'Analysis Results', supportingPoints: [] });
        const parsedKeyPoints = this.safeJsonParse(keyPointsResult, { points: [] });
        const parsedVisualization = this.safeJsonParse(visualizationResult, { visualType: 'Bar Chart', highlights: [] });
        const parsedRecommendations = this.safeJsonParse(recommendationsResult, { recommendations: [] });

        return {
            title: parsedTitle.title,
            subtitle: task.soWhat || 'Key Insights',
            visualType: parsedVisualization.visualType,
            visualHighlights: parsedVisualization.highlights,
            keyPoints: parsedKeyPoints.points.slice(0, 3),
            recommendations: parsedRecommendations.recommendations.slice(0, 2),
            source: task.source || 'Data Analysis',
            audience: task.audience || 'General business audience',
            style: task.style || 'Professional'
        };
    } catch (error: any) {
        console.error('Slide generation error:', error);
        throw new Error(`Slide generation failed: ${error.message}`);
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

export const slideGenerationService = new SlideGenerationService(); 