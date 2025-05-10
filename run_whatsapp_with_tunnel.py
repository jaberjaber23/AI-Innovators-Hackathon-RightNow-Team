import os
import sys
import time
import subprocess
import requests
from pyngrok import ngrok
import shutil

# WhatsApp Integration server port
WHATSAPP_PORT = 8002

def start_whatsapp_server():
    """Start the WhatsApp integration server as a subprocess"""
    print("Starting WhatsApp Integration server...")
    process = subprocess.Popen([sys.executable, "whatsapp_integration.py"], 
                              stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE)
    return process

def setup_ngrok_tunnel(port):
    """Set up an ngrok tunnel to the specified port"""
    print(f"Setting up ngrok tunnel to port {port}...")
    public_url = ngrok.connect(port).public_url
    print("\n" + "=" * 50)
    print(f"NGROK TUNNEL URL: {public_url}")
    print("=" * 50 + "\n")
    return public_url

def update_twilio_webhook(webhook_url):
    """Output instructions to update Twilio webhook URL"""
    webhook_endpoint = f"{webhook_url}/webhook"
    print("\n" + "=" * 70)
    print("  IMPORTANT: UPDATE YOUR TWILIO WEBHOOK")
    print("=" * 70)
    print(f"1. Go to: https://www.twilio.com/console/sms/whatsapp/sandbox")
    print(f"2. Find the 'WHEN A MESSAGE COMES IN' field")
    print(f"3. Set it to this URL (CTRL+C to copy):")
    print(f"\n   {webhook_endpoint}\n")
    print(f"4. Make sure you've joined the WhatsApp sandbox by sending")
    print(f"   the code from the Twilio console to +14155238886")
    print("=" * 70 + "\n")
    return webhook_endpoint

def check_whatsapp_server(timeout=60):
    """Check if the WhatsApp server is running"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"http://localhost:{WHATSAPP_PORT}/status")
            if response.status_code == 200:
                print("WhatsApp server is running!")
                return True
        except:
            pass
        time.sleep(1)
        print("Waiting for WhatsApp server to start...")
    
    print("Failed to connect to WhatsApp server within timeout period.")
    return False

def main():
    # Make sure .env file exists
    if not os.path.exists(".env"):
        print("ERROR: .env file not found. Creating one from template...")
        shutil.copy(".env-template", ".env")
        print("Created .env file. Please update with your credentials.")
    
    # Start the WhatsApp integration server
    whatsapp_process = start_whatsapp_server()
    
    try:
        # Check if the server started successfully
        if not check_whatsapp_server():
            print("WhatsApp server failed to start. Check the logs for errors.")
            whatsapp_process.terminate()
            return
        
        # Set up ngrok tunnel
        tunnel_url = setup_ngrok_tunnel(WHATSAPP_PORT)
        
        # Provide instructions for updating the Twilio webhook
        webhook_endpoint = update_twilio_webhook(tunnel_url)
        
        print("Your WhatsApp integration is now running!")
        print("To test it, send a message to the WhatsApp sandbox number: +14155238886")
        print("Simply chat naturally - no commands needed! Ask questions about:")
        print(" • Financial analysis and insights")
        print(" • Mall transaction summaries")
        print(" • Unusual transaction patterns")
        print(" • Monthly reports")
        
        print("\n" + "-" * 70)
        print("TWILIO WHATSAPP SETUP CHECKLIST:")
        print("-" * 70)
        print("1. Join sandbox: Send join code to +14155238886")
        print(f"2. Set webhook URL: {webhook_endpoint}")
        print("3. Test: Send a financial question via WhatsApp")
        print("-" * 70)
        
        print("\nPress Ctrl+C to stop the server...\n")
        
        # Keep the script running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        # Clean up
        print("Stopping ngrok tunnel...")
        ngrok.kill()
        
        print("Stopping WhatsApp server...")
        whatsapp_process.terminate()
        
        print("Done!")

if __name__ == "__main__":
    main() 