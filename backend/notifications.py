"""
notification.py — Email & Google Chat webhook helpers.

All functions silently log errors if credentials are not configured
so the app works without email/webhook setup during development.
"""
import smtplib
import urllib.request
import urllib.error
import json
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def _get_config():
    from .config import Config
    return Config


def send_email(to: str | list, subject: str, html_body: str, text_body: str = ''):
    """Send an HTML email via SMTP. Silently skips if not configured."""
    cfg = _get_config()
    if not cfg.MAIL_USERNAME or not cfg.MAIL_PASSWORD:
        logger.info(f"[EMAIL-MOCK] To: {to} | Subject: {subject}")
        print(f"[EMAIL-MOCK] To: {to} | Subject: {subject}")
        return True

    recipients = to if isinstance(to, list) else [to]
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = cfg.MAIL_DEFAULT_SENDER
        msg['To'] = ', '.join(recipients)
        if text_body:
            msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(cfg.MAIL_SERVER, cfg.MAIL_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(cfg.MAIL_USERNAME, cfg.MAIL_PASSWORD)
            server.sendmail(cfg.MAIL_DEFAULT_SENDER, recipients, msg.as_string())
        logger.info(f"[EMAIL] Sent '{subject}' to {recipients}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL-ERROR] {e}")
        return False


def send_gchat_message(text: str):
    """Post a plain-text message to a Google Chat webhook. Silently skips if not configured."""
    cfg = _get_config()
    if not cfg.GCHAT_WEBHOOK_URL:
        print(f"[GCHAT-MOCK] {text}")
        return True
    try:
        payload = json.dumps({'text': text}).encode('utf-8')
        req = urllib.request.Request(
            cfg.GCHAT_WEBHOOK_URL,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as e:
        logger.error(f"[GCHAT-ERROR] {e}")
        return False


def build_reminder_email(student_name: str, drives: list) -> str:
    """Render HTML reminder email listing upcoming drives."""
    rows = ''
    for d in drives:
        rows += f"""
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee">{d['job_title']}</td>
          <td style="padding:10px;border-bottom:1px solid #eee">{d['company_name']}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;color:#e74c3c"><strong>{d['deadline']}</strong></td>
        </tr>"""
    return f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
      <div style="background:linear-gradient(135deg,#6366f1,#06b6d4);padding:24px;border-radius:12px;color:#fff;text-align:center">
        <h1 style="margin:0">⚡ PlacePro</h1>
        <p style="margin:8px 0 0;opacity:.9">Placement Drive Deadline Reminders</p>
      </div>
      <div style="padding:24px 0">
        <p>Hi <strong>{student_name}</strong>,</p>
        <p>Here are placement drives with deadlines in the next <strong>7 days</strong> that you are eligible for:</p>
        <table width="100%" style="border-collapse:collapse;margin-top:16px">
          <thead><tr style="background:#f8f9fa">
            <th style="padding:10px;text-align:left">Job Title</th>
            <th style="padding:10px;text-align:left">Company</th>
            <th style="padding:10px;text-align:left">Deadline</th>
          </tr></thead>
          <tbody>{rows}</tbody>
        </table>
        <p style="margin-top:20px">Log in to <a href="http://localhost:5000">PlacePro</a> to apply before the deadline!</p>
      </div>
      <div style="border-top:1px solid #eee;padding-top:16px;font-size:12px;color:#999;text-align:center">
        PlacePro — Institute Placement Cell
      </div>
    </body></html>"""


def build_monthly_report_email(stats: dict, month: str) -> str:
    """Render HTML monthly activity report for admin."""
    return f"""
    <html><body style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:20px">
      <div style="background:linear-gradient(135deg,#6366f1,#06b6d4);padding:28px;border-radius:12px;color:#fff;text-align:center">
        <h1 style="margin:0">📊 PlacePro Monthly Report</h1>
        <p style="margin:8px 0 0;opacity:.9">{month}</p>
      </div>
      <div style="padding:24px 0">
        <h2 style="color:#333">Placement Activity Summary</h2>
        <table width="100%" style="border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">
          <tr style="background:#f8f9fa"><td style="padding:14px;font-weight:bold;color:#555">Total Students Registered</td>
            <td style="padding:14px;text-align:right;font-size:1.3em;color:#6366f1"><strong>{stats.get('total_students',0)}</strong></td></tr>
          <tr><td style="padding:14px;font-weight:bold;color:#555">Total Companies Approved</td>
            <td style="padding:14px;text-align:right;font-size:1.3em;color:#06b6d4"><strong>{stats.get('approved_companies',0)}</strong></td></tr>
          <tr style="background:#f8f9fa"><td style="padding:14px;font-weight:bold;color:#555">Drives Conducted This Month</td>
            <td style="padding:14px;text-align:right;font-size:1.3em;color:#10b981"><strong>{stats.get('drives_this_month',0)}</strong></td></tr>
          <tr><td style="padding:14px;font-weight:bold;color:#555">Total Applications This Month</td>
            <td style="padding:14px;text-align:right;font-size:1.3em;color:#f59e0b"><strong>{stats.get('applications_this_month',0)}</strong></td></tr>
          <tr style="background:#f8f9fa"><td style="padding:14px;font-weight:bold;color:#555">Students Selected This Month</td>
            <td style="padding:14px;text-align:right;font-size:1.3em;color:#10b981"><strong>{stats.get('selected_this_month',0)}</strong></td></tr>
          <tr><td style="padding:14px;font-weight:bold;color:#555">Placement Rate</td>
            <td style="padding:14px;text-align:right;font-size:1.3em;color:#6366f1"><strong>{stats.get('placement_rate','N/A')}</strong></td></tr>
        </table>
        <p style="margin-top:20px;color:#666;font-size:14px">This report was auto-generated by PlacePro on the 1st of the month.</p>
      </div>
      <div style="border-top:1px solid #eee;padding-top:16px;font-size:12px;color:#999;text-align:center">
        PlacePro — Institute Placement Cell &copy; 2026
      </div>
    </body></html>"""
