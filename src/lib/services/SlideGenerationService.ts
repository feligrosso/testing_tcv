import OpenAI from 'openai';
import { queueService } from './QueueService';
import crypto from 'crypto';
import { ChatCompletionMessage } from 'openai/resources/chat/completions';

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
  private static CHUNK_SIZE = 2000; // Increased for better context
  private static MAX_RETRIES = 3;
  private static TIMEOUT = 60000; // Increased timeout

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 0,
      timeout: SlideGenerationService.TIMEOUT,
    });
    
    // Add version validation logging
    console.log('OpenAI Service Initialization:', {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV
    });

    // Validate response format support
    this.validateResponseFormatSupport();

    // Enhanced diagnostic logging
    try {
      console.log('Build Environment:', {
        nodeEnv: process.env.NODE_ENV,
        nextVersion: process.env.NEXT_VERSION,
        buildTime: new Date().toISOString()
      });

      // Log OpenAI instance details without accessing package.json
      console.log('OpenAI Configuration:', {
        timeout: SlideGenerationService.TIMEOUT,
        defaultModel: 'gpt-3.5-turbo',
        apiEndpoint: this.openai.baseURL // Log base URL to verify configuration
      });

      // Validate OpenAI client initialization
      this.validateOpenAIClient();
    } catch (error) {
      console.error('Initialization diagnostic error:', error);
    }
  }

  private async validateResponseFormatSupport() {
    try {
        // Test API with JSON response format
        const testResponse = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Reply with: {"test": true}' }],
            max_tokens: 50,
            response_format: { type: "json_object" }
        });
        console.log('Response Format Support:', {
            supported: true,
            responseType: typeof testResponse.choices[0].message.content,
            isValidJSON: this.isValidJSON(testResponse.choices[0].message.content || '')
        });
    } catch (error: any) {
        console.error('Response Format Support Test Failed:', {
            error: error.message,
            type: error.type,
            code: error.code,
            stack: error.stack
        });
    }
  }

  private isValidJSON(str: string): boolean {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
  }

  private async validateOpenAIClient() {
    try {
      // Test API connectivity with minimal request
      const modelList = await this.openai.models.list();
      console.log('Available Models:', modelList.data.map(model => model.id));
    } catch (error) {
      console.error('OpenAI client validation error:', error);
    }
  }

  private generateTaskId(task: SlideGenerationTask): string {
    const data = JSON.stringify({
      title: task.title,
      rawData: task.rawData,
      soWhat: task.soWhat,
      source: task.source,
      audience: task.audience,
      style: task.style,
      focusArea: task.focusArea,
      dataContext: task.dataContext
    });
    return crypto.createHash('md5').update(data).digest('hex');
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

      // Log model and request configuration
      const messages = [
        {
          role: 'system' as const,
          content: 'You are an expert data analyst. Analyze the data and provide a JSON summary with key metrics, trends, and an overview.'
        },
        {
          role: 'user' as const,
          content: `Please analyze this data and provide a JSON response with format: {"overview": "brief overview", "keyMetrics": ["metric1", "metric2"], "trends": ["trend1", "trend2"]}. Data: ${data}`
        }
      ];

      const requestConfig = {
        model: 'gpt-3.5-turbo-16k',
        maxTokens: 500,
        temperature: 0.3,
        messages
      };

      console.log('Data Summarization Request Config:', requestConfig);

      // Attempt API call
      console.log('Initiating OpenAI API call for data summarization...');
      const response = await this.openai.chat.completions.create({
        model: requestConfig.model,
        messages: requestConfig.messages,
        temperature: requestConfig.temperature,
        max_tokens: requestConfig.maxTokens,
        response_format: { type: "json_object" } as const
      });

      // Log successful response metadata
      console.log('OpenAI API Response Metadata:', {
        model: response.model,
        objectType: response.object,
        completionTokens: response.usage?.completion_tokens,
        promptTokens: response.usage?.prompt_tokens
      });

      // Add validation logging
      await this.validatePromptEffectiveness(
        requestConfig.messages[1].content,
        response.choices[0].message
      );
      
      await this.testTwoPassAnalysis(data);

      return JSON.parse(response.choices[0].message.content || '{"overview":"","keyMetrics":[],"trends":[]}');
    } catch (error: any) {
      // Enhanced error logging
      console.error('Data summarization error details:', {
        errorType: error.type,
        errorCode: error.code,
        errorParam: error.param,
        errorMessage: error.message,
        requestId: error.request_id,
        httpStatus: error.status
      });

      // Log stack trace for unexpected errors
      if (!error.type || error.type !== 'invalid_request_error') {
        console.error('Unexpected error stack:', error.stack);
      }

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
          Trends: ${data.trends.join(', ')}
          
          Format response as JSON:
          {
            "title": "Your action-oriented title here",
            "supportingData": ["key data point 1", "key data point 2"],
            "businessImplication": "Clear business implication"
          }`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" } as const
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async recommendVisualization(data: DataSummary, framework: ConsultingFramework): Promise<VisualizationRecommendation> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert in data visualization following consulting best practices.
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
          Framework: ${framework.type}
          
          Format response as JSON:
          {
            "type": "Specific chart type",
            "rationale": "Why this visualization works best",
            "keyElements": ["What to emphasize"],
            "dataHighlights": ["Specific data points to highlight"],
            "alternativeOptions": ["Other possible visualizations"]
          }`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" } as const
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async createSubTasks(task: SlideGenerationTask): Promise<SubTask[]> {
    // First pass: Data summary and framework selection
    const dataSummary = await this.summarizeData(task.rawData);
    const framework = this.getConsultingFramework(dataSummary);
    
    // Second pass: Enhanced analysis with framework
    const actionTitle = await this.generateActionTitle(dataSummary, framework);
    const visualization = await this.recommendVisualization(dataSummary, framework);
    
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
- Key Metrics: ${dataSummary.keyMetrics.join(', ')}
- Trends: ${dataSummary.trends.join(', ')}
`;

    // Title generation (highest priority)
    subTasks.push({
      type: 'title',
      prompt: `Generate a JSON response with this action title and supporting elements. ${contextPrompt} Format: {"title": "${actionTitle.title}", "supportingPoints": ${JSON.stringify(actionTitle.supportingData)}}`,
      priority: 4
    });

    // Key points from each chunk (high priority)
    dataChunks.forEach((chunk, index) => {
      subTasks.push({
        type: 'keyPoints',
        prompt: `Generate a JSON response with key insights that support the main action title. Include specific numbers and trends. ${contextPrompt} Format: {"points": ["Point 1", "Point 2", "Point 3"]}. Data: ${chunk}`,
        priority: 3
      });
    });

    // Visualization recommendation (medium priority)
    subTasks.push({
      type: 'visualization',
      prompt: `Generate a JSON response with this visualization recommendation and elements to highlight. ${contextPrompt} Format: {"visualType": "${visualization.type}", "highlights": ${JSON.stringify(visualization.keyElements)}, "rationale": "${visualization.rationale}"}`,
      priority: 2
    });

    // Recommendations (lower priority)
    subTasks.push({
      type: 'recommendations',
      prompt: `Generate a JSON response with strategic recommendations that follow from the action title. ${contextPrompt} Format: {"recommendations": ["Recommendation 1", "Recommendation 2"]}. Supporting Data: ${actionTitle.supportingData.join(', ')}`,
      priority: 1
    });

    return subTasks;
  }

  private async executeSubTask(subTask: SubTask): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert management consultant creating high-impact presentation slides. Always respond with valid JSON following the exact format specified in the prompt.' 
          },
          { 
            role: 'user', 
            content: subTask.prompt 
          }
        ],
        temperature: 0.7,
        max_tokens: 400, // Increased for more detailed responses
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content || '{}';
      JSON.parse(content); // Validate JSON
      
      return {
        type: subTask.type,
        content
      };
    } catch (error: any) {
      console.error(`SubTask execution error (${subTask.type}):`, error);
      return {
        type: subTask.type,
        content: JSON.stringify(
          subTask.type === 'title' 
            ? { title: 'Analysis Results' }
            : subTask.type === 'keyPoints'
            ? { points: ['Data analysis in progress'] }
            : subTask.type === 'recommendations'
            ? { recommendations: ['Analysis pending'] }
            : { visualType: 'Bar Chart', highlights: [] }
        )
      };
    }
  }

  async generateSlide(task: SlideGenerationTask) {
    const taskId = this.generateTaskId(task);
    const subTasks = await this.createSubTasks(task);
    
    try {
      // Process tasks in priority order
      const results = [];
      const priorityGroups = new Map<number, SubTask[]>();
      
      // Group tasks by priority
      subTasks.forEach(task => {
        const tasks = priorityGroups.get(task.priority) || [];
        tasks.push(task);
        priorityGroups.set(task.priority, tasks);
      });

      // Process each priority group in sequence, but tasks within a group in parallel
      for (let priority = 4; priority >= 1; priority--) {
        const tasksInGroup = priorityGroups.get(priority) || [];
        if (tasksInGroup.length > 0) {
          const groupResults = await Promise.all(
            tasksInGroup.map(subTask => 
              queueService.enqueue(
                `${taskId}-${subTask.type}`,
                () => this.executeSubTask(subTask),
                subTask.priority
              )
            )
          );
          results.push(...groupResults);
        }
      }

      // Parse results
      const titleResult = results.find(r => r.type === 'title')?.content;
      const keyPointsResults = results.filter(r => r.type === 'keyPoints').map(r => r.content);
      const visualizationResult = results.find(r => r.type === 'visualization')?.content;
      const recommendationsResult = results.find(r => r.type === 'recommendations')?.content;

      const parsedVisualization = JSON.parse(visualizationResult || '{"visualType":"Bar Chart","highlights":[]}');
      const parsedRecommendations = JSON.parse(recommendationsResult || '{"recommendations":[]}');

      return {
        title: JSON.parse(titleResult || '{"title":"Analysis Results"}').title || task.title || 'Analysis Results',
        subtitle: task.soWhat || 'Key Insights',
        visualType: parsedVisualization.visualType || 'Bar Chart',
        visualHighlights: parsedVisualization.highlights || [],
        keyPoints: keyPointsResults.flatMap(result => {
          try {
            const parsed = JSON.parse(result);
            return parsed.points || [];
          } catch (e) {
            return [];
          }
        }).slice(0, 5), // Increased to 5 key points
        recommendations: parsedRecommendations.recommendations || [],
        source: task.source || 'Data Analysis',
        audience: task.audience || 'General business audience',
        style: task.style || 'Professional'
      };
    } catch (error: any) {
      console.error('Slide generation error:', error);
      throw new Error(`Slide generation failed: ${error.message}`);
    }
  }
}

export const slideGenerationService = new SlideGenerationService(); 