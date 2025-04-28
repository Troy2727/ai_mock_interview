/**
 * Mock implementation of Vapi for development and testing
 * This includes audio simulation using the browser's speech synthesis
 * and workflow simulation to match the real Vapi behavior
 */

// Define interview workflow types
interface InterviewQuestion {
  id: string;
  text: string;
  followUps?: string[];
}

interface InterviewWorkflow {
  id: string;
  name: string;
  description: string;
  introduction: string[];
  questions: InterviewQuestion[];
  conclusion: string[];
}

// Mock interview workflows
const MOCK_WORKFLOWS: Record<string, InterviewWorkflow> = {
  // Default workflow for when the ID doesn't match
  'default': {
    id: 'default',
    name: 'General Interview',
    description: 'A general interview workflow for testing',
    introduction: [
      "Hello! I'm your AI interviewer. I'll be asking you some questions today to help you practice for your upcoming interviews.",
      "Let's start with a simple question. Could you tell me about your background and experience?"
    ],
    questions: [
      {
        id: 'background',
        text: "Could you tell me about your background and experience?",
        followUps: [
          "That's interesting. How has that experience prepared you for this role?",
          "Could you elaborate on any specific skills you developed during that time?"
        ]
      },
      {
        id: 'challenge',
        text: "Can you describe a challenging project you've worked on and how you overcame obstacles?",
        followUps: [
          "That's a great example. What would you do differently if you faced a similar challenge again?",
          "How did that experience affect your approach to problem-solving?"
        ]
      },
      {
        id: 'teamwork',
        text: "How would you describe your approach to teamwork and collaboration?",
        followUps: [
          "Could you give an example of a successful team project you were part of?",
          "How do you handle disagreements within a team?"
        ]
      },
      {
        id: 'strengths',
        text: "What would you say are your greatest strengths and areas where you'd like to improve?",
        followUps: [
          "How do you work on improving those areas?",
          "Can you give an example of how you've leveraged your strengths in a professional setting?"
        ]
      },
      {
        id: 'goals',
        text: "Where do you see yourself in five years, and what are your career goals?",
        followUps: [
          "What steps are you taking to achieve those goals?",
          "How does this role fit into your long-term career plan?"
        ]
      }
    ],
    conclusion: [
      "Thank you for participating in this interview practice session. You've provided some great insights.",
      "I hope this has been helpful for your interview preparation. Do you have any questions for me before we conclude?"
    ]
  },
  // Specific workflow for jimaestro_interview_prep
  '2eda67a8-e781-4018-8b68-7a1af216deb8': {
    id: '2eda67a8-e781-4018-8b68-7a1af216deb8',
    name: 'Interview Preparation',
    description: 'An interview preparation workflow based on jimaestro_interview_prep',
    introduction: [
      "Hello! I'm your AI interview coach. I'll be asking you some questions today to help you prepare for your upcoming interviews.",
      "This session will help you practice your responses and get comfortable with common interview questions."
    ],
    questions: [
      {
        id: 'background',
        text: "Let's start with your background. Could you tell me about your professional experience and skills?",
        followUps: [
          "That's helpful. How do you think your experience aligns with the roles you're applying for?",
          "What would you say are your strongest technical or professional skills?"
        ]
      },
      {
        id: 'strengths',
        text: "What would you say are your greatest strengths, and how have they helped you succeed in your career?",
        followUps: [
          "Could you give a specific example of how you've applied these strengths in a professional setting?",
          "How do you think these strengths would benefit a potential employer?"
        ]
      },
      {
        id: 'weaknesses',
        text: "What areas do you think you could improve in, and what steps are you taking to address them?",
        followUps: [
          "That's a good self-assessment. How have you worked to overcome these challenges?",
          "How do you turn your weaknesses into opportunities for growth?"
        ]
      },
      {
        id: 'challenges',
        text: "Can you describe a challenging situation you've faced at work and how you handled it?",
        followUps: [
          "What did you learn from that experience?",
          "How would you apply what you learned to future challenges?"
        ]
      },
      {
        id: 'teamwork',
        text: "How do you approach working in a team environment? Can you give an example of successful collaboration?",
        followUps: [
          "How do you handle disagreements or conflicts within a team?",
          "What role do you typically take when working in a group setting?"
        ]
      },
      {
        id: 'goals',
        text: "What are your career goals, and how does this position fit into your long-term plans?",
        followUps: [
          "What steps are you taking to achieve these goals?",
          "How do you see your career evolving over the next 3-5 years?"
        ]
      }
    ],
    conclusion: [
      "Thank you for participating in this interview practice session. You've provided some thoughtful responses that would impress potential employers.",
      "Remember to tailor your answers to specific job descriptions and company cultures. Do you have any questions about the interview process that I can help with?"
    ]
  }
};

// Create a mock Vapi class
export class MockVapi {
  private eventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  private isMutedState: boolean = false;
  private isConnected: boolean = false;
  private isSimulatingAudio: boolean = false;
  private speechSynthesis: SpeechSynthesis | null = null;
  private speechUtterance: SpeechSynthesisUtterance | null = null;
  private audioContext: AudioContext | null = null;
  // No speech synthesis or audio context properties

  // Workflow simulation properties
  private currentWorkflow: InterviewWorkflow | null = null;
  private currentQuestionIndex: number = 0;
  private currentFollowUpIndex: number = 0;
  private isInIntroduction: boolean = true;
  private isInConclusion: boolean = false;
  private introductionIndex: number = 0;
  private conclusionIndex: number = 0;
  private userName: string = 'User';

  constructor(token: string) {
    console.log('MockVapi: Initialized with token', token);

    // Only try to initialize browser APIs if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Initialize speech synthesis with better error handling
      try {
        // Check if speechSynthesis is available
        if (window.speechSynthesis) {
          this.speechSynthesis = window.speechSynthesis;
          console.log('MockVapi: Speech synthesis initialized');

          // Pre-load voices to avoid issues (some browsers need this)
          if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
              const voices = window.speechSynthesis.getVoices();
              console.log(`MockVapi: ${voices.length} voices loaded for speech synthesis`);
            };
          }

          // Try to get voices immediately as well
          setTimeout(() => {
            try {
              const voices = window.speechSynthesis.getVoices();
              if (voices && voices.length > 0) {
                console.log(`MockVapi: ${voices.length} voices available immediately`);
              } else {
                console.log('MockVapi: No voices available immediately, will try again when voices change');
              }
            } catch (voiceError) {
              console.warn('MockVapi: Error getting voices:', voiceError);
            }
          }, 100);
        } else {
          console.warn('MockVapi: Speech synthesis not available in this browser');
        }
      } catch (speechError) {
        console.warn('MockVapi: Error initializing speech synthesis:', speechError);
        this.speechSynthesis = null;
      }

      // Initialize audio context with better error handling
      try {
        // Check if AudioContext is available
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
          console.log('MockVapi: Audio context initialized');
        } else {
          console.warn('MockVapi: AudioContext not available in this browser');
        }
      } catch (audioError) {
        console.warn('MockVapi: Failed to initialize audio context:', audioError);
        this.audioContext = null;
      }
    } else {
      console.warn('MockVapi: Running in non-browser environment, audio features disabled');
    }
  }

  /**
   * Simulate speech using the browser's speech synthesis
   * @param text Text to speak
   * @param onStart Callback when speech starts
   * @param onEnd Callback when speech ends
   */
  private simulateSpeech(text: string, onStart?: () => void, onEnd?: () => void): void {
    // If speech synthesis is not available, fall back to a timer-based approach
    if (!this.speechSynthesis || typeof window === 'undefined') {
      console.warn('MockVapi: Speech synthesis not available, using timer-based simulation');

      // Simulate speech start
      this.isSimulatingAudio = true;
      if (onStart) onStart();

      // Calculate a reasonable duration based on text length (average reading speed)
      const wordsCount = text.split(/\s+/).length;
      const durationMs = Math.max(1000, wordsCount * 200); // At least 1 second, ~200ms per word

      // Simulate speech end after the calculated duration
      setTimeout(() => {
        console.log('MockVapi: Simulated speech ended after', durationMs, 'ms');
        this.isSimulatingAudio = false;
        if (onEnd) onEnd();
      }, durationMs);

      return;
    }

    try {
      // Cancel any ongoing speech
      this.speechSynthesis.cancel();

      // Create a new utterance
      this.speechUtterance = new SpeechSynthesisUtterance(text);

      // Try to set a voice, but handle potential errors
      try {
        const voices = this.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          // Try to find an English voice
          const englishVoices = voices.filter(voice => voice.lang && voice.lang.startsWith('en-'));
          if (englishVoices.length > 0) {
            this.speechUtterance.voice = englishVoices[0];
          } else if (voices.length > 0) {
            // Fall back to the first available voice
            this.speechUtterance.voice = voices[0];
          }
        }
      } catch (voiceError) {
        console.warn('MockVapi: Error setting voice:', voiceError);
        // Continue without setting a specific voice
      }

      // Set properties with safe defaults
      this.speechUtterance.rate = 1.0;
      this.speechUtterance.pitch = 1.0;
      this.speechUtterance.volume = 1.0;

      // Set event handlers with error handling
      this.speechUtterance.onstart = () => {
        console.log('MockVapi: Speech started');
        this.isSimulatingAudio = true;
        if (onStart) onStart();
      };

      this.speechUtterance.onend = () => {
        console.log('MockVapi: Speech ended');
        this.isSimulatingAudio = false;
        if (onEnd) onEnd();
      };

      // Special handling for speech errors to avoid empty error objects
      this.speechUtterance.onerror = () => {
        // Don't log the event object as it might be empty and cause issues
        console.log('MockVapi: Speech synthesis error occurred, using audio element fallback');

        // Cancel any ongoing speech synthesis to clean up
        if (this.speechSynthesis) {
          try {
            this.speechSynthesis.cancel();
          } catch (cancelError) {
            console.warn('Error cancelling speech after error');
          }
        }

        // Try using an audio element with the Web Speech API as a fallback
        try {
          if (typeof window !== 'undefined') {
            // Create a SpeechSynthesisUtterance
            const msg = new SpeechSynthesisUtterance(text);

            // Set properties
            msg.volume = 1; // 0 to 1
            msg.rate = 1; // 0.1 to 10
            msg.pitch = 1; // 0 to 2
            msg.lang = 'en-US';

            // Set event handlers
            msg.onstart = () => {
              console.log('MockVapi: Audio element speech started');
              this.isSimulatingAudio = true;
              if (onStart) onStart();
            };

            msg.onend = () => {
              console.log('MockVapi: Audio element speech ended');
              this.isSimulatingAudio = false;
              if (onEnd) onEnd();
            };

            msg.onerror = () => {
              console.log('MockVapi: Audio element speech error, falling back to timer');
              // Fall back to timer-based approach
              this.fallbackToTimer(text, onEnd);
            };

            // Speak the text
            window.speechSynthesis.speak(msg);
            return;
          }
        } catch (audioError) {
          console.log('MockVapi: Audio element fallback failed, using timer-based simulation');
        }

        // If all else fails, fall back to timer-based approach
        this.fallbackToTimer(text, onEnd);
      };

      // Start speaking with error handling
      try {
        // Check if the speech synthesis is available and ready
        if (this.speechSynthesis && this.speechSynthesis.speaking === false) {
          console.log('MockVapi: Starting speech synthesis');
          this.speechSynthesis.speak(this.speechUtterance);
        } else {
          // If speech synthesis is busy or not available, use fallback
          console.log('MockVapi: Speech synthesis busy or not available, using fallback');
          this.fallbackToTimer(text, onEnd);
        }
      } catch (speakError) {
        console.log('MockVapi: Error starting speech, using fallback');
        // Fall back to timer-based approach
        this.fallbackToTimer(text, onEnd);
      }
    } catch (error) {
      console.error('MockVapi: Error in speech synthesis');

      // Always ensure we call onEnd even if there's an error
      if (onEnd) onEnd();
    }
  }

  /**
   * Fall back to timer-based simulation when speech synthesis fails
   * @param text Text that was being spoken
   * @param onEnd Callback when speech ends
   */
  private fallbackToTimer(text: string, onEnd?: () => void): void {
    console.log('MockVapi: Using timer-based simulation');

    // Calculate a reasonable duration based on text length
    const wordsCount = text.split(/\s+/).length;
    const durationMs = Math.max(1000, wordsCount * 200); // At least 1 second, ~200ms per word

    console.log(`MockVapi: Simulating speech for ${durationMs}ms`);

    // End the speech after the calculated duration
    setTimeout(() => {
      console.log('MockVapi: Timer-based simulation ended');
      this.isSimulatingAudio = false;
      if (onEnd) onEnd();
    }, durationMs);
  }

  // Basic methods
  async start(workflowId: string, options?: Record<string, unknown>): Promise<{ id: string; status: string }> {
    console.log('MockVapi: Starting call with workflow', workflowId, options);

    // Validate the workflow ID
    if (!workflowId || typeof workflowId !== 'string') {
      console.error('MockVapi: Invalid workflow ID:', workflowId);
      const error = new Error('Invalid workflow ID');
      this.emit('error', error);
      throw error;
    }

    try {
      // Get the user's name from options if available
      this.userName = options?.variableValues &&
        typeof options.variableValues === 'object' &&
        (options.variableValues as any).username || 'User';

      console.log(`MockVapi: User name is ${this.userName}`);

      // Get the workflow for the given ID or use the default
      this.currentWorkflow = MOCK_WORKFLOWS[workflowId] || MOCK_WORKFLOWS['default'];
      console.log(`MockVapi: Using workflow "${this.currentWorkflow.name}" (${this.currentWorkflow.id})`);

      // Reset workflow state
      this.isInIntroduction = true;
      this.isInConclusion = false;
      this.introductionIndex = 0;
      this.currentQuestionIndex = 0;
      this.currentFollowUpIndex = 0;

      // Return immediately with a promise that will resolve
      const result = { id: 'mock-call-id', status: 'connected' };

      // Use setTimeout to simulate async events after returning
      setTimeout(() => {
        this.isConnected = true;
        this.emit('call-start');

        // Start the introduction sequence
        this.continueWorkflow();
      }, 1500);

      return result;
    } catch (error) {
      console.error('MockVapi: Error starting call:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Continue the workflow based on the current state
   */
  private continueWorkflow(): void {
    if (!this.currentWorkflow) {
      console.error('MockVapi: No workflow set');
      return;
    }

    // If we're in the introduction
    if (this.isInIntroduction) {
      if (this.introductionIndex < this.currentWorkflow.introduction.length) {
        // Get the next introduction message
        const message = this.currentWorkflow.introduction[this.introductionIndex];

        // Replace placeholders
        const processedMessage = message.replace('{userName}', this.userName);

        // Speak the message
        this.speakMessage(processedMessage, () => {
          // Move to the next introduction message
          this.introductionIndex++;

          // If we've reached the end of the introduction, move to questions
          if (this.introductionIndex >= this.currentWorkflow.introduction.length) {
            this.isInIntroduction = false;
          }

          // Continue the workflow after a short delay
          setTimeout(() => this.continueWorkflow(), 1000);
        });
      }
    }
    // If we're in the conclusion
    else if (this.isInConclusion) {
      if (this.conclusionIndex < this.currentWorkflow.conclusion.length) {
        // Get the next conclusion message
        const message = this.currentWorkflow.conclusion[this.conclusionIndex];

        // Replace placeholders
        const processedMessage = message.replace('{userName}', this.userName);

        // Speak the message
        this.speakMessage(processedMessage, () => {
          // Move to the next conclusion message
          this.conclusionIndex++;

          // Continue the workflow after a short delay if there are more conclusion messages
          if (this.conclusionIndex < this.currentWorkflow.conclusion.length) {
            setTimeout(() => this.continueWorkflow(), 1000);
          }
        });
      }
    }
    // Otherwise, we're in the questions
    else {
      if (this.currentQuestionIndex < this.currentWorkflow.questions.length) {
        // Get the current question
        const question = this.currentWorkflow.questions[this.currentQuestionIndex];

        // If we haven't asked the main question yet
        if (this.currentFollowUpIndex === 0) {
          // Speak the main question
          this.speakMessage(question.text);

          // We don't automatically continue here - we wait for the user to respond
        }
        // If we're in follow-ups and there are more follow-ups
        else if (question.followUps && this.currentFollowUpIndex <= question.followUps.length) {
          // Get the follow-up question
          const followUp = question.followUps[this.currentFollowUpIndex - 1];

          // Speak the follow-up
          this.speakMessage(followUp);

          // We don't automatically continue here - we wait for the user to respond
        }
        // If we've gone through all follow-ups for this question
        else {
          // Move to the next question
          this.currentQuestionIndex++;
          this.currentFollowUpIndex = 0;

          // If we've reached the end of the questions, move to the conclusion
          if (this.currentQuestionIndex >= this.currentWorkflow.questions.length) {
            this.isInConclusion = true;
            this.conclusionIndex = 0;
          }

          // Continue the workflow after a short delay
          setTimeout(() => this.continueWorkflow(), 1000);
        }
      }
    }
  }

  /**
   * Speak a message and emit the appropriate events
   * @param message Message to speak
   * @param onComplete Callback when speech is complete
   */
  private speakMessage(message: string, onComplete?: () => void): void {
    // Emit speech start event
    this.emit('speech-start');

    // Send transcript message
    this.emit('message', {
      type: 'transcript',
      transcriptType: 'final',
      role: 'assistant',
      transcript: message
    });

    // Use speech synthesis to actually speak the message
    this.simulateSpeech(message,
      // onStart callback
      () => {
        console.log('MockVapi: Speaking message:', message);
      },
      // onEnd callback
      () => {
        // Emit speech end event
        this.emit('speech-end');

        // Call the completion callback if provided
        if (onComplete) {
          onComplete();
        }
      }
    );
  }

  async stop(): Promise<void> {
    console.log('MockVapi: Stopping call...');

    // Stop any ongoing speech synthesis
    if (this.speechSynthesis) {
      try {
        this.speechSynthesis.cancel();
        console.log('MockVapi: Speech synthesis cancelled');
      } catch (error) {
        console.warn('MockVapi: Error cancelling speech synthesis');
      }
    }

    // Stop any ongoing audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
        console.log('MockVapi: Audio context closed');
      } catch (error) {
        console.warn('MockVapi: Error closing audio context');
      }
    }

    if (this.isConnected) {
      this.isConnected = false;
      this.isSimulatingAudio = false;

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
      // Get the user's message if available
      const userMessage = message.message && typeof message.message === 'string'
        ? message.message
        : 'I understand. Let me respond to that.';

      console.log('MockVapi: Received user message:', userMessage);

      // If we're in a workflow, advance to the next step
      if (this.currentWorkflow) {
        // If we're in the introduction, finish it and move to questions
        if (this.isInIntroduction) {
          this.isInIntroduction = false;
          this.continueWorkflow();
        }
        // If we're in the conclusion, just acknowledge
        else if (this.isInConclusion) {
          // Generate a simple acknowledgment
          const acknowledgments = [
            "I'm glad I could help with your interview preparation.",
            "Thank you for your question. I hope this practice session was useful.",
            "That's a good question. I hope you feel more prepared for your interviews now."
          ];

          // Pick a random acknowledgment
          const response = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];

          // Speak the acknowledgment
          setTimeout(() => {
            this.speakMessage(response);
          }, 1000);
        }
        // If we're in the questions
        else {
          // Get the current question
          const question = this.currentWorkflow.questions[this.currentQuestionIndex];

          // Advance to the next follow-up or next question
          if (question.followUps && this.currentFollowUpIndex < question.followUps.length) {
            // Move to the next follow-up
            this.currentFollowUpIndex++;

            // Continue the workflow after a short delay
            setTimeout(() => this.continueWorkflow(), 1000);
          } else {
            // Move to the next question
            this.currentQuestionIndex++;
            this.currentFollowUpIndex = 0;

            // If we've reached the end of the questions, move to the conclusion
            if (this.currentQuestionIndex >= this.currentWorkflow.questions.length) {
              this.isInConclusion = true;
              this.conclusionIndex = 0;
            }

            // Continue the workflow after a short delay
            setTimeout(() => this.continueWorkflow(), 1000);
          }
        }
      }
      // If we're not in a workflow, use the simple pattern matching
      else {
        // Generate a response based on the user's message
        let response = '';

        // Simple pattern matching for responses
        if (userMessage.toLowerCase().includes('experience') ||
            userMessage.toLowerCase().includes('background') ||
            userMessage.toLowerCase().includes('worked')) {
          response = "Thank you for sharing your experience. That's very interesting. Now, could you tell me about a challenging project you've worked on and how you overcame the obstacles?";
        }
        else if (userMessage.toLowerCase().includes('challenge') ||
                userMessage.toLowerCase().includes('project') ||
                userMessage.toLowerCase().includes('obstacle')) {
          response = "That's a great example of problem-solving. How would you describe your approach to teamwork and collaboration?";
        }
        else if (userMessage.toLowerCase().includes('team') ||
                userMessage.toLowerCase().includes('collaborat') ||
                userMessage.toLowerCase().includes('work with')) {
          response = "Teamwork is indeed essential. What would you say are your greatest strengths and areas where you'd like to improve?";
        }
        else if (userMessage.toLowerCase().includes('strength') ||
                userMessage.toLowerCase().includes('weakness') ||
                userMessage.toLowerCase().includes('improve')) {
          response = "Self-awareness is very important. Looking ahead, where do you see yourself in five years, and what are your career goals?";
        }
        else {
          // Default responses if no pattern matches
          const defaultResponses = [
            "That's interesting. Could you tell me more about a specific example?",
            "I appreciate your response. How do you think that experience has shaped your approach to work?",
            "Thank you for sharing. What skills did you develop from that experience?",
            "That's valuable insight. How would you apply that in a new role?",
            "Interesting perspective. Could you elaborate on how that aligns with your career goals?"
          ];

          // Pick a random default response
          response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
        }

        // Short delay before responding
        setTimeout(() => {
          this.speakMessage(response);
        }, 1000);
      }
    }
  }

  say(text: string, interrupt: boolean = false): void {
    console.log('MockVapi: Saying:', text, 'interrupt:', interrupt);

    // If interrupt is true, cancel any ongoing speech
    if (interrupt && this.speechSynthesis) {
      try {
        this.speechSynthesis.cancel();
      } catch (error) {
        console.warn('MockVapi: Error cancelling speech for interrupt');
      }
    }

    // Emit speech start event
    this.emit('speech-start');

    // Use speech synthesis to actually speak the text
    this.simulateSpeech(text,
      // onStart callback
      () => {
        console.log('MockVapi: Speaking text:', text);
      },
      // onEnd callback
      () => {
        // Emit speech end event
        this.emit('speech-end');
      }
    );
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

// Export the MockVapi class
export { MockVapi };
