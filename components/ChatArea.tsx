import React, { useState, useRef, useEffect } from 'react';
import { Message, Channel, ChannelType } from '../types';
import { generateAIResponse } from '../services/geminiService';

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onSendAIMessage: (text: string, response: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ channel, messages, onSendMessage, onSendAIMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTypingAI, setIsTypingAI] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!inputValue.trim()) return;

      const text = inputValue;
      setInputValue('');

      if (channel.type === ChannelType.AI) {
        // AI Logic
        setIsTypingAI(true);
        // Optimistically add user message via parent, but for AI chat we handle the pair logic
        // We will call the parent to add the user message first
        onSendMessage(text); 
        
        try {
            const response = await generateAIResponse(text);
            onSendAIMessage(text, response);
        } catch (err) {
            onSendAIMessage(text, "Error communicating with AI.");
        } finally {
            setIsTypingAI(false);
        }
      } else {
        // Standard Chat Logic
        onSendMessage(text);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-discord-main h-full min-w-0">
      {/* Channel Header */}
      <div className="h-12 border-b border-discord-dark flex items-center px-4 shrink-0 shadow-sm z-10">
        <i className={`mr-2 text-discord-muted text-xl ${channel.type === ChannelType.AI ? 'fas fa-robot' : 'fas fa-hashtag'}`}></i>
        <h3 className="font-bold text-white">{channel.name}</h3>
        {channel.type === ChannelType.AI && <span className="ml-2 text-xs bg-discord-accent text-white px-1 rounded">BOT</span>}
        <div className="ml-auto flex items-center space-x-4 text-discord-muted text-lg">
           <i className="fas fa-bell hover:text-discord-text cursor-pointer"></i>
           <i className="fas fa-thumbtack hover:text-discord-text cursor-pointer"></i>
           <i className="fas fa-users hover:text-discord-text cursor-pointer"></i>
           <div className="w-48 bg-discord-dark rounded px-2 py-1 text-sm flex items-center">
             <input type="text" placeholder="Search" className="bg-transparent outline-none text-discord-text w-full" />
             <i className="fas fa-search text-xs"></i>
           </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-discord-muted opacity-50">
                <div className="w-16 h-16 bg-discord-sidebar rounded-full flex items-center justify-center mb-4">
                    <i className="fas fa-hashtag text-3xl"></i>
                </div>
                <h3 className="text-xl font-bold">Welcome to #{channel.name}!</h3>
                <p>This is the start of the #{channel.name} channel.</p>
            </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className="group flex hover:bg-discord-hover/30 -mx-4 px-4 py-1">
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center mt-1 cursor-pointer hover:opacity-80 ${msg.isAi ? 'bg-discord-accent' : 'bg-gray-500'}`}>
              {msg.isAi ? <i className="fas fa-robot text-white"></i> : <i className="fas fa-user text-white"></i>}
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <div className="flex items-center">
                <span className={`font-medium hover:underline cursor-pointer ${msg.isAi ? 'text-discord-accent' : 'text-white'}`}>
                  {msg.sender}
                </span>
                {msg.isAi && <span className="ml-1 text-[10px] bg-discord-accent text-white px-1 rounded uppercase font-bold">Bot</span>}
                <span className="ml-2 text-xs text-discord-muted">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-discord-text whitespace-pre-wrap break-words leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isTypingAI && (
           <div className="flex px-4 py-2">
               <span className="text-discord-muted text-sm italic animate-pulse">Pissbot is thinking...</span>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 pb-6 pt-2 shrink-0">
        <div className="bg-discord-chat rounded-lg px-4 py-2.5 flex items-center shadow-sm border border-transparent focus-within:border-discord-accent/50 transition-colors">
          <button className="text-discord-muted hover:text-discord-text mr-3 bg-discord-sidebar rounded-full w-6 h-6 flex items-center justify-center transition-colors">
            <i className="fas fa-plus text-xs"></i>
          </button>
          <input
            type="text"
            className="bg-transparent border-none outline-none text-discord-text flex-1 placeholder-discord-muted"
            placeholder={`Message #${channel.name}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div className="flex items-center space-x-3 text-discord-muted ml-2 text-xl">
             <i className="fas fa-gift hover:text-discord-text cursor-pointer"></i>
             <i className="fas fa-sticky-note hover:text-discord-text cursor-pointer"></i>
             <i className="fas fa-smile hover:text-discord-text cursor-pointer"></i>
          </div>
        </div>
        {channel.type === ChannelType.AI && (
             <div className="text-xs text-discord-muted mt-1 ml-1">
                 AI responses are generated by Pissbot.
             </div>
        )}
      </div>
    </div>
  );
};
