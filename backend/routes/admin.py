from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from ..extensions import db
from ..models import User, StudentProfile, CompanyProfile, PlacementDrive, Application
from ..cache import cache_get, cache_set, cache_delete_pattern
from ..config import Config
import os

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def require_admin():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    return None


# ── Companies ──────────────────────────────────────────────────────────────────

@admin_bp.route('/companies', methods=['GET'])
@jwt_required()
def list_companies():
    err = require_admin()
    if err: return err
    status = request.args.get('status')
    query = CompanyProfile.query
    if status:
        query = query.filter_by(approval_status=status)
    return jsonify([c.to_dict() for c in query.all()])


@admin_bp.route('/companies/<int:company_id>/approve', methods=['PUT'])
@jwt_required()
def approve_company(company_id):
    err = require_admin()
    if err: return err
    company = CompanyProfile.query.get_or_404(company_id)
    data = request.get_json()
    action = data.get('action')
    if action not in ('approve', 'reject'):
        return jsonify({'error': 'action must be approve or reject'}), 400
    company.approval_status = 'approved' if action == 'approve' else 'rejected'
    db.session.commit()
    cache_delete_pattern('company:*')
    return jsonify({'message': f'Company {action}d', 'company': company.to_dict()})


@admin_bp.route('/companies/<int:company_id>/blacklist', methods=['PUT'])
@jwt_required()
def blacklist_company(company_id):
    err = require_admin()
    if err: return err
    company = CompanyProfile.query.get_or_404(company_id)
    data = request.get_json()
    company.is_blacklisted = data.get('blacklist', True)
    user = User.query.get(company.user_id)
    if user:
        user.is_active = not company.is_blacklisted
    db.session.commit()
    cache_delete_pattern('company:*')
    return jsonify({'message': 'Updated', 'company': company.to_dict()})


# ── Students ───────────────────────────────────────────────────────────────────

@admin_bp.route('/students', methods=['GET'])
@jwt_required()
def list_students():
    err = require_admin()
    if err: return err
    students = StudentProfile.query.all()
    return jsonify([s.to_dict() for s in students])


@admin_bp.route('/students/<int:student_id>/blacklist', methods=['PUT'])
@jwt_required()
def blacklist_student(student_id):
    err = require_admin()
    if err: return err
    student = StudentProfile.query.get_or_404(student_id)
    data = request.get_json()
    student.is_blacklisted = data.get('blacklist', True)
    user = User.query.get(student.user_id)
    if user:
        user.is_active = not student.is_blacklisted
    db.session.commit()
    return jsonify({'message': 'Updated', 'student': student.to_dict()})


# ── All Applications (admin view) ──────────────────────────────────────────────

@admin_bp.route('/applications', methods=['GET'])
@jwt_required()
def all_applications():
    err = require_admin()
    if err: return err
    drive_id = request.args.get('drive_id')
    student_id = request.args.get('student_id')
    status = request.args.get('status')

    query = Application.query
    if drive_id:
        query = query.filter_by(drive_id=drive_id)
    if student_id:
        query = query.filter_by(student_id=student_id)
    if status:
        query = query.filter_by(status=status)

    apps = query.order_by(Application.applied_at.desc()).all()
    return jsonify([a.to_dict() for a in apps])


# ── Drives ─────────────────────────────────────────────────────────────────────

@admin_bp.route('/drives', methods=['GET'])
@jwt_required()
def list_drives():
    err = require_admin()
    if err: return err
    status = request.args.get('status')
    query = PlacementDrive.query
    if status:
        query = query.filter_by(status=status)
    return jsonify([d.to_dict() for d in query.all()])


@admin_bp.route('/drives/<int:drive_id>/approve', methods=['PUT'])
@jwt_required()
def approve_drive(drive_id):
    err = require_admin()
    if err: return err
    drive = PlacementDrive.query.get_or_404(drive_id)
    data = request.get_json()
    action = data.get('action')
    if action not in ('approve', 'reject', 'close'):
        return jsonify({'error': 'action must be approve, reject, or close'}), 400
    drive.status = {'approve': 'approved', 'reject': 'rejected', 'close': 'closed'}[action]
    db.session.commit()
    cache_delete_pattern('drives:*')
    return jsonify({'message': f'Drive {action}d', 'drive': drive.to_dict()})


# ── Search ─────────────────────────────────────────────────────────────────────

@admin_bp.route('/search', methods=['GET'])
@jwt_required()
def search():
    err = require_admin()
    if err: return err
    q = request.args.get('q', '').strip()
    entity = request.args.get('type', 'all')
    results = {'students': [], 'companies': [], 'drives': []}

    if entity in ('all', 'student') and q:
        students = StudentProfile.query.filter(
            StudentProfile.name.ilike(f'%{q}%') |
            StudentProfile.branch.ilike(f'%{q}%')
        ).all()
        results['students'] = [s.to_dict() for s in students]

    if entity in ('all', 'company') and q:
        companies = CompanyProfile.query.filter(
            CompanyProfile.company_name.ilike(f'%{q}%') |
            CompanyProfile.industry.ilike(f'%{q}%')
        ).all()
        results['companies'] = [c.to_dict() for c in companies]

    if entity in ('all', 'drive') and q:
        drives = PlacementDrive.query.filter(
            PlacementDrive.job_title.ilike(f'%{q}%') |
            PlacementDrive.location.ilike(f'%{q}%')
        ).all()
        results['drives'] = [d.to_dict() for d in drives]

    return jsonify(results)


# ── Statistics ──────────────────────────────────────────────────────────────────

@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def stats():
    err = require_admin()
    if err: return err
    cached = cache_get('admin:stats')
    if cached:
        return jsonify(cached)

    data = {
        'total_students': StudentProfile.query.count(),
        'total_companies': CompanyProfile.query.count(),
        'approved_companies': CompanyProfile.query.filter_by(approval_status='approved').count(),
        'pending_companies': CompanyProfile.query.filter_by(approval_status='pending').count(),
        'total_drives': PlacementDrive.query.count(),
        'approved_drives': PlacementDrive.query.filter_by(status='approved').count(),
        'pending_drives': PlacementDrive.query.filter_by(status='pending').count(),
        'total_applications': Application.query.count(),
        'selected_students': Application.query.filter_by(status='selected').count(),
        'blacklisted_students': StudentProfile.query.filter_by(is_blacklisted=True).count(),
        'blacklisted_companies': CompanyProfile.query.filter_by(is_blacklisted=True).count(),
    }
    cache_set('admin:stats', data, Config.CACHE_STATS_TTL)
    return jsonify(data)


# ── Trigger Jobs Manually (for demo/testing) ───────────────────────────────────

@admin_bp.route('/jobs/trigger', methods=['POST'])
@jwt_required()
def trigger_job():
    """Manually trigger a Celery job for demo purposes."""
    err = require_admin()
    if err: return err

    data = request.get_json()
    job = data.get('job')

    try:
        from ..tasks import celery
        if job == 'daily_reminders':
            task = celery.send_task('backend.tasks.daily_deadline_reminders')
            return jsonify({'message': 'Daily reminders job triggered', 'task_id': task.id})
        elif job == 'monthly_report':
            task = celery.send_task('backend.tasks.monthly_activity_report')
            return jsonify({'message': 'Monthly report job triggered', 'task_id': task.id})
        elif job == 'close_expired':
            task = celery.send_task('backend.tasks.close_expired_drives')
            return jsonify({'message': 'Close expired drives job triggered', 'task_id': task.id})
        else:
            return jsonify({'error': 'Unknown job. Use: daily_reminders, monthly_report, close_expired'}), 400
    except Exception as e:
        # Fallback: run synchronously if Celery not available
        try:
            from .. import tasks as t
            if job == 'daily_reminders':
                result = t.daily_deadline_reminders.apply().get()
            elif job == 'monthly_report':
                result = t.monthly_activity_report.apply().get()
            elif job == 'close_expired':
                result = t.close_expired_drives.apply().get()
            return jsonify({'message': f'Job ran synchronously (Celery unavailable)', 'result': result})
        except Exception as e2:
            return jsonify({'error': str(e2)}), 500


# ── Download exports dir listing ───────────────────────────────────────────────

@admin_bp.route('/exports', methods=['GET'])
@jwt_required()
def list_exports():
    """List all CSV export files."""
    err = require_admin()
    if err: return err
    export_dir = Config.EXPORT_DIR
    if not os.path.exists(export_dir):
        return jsonify([])
    files = [f for f in os.listdir(export_dir) if f.endswith('.csv')]
    return jsonify(files)
