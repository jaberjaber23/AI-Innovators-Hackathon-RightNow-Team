import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { motion } from 'framer-motion';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Regex patterns for identifying special content
const TABLE_PATTERN = /```table\s*([\s\S]*?)```/g;
const CHART_PATTERN = /```chart:(\w+)\s*([\s\S]*?)```/g;

interface RichMessageContentProps {
  content: string;
}

const RichMessageContent: React.FC<RichMessageContentProps> = ({ content }) => {
  const [processedContent, setProcessedContent] = useState<string>(content);
  const chartRefs = useRef<{[key: string]: any}>({});

  // Process content to extract tables and charts
  useEffect(() => {
    let processedText = content;
    let chartIndex = 0;
    
    // Replace chart markers with placeholders
    processedText = processedText.replace(CHART_PATTERN, (match, chartType, chartData) => {
      const chartId = `chart-${chartIndex++}`;
      try {
        chartRefs.current[chartId] = {
          type: chartType.trim().toLowerCase(),
          data: JSON.parse(chartData.trim())
        };
      } catch (e) {
        console.error('Failed to parse chart data:', e);
      }
      return `<div id="${chartId}" class="chart-container"></div>`;
    });
    
    // Enhance tables with styling
    processedText = processedText.replace(TABLE_PATTERN, (match, tableContent) => {
      return `<div class="table-responsive my-4 overflow-x-auto">
                <table class="min-w-full border-collapse rounded-lg overflow-hidden">
                  ${tableContent.trim()}
                </table>
              </div>`;
    });
    
    setProcessedContent(processedText);
  }, [content]);

  const renderChart = (id: string, type: string, data: any) => {
    // Modern futuristic styling for charts
    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            font: {
              family: 'Inter',
              size: 12
            },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        title: {
          display: data.title ? true : false,
          text: data.title || '',
          font: {
            family: 'Inter',
            size: 16,
            weight: 'bold' as const,
          },
          color: '#111827',
          padding: {
            top: 10,
            bottom: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          titleColor: '#111827',
          bodyColor: '#111827',
          borderColor: 'rgba(24, 144, 255, 0.2)',
          borderWidth: 1,
          cornerRadius: 8,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          titleFont: {
            family: 'Inter',
            weight: 'bold' as const,
          },
          bodyFont: {
            family: 'Inter',
          },
          padding: 12,
          usePointStyle: true,
        },
      },
      elements: {
        line: {
          tension: 0.4,
          borderWidth: 2,
          borderColor: '#0095ff',
          backgroundColor: 'rgba(0, 149, 255, 0.1)',
          fill: true,
        },
        point: {
          radius: 4,
          hitRadius: 10,
          hoverRadius: 6,
          borderWidth: 2,
        },
        arc: {
          borderWidth: 1,
          borderColor: '#fff',
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            font: {
              family: 'Inter',
              size: 12,
            },
            color: '#6b7280',
          },
        },
        y: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false,
          },
          ticks: {
            font: {
              family: 'Inter',
              size: 12,
            },
            color: '#6b7280',
          },
        },
      },
    };

    // Specific configurations for chart types
    const chartOptions = {
      ...defaultOptions,
      ...(type === 'line' || type === 'bar' ? {
        scales: {
          ...defaultOptions.scales,
        }
      } : {}),
      ...(type === 'pie' || type === 'doughnut' ? {
        cutout: type === 'doughnut' ? '70%' : undefined,
      } : {})
    };

    switch (type) {
      case 'line':
        return <Line data={data} options={chartOptions} />;
      case 'bar':
        return <Bar data={data} options={chartOptions} />;
      case 'pie':
        return <Pie data={data} options={chartOptions} />;
      case 'doughnut':
        return <Doughnut data={data} options={chartOptions} />;
      default:
        return <div>Unsupported chart type: {type}</div>;
    }
  };

  // Custom components for Markdown rendering
  const components = {
    // Custom code block renderer
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={atomDark}
          language={match[1]}
          PreTag="div"
          className="rounded-lg overflow-hidden"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={`${className} rounded bg-neutral-100 px-1.5 py-0.5 text-sm font-mono text-primary-700`} {...props}>
          {children}
        </code>
      );
    },
    // Custom table renderer
    table({ node, children, ...props }: any) {
      return (
        <div className="overflow-x-auto my-6 rounded-xl shadow-md border border-neutral-200">
          <table className="min-w-full border-collapse bg-white rounded-xl overflow-hidden" {...props}>
            {children}
          </table>
        </div>
      );
    },
    // Custom th renderer
    th({ node, children, ...props }: any) {
      return (
        <th className="px-4 py-3 bg-primary-500 text-white font-medium border-b border-primary-600" {...props}>
          {children}
        </th>
      );
    },
    // Custom td renderer
    td({ node, children, ...props }: any) {
      return (
        <td className="px-4 py-3 border-b border-neutral-200" {...props}>
          {children}
        </td>
      );
    },
    // Custom tr renderer
    tr({ node, children, isHeader, ...props }: any) {
      return (
        <tr className="hover:bg-neutral-50 transition-colors" {...props}>
          {children}
        </tr>
      );
    },
    // Handle any div that might contain a chart
    div({ node, className, children, ...props }: any) {
      const id = props.id || '';
      if (id.startsWith('chart-') && chartRefs.current[id]) {
        const { type, data } = chartRefs.current[id];
        return (
          <div className="my-6 p-4 bg-white rounded-xl shadow-md border border-neutral-200">
            {renderChart(id, type, data)}
          </div>
        );
      }
      return <div className={className} {...props}>{children}</div>;
    },
    // Headings
    h1: ({ node, ...props }: any) => (
      <h1 className="text-2xl font-bold text-neutral-800 my-4" {...props} />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 className="text-xl font-bold text-neutral-800 my-3" {...props} />
    ),
    h3: ({ node, ...props }: any) => (
      <h3 className="text-lg font-bold text-neutral-800 my-2" {...props} />
    ),
    // Lists
    ul: ({ node, ...props }: any) => (
      <ul className="list-disc pl-5 my-3 space-y-1" {...props} />
    ),
    ol: ({ node, ...props }: any) => (
      <ol className="list-decimal pl-5 my-3 space-y-1" {...props} />
    ),
    // Links
    a: ({ node, ...props }: any) => (
      <a className="text-primary-600 hover:text-primary-700 underline" {...props} />
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="prose prose-sm max-w-none"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </motion.div>
  );
};

export default RichMessageContent; 