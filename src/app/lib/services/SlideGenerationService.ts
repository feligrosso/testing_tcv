import OpenAI from 'openai';
import { queueService } from './QueueService';
import crypto from 'crypto';

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

  private async summarizeData(data: string): Promise<DataSummary> {
    try {
      // Log model and request configuration
      const requestConfig = {
        model: 'gpt-3.5-turbo-16k',
        maxTokens: 500,
        temperature: 0.3,
        responseFormat: { type: "json_object" }
      };
      console.log('Data Summarization Request Config:', requestConfig);

      // Attempt API call
      console.log('Initiating OpenAI API call for data summarization...');
      const response = await this.openai.chat.completions.create({
        model: requestConfig.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert data analyst. Analyze the data and provide a JSON summary with key metrics, trends, and an overview.'
          },
          {
            role: 'user',
            content: `Please analyze this data and provide a JSON response with format: {"overview": "brief overview", "keyMetrics": ["metric1", "metric2"], "trends": ["trend1", "trend2"]}. Data: ${data}`
          }
        ],
        temperature: requestConfig.temperature,
        max_tokens: requestConfig.maxTokens,
        response_format: requestConfig.responseFormat
      });

      // Log successful response metadata
      console.log('OpenAI API Response Metadata:', {
        model: response.model,
        objectType: response.object,
        completionTokens: response.usage?.completion_tokens,
        promptTokens: response.usage?.prompt_tokens
      });

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

  private async createSubTasks(task: SlideGenerationTask): Promise<SubTask[]> {
    const dataSummary = await this.summarizeData(task.rawData);
    const dataChunks = this.splitData(task.rawData);
    const subTasks: SubTask[] = [];

    const contextPrompt = `
Context:
- Audience: ${task.audience || 'General business audience'}
- Style: ${task.style || 'Professional'}
- Focus Area: ${task.focusArea || 'General analysis'}
- Data Context: ${task.dataContext || 'Business data'}
- Key Metrics: ${dataSummary.keyMetrics.join(', ')}
- Trends: ${dataSummary.trends.join(', ')}
`;

    // Title generation (highest priority)
    subTasks.push({
      type: 'title',
      prompt: `Generate a JSON response with a compelling, action-oriented title that highlights the main insight. ${contextPrompt} Data Overview: ${dataSummary.overview}. Format: {"title": "Your Title Here"}`,
      priority: 4
    });

    // Key points from each chunk (high priority)
    dataChunks.forEach((chunk, index) => {
      subTasks.push({
        type: 'keyPoints',
        prompt: `Generate a JSON response with key insights from this data chunk. Include specific numbers and actionable insights. ${contextPrompt} Format: {"points": ["Point 1", "Point 2", "Point 3"]}. Data: ${chunk}`,
        priority: 3
      });
    });

    // Visualization recommendation (medium priority)
    subTasks.push({
      type: 'visualization',
      prompt: `Generate a JSON response recommending the best visualization type and key elements to highlight. ${contextPrompt} Format: {"visualType": "Chart Type", "highlights": ["Element 1", "Element 2"]}. Overview: ${dataSummary.overview}`,
      priority: 2
    });

    // Recommendations (lower priority)
    subTasks.push({
      type: 'recommendations',
      prompt: `Generate a JSON response with strategic recommendations based on the data. ${contextPrompt} Format: {"recommendations": ["Recommendation 1", "Recommendation 2"]}. Overview: ${dataSummary.overview}`,
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