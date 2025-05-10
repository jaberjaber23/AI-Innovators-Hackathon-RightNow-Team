'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';

type WhatsAppStatus = {
  twilio_configured: boolean;
  mcp_connection: string;
  mcp_status?: {
    status: string;
    tools_count: number;
  };
};

export default function WhatsAppPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message: string }>({ message: '' });
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    // Get WhatsApp integration status
    const getStatus = async () => {
      try {
        const response = await fetch('/api/whatsapp');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        } else {
          setStatus(null);
          setResult({ 
            success: false, 
            message: 'Failed to connect to WhatsApp integration server' 
          });
        }
      } catch (error) {
        setStatus(null);
        setResult({ 
          success: false, 
          message: 'Error connecting to WhatsApp integration server' 
        });
      } finally {
        setStatusLoading(false);
      }
    };

    getStatus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult({ message: '' });

    try {
      // Format phone number if needed (remove spaces, ensure it has country code)
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedNumber,
          message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ 
          success: true, 
          message: 'Message sent successfully!' 
        });
        // Clear the form
        setMessage('');
      } else {
        setResult({ 
          success: false, 
          message: data.error || 'Failed to send message' 
        });
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: 'Error sending message' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">WhatsApp Integration</h1>
        <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Back to Dashboard
        </Link>
      </div>

      {statusLoading ? (
        <div className="bg-gray-100 p-6 rounded-lg mb-8">
          <p className="text-gray-700">Loading WhatsApp integration status...</p>
        </div>
      ) : status ? (
        <div className="bg-gray-100 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">WhatsApp Integration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <p className="font-medium">Twilio Configuration:</p>
              {status.twilio_configured ? (
                <p className="text-green-600">✅ Twilio is configured</p>
              ) : (
                <p className="text-red-600">❌ Twilio is not configured</p>
              )}
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="font-medium">MCP Connection:</p>
              {status.mcp_connection === 'connected' ? (
                <p className="text-green-600">✅ Connected to MCP Server</p>
              ) : (
                <p className="text-red-600">❌ Not connected to MCP Server</p>
              )}
            </div>
          </div>

          {!status.twilio_configured && (
            <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
              <p className="font-semibold">Setup Required:</p>
              <p>Please configure your Twilio credentials in the .env file:</p>
              <pre className="mt-2 p-2 bg-gray-800 text-white rounded text-sm overflow-x-auto">
                TWILIO_ACCOUNT_SID=your_account_sid<br />
                TWILIO_AUTH_TOKEN=your_auth_token<br />
                TWILIO_PHONE_NUMBER=your_twilio_phone_number
              </pre>
              <p className="mt-2">
                You can get these from your{' '}
                <a
                  href="https://www.twilio.com/console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Twilio Console
                </a>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-red-100 p-6 rounded-lg mb-8 text-red-800">
          <p className="font-semibold">WhatsApp Integration Error</p>
          <p>{result.message}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Send WhatsApp Message</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (with country code)
            </label>
            <input
              type="text"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-sm text-gray-600 mt-1">
              Make sure this number is registered with the WhatsApp Business API
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-between items-center">
            <button
              type="submit"
              disabled={loading || !status?.twilio_configured}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                loading || !status?.twilio_configured
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
            
            {result.message && (
              <div
                className={`px-4 py-2 rounded ${
                  result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {result.message}
              </div>
            )}
          </div>
        </form>

        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-medium mb-2">WhatsApp Commands Help</h3>
          <p className="mb-2">Your users can send the following commands to interact with the AI:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-mono">/financial [question]</span> - Ask a financial question</li>
            <li><span className="font-mono">/summary</span> - Get mall transaction summary</li>
            <li><span className="font-mono">/anomalies</span> - Check for transaction anomalies</li>
            <li><span className="font-mono">/report [month]</span> - Generate monthly report</li>
            <li><span className="font-mono">/help</span> - Show available commands</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 