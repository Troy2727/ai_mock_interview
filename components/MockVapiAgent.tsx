'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Loading from './Loading';
import UserAvatar from './UserAvatar';

enum CallStatus {
    INACTIVE = 'INACTIVE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED',
}

interface SavedMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

interface AgentProps {
  userName: string;
  userId?: string;
  type: "generate" | "interview";
}

// Mock interview questions
const interviewQuestions = [
  `Hello ${'{userName}'}, I'm Connor, your interview architect. Let's prepare for your interview. What type of position are you interviewing for?`,
  "Great! Could you tell me about your background and experience related to this position?",
  "What would you say are your greatest strengths that make you a good fit for this role?",
  "Can you describe a challenging situation you faced at work and how you handled it?",
  "Why are you interested in this position and what do you know about our company?",
  "Where do you see yourself professionally in 5 years?",
  "Do you have any questions for me about the position or the interview process?",
  "Thank you for your time today. I think you're well prepared for your interview. Good luck!"
];

const MockVapiAgent = ({userName, userId, type}: AgentProps) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Handle call status changes
  useEffect(() => {
    if (callStatus === CallStatus.FINISHED) {
      setIsRedirecting(true);

      // Redirect to dashboard after a delay
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [callStatus, router]);

  // Function to display the assistant's message (no audio)
  const displayAssistantMessage = async (message: string) => {
    // No speaking animation in this version
    setIsSpeaking(false);

    // Replace {userName} with the actual user name
    const personalizedMessage = message.replace('{userName}', userName || 'User');

    // Add the message to the conversation
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: personalizedMessage
    }]);
  };

  // We're not handling user responses in this mock implementation
  // The interview will progress automatically with timed questions

  const handleCall = async () => {
    try {
      console.log('Starting mock interview...');
      toast.info('Starting interview...');

      // No audio setup needed for the mock implementation

      // Update UI
      setErrorMessage(null);
      setCallStatus(CallStatus.CONNECTING);

      // Simulate connection delay
      setTimeout(() => {
        setCallStatus(CallStatus.ACTIVE);
        toast.success('Call started successfully');

        // Show a toast indicating this is a mock implementation with no audio
        toast.info('Using mock interview (NO AUDIO) - This is a text-only simulated interview');

        // Start the interview with the first question
        displayAssistantMessage(interviewQuestions[0]);

        // Progress through the questions automatically with delays
        let questionDelay = 10000; // 10 seconds for the first question

        // Schedule all questions with increasing delays
        for (let i = 1; i < interviewQuestions.length; i++) {
          setTimeout(() => {
            displayAssistantMessage(interviewQuestions[i]);
          }, questionDelay);

          // Increase delay for next question
          questionDelay += 8000; // Add 8 seconds for each question
        }
      }, 2000);

    } catch (error) {
      console.error('Error starting mock call:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Error starting interview: ${errorMsg}`);
      setErrorMessage(errorMsg);
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleDisconnect = () => {
    console.log('Disconnecting call...');
    setCallStatus(CallStatus.FINISHED);
    setIsSpeaking(false);
    toast.info('Call ended');
  };

  const latestMessage = messages[messages.length - 1]?.content;
  const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

  return (
    <>
      <div className='call-view'>
        {isRedirecting && (
          <div>
            <Loading />
          </div>
        )}

        <div className='card-interviewer'>
          <div className='avatar'>
            <Image
              src="/Connor.webp"
              alt="connor"
              width={114}
              height={65}
              className='object-cover rounded-full'
            />
            {/* No speaking animation in this version */}
          </div>
          <h3>Connor</h3>
          <h4>Interview Architect</h4>
        </div>

        <div className='card-border'>
          <div className='card-content'>
            <UserAvatar
              user={{ name: userName }}
              size={120}
              className="mx-auto"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className='transcript-border'>
          <div className='transcript'>
            <p key={latestMessage} className={cn('transition-opacity duration-500 opacity-0', 'animate-fadeIn opacity-100')}>{latestMessage}</p>
          </div>
        </div>
      )}

      <div className='w-full flex justify-center'>
        {callStatus !== CallStatus.ACTIVE ? (
          <button
            className='relative btn-call'
            onClick={handleCall}
            disabled={callStatus === CallStatus.CONNECTING}
          >
            <span className={cn('absolute animate-ping rounded-full opacity-75', callStatus !== CallStatus.CONNECTING && 'hidden')} />
            <span>
              {isCallInactiveOrFinished ? 'Call' : '. . .'}
            </span>
          </button>
        ) : (
          <button className='btn-disconnect' onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>

      {errorMessage && (
        <div className='mt-4 p-4 bg-red-100 rounded-lg'>
          <h3 className='text-lg font-bold text-red-800 mb-2'>Error</h3>
          <p className='text-red-800'>{errorMessage}</p>

          <div className='mt-4'>
            <h4 className='font-bold text-red-800 mb-1'>Troubleshooting Tips:</h4>
            <ul className='list-disc pl-5 text-red-800'>
              <li>Try refreshing the page</li>
              <li>Check your internet connection</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default MockVapiAgent;
