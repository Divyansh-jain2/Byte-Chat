'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { chatService } from '@/services/chat.service';
import anonymousChatService from '@/services/anonymous-chat.service';


type ChatResponse = {
  conversationId?: string;
  data?: { conversationId?: string };
};

export default function NewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'sending' | 'success' | 'error'>('sending');
  const [error, setError] = useState<string>('');
  const [retrying, setRetrying] = useState(false);

  const sendRequest = useCallback(async (receiverId: string, isAnonymous: boolean) => {
    try {
      setStatus('sending');
      setError('');
      
      // Add timeout handler (15 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout. Please try again.')), 15000)
      );
      
      // Use the appropriate service based on chat type
      let requestPromise: Promise<ChatResponse>;
      if (isAnonymous) {
        requestPromise = anonymousChatService.createAnonymousConversation(receiverId);
      } else {
        requestPromise = chatService.sendChatRequest(receiverId);
      }
      
      const response = await Promise.race([requestPromise, timeoutPromise]) as ChatResponse;
      setStatus('success');
      
      // Extract conversationId based on response structure
      // Regular chat: response.data.conversationId
      // Anonymous chat: response.conversationId (already extracted .data.data)
      const conversationId = isAnonymous ? response.conversationId : response.data?.conversationId;
      setTimeout(() => {
        router.push(`/chat/${conversationId}`);
      }, 500);
    } 
    catch (err: unknown) {
      setStatus('error');
      let errorMsg = 'Failed to open chat. Please try again.';

      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: unknown }).response === 'object'
        ) {
            const response = (err as { response: 
              { status?: number; data?: { 
                message?: string } } 
              }).response;
            if (response.status === 403) {
              errorMsg = 'You cannot message this user. You may be blocked.';
            } else if (response.status === 400) {
              errorMsg = response.data?.message || 'Invalid request';
            } else {
              errorMsg = response.data?.message || errorMsg;
            }
          } 
          else if (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message?: string }).message === 'string'
      ) {
        if ((err as { message: string }).message.includes('timeout')) {
          errorMsg = 'Connection timeout. Please check your internet and try again.';
        }
      }

      setError(errorMsg);
    }  
    finally {
      setRetrying(false);
    }
  }, [router]);

  useEffect(() => {
    const userId = searchParams.get('userId');
    const isAnonymous = searchParams.get('anonymous') === 'true';

    if (!userId) {
      setStatus('error');
      setError('Invalid user ID');
      return;
    }

    // Check if trying to message self
    const currentUser = localStorage.getItem('user');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      if (user.user_id === userId) {
        setStatus('error');
        setError('You cannot send a message to yourself');
        return;
      }
    }

    sendRequest(userId, isAnonymous);
  }, [sendRequest, searchParams]);

  const handleRetry = () => {
    const userId = searchParams.get('userId');
    const isAnonymous = searchParams.get('anonymous') === 'true';
    
    if (userId) {
      setRetrying(true);
      sendRequest(userId, isAnonymous);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        {status === 'sending' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Opening Chat...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-green-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Chat Ready!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Opening conversation...
            </p>
            <p className="text-sm text-gray-500">Redirecting...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Request Failed
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {retrying ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Retrying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
