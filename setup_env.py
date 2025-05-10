import os
import shutil
from pathlib import Path

def create_or_update_env():
    """Create or update the .env file with proper WhatsApp sandbox credentials"""
    env_path = Path('.env')
    template_path = Path('.env-template')
    
    # Check if .env-template exists
    if not template_path.exists():
        print("❌ ERROR: .env-template file not found.")
        return False
    
    # Determine if we're creating or updating
    creating_new = not env_path.exists()
    
    if creating_new:
        # Just copy the template to create a new .env file
        shutil.copy(template_path, env_path)
        print("✅ Created new .env file from template.")
    else:
        # Update existing .env file
        print("📝 Updating existing .env file...")
        
        # Read current .env file
        with open(env_path, 'r') as f:
            env_lines = f.readlines()
        
        # Update the phone number if it's not already the sandbox number
        updated = False
        for i, line in enumerate(env_lines):
            if line.startswith('TWILIO_PHONE_NUMBER=') and '+14155238886' not in line:
                env_lines[i] = 'TWILIO_PHONE_NUMBER=+14155238886  # WhatsApp sandbox number\n'
                updated = True
        
        if updated:
            # Write the updated file
            with open(env_path, 'w') as f:
                f.writelines(env_lines)
            print("✅ Updated TWILIO_PHONE_NUMBER to the WhatsApp sandbox number.")
        else:
            print("✓ TWILIO_PHONE_NUMBER already set correctly.")
    
    print("\n--- WhatsApp Sandbox Setup Instructions ---")
    print("1. Go to: https://www.twilio.com/console/sms/whatsapp/sandbox")
    print("2. Get the join code (like 'join example-word')")
    print("3. Send this code via WhatsApp to +14155238886")
    print("4. Wait for confirmation from WhatsApp that you've joined the sandbox")
    
    print("\nAfter completing these steps, run:")
    print("python test_twilio_config.py")
    
    return True

if __name__ == "__main__":
    print("===== WhatsApp Environment Setup =====\n")
    create_or_update_env() 