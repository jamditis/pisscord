import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Channel, ChannelType } from '../types';
import { generateAIResponse, ChatMessage } from '../services/geminiService';
import { uploadFile } from '../services/firebase';
import { useIsMobile } from '../hooks/useIsMobile';

// Simple Discord-style Markdown renderer
const renderMarkdown = (text: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let key = 0;

  // Split by code blocks first (```code```)
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  const processInlineMarkdown = (str: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let innerKey = 0;

    // Process inline elements: **bold**, *italic*, `code`, ~~strikethrough~~, [link](url)
    const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|~~(.+?)~~|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s]+))/g;
    let innerLastIndex = 0;
    let innerMatch;

    while ((innerMatch = inlineRegex.exec(str)) !== null) {
      // Add text before match
      if (innerMatch.index > innerLastIndex) {
        result.push(str.substring(innerLastIndex, innerMatch.index));
      }

      if (innerMatch[2]) {
        // **bold**
        result.push(<strong key={`b-${innerKey++}`} className="font-bold">{innerMatch[2]}</strong>);
      } else if (innerMatch[3]) {
        // *italic*
        result.push(<em key={`i-${innerKey++}`} className="italic">{innerMatch[3]}</em>);
      } else if (innerMatch[4]) {
        // `inline code`
        result.push(<code key={`c-${innerKey++}`} className="bg-discord-dark px-1 py-0.5 rounded text-sm font-mono text-pink-400">{innerMatch[4]}</code>);
      } else if (innerMatch[5]) {
        // ~~strikethrough~~
        result.push(<del key={`s-${innerKey++}`} className="line-through opacity-70">{innerMatch[5]}</del>);
      } else if (innerMatch[6] && innerMatch[7]) {
        // [link](url)
        result.push(
          <a key={`a-${innerKey++}`} href={innerMatch[7]} target="_blank" rel="noopener noreferrer" className="text-discord-link hover:underline">
            {innerMatch[6]}
          </a>
        );
      } else if (innerMatch[8]) {
        // Plain URL
        result.push(
          <a key={`u-${innerKey++}`} href={innerMatch[8]} target="_blank" rel="noopener noreferrer" className="text-discord-link hover:underline">
            {innerMatch[8]}
          </a>
        );
      }

      innerLastIndex = innerMatch.index + innerMatch[0].length;
    }

    // Add remaining text
    if (innerLastIndex < str.length) {
      result.push(str.substring(innerLastIndex));
    }

    return result.length > 0 ? result : [str];
  };

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block (with inline processing)
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      // Process headers and lists in non-code sections
      const lines = beforeText.split('\n');
      lines.forEach((line, i) => {
        if (line.startsWith('# ')) {
          elements.push(<h1 key={key++} className="text-xl font-bold text-white mt-2 mb-1">{processInlineMarkdown(line.slice(2))}</h1>);
        } else if (line.startsWith('## ')) {
          elements.push(<h2 key={key++} className="text-lg font-bold text-white mt-2 mb-1">{processInlineMarkdown(line.slice(3))}</h2>);
        } else if (line.startsWith('### ')) {
          elements.push(<h3 key={key++} className="text-base font-bold text-white mt-1 mb-1">{processInlineMarkdown(line.slice(4))}</h3>);
        } else if (line.match(/^[-*] \[x\] /)) {
          elements.push(<div key={key++} className="flex items-center gap-2"><input type="checkbox" checked disabled className="accent-discord-green" /><span className="line-through opacity-70">{processInlineMarkdown(line.slice(6))}</span></div>);
        } else if (line.match(/^[-*] \[ \] /)) {
          elements.push(<div key={key++} className="flex items-center gap-2"><input type="checkbox" disabled /><span>{processInlineMarkdown(line.slice(6))}</span></div>);
        } else if (line.match(/^[-*] /)) {
          elements.push(<div key={key++} className="flex items-start gap-2 ml-2"><span className="text-discord-muted">•</span><span>{processInlineMarkdown(line.slice(2))}</span></div>);
        } else if (line.match(/^\d+\. /)) {
          const num = line.match(/^(\d+)\. /)?.[1];
          elements.push(<div key={key++} className="flex items-start gap-2 ml-2"><span className="text-discord-muted">{num}.</span><span>{processInlineMarkdown(line.replace(/^\d+\. /, ''))}</span></div>);
        } else if (line.startsWith('> ')) {
          elements.push(<blockquote key={key++} className="border-l-4 border-discord-muted pl-3 py-1 text-discord-text/80 italic">{processInlineMarkdown(line.slice(2))}</blockquote>);
        } else {
          elements.push(<span key={key++}>{processInlineMarkdown(line)}{i < lines.length - 1 ? <br /> : null}</span>);
        }
      });
    }

    // Add code block
    const language = match[1] || '';
    const code = match[2].trim();
    elements.push(
      <pre key={key++} className="bg-discord-dark rounded-lg p-3 my-2 overflow-x-auto max-w-full">
        {language && <div className="text-[10px] text-discord-muted uppercase mb-2">{language}</div>}
        <code className="text-sm font-mono text-green-400 whitespace-pre-wrap break-words">{code}</code>
      </pre>
    );

    lastIndex = match.index + match[0].length;
  }

  // Process remaining text after last code block
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    const lines = remainingText.split('\n');
    lines.forEach((line, i) => {
      if (line.startsWith('# ')) {
        elements.push(<h1 key={key++} className="text-xl font-bold text-white mt-2 mb-1">{processInlineMarkdown(line.slice(2))}</h1>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={key++} className="text-lg font-bold text-white mt-2 mb-1">{processInlineMarkdown(line.slice(3))}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={key++} className="text-base font-bold text-white mt-1 mb-1">{processInlineMarkdown(line.slice(4))}</h3>);
      } else if (line.match(/^[-*] \[x\] /)) {
        elements.push(<div key={key++} className="flex items-center gap-2"><input type="checkbox" checked disabled className="accent-discord-green" /><span className="line-through opacity-70">{processInlineMarkdown(line.slice(6))}</span></div>);
      } else if (line.match(/^[-*] \[ \] /)) {
        elements.push(<div key={key++} className="flex items-center gap-2"><input type="checkbox" disabled /><span>{processInlineMarkdown(line.slice(6))}</span></div>);
      } else if (line.match(/^[-*] /)) {
        elements.push(<div key={key++} className="flex items-start gap-2 ml-2"><span className="text-discord-muted">•</span><span>{processInlineMarkdown(line.slice(2))}</span></div>);
      } else if (line.match(/^\d+\. /)) {
        const num = line.match(/^(\d+)\. /)?.[1];
        elements.push(<div key={key++} className="flex items-start gap-2 ml-2"><span className="text-discord-muted">{num}.</span><span>{processInlineMarkdown(line.replace(/^\d+\. /, ''))}</span></div>);
      } else if (line.startsWith('> ')) {
        elements.push(<blockquote key={key++} className="border-l-4 border-discord-muted pl-3 py-1 text-discord-text/80 italic">{processInlineMarkdown(line.slice(2))}</blockquote>);
      } else {
        elements.push(<span key={key++}>{processInlineMarkdown(line)}{i < lines.length - 1 ? <br /> : null}</span>);
      }
    });
  }

  return elements;
};

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  onlineUsers: Array<{ displayName: string; photoURL?: string }>;
  onSendMessage: (text: string, attachment?: Message['attachment']) => void;
  onSendAIMessage: (text: string, response: string) => void;
  onOpenReportModal?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ channel, messages, onlineUsers, onSendMessage, onSendAIMessage, onOpenReportModal }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTypingAI, setIsTypingAI] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

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
        // AI Logic - build conversation history from recent messages
        setIsTypingAI(true);
        onSendMessage(text);

        // Convert messages to conversation history format (last 10 exchanges)
        const conversationHistory: ChatMessage[] = messages
          .slice(-20) // Get last 20 messages
          .map(msg => ({
            role: msg.isAi ? 'model' as const : 'user' as const,
            content: msg.content
          }));

        try {
            const response = await generateAIResponse(text, conversationHistory);
            onSendAIMessage(text, response);
        } catch (err: any) {
            const errorMsg = `AI Error: ${err.message || "Unknown error"}`;
            console.error(errorMsg);
            onSendAIMessage(text, "😵 Pissbot crashed! Check debug logs.");
        } finally {
            setIsTypingAI(false);
        }
      } else {
        // Standard Chat Logic
        onSendMessage(text);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadFile(file);
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      onSendMessage('', {
        url,
        type,
        name: file.name
      });
    } catch (error) {
      console.error('Upload failed', error);
      // Ideally show a toast here, but we'd need to pass toast prop or use a context
      alert('File upload failed.'); 
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helper to find user avatar
  const getUserAvatar = (senderName: string) => {
      // Pissbot special case
      if (senderName === 'Pissbot') return null;

      // Try to find user by display name (Not perfect, but works for now without senderId)
      const user = onlineUsers.find(u => u.displayName === senderName);
      return user?.photoURL;
  };

  // Handle send button for mobile
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const text = inputValue;
    setInputValue('');

    if (channel.type === ChannelType.AI) {
      setIsTypingAI(true);
      onSendMessage(text);

      // Convert messages to conversation history format (last 10 exchanges)
      const conversationHistory: ChatMessage[] = messages
        .slice(-20)
        .map(msg => ({
          role: msg.isAi ? 'model' as const : 'user' as const,
          content: msg.content
        }));

      try {
          const response = await generateAIResponse(text, conversationHistory);
          onSendAIMessage(text, response);
      } catch (err: any) {
          const errorMsg = `AI Error: ${err.message || "Unknown error"}`;
          console.error(errorMsg);
          onSendAIMessage(text, "😵 Pissbot crashed! Check debug logs.");
      } finally {
          setIsTypingAI(false);
      }
    } else {
      onSendMessage(text);
    }
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col bg-gradient-to-b from-[#1a1a2e] to-[#16162a] h-full w-full max-w-full overflow-hidden">
        {/* Mobile Header - with top padding for status bar */}
        <div
          className="px-4 py-3 border-b border-white/5 flex items-center shrink-0 bg-[#1a1a2e]/80 backdrop-blur-sm"
          style={{ paddingTop: '3.5rem' }}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mr-3 ${
            channel.type === ChannelType.AI
              ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
              : 'bg-white/10'
          }`}>
            <i className={`text-white ${channel.type === ChannelType.AI ? 'fas fa-robot' : 'fas fa-hashtag'}`}></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate">{channel.name}</h3>
            <p className="text-xs text-white/40">
              {channel.type === ChannelType.AI ? 'AI Assistant' : `${messages.length} messages`}
            </p>
          </div>
          {channel.id === '5' && (
            <motion.button
              onClick={onOpenReportModal}
              whileTap={{ scale: 0.95 }}
              className="bg-green-500/20 text-green-400 px-3 py-2 rounded-xl text-sm font-medium flex items-center"
            >
              <i className="fas fa-bug mr-2"></i> Report
            </motion.button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <i className={`text-3xl text-white/20 ${channel.type === ChannelType.AI ? 'fas fa-robot' : 'fas fa-hashtag'}`}></i>
              </div>
              <h3 className="text-lg font-bold text-white/70 mb-1">Welcome to #{channel.name}!</h3>
              <p className="text-white/40 text-sm">This is the start of the conversation.</p>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg, index) => {
              const avatarUrl = getUserAvatar(msg.sender);
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex mb-3 ${msg.isAi ? '' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${
                    msg.isAi ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-white/10'
                  }`}>
                    {msg.isAi ? (
                      <i className="fas fa-robot text-white text-sm"></i>
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt={msg.sender} className="w-full h-full object-cover" />
                    ) : (
                      <i className="fas fa-user text-white/50 text-sm"></i>
                    )}
                  </div>

                  {/* Message bubble */}
                  <div className="ml-2 flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-medium text-sm ${msg.isAi ? 'text-purple-400' : 'text-white/90'}`}>
                        {msg.sender}
                      </span>
                      {msg.isAi && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 uppercase font-bold">
                          Bot
                        </span>
                      )}
                      <span className="text-[10px] text-white/30">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`text-sm text-white/80 leading-relaxed rounded-2xl px-3 py-2 overflow-hidden max-w-full ${
                      msg.isAi
                        ? 'bg-purple-500/10 border border-purple-500/20'
                        : 'bg-white/5'
                    }`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {renderMarkdown(msg.content)}
                    </div>

                    {/* Attachment */}
                    {msg.attachment && (
                      <div className="mt-2">
                        {msg.attachment.type === 'image' ? (
                          <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block">
                            <img
                              src={msg.attachment.url}
                              alt={msg.attachment.name}
                              className="rounded-xl max-h-60 border border-white/10"
                            />
                          </a>
                        ) : (
                          <div className="flex items-center bg-white/5 p-3 rounded-xl border border-white/10">
                            <i className="fas fa-file-download text-xl text-purple-400 mr-3"></i>
                            <div className="overflow-hidden flex-1">
                              <div className="text-white/80 text-sm font-medium truncate">{msg.attachment.name}</div>
                              <div className="text-[10px] text-white/40">Attachment</div>
                            </div>
                            <a
                              href={msg.attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"
                            >
                              <i className="fas fa-download text-white/60 text-sm"></i>
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isTypingAI && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center px-3 py-2"
            >
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-purple-400 text-sm ml-2">Pissbot is thinking...</span>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Mobile Input Area - extra bottom padding for nav bar */}
        <div className="px-3 pb-24 pt-2 shrink-0 border-t border-white/5 bg-[#16162a]">
          {channel.id === '5' ? (
            <motion.button
              onClick={onOpenReportModal}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center shadow-lg"
            >
              <i className="fas fa-bug mr-2"></i> Report Issue / Request Feature
            </motion.button>
          ) : channel.id === '4' ? (
            <div className="bg-white/5 rounded-xl px-4 py-3 flex items-center justify-center border border-white/5">
              <i className="fas fa-lock mr-2 text-white/30"></i>
              <span className="text-white/40 text-sm">Read-only channel</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Upload Button */}
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center border border-white/10"
              >
                {isUploading ? (
                  <i className="fas fa-spinner fa-spin text-purple-400"></i>
                ) : (
                  <i className="fas fa-plus text-white/50"></i>
                )}
              </motion.button>

              {/* Text Input */}
              <div className="flex-1 bg-white/5 rounded-xl border border-white/10 flex items-center overflow-hidden">
                <input
                  type="text"
                  className="flex-1 bg-transparent border-none outline-none text-white px-4 py-3 placeholder-white/30"
                  placeholder={`Message #${channel.name}`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Send Button */}
              <motion.button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                whileTap={{ scale: 0.95 }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  inputValue.trim()
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <i className={`fas fa-paper-plane text-sm ${inputValue.trim() ? 'text-white' : 'text-white/30'}`}></i>
              </motion.button>
            </div>
          )}

          {channel.type === ChannelType.AI && (
            <div className="text-[10px] text-white/30 mt-2 text-center">
              Powered by Pissbot AI
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex-1 flex flex-col bg-discord-main h-full min-w-0">
      {/* Channel Header */}
      <div className="h-12 border-b border-discord-dark flex items-center px-4 shrink-0 shadow-sm z-10 backdrop-blur-sm bg-discord-header/90">
        <i className={`mr-2 text-discord-muted text-xl ${channel.type === ChannelType.AI ? 'fas fa-robot' : 'fas fa-hashtag'}`}></i>
        <h3 className="font-display tracking-wide text-lg text-white">{channel.name}</h3>
        {channel.type === ChannelType.AI && <span className="ml-2 text-xs bg-discord-accent text-white px-1 rounded">BOT</span>}
        
        {channel.id === '5' && (
            <button 
                onClick={onOpenReportModal}
                className="ml-4 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors flex items-center"
            >
                <i className="fas fa-bug mr-2"></i> Report Issue
            </button>
        )}

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
        
        {messages.map((msg) => {
          const avatarUrl = getUserAvatar(msg.sender);
          return (
          <div key={msg.id} className="group flex hover:bg-discord-hover/30 -mx-4 px-4 py-1">
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center mt-1 cursor-pointer hover:opacity-80 overflow-hidden ${msg.isAi ? 'bg-discord-accent' : 'bg-gray-500'}`}>
              {msg.isAi ? (
                  <i className="fas fa-robot text-white"></i>
              ) : avatarUrl ? (
                  <img src={avatarUrl} alt={msg.sender} className="w-full h-full object-cover" />
              ) : (
                  <i className="fas fa-user text-white"></i>
              )}
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
              <div className="text-discord-text break-words leading-relaxed">
                {renderMarkdown(msg.content)}
              </div>
              {/* Attachment Rendering */}
              {msg.attachment && (
                <div className="mt-2">
                  {msg.attachment.type === 'image' ? (
                    <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block max-w-sm">
                       <img 
                         src={msg.attachment.url} 
                         alt={msg.attachment.name} 
                         className="rounded-lg max-h-80 border border-discord-dark cursor-zoom-in"
                       />
                    </a>
                  ) : (
                    <div className="flex items-center bg-discord-dark p-3 rounded max-w-sm border border-discord-sidebar">
                      <i className="fas fa-file-download text-2xl text-discord-accent mr-3"></i>
                      <div className="overflow-hidden">
                        <div className="text-discord-link font-medium truncate" title={msg.attachment.name}>{msg.attachment.name}</div>
                        <div className="text-xs text-discord-muted">Attachment</div>
                      </div>
                      <a 
                        href={msg.attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="ml-auto bg-discord-sidebar hover:bg-discord-hover p-2 rounded text-discord-muted hover:text-white transition-colors"
                      >
                        <i className="fas fa-download"></i>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          );
        })}
        {isTypingAI && (
           <div className="flex px-4 py-2">
               <span className="text-discord-muted text-sm italic animate-pulse">Pissbot is thinking...</span>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 pb-6 pt-2 shrink-0">
        {/* #issues Channel - Special Button */}
        {channel.id === '5' ? (
            <button 
                onClick={onOpenReportModal}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded flex items-center justify-center transition-all shadow-lg"
            >
                <i className="fas fa-bug mr-2"></i> Report Issue / Request Feature
            </button>
        ) : channel.id === '4' ? (
            /* #dev-updates - Read Only */
            <div className="bg-discord-chat rounded-lg px-4 py-3 flex items-center justify-center border border-discord-sidebar cursor-not-allowed opacity-50">
                <i className="fas fa-lock mr-2 text-discord-muted"></i>
                <span className="text-discord-muted font-bold text-sm">You do not have permission to send messages in this channel.</span>
            </div>
        ) : (
            /* Standard Input */
            <div className="bg-discord-chat rounded-lg px-4 py-2.5 flex items-center shadow-sm border border-transparent focus-within:border-discord-accent/50 transition-colors">
              
              {/* Hidden File Input */}
              <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleFileSelect} 
                 className="hidden" 
              />

              <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isUploading}
                 className={`text-discord-muted hover:text-discord-text mr-3 bg-discord-sidebar rounded-full w-6 h-6 flex items-center justify-center transition-colors ${isUploading ? 'animate-pulse cursor-wait' : ''}`}
                 title="Upload File"
              >
                {isUploading ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-plus text-xs"></i>}
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
        )}
        
        {channel.type === ChannelType.AI && (
             <div className="text-xs text-discord-muted mt-1 ml-1">
                 AI responses are generated by Pissbot.
             </div>
        )}
      </div>
    </div>
  );
};
