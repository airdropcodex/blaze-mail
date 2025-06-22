import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mailApi } from '../services/mailApi';
import { MailAccount, MailMessage } from '../types/api';
import toast from 'react-hot-toast';

interface InboxState {
  account: MailAccount | null;
  password: string;
  isAuthenticated: boolean;
  expiresAt: Date | null;
  token: string | null; // <-- Add token to state
}

export function useInbox() {
  const [inboxState, setInboxState] = useState<InboxState>(() => {
    // Try to restore from localStorage
    const saved = localStorage.getItem('inbox-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.account && parsed.isAuthenticated && parsed.token) {
        mailApi.setToken(parsed.token);
        return {
          ...parsed,
          expiresAt: new Date(parsed.expiresAt),
          token: parsed.token,
        };
      }
    }
    return {
      account: null,
      password: '',
      isAuthenticated: false,
      expiresAt: null,
      token: null,
    };
  });

  // Always set token on mount if present
  useEffect(() => {
    if (inboxState.token) {
      mailApi.setToken(inboxState.token);
    }
  }, [inboxState.token]);

  const queryClient = useQueryClient();

  // Fetch available domains
  const { data: domains = [] } = useQuery({
    queryKey: ['domains'],
    queryFn: () => mailApi.getDomains(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create inbox mutation
  const createInboxMutation = useMutation({
    mutationFn: async () => {
      const activeDomains = domains.filter(d => d.isActive && !d.isPrivate);
      if (activeDomains.length === 0) {
        throw new Error('No available domains');
      }

      const randomDomain = activeDomains[Math.floor(Math.random() * activeDomains.length)];
      const username = Math.random().toString(36).substring(2, 10);
      const address = `${username}@${randomDomain.domain}`;
      const password = Math.random().toString(36).substring(2, 15);

      // Create the account and wait for it to be ready
      await mailApi.createAccount(address, password);
      
      // Get authentication token
      const token = await mailApi.getToken(address, password);
      mailApi.setToken(token.token);
      
      // Ensure the account is properly initialized by fetching it
      // This also verifies we can authenticate with the token
      const verifiedAccount = await mailApi.getAccount();
      
      // Wait a moment to ensure the account is fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { account: verifiedAccount, password, token };
    },
    onSuccess: ({ account, password, token }) => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      const newState = {
        account,
        password,
        isAuthenticated: true,
        expiresAt,
        token: token.token, // <-- Save token in state
      };

      setInboxState(newState);

      // Save to localStorage
      localStorage.setItem('inbox-state', JSON.stringify(newState));

      toast.success('Inbox created successfully!', {
        icon: '📬',
        duration: 3000,
      });

      // Start polling for messages
      queryClient.invalidateQueries({ queryKey: ['messages', account.id] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create inbox', {
        icon: '❌',
      });
    },
  });

  // Fetch messages
  const { 
    data: messages = [], 
    isLoading: messagesLoading,
    refetch: refetchMessages,
    isError: isMessagesError,
    error: messagesError,
  } = useQuery<MailMessage[]>({
    queryKey: ['messages', inboxState.account?.id],
    queryFn: async () => {
      console.log('🔍 useInbox: Fetching messages...');
      console.log('🔍 useInbox: Current token:', inboxState.token ? 'Present' : 'Missing');
      console.log('🔍 useInbox: Account ID:', inboxState.account?.id);
      try {
        const result = await mailApi.getMessages();
        console.log('🔍 useInbox: Messages fetched successfully:', result);
        console.log('🔍 useInbox: Number of messages:', result?.length || 0);
        return result;
      } catch (error) {
        console.error('🔍 useInbox: Error fetching messages:', error);
        throw error;
      }
    },
    enabled: !!inboxState.account && inboxState.isAuthenticated && !!inboxState.token, // Only enabled if token is present
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 0,
    retry: 3
  });

  // Delete inbox mutation
  const deleteInboxMutation = useMutation({
    mutationFn: () => mailApi.deleteAccount(inboxState.account!.id),
    onSuccess: () => {
      setInboxState({
        account: null,
        password: '',
        isAuthenticated: false,
        expiresAt: null,
        token: null,
      });
      mailApi.clearToken();
      localStorage.removeItem('inbox-state');
      queryClient.removeQueries({ queryKey: ['messages'] });
      toast.success('Inbox deleted successfully!', {
        icon: '🗑️',
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete inbox', {
        icon: '❌',
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => mailApi.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message deleted successfully!', {
        icon: '🗑️',
        duration: 2000,
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete message', {
        icon: '❌',
      });
    },
  });

  // Copy email to clipboard with fallback
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for insecure context or unsupported browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success('Copied to clipboard!', {
        icon: '📋',
        duration: 2000,
      });
    } catch {
      toast.error('Failed to copy to clipboard', {
        icon: '❌',
      });
    }
  }, []);

  // Check if inbox is expired
  const isExpired = inboxState.expiresAt ? new Date() > inboxState.expiresAt : false;

  // Auto-cleanup expired inbox
  useEffect(() => {
    if (isExpired && inboxState.account) {
      setInboxState({
        account: null,
        password: '',
        isAuthenticated: false,
        expiresAt: null,
        token: null,
      });
      mailApi.clearToken();
      localStorage.removeItem('inbox-state');
      queryClient.removeQueries({ queryKey: ['messages'] });
      toast.error('Inbox has expired', {
        icon: '⏰',
      });
    }
  }, [isExpired, inboxState.account, queryClient]);

  // Auto-refresh on error
  useEffect(() => {
    if (isMessagesError && inboxState.isAuthenticated) {
      const timer = setTimeout(() => {
        refetchMessages();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isMessagesError, inboxState.isAuthenticated, refetchMessages]);

  return {
    // State
    account: inboxState.account,
    messages: Array.isArray(messages) ? messages : [], // Ensure messages is always an array
    isAuthenticated: inboxState.isAuthenticated,
    expiresAt: inboxState.expiresAt,
    isExpired,
    
    // Loading states
    isCreating: createInboxMutation.isPending,
    isDeleting: deleteInboxMutation.isPending,
    messagesLoading,
    
    // Actions
    createInbox: () => createInboxMutation.mutate(),
    deleteInbox: () => deleteInboxMutation.mutate(),
    deleteMessage: deleteMessageMutation.mutate,
    copyToClipboard,
    refetchMessages,
  };
}

export default useInbox;