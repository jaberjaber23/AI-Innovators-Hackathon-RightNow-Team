import React from 'react';
import { motion } from 'framer-motion';
import { FaRobot, FaUser } from 'react-icons/fa';
import RichMessageContent from './RichMessageContent';

interface ChatBubbleProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ content, role, timestamp }) => {
  const isUser = role === 'user';
  
  const bubbleVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 24,
        duration: 0.3
      } 
    }
  };

  return (
    <motion.div
      className={`flex items-start max-w-[85%] mb-6 ${isUser ? 'ml-auto' : 'mr-auto'}`}
      initial="hidden"
      animate="visible"
      variants={bubbleVariants}
    >
      {!isUser && (
        <div className="flex-shrink-0 mr-3">
          <div className="bg-gradient-to-br from-primary-400 to-primary-600 text-white rounded-lg p-2.5 shadow-md">
            <FaRobot size={18} />
          </div>
        </div>
      )}
      
      <div
        className={`
          relative p-4 rounded-xl shadow-md
          ${isUser 
            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white' 
            : 'bg-white border border-gray-100 text-gray-800'}
          ${isUser ? 'shadow-[0_4px_12px_rgba(24,144,255,0.25)]' : 'shadow-[0_4px_12px_rgba(0,0,0,0.05)]'}
        `}
      >
        {/* Futuristic decorative element - top line */}
        <div 
          className={`absolute top-0 left-0 w-full h-px 
            ${isUser 
              ? 'bg-gradient-to-r from-white/0 via-white/50 to-white/0' 
              : 'bg-gradient-to-r from-transparent via-primary-500/30 to-transparent'}`
          }
        ></div>
        
        {/* Triangle pointer for chat bubble */}
        <div
          className={`
            absolute top-5 w-3 h-3 transform rotate-45 z-10
            ${isUser 
              ? 'right-0 translate-x-1.5 bg-primary-500' 
              : 'left-0 -translate-x-1.5 bg-white border-l border-t border-gray-100'}
          `}
        />
        
        <div className="relative z-10">
          {isUser ? (
            <div className="text-sm whitespace-pre-wrap">{content}</div>
          ) : (
            <RichMessageContent content={content} />
          )}
          
          <div className={`text-xs mt-2 flex justify-between items-center ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
            <span className="font-mono">{timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isUser && (
              <span className="font-medium ml-2 font-mono">YOU</span>
            )}
          </div>
        </div>
        
        {/* Futuristic decorative element - bottom line */}
        <div 
          className={`absolute bottom-0 right-0 w-1/3 h-px 
            ${isUser 
              ? 'bg-gradient-to-l from-white/0 via-white/30 to-white/0' 
              : 'bg-gradient-to-l from-transparent via-primary-500/20 to-transparent'}`
          }
        ></div>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 ml-3">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-lg p-2.5 shadow-md">
            <FaUser size={18} />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ChatBubble; 