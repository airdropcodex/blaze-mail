import { 
  Inbox, 
  Copy, 
  RotateCcw, 
  Trash2,
  Loader2,
  Trash,
} from 'lucide-react';
import { useInbox } from '../hooks/useInbox';
import { formatDistanceToNow } from 'date-fns';
import { useEffect } from 'react';

interface InboxManagerProps {
  onMessageSelect: (messageId: string) => void;
}

export function InboxManager({ onMessageSelect }: InboxManagerProps) {
  const {
    account,
    messages,
    isAuthenticated,
    isExpired,
    isDeleting,
    messagesLoading,
    deleteInbox,
    copyToClipboard,
    refetchMessages,
    deleteMessage,
    isCreating,
    createInbox,
  } = useInbox();

  // Debug logging to track messages data flow
  useEffect(() => {
    console.log('🔍 InboxManager - Messages state updated:', {
      messagesCount: messages.length,
      messages: messages,
      isAuthenticated,
      messagesLoading,
      accountId: account?.id,
      accountAddress: account?.address
    });
  }, [messages, isAuthenticated, messagesLoading, account]);

  // Automatically create inbox if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isCreating) {
      createInbox();
    }
  }, [isAuthenticated, isCreating, createInbox]);

  const handleDeleteMessage = (messageId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening message when deleting
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMessage(messageId);
    }
  };

  if (!isAuthenticated || !account) {
    return (
      <div className="space-y-6">
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Inbox className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h2 className="text-lg font-display font-medium text-slate-900 dark:text-slate-100">
                {isCreating ? 'Creating Inbox...' : 'Initializing Inbox'}
              </h2>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center space-y-3 py-8">
            <Loader2 className="w-6 h-6 text-violet-600 dark:text-violet-400 animate-spin" />
            <p className="text-slate-600 dark:text-slate-400">
              {isCreating ? 'Setting up your secure inbox...' : 'Preparing your inbox...'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">This should only take a few seconds</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inbox Header */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Inbox className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h2 className="text-lg font-display font-medium text-slate-900 dark:text-slate-100">Your Inbox</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refetchMessages()}
              disabled={messagesLoading}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 disabled:opacity-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              title="Refresh messages"
            >
              <RotateCcw className={`w-5 h-5 ${messagesLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => deleteInbox()}
              disabled={isDeleting}
              className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              title="Delete inbox"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email Address */}
        <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
          <div className="flex-1 font-mono text-sm text-slate-900 dark:text-slate-100 select-all">
            {account.address}
          </div>
          <button
            onClick={() => copyToClipboard(account.address)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            title="Copy to clipboard"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>

        {isExpired && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl">
            <p className="text-sm text-red-600 dark:text-red-400">
              This inbox has expired. Please create a new one.
            </p>
          </div>
        )}
      </div>

      {/* Messages List */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-lg font-display font-medium text-slate-900 dark:text-slate-100">
            Messages {messages.length > 0 && `(${messages.length})`}
          </h3>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {messagesLoading ? (
            <div className="p-6">
              <div className="flex items-center justify-center space-x-3">
                <Loader2 className="w-5 h-5 text-violet-600 dark:text-violet-400 animate-spin" />
                <p className="text-slate-600 dark:text-slate-400">Fetching messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Inbox className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <p className="text-slate-600 dark:text-slate-400">No messages yet</p>
              </div>
              <p className="text-sm text-center text-slate-500 dark:text-slate-500">
                Send an email to your temporary address - it will appear here instantly
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
              {messages.map((message) => {
                return (
                  <div
                    key={message.id}
                    className="group flex items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200"
                  >
                    <button
                      onClick={() => onMessageSelect(message.id)}
                      className="flex-1 p-4 text-left transition-all duration-200 hover:pl-6 focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700/70"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {message.from.name || message.from.address}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {message.subject || '(No subject)'}
                          </p>
                        </div>
                        <time className="text-xs text-slate-500 dark:text-slate-500 whitespace-nowrap">
                          {formatDistanceToNow(new Date(message.createdAt))}
                        </time>
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleDeleteMessage(message.id, e)}
                      className="p-2 opacity-0 group-hover:opacity-100 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 mx-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                      title="Delete message"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}