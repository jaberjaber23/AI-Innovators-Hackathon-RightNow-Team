# WhatsApp Integration Setup Guide

This guide will help you set up the WhatsApp integration using Twilio's WhatsApp sandbox.

## Step 1: Join the Twilio WhatsApp Sandbox

1. Go to [Twilio's WhatsApp Sandbox](https://www.twilio.com/console/sms/whatsapp/sandbox)
2. You'll see a sandbox connection message that looks like this:
   ```
   join example-word
   ```
3. **Send this exact message** from your WhatsApp app to the sandbox number:
   ```
   +14155238886
   ```
4. You'll receive a confirmation message from Twilio once you're connected.

![WhatsApp Sandbox](https://assets.twilio.com/images/twilio-docs/whatsapp-sandbox.png)

## Step 2: Set Up Environment Variables

1. Copy the `.env-template` file to `.env`:
   ```
   copy .env-template .env
   ```

2. Edit the `.env` file and update these values:
   - `TWILIO_ACCOUNT_SID` - from your Twilio console
   - `TWILIO_AUTH_TOKEN` - from your Twilio console
   - `TWILIO_PHONE_NUMBER` - should be `+14155238886` for the sandbox
   - `WHATSAPP_TEST_NUMBER` - your WhatsApp phone number (with country code)

## Step 3: Test Your Configuration

Run the test script to verify your Twilio configuration:

```
python test_twilio_config.py
```

If you see any errors, follow the troubleshooting instructions in the output.

## Step 4: Run the WhatsApp Integration

After confirming your configuration is correct:

1. Start the integration with ngrok tunneling:
   ```
   python run_whatsapp_with_tunnel.py
   ```

2. When the ngrok tunnel URL appears, copy it and update your Twilio WhatsApp Sandbox settings:
   - Go to [Twilio's WhatsApp Sandbox](https://www.twilio.com/console/sms/whatsapp/sandbox)
   - Paste your URL + `/webhook` into the "WHEN A MESSAGE COMES IN" field
   - Save the configuration

## Step 5: Test the Integration

1. Send a message to the WhatsApp sandbox number (`+14155238886`)
2. Ask something like "What's the financial summary for this month?"
3. The AI should respond with financial insights

## Common Issues

### "Twilio could not find a Channel with the specified From address"

This means your WhatsApp number isn't properly configured. Ensure:
1. You're using the correct sandbox number (`+14155238886`)
2. You've joined the sandbox by sending the code
3. Your environment variables are set correctly

### Messages Not Being Received

If messages aren't received by your app:
1. Check that your ngrok tunnel is running
2. Verify the webhook URL is correctly set in Twilio
3. Restart the integration server

## Need Help?

Run the diagnostic tool:
```
python test_twilio_config.py
```

This will check your configuration and provide specific troubleshooting tips. 