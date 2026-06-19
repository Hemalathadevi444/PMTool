import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
import logging
import re
from app.config import get_settings

logger = logging.getLogger(__name__)

def generate_html_email(subject: str, body: str) -> str:
    # Check if this is an OTP email
    otp_match = re.search(r"is\s+(\d{6})", body)
    if otp_match:
        otp_code = otp_match.group(1)
        body_content = f"""
        <p>Hello,</p>
        <p>You requested a verification code to access your account. Please use the following One-Time Password (OTP):</p>
        <div class="highlight-box">{otp_code}</div>
        <p>This code is valid for 5 minutes. If you did not request this, please secure your account immediately.</p>
        """
    else:
        # Task assignment or other notifications
        body_content = f"""
        <p>Hello,</p>
        <p style="font-size: 16px; font-weight: 500; color: #111827;">{body}</p>
        <p>Log in to your workspace to view the details and start collaborating.</p>
        """

    html_template = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .container {{
      max-width: 580px;
      margin: 30px auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }}
    .header {{
      background-color: #7c3aed;
      padding: 24px;
      text-align: center;
    }}
    .header h1 {{
      color: #ffffff;
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }}
    .content {{
      padding: 30px;
      color: #374151;
      line-height: 1.6;
    }}
    .content p {{
      margin: 0 0 16px;
      font-size: 15px;
    }}
    .highlight-box {{
      background-color: #f5f3ff;
      border: 1px solid #ddd6fe;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      text-align: center;
      font-size: 28px;
      font-weight: 700;
      color: #7c3aed;
      letter-spacing: 2px;
    }}
    .footer {{
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AIG Project Management</h1>
    </div>
    <div class="content">
      {body_content}
    </div>
    <div class="footer">
      This is an automated notification from AIG Project Management.<br>
      Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
"""
    return html_template

import threading

def send_email(to_email: str, subject: str, body: str) -> None:
    def _send_email_worker():
        settings = get_settings()
        
        # If password is not set or username is empty, log and print (mock mode)
        if not settings.smtp_password or not settings.smtp_username:
            mock_msg = (
                f"\n"
                f"================[ MOCK EMAIL SENT ]================\n"
                f"From: AIG Project Management <{settings.smtp_username}>\n"
                f"To: {to_email}\n"
                f"Subject: {subject}\n"
                f"Body: {body}\n"
                f"===================================================\n"
            )
            logger.warning(mock_msg)
            print(mock_msg, flush=True)
            return

        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = formataddr(("AIG Project Management", settings.smtp_username))
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Attach plain text part
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach HTML part
            html_body = generate_html_email(subject, body)
            msg.attach(MIMEText(html_body, 'html'))

            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
            server.quit()
            logger.info(f"Email successfully sent to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            print(f"[ERROR] Failed to send email to {to_email}: {e}", flush=True)

    threading.Thread(target=_send_email_worker, daemon=True).start()
