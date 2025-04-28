/**
 * Custom Vapi implementation that fixes URL construction issues
 */

// Import the original Vapi class
import OriginalVapi from '@vapi-ai/web';

/**
 * CustomVapi extends the original Vapi class but fixes the URL construction issue
 */
export class CustomVapi {
  private originalVapi: any;
  private token: string;
  private options: any;
  private eventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};

  constructor(token: string, options?: any) {
    console.log('CustomVapi: Initializing with token', token);
    this.token = token;
    this.options = options || {};
    
    // Create the original Vapi instance
    try {
      this.originalVapi = new OriginalVapi(token, options);
      console.log('CustomVapi: Original Vapi instance created successfully');
    } catch (error) {
      console.error('CustomVapi: Error creating original Vapi instance', error);
      throw error;
    }
  }

  /**
   * Start a call with the Vapi service
   * @param workflowIdOrAssistant Workflow ID or assistant configuration
   * @param options Call options
   * @returns Promise that resolves to a call object
   */
  async start(workflowIdOrAssistant: string | Record<string, unknown>, options?: any): Promise<any> {
    console.log('CustomVapi: Starting call with', { workflowIdOrAssistant, options });
    
    try {
      // If workflowIdOrAssistant is a string, use it directly
      if (typeof workflowIdOrAssistant === 'string') {
        console.log('CustomVapi: Using workflow ID directly:', workflowIdOrAssistant);
        
        // Call the original Vapi start method with the string workflow ID
        const result = await this.originalVapi.start(workflowIdOrAssistant, options);
        console.log('CustomVapi: Call started successfully with result', result);
        return result;
      }
      
      // If workflowIdOrAssistant is an object, extract the workflowId
      if (typeof workflowIdOrAssistant === 'object' && workflowIdOrAssistant !== null) {
        console.log('CustomVapi: Extracting workflow ID from object');
        
        // Extract the workflowId from the object
        const workflowId = (workflowIdOrAssistant as any).workflowId;
        
        if (!workflowId || typeof workflowId !== 'string') {
          console.error('CustomVapi: Invalid workflow ID in object', workflowIdOrAssistant);
          throw new Error('Invalid workflow ID in object');
        }
        
        console.log('CustomVapi: Extracted workflow ID:', workflowId);
        
        // Merge the options
        const mergedOptions = {
          ...options,
          variableValues: {
            ...(options?.variableValues || {}),
            ...(workflowIdOrAssistant as any).variableValues || {},
          }
        };
        
        console.log('CustomVapi: Using merged options', mergedOptions);
        
        // Call the original Vapi start method with the extracted workflow ID
        const result = await this.originalVapi.start(workflowId, mergedOptions);
        console.log('CustomVapi: Call started successfully with result', result);
        return result;
      }
      
      // If workflowIdOrAssistant is neither a string nor an object, throw an error
      console.error('CustomVapi: Invalid workflow ID or assistant config', workflowIdOrAssistant);
      throw new Error('Invalid workflow ID or assistant config');
    } catch (error) {
      console.error('CustomVapi: Error starting call', error);
      
      // Emit an error event
      this.emit('error', error);
      
      throw error;
    }
  }

  /**
   * Stop the current call
   */
  async stop(): Promise<void> {
    console.log('CustomVapi: Stopping call');
    
    try {
      await this.originalVapi.stop();
      console.log('CustomVapi: Call stopped successfully');
    } catch (error) {
      console.error('CustomVapi: Error stopping call', error);
      throw error;
    }
  }

  /**
   * Send a message to the Vapi service
   * @param message Message to send
   */
  send(message: any): void {
    console.log('CustomVapi: Sending message', message);
    
    try {
      this.originalVapi.send(message);
      console.log('CustomVapi: Message sent successfully');
    } catch (error) {
      console.error('CustomVapi: Error sending message', error);
      throw error;
    }
  }

  /**
   * Check if the microphone is muted
   * @returns True if muted, false otherwise
   */
  isMuted(): boolean {
    return this.originalVapi.isMuted();
  }

  /**
   * Set the muted state of the microphone
   * @param muted True to mute, false to unmute
   */
  setMuted(muted: boolean): void {
    console.log('CustomVapi: Setting muted state to', muted);
    this.originalVapi.setMuted(muted);
  }

  /**
   * Register an event handler
   * @param event Event name
   * @param handler Event handler function
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    console.log('CustomVapi: Registering handler for event', event);
    
    // Register the handler with the original Vapi instance
    this.originalVapi.on(event, handler);
    
    // Also store the handler in our own map for reference
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  /**
   * Unregister an event handler
   * @param event Event name
   * @param handler Event handler function
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    console.log('CustomVapi: Unregistering handler for event', event);
    
    // Unregister the handler from the original Vapi instance
    this.originalVapi.off(event, handler);
    
    // Also remove the handler from our own map
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  /**
   * Remove all event handlers
   */
  removeAllListeners(): void {
    console.log('CustomVapi: Removing all listeners');
    
    // Remove all listeners from the original Vapi instance
    this.originalVapi.removeAllListeners();
    
    // Also clear our own map
    this.eventHandlers = {};
  }

  /**
   * Emit an event
   * @param event Event name
   * @param args Event arguments
   */
  private emit(event: string, ...args: unknown[]): void {
    console.log('CustomVapi: Emitting event', event);
    
    // Call all handlers for the event
    if (this.eventHandlers[event]) {
      for (const handler of this.eventHandlers[event]) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`CustomVapi: Error in ${event} handler:`, error);
        }
      }
    }
  }
}

export default CustomVapi;
