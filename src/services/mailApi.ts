import { MailAccount, MailMessage, MailMessageDetail, AuthToken, Domain } from '../types/api';

const API_BASE = 'https://api.mail.tm';

interface RawMailMessage {
  id?: string;
  _id?: string;
  msgid?: string;
  accountId?: string;
  account_id?: string;
  from?: {
    address?: string;
    name?: string;
  };
  to?: Array<{
    address: string;
    name: string;
  }>;
  subject?: string;
  intro?: string;
  seen?: boolean;
  isDeleted?: boolean;
  hasAttachments?: boolean;
  size?: number;
  downloadUrl?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

class MailApiService {
  private token: string | null = null;

  async getDomains(): Promise<Domain[]> {
    const response = await fetch(`${API_BASE}/domains`);
    if (!response.ok) {
      console.error('Failed to fetch domains:', await response.text());
      throw new Error('Failed to fetch domains');
    }
    const data = await response.json();
    return data['hydra:member'] || [];
  }

  async createAccount(address: string, password: string): Promise<MailAccount> {
    console.log('Creating account:', { address }); // Debug log
    const response = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Account creation failed:', error); // Debug log
      throw new Error(error['hydra:description'] || error.message || 'Failed to create account');
    }
    
    const account = await response.json();
    console.log('Account created successfully:', account); // Debug log
    return account;
  }

  async getToken(address: string, password: string): Promise<AuthToken> {
    console.log('Getting token for:', { address }); // Debug log
    const response = await fetch(`${API_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Token fetch failed:', error); // Debug log
      throw new Error(error['hydra:description'] || error.message || 'Failed to authenticate');
    }
    
    const tokenData = await response.json();
    this.token = tokenData.token;
    console.log('Token obtained successfully'); // Debug log
    return tokenData;
  }

  async getAccount(): Promise<MailAccount> {
    if (!this.token) throw new Error('Not authenticated');
    
    console.log('Fetching account details'); // Debug log
    const response = await fetch(`${API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Account fetch failed:', error); // Debug log
      throw new Error(error['hydra:description'] || error.message || 'Failed to fetch account');
    }

    const account = await response.json();
    console.log('Account details fetched:', account); // Debug log
    return account;
  }

  async getMessages(page: number = 1, itemsPerPage: number = 50): Promise<MailMessage[]> {
    if (!this.token) throw new Error('Not authenticated');
    
    // Add logging for fetch
    console.log('Fetching messages with token:', this.token);
    const response = await fetch(`${API_BASE}/messages?page=${page}&itemsPerPage=${itemsPerPage}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to fetch messages:', error);
      throw new Error(error['hydra:description'] || error.message || 'Failed to fetch messages');
    }

    const data = await response.json();
    console.log('Fetched messages data:', data);

    // Ensure correct mapping of fields
    const messages = (data['hydra:member'] || []).map((msg: RawMailMessage) => ({
      id: msg.id || msg._id || '',
      accountId: msg.accountId || msg.account_id || '',
      msgid: msg.msgid || msg.id || msg._id || '',
      from: {
        address: msg.from?.address || '',
        name: msg.from?.name || ''
      },
      to: Array.isArray(msg.to) ? msg.to : [],
      subject: msg.subject || '',
      intro: msg.intro || '',
      seen: Boolean(msg.seen),
      isDeleted: Boolean(msg.isDeleted),
      hasAttachments: Boolean(msg.hasAttachments),
      size: Number(msg.size) || 0,
      downloadUrl: msg.downloadUrl || '',
      createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
      updatedAt: msg.updatedAt || msg.updated_at || new Date().toISOString(),
    }));

    console.log('Processed messages:', messages);
    return messages;
  }

  async getMessage(messageId: string): Promise<MailMessageDetail> {
    if (!this.token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/messages/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch message');
    }

    return response.json();
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    if (!this.token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/merge-patch+json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ seen: true }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to mark message as read');
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
    
    if (!response.ok) throw new Error('Failed to delete message');
  }

  async deleteAccount(accountId: string): Promise<void> {
    if (!this.token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
    
    if (!response.ok) throw new Error('Failed to delete account');
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }
}

export const mailApi = new MailApiService();