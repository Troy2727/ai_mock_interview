/**
 * Mock implementation of Vapi for development and testing
 */

// Create a mock Vapi class
export class MockVapi {
  private eventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  private isMutedState: boolean = false;
  private isConnected: boolean = false;

  constructor(token: string) {
    console.log('MockVapi: Initialized with token', token);
  }

  // Basic methods
  async start(workflowId: string, options?: Record<string, unknown>): Promise<{ id: string; status: string }> {
    console.log('MockVapi: Starting call with workflow', workflowId, options);

    // Simulate a successful call start after a short delay
    setTimeout(() => {
      this.isConnected = true;
      this.emit('call-start');

      // Simulate the assistant speaking
      setTimeout(() => {
        this.emit('speech-start');

        // Send a transcript message
        setTimeout(() => {
          this.emit('message', {
            type: 'transcript',
            transcriptType: 'final',
            role: 'assistant',
            transcript: 'Hello! I am your interview assistant. How can I help you today?'
          });

          // End the speech after a delay
          setTimeout(() => {
            this.emit('speech-end');
          }, 2000);
        }, 1000);
      }, 2000);
    }, 1500);

    return { id: 'mock-call-id', status: 'connected' };
  }

  async stop(): Promise<void> {
    console.log('MockVapi: Stopping call...');

    if (this.isConnected) {
      this.isConnected = false;

      // Simulate a call end
      setTimeout(() => {
        this.emit('call-end');
      }, 500);
    }
  }

  send(message: Record<string, unknown>): void {
    console.log('MockVapi: Sending message:', message);

    // If it's an add-message request, simulate a response
    if (message.type === 'add-message') {
      setTimeout(() => {
        this.emit('speech-start');

        // Send a transcript message
        setTimeout(() => {
          this.emit('message', {
            type: 'transcript',
            transcriptType: 'final',
            role: 'assistant',
            transcript: 'I understand. Let me respond to that.'
          });

          // End the speech after a delay
          setTimeout(() => {
            this.emit('speech-end');
          }, 2000);
        }, 1000);
      }, 1000);
    }
  }

  say(text: string, interrupt: boolean = false): void {
    console.log('MockVapi: Saying:', text, 'interrupt:', interrupt);

    setTimeout(() => {
      this.emit('speech-start');

      // End the speech after a delay
      setTimeout(() => {
        this.emit('speech-end');
      }, 2000);
    }, 500);
  }

  isMuted(): boolean {
    return this.isMutedState;
  }

  setMuted(muted: boolean): void {
    console.log('MockVapi: Setting muted:', muted);
    this.isMutedState = muted;
  }

  // Event handling
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  removeAllListeners(): void {
    this.eventHandlers = {};
  }

  private emit(event: string, ...args: any[]): void {
    if (this.eventHandlers[event]) {
      for (const handler of this.eventHandlers[event]) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      }
    }
  }
}
