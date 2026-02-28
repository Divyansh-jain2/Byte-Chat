'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  const requestSentRef = useRef(false);

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
    // Skip if request already sent (prevents double-call in React Strict Mode)
    if (requestSentRef.current) {
      return;
    }

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

    // Mark request as sent
    requestSentRef.current = true;
    sendRequest(userId, isAnonymous);
  }, [sendRequest, searchParams]);

  const handleRetry = () => {
    const userId = searchParams.get('userId');
    const isAnonymous = searchParams.get('anonymous') === 'true';
    
    if (userId) {
      setRetrying(true);
      requestSentRef.current = false; // Reset to allow retry
      sendRequest(userId, isAnonymous);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-warm antialiased flex items-center justify-center p-4">
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-linear-to-br from-pink-300/15 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center animate-scale-in">
        {status === 'sending' && (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-transparent mx-auto mb-5 animate-spin"
              style={{ borderTopColor: 'var(--pink)', borderRightColor: 'var(--coral)' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--heading)' }}>Opening Chat…</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Please wait a moment</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--heading)' }}>Chat Ready!</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Opening conversation…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--heading)' }}>Request Failed</h2>
            <p className="text-sm mb-6 text-red-400">{error}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleRetry} disabled={retrying} className="btn-romance px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                {retrying ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Retrying…</>
                ) : '↺ Try Again'}
              </button>
              <button onClick={() => router.push('/dashboard')} className="btn-ghost px-5 py-2.5 text-sm">Dashboard</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
