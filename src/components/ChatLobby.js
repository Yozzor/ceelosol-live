import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../util/auth';
import profileService from '../services/profileService';
import PlayerName from './PlayerName';
import './ChatLobby.css';

/**
 * ChatLobby - Persistent chat for players to communicate
 * Shows nicknames or shortened wallet addresses
 * Messages persist so new players can see previous conversations
 */
const ChatLobby = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { walletAddress, publicKey } = useAuth();

  // Use publicKey as fallback if walletAddress is not available
  const effectiveWalletAddress = walletAddress || publicKey;

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString();
  };

  // Fetch chat messages
  const fetchMessages = async () => {
    try {
      setLoading(true);

      // Get messages from the last 7 days using existing messages table
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: chatMessages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching chat messages:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // Don't return here, let it continue with empty array
      }

      setMessages(chatMessages || []);
    } catch (error) {
      console.error('Error processing chat messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !effectiveWalletAddress || sending) {
      return;
    }

    try {
      setSending(true);

      // Get the current user's nickname from profile service
      const currentProfile = profileService.getProfile(effectiveWalletAddress);
      const nickname = currentProfile?.nickname?.trim() || null;

      const { error } = await supabase
        .from('chat_messages')
        .insert([
          {
            player_address: effectiveWalletAddress,
            nickname: nickname, // Store nickname in the message
            message: newMessage.trim(),
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('Error sending message:', error);
        return;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Set up real-time subscription and initial load
  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('chat_messages_channel')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          console.log('New chat message:', payload);
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="chat-lobby">
        <div className="chat-loading">
          <div className="loading-spinner"></div>
          <span>Loading chat...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-lobby">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">💬</div>
            <p>No messages yet</p>
            <span>Start the conversation!</span>
          </div>
        ) : (
          messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.player_address === effectiveWalletAddress ? 'own-message' : ''}`}
              >
                <div className="message-header">
                  <PlayerName
                    walletAddress={message.player_address}
                    currentUserAddress={effectiveWalletAddress}
                    maxLength={8}
                    showYou={true}
                    nickname={message.nickname} // Use nickname from message
                  />
                  <span className="message-time">
                    {formatTimestamp(message.created_at)}
                  </span>
                </div>
                <div className="message-content">
                  {message.message}
                </div>
              </div>
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            maxLength={500}
            disabled={!effectiveWalletAddress || sending}
            className="chat-input"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !effectiveWalletAddress || sending}
            className="send-button"
          >
            {sending ? '⏳' : '📤'}
          </button>
        </div>
        <div className="chat-info">
          <span className="message-count">{messages.length} messages</span>
          <span className="chat-status">
            {effectiveWalletAddress ? '💬 Live Chat' : '⚠️ No Wallet'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatLobby;
