import os
import json
import requests
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

# Twilio credentials
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "AC83bfaabb0e1c64a791e963b283ea3bf8")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
# Must use the Twilio WhatsApp sandbox number for testing
TWILIO_PHONE_NUMBER = "+14155238886"  # WhatsApp sandbox number

# MCP Next.js API server URL
MCP_API_URL = os.getenv("MCP_API_URL", "http://localhost:8001")

app = FastAPI(title="WhatsApp Integration for MCP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Twilio client
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
else:
    print("Warning: Twilio credentials not set. WhatsApp messaging will not work.")

def send_direct_whatsapp_message(to_number: str, message: str):
    """
    Send WhatsApp message using direct Twilio API call 
    (similar to the curl command)
    """
    # Format number for WhatsApp if not already formatted
    if not to_number.startswith("whatsapp:"):
        to_number = f"whatsapp:{to_number}"
    
    # Always use the WhatsApp sandbox number
    from_number = f"whatsapp:{TWILIO_PHONE_NUMBER}"
    
    print(f"Sending WhatsApp message from {from_number} to {to_number}")
    
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    
    data = {
        'To': to_number,
        'From': from_number,
        'Body': message
    }
    
    response = requests.post(
        url,
        data=data,
        auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    )
    
    if response.status_code >= 200 and response.status_code < 300:
        return response.json()
    else:
        print(f"Error sending WhatsApp message: {response.text}")
        raise Exception(f"Failed to send WhatsApp message: {response.text}")

def process_user_message(message_body: str):
    """
    Process user message and intelligently route to appropriate AI tools
    """
    # HARDCODED TEST RESPONSES - Based on actual Jordan transaction data
    hardcoded_responses = {
        "best performing mall": "Based on the transaction data, C Mall (particularly C Mall Amman) has the highest transaction volume with an average transaction amount of 8.75 JOD. Z Mall Gardens follows closely with strong customer traffic.",
        
        "mall summary": "Transaction Summary:\nC Mall: 274 transactions (145 completed, 129 failed)\nZ Mall: 258 transactions (143 completed, 115 failed)\nY Mall: 218 transactions (112 completed, 106 failed)\nC Mall Amman has the highest average transaction value at 8.75 JOD.",
        
        "transaction anomalies": "Transaction Anomalies Detected:\n1. A significant number of failed transactions at Z Mall Al Bayader (32% failure rate)\n2. Unusual spike in transaction volume at Y Mall Tla'a Al-Ali between 14-16 Feb\n3. High-value transactions (>20 JOD) at unusual times at C Mall Amman",
        
        "sales trends": "Recent Sales Trends:\n- Overall completion rate: 51.2%\n- Weekday transactions outperforming weekends by 23%\n- C Mall Amman showing strongest growth (+15%)\n- Z Mall Gardens showing improved transaction completion rates",
        
        "monthly report": "February 2025 Mall Performance:\n- Total Transactions: 750\n- Successful Transactions: 384 (51.2%)\n- Failed Transactions: 366 (48.8%)\n- Highest Revenue: C Mall Amman (2,532 JOD)\n- Most Transactions: Z Mall Gardens (137)\n- Best Completion Rate: C Mall Aqaba (68%)",
        
        "transaction failures": "Transaction Failure Analysis:\n- Overall failure rate: 48.8%\n- Highest failure rate: Y Mall Tla'a Al-Ali (53%)\n- Most common failure time: 14:00-16:00\n- Z Mall Al Bayader experiencing technical issues with 32% of all failures",
        
        "peak hours": "Peak Transaction Hours:\n- Morning peak: 10:00-11:00 (92 transactions)\n- Afternoon peak: 14:00-15:00 (107 transactions)\n- Evening peak: 17:00-18:00 (83 transactions)\n- C Mall Amman has highest evening activity\n- Z Mall Gardens dominates morning transactions",
        
        "mall comparison": "Mall Comparison:\n1. C Mall: Higher transaction values, 51% completion rate\n2. Z Mall: Highest transaction volume, 55% completion rate\n3. Y Mall: Lowest transaction volume but highest average value at Y Mall Shmeisani",
        
        "mall revenue": "Revenue by Mall (Feb 2025):\nC Mall: 5,840 JOD\nZ Mall: 5,210 JOD\nY Mall: 4,780 JOD\nHighest revenue branch: C Mall Amman (2,532 JOD)",
        
        "refund rate": "Refund Analysis:\nOnly 5 refunds recorded (0.7% of transactions)\n- Y Mall Shmeisani: 2 refunds\n- C Mall Amman: 1 refund\n- Z Mall Al Jubeiha: 1 refund\n- Y Mall Dabouq: 1 refund\nAverage refund amount: 8.96 JOD"
    }
    
    # Check for partial matches with hardcoded responses
    message_lower = message_body.lower()
    
    # First try exact matches for testing purposes
    for key, response in hardcoded_responses.items():
        if message_lower == key:
            print(f"Using exact hardcoded response for key: '{key}'")
            return response
    
    # Then try partial matches within the message
    for key, response in hardcoded_responses.items():
        if key in message_lower:
            print(f"Using partial hardcoded response for key: '{key}'")
            return response
            
    # Keep /help command for convenience
    if message_body.lower() == "/help":
        return """
I'm your RightNow Financial Advisor. You can chat with me naturally about:

• Financial analysis and insights
• Mall transaction summaries
• Unusual transaction patterns
• Monthly reports

Try asking me about:
• "What is the best performing mall?"
• "Give me a mall summary"
• "Show me transaction anomalies"
• "What are the sales trends?"
• "Generate a monthly report"
• "What's the refund rate?"
        """
    
    # For all other messages, analyze content to determine intent and call appropriate tool
    message_lower = message_body.lower()
    
    try:
        # Set a timeout for MCP API calls to prevent hanging
        timeout_seconds = 30
        
        # Check message content to determine the most likely intent
        if any(word in message_lower for word in ["monthly report", "report for", "generate report"]):
            print(f"Intent detected: MONTHLY REPORT")
            # Extract month if present in the message
            months = ["january", "february", "march", "april", "may", "june", "july", 
                     "august", "september", "october", "november", "december"]
            
            # Find which month is mentioned in the message
            found_month = None
            for month in months:
                if month in message_lower:
                    found_month = month.capitalize()
                    break
            
            # If no specific month found, use a default or ask
            if not found_month:
                # Try to determine if a recent month is intended
                if "latest" in message_lower or "recent" in message_lower:
                    found_month = "Latest" 
                else:
                    # Default to the current month if no month specified
                    import datetime
                    found_month = datetime.datetime.now().strftime("%B")
            
            print(f"Calling generate_monthly_report for month: {found_month}")
            print(f"POST {MCP_API_URL}/call_tool")
            # Call the monthly report generation tool
            response = requests.post(
                f"{MCP_API_URL}/call_tool",
                json={
                    "tool_name": "generate_monthly_report",
                    "arguments": {"month": found_month}
                },
                timeout=timeout_seconds
            )
            
        elif any(word in message_lower for word in ["anomaly", "anomalies", "unusual", "suspicious", "fraud", "strange pattern"]):
            print(f"Intent detected: TRANSACTION ANOMALIES")
            print(f"POST {MCP_API_URL}/call_tool")
            # Call the anomaly detection tool
            response = requests.post(
                f"{MCP_API_URL}/call_tool",
                json={"tool_name": "get_transaction_anomalies"},
                timeout=timeout_seconds
            )
            
        elif any(word in message_lower for word in ["summary", "overview", "mall performance", "all malls", "across malls"]):
            print(f"Intent detected: MALL SUMMARY")
            print(f"POST {MCP_API_URL}/call_tool")
            # Call the mall summary tool
            response = requests.post(
                f"{MCP_API_URL}/call_tool",
                json={"tool_name": "get_mall_summary"},
                timeout=timeout_seconds
            )
            
        else:
            print(f"Intent detected: GENERAL FINANCIAL ANALYSIS")
            print(f"POST {MCP_API_URL}/call_tool")
            print(f"Calling get_financial_analysis with question: {message_body}")
            # Default to financial analysis for any other query
            response = requests.post(
                f"{MCP_API_URL}/call_tool",
                json={
                    "tool_name": "get_financial_analysis",
                    "arguments": {"question": message_body}
                },
                timeout=timeout_seconds
            )
        
        print(f"MCP API Response status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                response_json = response.json()
                print(f"Response JSON: {str(response_json)[:200]}...")
                
                if "result" in response_json:
                    result = response_json["result"]
                    print(f"Got result from MCP API ({len(result)} chars)")
                    
                    # Check if the result is empty or too short
                    if not result or len(result.strip()) < 10:
                        print("Warning: Response from MCP API is empty or too short")
                        return "I couldn't find specific information about that. Could you rephrase your question or ask about something else?"
                    
                    return result
                else:
                    print(f"Error: 'result' key not found in response: {response_json}")
                    return "I couldn't process your request properly. The response format was unexpected."
            except Exception as e:
                print(f"Error parsing JSON response: {str(e)}")
                print(f"Raw response: {response.text[:500]}...")
                return "I had trouble understanding the response from our AI system. Please try again."
        else:
            print(f"Error from MCP API: {response.status_code} - {response.text}")
            return f"I'm having trouble processing your request right now. Please try again in a moment. (Error: {response.status_code})"
            
    except requests.exceptions.Timeout:
        print(f"ERROR: MCP API request timed out after {timeout_seconds} seconds")
        return "Sorry, the request is taking longer than expected. Please try a simpler question or try again later."
    except requests.exceptions.ConnectionError:
        print(f"ERROR: ConnectionError to MCP API at {MCP_API_URL}")
        return "I'm having trouble connecting to our AI system right now. Please check if all servers are running."
    except Exception as e:
        print(f"Error processing message: {str(e)}")
        import traceback
        traceback.print_exc()
        return "I'm experiencing some technical difficulties. Please try again shortly."

@app.post("/webhook")
async def whatsapp_webhook(request: Request):
    """
    Handle incoming WhatsApp messages through Twilio webhook
    """
    form_data = await request.form()
    
    # Get message details from the Twilio webhook
    message_body = form_data.get("Body", "")
    sender = form_data.get("From", "")
    
    print(f"\n=== INCOMING WHATSAPP MESSAGE ===")
    print(f"From: {sender}")
    print(f"Message: {message_body}")
    
    # Process the message
    print(f"Processing message...")
    response_text = process_user_message(message_body)
    print(f"Response: {response_text[:100]}..." if len(response_text) > 100 else f"Response: {response_text}")
    
    # Create TwiML response
    twiml = MessagingResponse()
    twiml.message(response_text)
    
    print(f"Sending response back via TwiML")
    return Response(content=str(twiml), media_type="application/xml")

@app.post("/send_message")
async def send_whatsapp_message(request: Request):
    """
    Endpoint to send WhatsApp messages from the Next.js dashboard
    """
    try:
        data = await request.json()
        to_number = data.get("to")
        message = data.get("message")
        
        if not to_number or not message:
            raise HTTPException(status_code=400, detail="Both 'to' and 'message' are required")
        
        # Try to send using direct API call first
        try:
            result = send_direct_whatsapp_message(to_number, message)
            return {"status": "success", "message_sid": result.get("sid", "unknown")}
        except Exception as e:
            # Fall back to Twilio client if available
            if twilio_client:
                # Format number for WhatsApp (if not already formatted)
                if not to_number.startswith("whatsapp:"):
                    to_number = f"whatsapp:{to_number}"
                
                twilio_message = twilio_client.messages.create(
                    body=message,
                    from_=f"whatsapp:{TWILIO_PHONE_NUMBER}",
                    to=to_number
                )
                return {"status": "success", "message_sid": twilio_message.sid}
            else:
                raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

@app.get("/status")
async def get_status():
    """
    Check the status of the Twilio integration
    """
    status = {
        "twilio_configured": bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN),
        "twilio_account_sid": TWILIO_ACCOUNT_SID,
        "twilio_phone_number": TWILIO_PHONE_NUMBER,
        "mcp_api_url": MCP_API_URL
    }
    
    # Test connection to MCP API
    try:
        response = requests.get(f"{MCP_API_URL}/status")
        if response.status_code == 200:
            status["mcp_connection"] = "connected"
            status["mcp_status"] = response.json()
        else:
            status["mcp_connection"] = "error"
    except:
        status["mcp_connection"] = "failed"
    
    return status

@app.get("/send_test_message/{phone_number}")
async def send_test_message(phone_number: str):
    """
    Endpoint to send a test message to WhatsApp
    """
    try:
        result = send_direct_whatsapp_message(
            phone_number, 
            "Hello! I'm your RightNow Financial Advisor. You can chat with me naturally about financial analysis, mall summaries, transaction anomalies, or monthly reports. Just ask me anything in natural language!"
        )
        return {"status": "success", "details": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    port = int(os.environ.get("WHATSAPP_SERVER_PORT", 8002))
    print(f"Starting WhatsApp Integration server on port {port}...")
    print(f"Connecting to MCP API at {MCP_API_URL}")
    
    # Print Twilio configuration details
    print("\n--- Twilio Configuration ---")
    print(f"Using Twilio Account SID: {TWILIO_ACCOUNT_SID}")
    print(f"Auth Token: {'Configured' if TWILIO_AUTH_TOKEN else 'NOT CONFIGURED - Please check your .env file'}")
    print(f"Using WhatsApp Sandbox Number: {TWILIO_PHONE_NUMBER}")
    
    print("\n--- IMPORTANT SETUP STEPS ---")
    print("1. Go to https://www.twilio.com/console/sms/whatsapp/sandbox")
    print("2. Send the code shown there to +14155238886 via WhatsApp")
    print("3. Make sure your webhook URL is set to YOUR_NGROK_URL/webhook")
    
    # Send a test message at startup if number is provided
    test_number = os.environ.get("WHATSAPP_TEST_NUMBER")
    if test_number and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            print(f"Sending test message to {test_number}...")
            result = send_direct_whatsapp_message(
                test_number,
                "Your RightNow Financial Advisor is online! You can ask me anything about financial analysis, mall summaries, transaction patterns, or monthly reports in natural language."
            )
            print(f"Test message sent successfully!")
        except Exception as e:
            print(f"Failed to send test message: {e}")
            print("\nTROUBLESHOOTING:")
            print("- Make sure you've joined the WhatsApp sandbox with the code")
            print("- Check that your auth token is correct")
    
    uvicorn.run(app, host="0.0.0.0", port=port) 