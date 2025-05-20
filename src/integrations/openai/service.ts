import OpenAI from 'openai';

// Initialize the OpenAI client
// The API key should be stored in an environment variable
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true, // Allow usage in browser environment
});

/**
 * Error thrown when the OpenAI API request fails
 */
export class OpenAIServiceError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'OpenAIServiceError';
  }
}

/**
 * Service for interacting with the OpenAI API
 */
export const openaiService = {
  /**
   * Send a request to the OpenAI API
   * @param prompt The prompt to send to the API
   * @param options Additional options for the API request
   * @returns The API response
   */
  async sendRequest(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      timeout?: number;
    } = {}
  ) {
    try {
      // Check if API key is available
      if (!import.meta.env.VITE_OPENAI_API_KEY) {
        console.error('OpenAI API key is missing. Check your .env file.');
        throw new OpenAIServiceError('OpenAI API key is not configured');
      }

      const {
        model = 'gpt-3.5-turbo',
        temperature = 0.2,
        maxTokens = 1000,
        timeout = 30000,
      } = options;

      console.log('Sending request to OpenAI API with model:', model);

      // Create a controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Remove the signal parameter as it's causing errors with the OpenAI API
        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that extracts and categorizes financial advisor recommendations.',
            },
            { role: 'user', content: prompt },
          ],
          temperature,
          max_tokens: maxTokens,
          // signal parameter removed as it's not supported
        });

        clearTimeout(timeoutId);
        return response;
      } catch (apiError: any) {
        console.error('OpenAI API Error:', apiError);
        // Log more detailed error information
        if (apiError.response) {
          console.error('Response status:', apiError.response.status);
          console.error('Response data:', apiError.response.data);
        }
        throw apiError;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('OpenAI request timed out');
        throw new OpenAIServiceError('Request to OpenAI API timed out');
      }
      console.error('OpenAI service error:', error.message, error);
      throw new OpenAIServiceError('Failed to communicate with OpenAI API', error);
    }
  },
};

export default openaiService;
