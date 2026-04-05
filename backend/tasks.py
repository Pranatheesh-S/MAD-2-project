"""
tasks.py — All Celery tasks:
  a) Scheduled: daily_deadline_reminders  (runs daily at 8 AM)
  b) Scheduled: monthly_activity_report   (runs 1st of every month)
  c) Scheduled: close_expired_drives      (runs daily at midnight)
  d) User-triggered: export_applications_csv
"""
import os
import csv
import json
import logging
from celery import Celery
from celery.schedules import crontab
from datetime import datetime, timezone, timedelta

from .celery_utils import make_celery
from .app import create_app

logger = logging.getLogger(__name__)

flask_app = create_app()
celery = make_celery(flask_app)

# ── Beat Schedule ──────────────────────────────────────────────────────────────
celery.conf.beat_schedule = {
    # a) Daily reminders at 08:00
    'daily-deadline-reminders': {
        'task': 'backend.tasks.daily_deadline_reminders',
        'schedule': crontab(hour=8, minute=0),
    },
    # b) Monthly report on the 1st at 07:00
    'monthly-activity-report': {
        'task': 'backend.tasks.monthly_activity_report',
        'schedule': crontab(day_of_month=1, hour=7, minute=0),
    },
    # c) Close expired drives at midnight
    'close-expired-drives': {
        'task': 'backend.tasks.close_expired_drives',
        'schedule': crontab(hour=0, minute=0),
    },
}
celery.conf.timezone = 'Asia/Kolkata'


# ── a) Daily Deadline Reminders ────────────────────────────────────────────────
@celery.task(name='backend.tasks.daily_deadline_reminders', bind=True)
def daily_deadline_reminders(self):
    """
    Sends deadline reminders (email + G-Chat) to students
    for drives expiring within the next 7 days.
    """
    from .models import StudentProfile, PlacementDrive, Application
    from .notifications import send_email, send_gchat_message, build_reminder_email

    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=7)

    upcoming = PlacementDrive.query.filter(
        PlacementDrive.status == 'approved',
        PlacementDrive.deadline >= now,
        PlacementDrive.deadline <= cutoff
    ).all()

    if not upcoming:
        print("[CELERY] No upcoming drives in next 7 days.")
        return {'reminders_sent': 0}

    students = StudentProfile.query.filter_by(is_blacklisted=False).all()
    count = 0

    for student in students:
        eligible = []
        applied_ids = {a.drive_id for a in Application.query.filter_by(student_id=student.id).all()}

        for d in upcoming:
            if d.id in applied_ids:
                continue  # already applied
            # Eligibility check
            if d.eligibility_cgpa and student.cgpa < d.eligibility_cgpa:
                continue
            if d.eligibility_year and d.eligibility_year != student.year:
                continue
            if d.eligibility_branch and d.eligibility_branch.upper() != 'ALL':
                allowed = [b.strip().lower() for b in d.eligibility_branch.split(',')]
                if student.branch and student.branch.lower() not in allowed:
                    continue
            eligible.append({
                'job_title': d.job_title,
                'company_name': d.company.company_name,
                'deadline': d.deadline.strftime('%d %b %Y, %H:%M IST')
            })

        if not eligible:
            continue

        # Send email
        html = build_reminder_email(student.name, eligible)
        send_email(
            to=student.user.email,
            subject=f"⚡ PlacePro: {len(eligible)} drive(s) closing soon!",
            html_body=html
        )
        # Send G-Chat notification
        drive_list = ', '.join(f"{d['job_title']} @ {d['company_name']}" for d in eligible)
        send_gchat_message(
            f"🔔 *PlacePro Reminder* — Hi {student.name}! "
            f"These drives close within 7 days: {drive_list}. Apply now!"
        )
        count += 1

    print(f"[CELERY] Daily reminders sent to {count} students.")
    return {'reminders_sent': count}


# ── b) Monthly Activity Report ─────────────────────────────────────────────────
@celery.task(name='backend.tasks.monthly_activity_report', bind=True)
def monthly_activity_report(self):
    """
    Generates a monthly HTML placement report and emails it to admin.
    Runs on the 1st of each month.
    """
    from .models import StudentProfile, CompanyProfile, PlacementDrive, Application
    from .notifications import send_email, build_monthly_report_email
    from .config import Config

    now = datetime.now(timezone.utc)
    # Previous month range
    first_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_end = first_this - timedelta(seconds=1)
    last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_label = last_month_start.strftime('%B %Y')

    # Stats
    drives_this_month = PlacementDrive.query.filter(
        PlacementDrive.created_at >= last_month_start,
        PlacementDrive.created_at <= last_month_end
    ).count()

    apps_this_month = Application.query.filter(
        Application.applied_at >= last_month_start,
        Application.applied_at <= last_month_end
    ).count()

    selected_this_month = Application.query.filter(
        Application.applied_at >= last_month_start,
        Application.applied_at <= last_month_end,
        Application.status == 'selected'
    ).count()

    placement_rate = (
        f"{round(selected_this_month / apps_this_month * 100, 1)}%"
        if apps_this_month > 0 else 'N/A'
    )

    stats = {
        'total_students': StudentProfile.query.count(),
        'approved_companies': CompanyProfile.query.filter_by(approval_status='approved').count(),
        'drives_this_month': drives_this_month,
        'applications_this_month': apps_this_month,
        'selected_this_month': selected_this_month,
        'placement_rate': placement_rate,
    }

    html = build_monthly_report_email(stats, month_label)
    send_email(
        to=Config.ADMIN_EMAIL,
        subject=f"📊 PlacePro Monthly Report — {month_label}",
        html_body=html
    )
    print(f"[CELERY] Monthly report for {month_label} sent to admin.")
    return {'month': month_label, 'stats': stats}


# ── c) Close Expired Drives ────────────────────────────────────────────────────
@celery.task(name='backend.tasks.close_expired_drives', bind=True)
def close_expired_drives(self):
    """Auto-close approved drives whose deadline has passed."""
    from .models import PlacementDrive
    from .extensions import db
    from .cache import cache_delete_pattern

    now = datetime.now(timezone.utc)
    expired = PlacementDrive.query.filter(
        PlacementDrive.status == 'approved',
        PlacementDrive.deadline < now
    ).all()

    for drive in expired:
        drive.status = 'closed'

    if expired:
        db.session.commit()
        cache_delete_pattern('drives:*')
        print(f"[CELERY] Closed {len(expired)} expired drives.")
    return {'closed_count': len(expired)}


# ── d) Export Applications as CSV (User-Triggered) ────────────────────────────
@celery.task(name='backend.tasks.export_applications_csv', bind=True)
def export_applications_csv(self, student_id: int):
    """
    Generates a CSV of all applications for a given student.
    Saves to the exports/ directory and emails/notifies the student.
    Returns the file path.
    """
    from .models import StudentProfile, Application
    from .notifications import send_email, send_gchat_message
    from .config import Config

    os.makedirs(Config.EXPORT_DIR, exist_ok=True)

    student = StudentProfile.query.get(student_id)
    if not student:
        return {'error': 'Student not found'}

    apps = Application.query.filter_by(student_id=student_id).all()
    filename = f"applications_{student_id}_{int(datetime.now().timestamp())}.csv"
    filepath = os.path.join(Config.EXPORT_DIR, filename)

    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'Application ID', 'Student ID', 'Student Name',
            'Company Name', 'Drive Title', 'Application Status',
            'Applied Date', 'Interview Date', 'Notes'
        ])
        for a in apps:
            writer.writerow([
                a.id,
                student_id,
                student.name,
                a.drive.company.company_name if a.drive and a.drive.company else '',
                a.drive.job_title if a.drive else '',
                a.status,
                a.applied_at.strftime('%Y-%m-%d %H:%M') if a.applied_at else '',
                a.interview_date.strftime('%Y-%m-%d %H:%M') if a.interview_date else '',
                a.notes or ''
            ])

    # Notify student
    html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:550px;margin:auto;padding:20px">
      <div style="background:linear-gradient(135deg,#6366f1,#06b6d4);padding:24px;border-radius:12px;color:#fff;text-align:center">
        <h2 style="margin:0">✅ Export Complete</h2>
      </div>
      <div style="padding:20px 0">
        <p>Hi <strong>{student.name}</strong>,</p>
        <p>Your application history export is ready!</p>
        <ul>
          <li>Total applications: <strong>{len(apps)}</strong></li>
          <li>File: <strong>{filename}</strong></li>
        </ul>
        <p>You can download it from your student dashboard on <a href="http://localhost:5000">PlacePro</a>.</p>
      </div>
    </body></html>"""

    send_email(
        to=student.user.email,
        subject='✅ PlacePro: Your application export is ready!',
        html_body=html
    )
    send_gchat_message(
        f"✅ *PlacePro Export* — Hi {student.name}! "
        f"Your CSV export of {len(apps)} applications is ready for download."
    )

    print(f"[CELERY] CSV exported: {filepath}")
    return {'file': filename, 'filepath': filepath, 'count': len(apps)}


# ── e) Application Confirmation Email (async on apply) ────────────────────────
@celery.task(name='backend.tasks.send_application_confirmation', bind=True)
def send_application_confirmation(self, app_id: int, student_name: str,
                                   student_email: str, job_title: str, company_name: str):
    """Send confirmation email to student after successful application."""
    from .notifications import send_email, send_gchat_message

    html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:550px;margin:auto;padding:20px">
      <div style="background:linear-gradient(135deg,#6366f1,#06b6d4);padding:24px;border-radius:12px;color:#fff;text-align:center">
        <h2 style="margin:0">🎉 Application Submitted!</h2>
      </div>
      <div style="padding:20px 0">
        <p>Hi <strong>{student_name}</strong>,</p>
        <p>Your application for <strong>{job_title}</strong> at <strong>{company_name}</strong> has been received.</p>
        <p>You can track your application status on <a href="http://localhost:5000">PlacePro</a>.</p>
        <p>Best of luck! 🚀</p>
      </div>
    </body></html>"""

    send_email(
        to=student_email,
        subject=f"✅ Application received: {job_title} at {company_name}",
        html_body=html
    )
    send_gchat_message(
        f"🎉 *PlacePro* — Hi {student_name}! Your application for "
        f"*{job_title}* at *{company_name}* was submitted successfully!"
    )
    print(f"[CELERY] Confirmation sent for application #{app_id}")
    return {'app_id': app_id, 'status': 'sent'}
