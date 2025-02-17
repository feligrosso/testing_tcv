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
    console.log('Initializing with API key:', {
        keyLength: apiKey?.length,
        isProjectKey: apiKey?.startsWith('sk-proj-'),
        timestamp: new Date().toISOString()
    });

    if (!apiKey) {
        console.error('API Key Missing in Service Constructor');
        throw new Error('OpenAI API key is required to initialize the service');
    }

    try {
        // Initialize OpenAI client with project-scoped key support
        this.openai = new OpenAI({
            apiKey: apiKey,
            maxRetries: SlideGenerationService.MAX_RETRIES,
            timeout: SlideGenerationService.TIMEOUT,
            defaultHeaders: {
                'OpenAI-Beta': 'all-v1'
            }
        });

        console.log('OpenAI Client Initialized:', {
            maxRetries: SlideGenerationService.MAX_RETRIES,
            timeout: SlideGenerationService.TIMEOUT,
            isProjectKey: apiKey.startsWith('sk-proj-'),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('OpenAI Client Initialization Error:', {
            error: error instanceof Error ? {
                message: error.message,
                name: error.name
            } : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        throw error;
    }
    
    this.modelCapabilities = new Map([
        ['gpt-3.5-turbo-basic', true],
        ['gpt-4-basic', true],
        ['gpt-3.5-turbo-16k-basic', true]
    ]);
  }

  private async validateConnection(): Promise<void> {
    try {
        console.log('Attempting API Connection Validation:', {
            timestamp: new Date().toISOString(),
            apiKeyFormat: {
                prefix: this.openai.apiKey?.substring(0, 7),
                length: this.openai.apiKey?.length
            }
        });

        // Simple test call to validate the API key
        const response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 5
        });

        console.log('OpenAI Connection Validated Successfully:', {
            model: response.model,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('OpenAI Connection Validation Failed:', {
            error: {
                message: error.message,
                type: error.type,
                status: error.status,
                code: error.code
            },
            apiKeyDetails: {
                prefix: this.openai.apiKey?.substring(0, 7),
                length: this.openai.apiKey?.length,
                isStandardFormat: this.openai.apiKey?.startsWith('sk-') && !this.openai.apiKey?.startsWith('sk-proj-')
            },
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
    const timing = this.startTiming('generateActionTitle');
    
    try {
        const prompt = `As a McKinsey-trained management consultant, analyze this data and create a compelling action title that demonstrates clear strategic reasoning. Follow these specific guidelines:

1. Title Structure (Critical):
   - Start with the key quantitative insight (specific numbers, time periods, changes)
   - Follow with the strategic implication or "so what"
   - Make it a complete, insight-driven sentence that tells a story
   - Example: "Between 2015 and 2025, Puerto Rico's applicants rose from 590 to 694, while matriculants climbed from 273 to 337, reflecting stable local demand that supports feasibility for a new medical program"

2. Reasoning Requirements:
   - Show clear cause-and-effect relationships
   - Connect data points to form a compelling narrative
   - Demonstrate strategic thinking (e.g., "this strong local preference suggests an opportunity")
   - Example: "Using a 492 MCAT and 3 GPA cutoff, about 59% of local applicants—around 452 individuals—meet both criteria, clarifying the potential talent pool and helping plan capacity"

3. Supporting Data Structure:
   - Each data point must directly support your reasoning
   - Present data in a logical flow that builds your argument
   - Include specific numbers that appear in your title
   - Example: 
     * "576 total applicants in 2024-2025"
     * "56% enrolled in-state, 44% went elsewhere"
     * "This indicates strong local preference"

4. Business Implication:
   - Must be actionable and forward-looking
   - Connect to strategic decision-making
   - Support resource allocation or planning decisions
   - Example: "This consistent student base informs feasibility and enrollment forecasts for a new medical program"

Data Summary:
${JSON.stringify(data, null, 2)}

Consulting Framework:
${JSON.stringify(framework, null, 2)}

Format the response as JSON with these exact fields:
{
    "title": "Your data-driven, reasoning-based action title here",
    "supportingData": [
        "Specific quantitative point 1 that builds your argument",
        "Specific quantitative point 2 that builds your argument",
        "Specific quantitative point 3 that builds your argument"
    ],
    "businessImplication": "Clear, actionable strategic implication"
}`;

        const response = await this.executeWithRetry(() =>
            this.openai.chat.completions.create({
                model: 'gpt-4',  // Using GPT-4 for better reasoning
                messages: [
                    {
                        role: 'system',
                        content: 'You are a McKinsey-trained management consultant skilled in data-driven storytelling and strategic reasoning. Your action titles must demonstrate clear analytical thinking and strategic implications.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        );

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Failed to generate action title');
        }

        const result = this.safeJsonParse(content, {
            title: 'Data Analysis Results',
            supportingData: [],
            businessImplication: 'Further analysis needed'
        });

        // Enhanced validation for reasoning and insights
        await this.validateActionTitleReasoning(result);

        this.endTiming(timing);
        return result;
    } catch (error) {
        console.error('Action Title Generation Error:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        this.endTiming(timing);
        return {
            title: 'Data Analysis Results',
            supportingData: [
                'Analysis completed successfully',
                'Review data for specific insights'
            ],
            businessImplication: 'Further analysis recommended for detailed insights'
        };
    }
  }

  private async validateActionTitleReasoning(actionTitle: ActionTitle): Promise<void> {
    const validationPrompt = `Validate this action title's reasoning and strategic insight:

Action Title: "${actionTitle.title}"
Supporting Data: ${JSON.stringify(actionTitle.supportingData)}
Business Implication: "${actionTitle.businessImplication}"

Evaluate against these criteria:
1. Quantitative Reasoning
   - Contains specific numbers and metrics
   - Shows clear data relationships
   - Demonstrates trend analysis

2. Strategic Thinking
   - Clear cause-and-effect logic
   - Business implications are actionable
   - Supports decision-making

3. Narrative Quality
   - Tells a compelling story
   - Flows logically
   - Connects data to strategy

4. Supporting Evidence
   - Data points directly prove the title
   - Logical progression of evidence
   - No unsupported claims

Return JSON: { 
    "isValid": boolean, 
    "feedback": string[],
    "reasoningScore": number,
    "strategicScore": number,
    "narrativeScore": number
}`;

    const response = await this.executeWithRetry(() =>
        this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'You are a senior McKinsey partner who reviews consulting deliverables for analytical rigor and strategic insight.'
                },
                {
                    role: 'user',
                    content: validationPrompt
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
        return;
    }

    const validation = this.safeJsonParse(content, { 
        isValid: true, 
        feedback: [],
        reasoningScore: 0,
        strategicScore: 0,
        narrativeScore: 0
    });
    
    if (!validation.isValid || 
        validation.reasoningScore < 7 || 
        validation.strategicScore < 7 || 
        validation.narrativeScore < 7) {
        console.warn('Action Title Quality Warning:', {
            feedback: validation.feedback,
            scores: {
                reasoning: validation.reasoningScore,
                strategic: validation.strategicScore,
                narrative: validation.narrativeScore
            },
            title: actionTitle.title,
            timestamp: new Date().toISOString()
        });
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