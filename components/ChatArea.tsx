import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Channel, ChannelType, PresenceUser } from '../types';
import { generateAIResponse, ChatMessage } from '../services/geminiService';
import { uploadFile } from '../services/firebase';
import { useIsMobile } from '../hooks/useIsMobile';
import { VoiceMessageButton } from './VoiceMessageButton';
import { AudioMessage } from './AudioMessage';
import { VideoMessage } from './VideoMessage';
import { VideoEmbed } from './VideoEmbed';
import { MarkdownToolbar } from './MarkdownToolbar';
import { QuickEmojiPicker } from './QuickEmojiPicker';
import { extractVideoEmbeds, isVideoFileUrl } from '../services/videoEmbed';

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

// Format file size for display (bytes to human-readable)
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Get file extension from filename
const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  if (parts.length < 2) return 'FILE';
  return parts[parts.length - 1].toUpperCase();
};

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  onlineUsers: PresenceUser[];
  onSendMessage: (text: string, attachment?: Message['attachment']) => void;
  onSendAIMessage: (text: string, response: string) => void;
  onOpenReportModal?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ channel, messages, onlineUsers, onSendMessage, onSendAIMessage, onOpenReportModal }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTypingAI, setIsTypingAI] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showMarkdownToolbar, setShowMarkdownToolbar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingCaption, setPendingCaption] = useState('');
  const [pendingFile, setPendingFile] = useState<{ file: File; type: 'image' | 'file' | 'audio' | 'video' } | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const markdownToggleRef = useRef<HTMLButtonElement>(null);
  const emojiToggleRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  // Handle voice message sent
  const handleVoiceMessageSent = (audioUrl: string, duration: number, fileName: string, fileSize: number) => {
    onSendMessage('', {
      url: audioUrl,
      type: 'audio',
      name: fileName,
      size: fileSize,
      duration
    });
  };

  // Handle markdown insert
  const handleMarkdownInsert = (before: string, after: string, placeholder: string) => {
    const input = inputRef.current;
    if (!input) {
      setInputValue(prev => prev + before + placeholder + after);
      return;
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const selectedText = inputValue.substring(start, end);
    const textToInsert = selectedText || placeholder;
    const newValue = inputValue.substring(0, start) + before + textToInsert + after + inputValue.substring(end);

    setInputValue(newValue);

    // Set cursor position after insert
    setTimeout(() => {
      const cursorPos = start + before.length + textToInsert.length;
      input.setSelectionRange(cursorPos, cursorPos);
      input.focus();
    }, 0);
  };

  // Handle emoji insert
  const handleEmojiInsert = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setInputValue(prev => prev + emoji);
      return;
    }

    const start = input.selectionStart || inputValue.length;
    const newValue = inputValue.substring(0, start) + emoji + inputValue.substring(start);
    setInputValue(newValue);

    setTimeout(() => {
      const cursorPos = start + emoji.length;
      input.setSelectionRange(cursorPos, cursorPos);
      input.focus();
    }, 0);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    // Enter sends, Shift+Enter creates new line (only applies to textarea)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine file type - check for images, video, audio, or generic file
    let type: 'image' | 'file' | 'audio' | 'video' = 'file';
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('video/') || isVideoFileUrl(file.name)) {
      type = 'video';
    } else if (file.type.startsWith('audio/') ||
               /\.(mp3|wav|aiff|aif|m4a|ogg|flac|wma|aac)$/i.test(file.name)) {
      type = 'audio';
    }

    // Set pending file - allow user to add caption before sending
    setPendingFile({ file, type });
    setPendingCaption(inputValue); // Carry over any existing text as caption
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendPendingFile = async () => {
    if (!pendingFile) return;

    setIsUploading(true);
    try {
      const url = await uploadFile(pendingFile.file);
      onSendMessage(pendingCaption.trim(), {
        url,
        type: pendingFile.type,
        name: pendingFile.file.name,
        size: pendingFile.file.size
      });
    } catch (error) {
      console.error('Upload failed', error);
      alert('File upload failed.');
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      setPendingCaption('');
      setInputValue('');
    }
  };

  const cancelPendingFile = () => {
    setPendingFile(null);
    setPendingCaption('');
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
                        ) : msg.attachment.type === 'audio' ? (
                          <AudioMessage
                            url={msg.attachment.url}
                            duration={msg.attachment.duration}
                            fileName={msg.attachment.name}
                          />
                        ) : msg.attachment.type === 'video' ? (
                          <VideoMessage
                            url={msg.attachment.url}
                            name={msg.attachment.name}
                            size={msg.attachment.size}
                          />
                        ) : (
                          <div className="flex items-center bg-white/5 p-3 rounded-xl border border-white/10">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mr-3">
                              <span className="text-[10px] font-bold text-purple-400">{getFileExtension(msg.attachment.name)}</span>
                            </div>
                            <div className="overflow-hidden flex-1">
                              <div className="text-white/80 text-sm font-medium truncate">{msg.attachment.name}</div>
                              <div className="text-[10px] text-white/40">
                                {formatFileSize(msg.attachment.size)}{msg.attachment.size ? ' • ' : ''}{getFileExtension(msg.attachment.name)} file
                              </div>
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

                    {/* URL embeds (video platforms) */}
                    {msg.content && extractVideoEmbeds(msg.content).map((embed, i) => (
                      <VideoEmbed key={`embed-${msg.id}-${i}`} embed={embed} />
                    ))}
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
                  ) : msg.attachment.type === 'audio' ? (
                    <AudioMessage
                      url={msg.attachment.url}
                      duration={msg.attachment.duration}
                      fileName={msg.attachment.name}
                    />
                  ) : msg.attachment.type === 'video' ? (
                    <VideoMessage
                      url={msg.attachment.url}
                      name={msg.attachment.name}
                      size={msg.attachment.size}
                    />
                  ) : (
                    <div className="flex items-center bg-discord-dark p-3 rounded max-w-sm border border-discord-sidebar">
                      <div className="w-10 h-10 rounded bg-discord-accent/20 flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-[10px] font-bold text-discord-accent">{getFileExtension(msg.attachment.name)}</span>
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <div className="text-discord-link font-medium truncate" title={msg.attachment.name}>{msg.attachment.name}</div>
                        <div className="text-xs text-discord-muted">
                          {formatFileSize(msg.attachment.size)}{msg.attachment.size ? ' • ' : ''}{getFileExtension(msg.attachment.name)} file
                        </div>
                      </div>
                      <a
                        href={msg.attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto bg-discord-sidebar hover:bg-discord-hover p-2 rounded text-discord-muted hover:text-white transition-colors flex-shrink-0"
                      >
                        <i className="fas fa-download"></i>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* URL embeds (video platforms) */}
              {msg.content && extractVideoEmbeds(msg.content).map((embed, i) => (
                <VideoEmbed key={`embed-${msg.id}-${i}`} embed={embed} />
              ))}
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
        {/* Pending File Preview */}
        <AnimatePresence>
          {pendingFile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 bg-discord-dark rounded-lg p-3 border border-discord-sidebar"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {pendingFile.type === 'image' ? (
                    <img
                      src={URL.createObjectURL(pendingFile.file)}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded mr-3"
                    />
                  ) : pendingFile.type === 'video' ? (
                    <div className="w-12 h-12 bg-purple-500/20 rounded flex items-center justify-center mr-3">
                      <i className="fas fa-film text-purple-400"></i>
                    </div>
                  ) : pendingFile.type === 'audio' ? (
                    <div className="w-12 h-12 bg-purple-500/20 rounded flex items-center justify-center mr-3">
                      <i className="fas fa-music text-purple-400"></i>
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-discord-accent/20 rounded flex items-center justify-center mr-3">
                      <span className="text-[10px] font-bold text-discord-accent">{getFileExtension(pendingFile.file.name)}</span>
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <div className="text-sm text-white truncate max-w-[200px]">{pendingFile.file.name}</div>
                    <div className="text-xs text-discord-muted">
                      {formatFileSize(pendingFile.file.size)} • {pendingFile.type === 'audio' ? 'Audio' : getFileExtension(pendingFile.file.name)} file
                    </div>
                  </div>
                </div>
                <button
                  onClick={cancelPendingFile}
                  className="w-8 h-8 rounded-lg bg-discord-sidebar hover:bg-discord-hover flex items-center justify-center text-discord-muted hover:text-white transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <input
                type="text"
                placeholder="Add a caption (optional)"
                value={pendingCaption}
                onChange={(e) => setPendingCaption(e.target.value)}
                className="mt-2 w-full bg-discord-sidebar border-none outline-none text-white text-sm px-3 py-2 rounded placeholder-discord-muted"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendPendingFile();
                  }
                }}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={sendPendingFile}
                  disabled={isUploading}
                  className="px-4 py-2 bg-discord-accent hover:bg-discord-accent/80 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center"
                >
                  {isUploading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2"></i>
                      Send
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            <div className="bg-discord-chat rounded-lg px-4 py-2.5 flex items-start shadow-sm border border-transparent focus-within:border-discord-accent/50 transition-colors">

              {/* Hidden File Input */}
              <input
                 type="file"
                 ref={fileInputRef}
                 onChange={handleFileSelect}
                 className="hidden"
              />

              <button
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isUploading || !!pendingFile}
                 className="w-8 h-8 rounded-lg bg-discord-sidebar hover:bg-discord-hover text-discord-muted hover:text-white flex items-center justify-center transition-colors mt-0.5 mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                 title="Upload File"
              >
                {isUploading ? <i className="fas fa-spinner fa-spin text-sm"></i> : <i className="fas fa-plus text-sm"></i>}
              </button>

              <textarea
                ref={inputRef}
                className="bg-transparent border-none outline-none text-discord-text flex-1 placeholder-discord-muted resize-none text-sm leading-6 py-1.5"
                placeholder={`Message #${channel.name}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                rows={1}
                style={{ minHeight: '32px', maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />

              <div className="flex items-center space-x-1 ml-2 mt-0.5">
                 {/* Voice Message Button - single instance, handles its own recording UI */}
                 <VoiceMessageButton
                   onVoiceMessageSent={handleVoiceMessageSent}
                   onRecordingStateChange={setIsRecordingVoice}
                   disabled={channel.type === ChannelType.AI}
                 />

                 {/* Hide other buttons while recording */}
                 {!isRecordingVoice && (
                   <>
                     {/* Markdown Formatting Button */}
                     <div className="relative">
                       <button
                         ref={markdownToggleRef}
                         onClick={() => {
                           setShowEmojiPicker(false); // Close other dropdown
                           setShowMarkdownToolbar(prev => !prev);
                         }}
                         className="w-8 h-8 rounded-lg bg-discord-sidebar hover:bg-discord-hover text-discord-muted hover:text-white flex items-center justify-center transition-colors"
                         title="Formatting"
                       >
                         <i className="fas fa-font text-sm"></i>
                       </button>
                       <MarkdownToolbar
                         isOpen={showMarkdownToolbar}
                         onClose={() => setShowMarkdownToolbar(false)}
                         onInsert={handleMarkdownInsert}
                         toggleRef={markdownToggleRef}
                       />
                     </div>

                     {/* Emoji Picker Button */}
                     <div className="relative">
                       <button
                         ref={emojiToggleRef}
                         onClick={() => {
                           setShowMarkdownToolbar(false); // Close other dropdown
                           setShowEmojiPicker(prev => !prev);
                         }}
                         className="w-8 h-8 rounded-lg bg-discord-sidebar hover:bg-discord-hover text-discord-muted hover:text-white flex items-center justify-center transition-colors"
                         title="Emoji"
                       >
                         <i className="fas fa-smile text-sm"></i>
                       </button>
                       <QuickEmojiPicker
                         isOpen={showEmojiPicker}
                         onClose={() => setShowEmojiPicker(false)}
                         onEmojiSelect={handleEmojiInsert}
                         toggleRef={emojiToggleRef}
                       />
                     </div>

                     {/* Send Button */}
                     <button
                       onClick={handleSend}
                       disabled={!inputValue.trim()}
                       className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                         inputValue.trim()
                           ? 'bg-discord-accent hover:bg-discord-accent/80 text-white'
                           : 'bg-discord-sidebar text-discord-muted cursor-not-allowed'
                       }`}
                       title="Send Message"
                     >
                       <i className="fas fa-paper-plane text-sm"></i>
                     </button>
                   </>
                 )}
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
