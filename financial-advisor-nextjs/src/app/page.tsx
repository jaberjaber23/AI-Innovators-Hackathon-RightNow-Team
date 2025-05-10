'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { 
  FaTrash, FaPaperPlane, FaBars, FaTimes, FaChartLine, 
  FaHistory, FaDownload, FaFilePdf, FaFileAlt, FaFileExport
} from 'react-icons/fa';
import { 
  BiChat, BiLineChart, BiSearchAlt, BiSpreadsheet, 
  BiEnvelope, BiBarChartAlt2, BiInfoCircle, BiAnalyse,
  BiData, BiPulse, BiDollarCircle, BiStats 
} from 'react-icons/bi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import ChatBubble from '@/components/ChatBubble';
import TypingIndicator from '@/components/TypingIndicator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Define message type
type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecking, setConnectionChecking] = useState(true);
  const [conversationHistory, setConversationHistory] = useState<{title: string, date: Date, id: string}[]>([]);
  const [currentView, setCurrentView] = useState<'chat' | 'history'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // MCP server URL - Either from environment or default to localhost:8001
  const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:8001';

  // Export chat as PDF function
  const exportToPDF = async () => {
    if (!chatContainerRef.current || messages.length === 0) return;
    
    try {
      // Show loading indicator
      setIsLoading(true);
      
      // Create a temporary div to render the PDF content
      const pdfContainer = document.createElement('div');
      pdfContainer.className = 'pdf-container';
      pdfContainer.style.width = '800px';
      pdfContainer.style.padding = '40px';
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      document.body.appendChild(pdfContainer);
      
      // Add title and date
      const titleDiv = document.createElement('div');
      titleDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0095ff; font-size: 24px; margin-bottom: 5px;">Financial Advisor Report</h1>
          <p style="color: #666; font-size: 14px;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <hr style="border: 1px solid #e0f0ff; margin: 20px 0;" />
        </div>
      `;
      pdfContainer.appendChild(titleDiv);
      
      // Clone the chat content
      const chatContent = chatContainerRef.current.cloneNode(true) as HTMLElement;
      
      // Remove user icons and other UI elements not needed in PDF
      const userIcons = chatContent.querySelectorAll('.flex-shrink-0');
      userIcons.forEach(icon => icon.remove());
      
      // Add the modified chat content
      pdfContainer.appendChild(chatContent);
      
      // Generate the PDF using html2canvas and jsPDF
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvas = await html2canvas(pdfContainer, {
        scale: 1.5,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pdfHeight;
      
      // Add new pages if the content is too long
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }
      
      // Save the PDF
      const fileName = `financial-advisor-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      
      // Clean up
      document.body.removeChild(pdfContainer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Features list for sidebar (updated with modern finance icons)
  const features = [
    { icon: <BiLineChart size={20} />, name: 'Sales Trend Analysis' },
    { icon: <BiPulse size={20} />, name: 'Real-time Transaction Monitoring' },
    { icon: <BiAnalyse size={20} />, name: 'Customer Behavior Insights' },
    { icon: <BiDollarCircle size={20} />, name: 'Revenue Forecasting' },
    { icon: <BiData size={20} />, name: 'Data-Driven Recommendations' },
    { icon: <BiStats size={20} />, name: 'Performance Metrics' },
  ];

  // Check MCP server connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionChecking(true);
        const response = await axios.get(`${MCP_SERVER_URL}/status`);
        setIsConnected(response.status === 200);
      } catch (error) {
        console.error('Failed to connect to MCP server:', error);
        setIsConnected(false);
      } finally {
        setConnectionChecking(false);
      }
    };

    checkConnection();
  }, [MCP_SERVER_URL]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = getTimeBasedGreeting();
      setMessages([
        {
          id: uuidv4(),
          role: 'assistant',
          content: `${greeting}, I'm your Financial Advisor Assistant! Ask me about retail transaction data from Jordan malls.\n\nI can provide insights with **rich interactive visualizations** and **formatted tables**. Try asking for:\n\n- Monthly sales reports\n- Customer segment analysis\n- Top performing product categories\n- Revenue trends and forecasts`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages.length]);

  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (input.trim() === '') return;
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Add to conversation history if we have at least 2 exchanges
      if (messages.length >= 3 && messages.length % 2 === 1) {
        // Create a title from the first user message
        const firstUserMessage = messages.find(m => m.role === 'user')?.content || userMessage.content;
        const title = firstUserMessage.slice(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
        
        setConversationHistory(prev => [
          { title, date: new Date(), id: uuidv4() },
          ...prev.slice(0, 9) // Keep only 10 most recent conversations
        ]);
      }
    } catch (error) {
      console.error('Error chatting with assistant:', error);
      
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please make sure the MCP server is running with `python mcp_server.py`.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  // Export chat as PDF or JSON
  const handleExportChat = (format: 'pdf' | 'json') => {
    if (format === 'json') {
      const chatData = {
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString()
        })),
        exportDate: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(chatData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportFileDefaultName = `financial-advisor-chat-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else if (format === 'pdf') {
      // Use the PDF export function
      exportToPDF();
    }
  };

  // Sidebar animations
  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Mobile sidebar toggle button */}
      <motion.button
        className="fixed top-4 left-4 z-50 md:hidden bg-primary-500 text-white p-2 rounded-full shadow-md"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isSidebarOpen ? <FaTimes /> : <FaBars />}
      </motion.button>

      {/* Sidebar */}
      <motion.aside 
        className="w-72 z-40 fixed h-full md:relative"
        initial="open"
        animate={isSidebarOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
      >
        <div className="h-full flex flex-col bg-gradient-to-b from-primary-900 via-primary-800 to-primary-700 shadow-sidebar">
          <div className="p-6">
            <div className="flex items-center justify-center mb-8">
              <div className="text-2xl font-bold text-white flex items-center">
                <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary-600 mr-2 shadow-glow animate-pulse-soft">
                  <span className="font-mono">R</span>
                </span> 
                RightNow
                <span className="ml-1 text-primary-300">.</span>
              </div>
            </div>
            
            <h2 className="text-sm uppercase tracking-wide text-primary-100 font-bold mb-1 flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-300 mr-2 animate-pulse-soft"></div>
              Real-time Analytics
            </h2>
            <p className="text-primary-200 text-xs mb-6 pl-4">Always accurate. Always current.</p>
            
            {/* Connection status */}
            <div className="flex items-center mb-6 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              {connectionChecking ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 mr-3 animate-pulse"></div>
                  <span className="text-sm text-white">Connecting...</span>
                </>
              ) : (
                <>
                  <div className={`w-2.5 h-2.5 rounded-full mr-3 ${isConnected ? 'bg-green-400 animate-pulse-soft' : 'bg-red-400'}`}></div>
                  <span className="text-sm text-white">{isConnected ? 'Data Stream Online' : 'Server Offline'}</span>
                </>
              )}
            </div>
            
            {!isConnected && !connectionChecking && (
              <div className="mb-6 p-3 rounded-xl bg-red-500/10 backdrop-blur-sm border border-red-500/20">
                <p className="text-white text-xs mb-2">Launch server to connect:</p>
                <code className="bg-black/30 text-white/90 p-2 rounded-lg text-xs block font-mono">python mcp_server.py</code>
              </div>
            )}
            
            {/* Navigation */}
            <div className="mb-6">
              <div className="flex p-1 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <button 
                  className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center text-sm transition-all ${
                    currentView === 'chat' 
                      ? 'bg-white text-primary-900 shadow-md' 
                      : 'text-white hover:bg-white/10'
                  }`}
                  onClick={() => setCurrentView('chat')}
                >
                  <BiChat className="mr-1.5" />
                  Chat
                </button>
                <button 
                  className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center text-sm transition-all ${
                    currentView === 'history' 
                      ? 'bg-white text-primary-900 shadow-md' 
                      : 'text-white hover:bg-white/10'
                  }`}
                  onClick={() => setCurrentView('history')}
                >
                  <FaHistory className="mr-1.5" />
                  History
                </button>
              </div>
            </div>
          </div>
          
          {/* Features list */}
          <div className="px-6 mb-4">
            <h2 className="text-primary-200 font-semibold mb-3 text-xs uppercase tracking-wide flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-300 mr-2"></div>
              Analytics Tools
            </h2>
            <div className="space-y-1.5">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="flex items-center p-2.5 rounded-xl text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-700 border border-primary-600 flex items-center justify-center mr-3">
                    {feature.icon}
                  </div>
                  <span className="text-sm">{feature.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Export options */}
          <div className="px-6 mb-4 mt-auto">
            <h2 className="text-primary-200 font-semibold mb-3 text-xs uppercase tracking-wide flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-300 mr-2"></div>
              Export Options
            </h2>
            <div className="space-y-2 grid grid-cols-1 gap-2">
              <button 
                onClick={() => handleExportChat('pdf')}
                className="p-2.5 bg-primary-700 hover:bg-primary-600 rounded-xl flex items-center text-sm text-white transition-colors disabled:opacity-50 border border-primary-600"
                disabled={messages.length < 2}
              >
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center mr-3">
                  <FaFilePdf />
                </div>
                Export as PDF
              </button>
              
              <button 
                onClick={() => handleExportChat('json')}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl flex items-center text-sm text-white transition-colors disabled:opacity-50 border border-white/10"
                disabled={messages.length < 2}
              >
                <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center mr-3">
                  <FaFileAlt />
                </div>
                Export as JSON
              </button>
            </div>
          </div>
          
          <div className="px-6 mb-6">
            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleClearChat}
                className="p-2.5 w-full rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-sm text-white transition-colors disabled:opacity-50 border border-white/10"
                disabled={messages.length === 0}
              >
                <FaTrash className="mr-2" size={14} />
                Clear Conversation
              </button>
            </div>
            
            {/* Model info */}
            <div className="mt-4 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center">
                <BiInfoCircle className="mr-2 text-primary-300" />
                <h3 className="text-sm font-semibold text-white">System</h3>
              </div>
              <p className="text-xs mt-1 text-primary-300 font-mono">Model: GPT-4 Turbo</p>
            </div>
            
            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-primary-300">© 2023 RightNow Analytics</p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex items-center">
          <div className="flex-1 px-4">
            <h1 className="text-2xl font-bold text-primary-900 flex items-center">
              {currentView === 'chat' ? (
                <>
                  <span className="font-mono text-primary-500 mr-1">$</span> RightNow
                  <span className="text-base ml-2 bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md font-mono">LIVE</span>
                </>
              ) : 'Conversation Archive'}
            </h1>
            <p className="text-gray-500">
              {currentView === 'chat' ? 'Financial data analysis in real-time' : 'Review your past insights'}
            </p>
          </div>
          
          {/* Connection status badge in header */}
          <div className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center ${
            connectionChecking 
              ? 'bg-yellow-100 text-yellow-800' 
              : isConnected 
                ? 'bg-green-100 text-green-800 glow-border' 
                : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              connectionChecking 
                ? 'bg-yellow-500 animate-pulse' 
                : isConnected 
                  ? 'bg-green-500 animate-pulse-soft' 
                  : 'bg-red-500'
            }`}></div>
            {connectionChecking ? 'Initializing...' : isConnected ? 'Live Data Feed' : 'Connection Required'}
          </div>
        </header>

        {/* Chat container */}
        <div 
          className="flex-1 overflow-auto p-4 pb-32 bg-gray-50"
          ref={chatContainerRef}
        >
          {currentView === 'chat' ? (
            messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-white p-8 rounded-2xl shadow-card max-w-2xl w-full border border-gray-100 relative overflow-hidden">
                  {/* Futuristic decorative elements */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent"></div>
                  <div className="absolute bottom-0 right-0 w-1/3 h-px bg-gradient-to-l from-transparent via-primary-500 to-transparent"></div>
                  
                  <div className="relative">
                    <div className="flex justify-center mb-8">
                      <div className="w-16 h-16 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-glow animate-pulse-soft">
                        <div className="text-xl font-mono font-bold">R</div>
                      </div>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-primary-900 mb-4 flex items-center justify-center">
                      <span className="font-mono text-primary-500 mr-2">$</span> 
                      RightNow 
                      <span className="text-sm ml-2 bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md font-mono">v1.0</span>
                    </h2>
                    
                    <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                      Real-time financial data analysis powered by advanced AI. Ask anything about retail transaction trends, customer insights, or business forecasts.
                    </p>
                    
                    {/* MCP Server status box */}
                    {!isConnected && !connectionChecking && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left max-w-lg mx-auto">
                        <h3 className="font-bold text-red-700 flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                          Connection Required
                        </h3>
                        <p className="text-sm text-red-600 mt-1">
                          Please start the MCP server with this command:
                        </p>
                        <div className="bg-gray-800 text-gray-100 p-3 rounded-lg mt-2 text-sm font-mono">
                          python mcp_server.py
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-primary-100 hover:shadow-card transition-all group cursor-pointer">
                        <div className="text-primary-500 mb-2 group-hover:animate-float">
                          <BiLineChart size={24} />
                        </div>
                        <h3 className="font-bold text-primary-800 mb-1">Trend Analysis</h3>
                        <p className="text-sm text-gray-600">Track performance patterns in real-time</p>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-primary-100 hover:shadow-card transition-all group cursor-pointer">
                        <div className="text-primary-500 mb-2 group-hover:animate-float">
                          <BiPulse size={24} />
                        </div>
                        <h3 className="font-bold text-primary-800 mb-1">Live Monitoring</h3>
                        <p className="text-sm text-gray-600">Real-time transaction intelligence</p>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-primary-100 hover:shadow-card transition-all group cursor-pointer">
                        <div className="text-primary-500 mb-2 group-hover:animate-float">
                          <BiAnalyse size={24} />
                        </div>
                        <h3 className="font-bold text-primary-800 mb-1">Predictive Insights</h3>
                        <p className="text-sm text-gray-600">AI-powered forecasting and suggestions</p>
                      </div>
                    </div>
                    
                    <div className="mt-8 flex justify-center">
                      <div className="inline-flex items-center text-xs text-gray-500">
                        <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-1.5 animate-pulse"></span>
                        Type a question below to begin your analysis
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                <AnimatePresence>
                  {messages.map((message) => (
                    <ChatBubble
                      key={message.id}
                      content={message.content}
                      role={message.role}
                      timestamp={message.timestamp}
                    />
                  ))}
                  
                  {isLoading && <TypingIndicator key="typing" />}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            )
          ) : (
            // History view
            <div className="max-w-4xl mx-auto">
              {conversationHistory.length === 0 ? (
                <div className="text-center py-12 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 mb-4">
                    <FaHistory className="text-primary-400 text-2xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-primary-900 mb-2">No conversation history</h3>
                  <p className="text-gray-500 max-w-md mx-auto">Your past analysis sessions will appear here for easy reference</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {conversationHistory.map((convo) => (
                    <motion.div 
                      key={convo.id}
                      className="bg-white rounded-xl shadow-sm p-5 hover:shadow-card transition-all border border-gray-100 cursor-pointer relative overflow-hidden"
                      onClick={() => {
                        setCurrentView('chat');
                        // In a full implementation, this would load the conversation
                      }}
                      whileHover={{ scale: 1.01, boxShadow: '0 4px 20px rgba(24, 144, 255, 0.15)' }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {/* Decorative line */}
                      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent"></div>
                      
                      <h3 className="font-medium text-primary-800 text-lg">{convo.title}</h3>
                      <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                        <span className="flex items-center">
                          <FaHistory className="mr-1.5 text-primary-400" size={12} />
                          {convo.date.toLocaleDateString()}
                        </span>
                        <span className="font-mono">{convo.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <form 
          onSubmit={handleSubmit} 
          className={`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:p-6 transition-opacity duration-300 z-10 ${
            currentView === 'chat' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                ref={inputRef}
                className="w-full resize-none py-3.5 px-4 pr-12 min-h-[52px] max-h-[150px] rounded-xl border border-gray-300 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 shadow-sm transition-all"
                placeholder={isConnected ? "Ask about financial data, trends, or insights..." : "Please start the MCP server first..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleTextareaInput}
                disabled={isLoading || !isConnected}
                rows={1}
              />
              <div className="absolute left-3 bottom-3 flex space-x-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-primary-500' : 'bg-red-500'} animate-pulse`}></div>
              </div>
              <motion.button
                type="submit"
                className="absolute right-3 bottom-3 bg-primary-500 text-white p-2.5 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || input.trim() === '' || !isConnected}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaPaperPlane size={16} />
              </motion.button>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center">
              <span className="w-1 h-1 bg-primary-500 rounded-full mr-1.5"></span>
              {isConnected 
                ? "Press Enter to send, Shift+Enter for new line" 
                : "Start the MCP server with 'python mcp_server.py' to enable data analysis"}
            </p>
          </div>
        </form>
      </main>
    </div>
  );
} 