import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_SENDER = os.getenv("SMTP_SENDER") or SMTP_USER

def send_smtp_email_sync(to_email: str, subject: str, html_content: str):
    if not SMTP_USER or not SMTP_PASS:
        print("⚠️ SMTP credentials not configured inside .env. Email skipped.")
        print(f"📧 [Mock Mail Log] To: {to_email} | Subject: {subject}")
        print(f"📧 [Mock Mail HTML]: {html_content[:300]}...")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_SENDER
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
            
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_SENDER, to_email, msg.as_string())
        server.quit()
        print(f"✅ Email sent successfully to {to_email}!")
        return True
    except Exception as e:
        print(f"❌ Failed to send SMTP email to {to_email}: {e}")
        return False

async def send_email(to_email: str, subject: str, html_content: str):
    # Run the synchronous SMTP call inside a background executor
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, send_smtp_email_sync, to_email, subject, html_content)
