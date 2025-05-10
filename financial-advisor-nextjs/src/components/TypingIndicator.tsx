import React from 'react';
import { motion } from 'framer-motion';
import { FaRobot } from 'react-icons/fa';

const TypingIndicator: React.FC = () => {
  const dotVariants = {
    initial: { y: 0 },
    animate: (i: number) => ({
      y: [0, -8, 0],
      opacity: [0.4, 1, 0.4],
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut",
      }
    })
  };

  return (
    <motion.div
      className="flex items-start max-w-[85%] mr-auto mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-shrink-0 mr-3">
        <div className="bg-gradient-to-br from-primary-400 to-primary-600 text-white rounded-lg p-2.5 shadow-md">
          <FaRobot size={18} />
        </div>
      </div>
      
      <div className="relative p-4 rounded-xl shadow-sm bg-white border border-gray-100 text-gray-800">
        {/* Futuristic top line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent"></div>
        
        {/* Triangle pointer */}
        <div className="absolute top-5 left-0 -translate-x-1.5 w-3 h-3 transform rotate-45 z-10 bg-white border-l border-t border-gray-100" />
        
        <div className="flex items-center space-x-3 py-2 px-1 relative z-10">
          <motion.span
            className="inline-block w-2 h-2 rounded-full bg-primary-500" 
            variants={dotVariants}
            initial="initial"
            animate="animate"
            custom={0}
          />
          <motion.span 
            className="inline-block w-2 h-2 rounded-full bg-primary-500" 
            variants={dotVariants}
            initial="initial"
            animate="animate"
            custom={1}
          />
          <motion.span 
            className="inline-block w-2 h-2 rounded-full bg-primary-500" 
            variants={dotVariants}
            initial="initial"
            animate="animate"
            custom={2}
          />
        </div>
        
        <div className="text-xs text-gray-500 mt-1 relative z-10 font-mono">
          Processing data...
        </div>
        
        {/* Futuristic bottom line */}
        <div className="absolute bottom-0 right-0 w-1/3 h-px bg-gradient-to-l from-transparent via-primary-500/20 to-transparent"></div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator; 