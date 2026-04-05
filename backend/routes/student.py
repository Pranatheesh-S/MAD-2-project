from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from datetime import datetime, timezone
import os
from ..extensions import db
from ..models import StudentProfile, PlacementDrive, Application
from ..cache import cache_get, cache_set, cache_delete
from ..config import Config

student_bp = Blueprint('student', __name__, url_prefix='/api/student')


def get_student_or_403():
    claims = get_jwt()
    if claims.get('role') != 'student':
        return None, jsonify({'error': 'Student access required'}), 403
    user_id = int(get_jwt_identity())
    profile = StudentProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return None, jsonify({'error': 'Student profile not found'}), 404
    return profile, None, None


# ── Profile ────────────────────────────────────────────────────────────────────

@student_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    profile, err, code = get_student_or_403()
    if err: return err, code
    return jsonify(profile.to_dict())


@student_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    profile, err, code = get_student_or_403()
    if err: return err, code

    data = request.get_json()
    for field in ('name', 'branch', 'phone', 'resume_url', 'skills'):
        if field in data:
            setattr(profile, field, data[field])
    if 'cgpa' in data:
        profile.cgpa = float(data['cgpa'])
    if 'year' in data:
        profile.year = int(data['year'])

    db.session.commit()
    # Invalidate drives cache since eligibility may have changed
    cache_delete(f'drives:student:{profile.id}')
    return jsonify(profile.to_dict())


# ── Drives ──────────────────────────────────────────────────────────────────────

@student_bp.route('/drives', methods=['GET'])
@jwt_required()
def list_drives():
    profile, err, code = get_student_or_403()
    if err: return err, code

    if profile.is_blacklisted:
        return jsonify({'error': 'Account is blacklisted'}), 403

    search = request.args.get('q', '').strip().lower()

    # Use per-student cache key (includes eligibility params)
    cache_key = f'drives:student:{profile.id}'
    cached = cache_get(cache_key)

    if cached is None:
        now = datetime.now(timezone.utc)
        drives = PlacementDrive.query.filter_by(status='approved').all()
        eligible = []
        for d in drives:
            # Skip expired drives
            if d.deadline:
                deadline = d.deadline
                if deadline.tzinfo is None:
                    deadline = deadline.replace(tzinfo=timezone.utc)
                else:
                    deadline = deadline.astimezone(timezone.utc)
                if deadline < now:
                    continue
            # CGPA check: only filter if student has CGPA set and drive has a minimum
            if d.eligibility_cgpa and profile.cgpa is not None and profile.cgpa < d.eligibility_cgpa:
                continue
            # Year check: only filter if BOTH drive and student have year set
            if d.eligibility_year and profile.year is not None and d.eligibility_year != profile.year:
                continue
            # Branch check: only filter if student has branch set and drive restricts branches
            branch_req = (d.eligibility_branch or '').strip()
            if branch_req and branch_req.upper() != 'ALL':
                if profile.branch:  # only restrict if student has provided their branch
                    allowed = [b.strip().lower() for b in branch_req.split(',') if b.strip()]
                    if profile.branch.lower() not in allowed:
                        continue
            eligible.append(d.to_dict())
        cache_set(cache_key, eligible, Config.CACHE_DRIVES_TTL)
        cached = eligible

    # Apply search filter on cached results
    if search:
        cached = [d for d in cached if
                  search in d['job_title'].lower() or
                  search in (d['company_name'] or '').lower() or
                  search in (d['location'] or '').lower() or
                  search in (d['job_description'] or '').lower()]

    return jsonify(cached)


# ── Applications ────────────────────────────────────────────────────────────────

@student_bp.route('/apply/<int:drive_id>', methods=['POST'])
@jwt_required()
def apply(drive_id):
    profile, err, code = get_student_or_403()
    if err: return err, code

    if profile.is_blacklisted:
        return jsonify({'error': 'Account is blacklisted'}), 403

    # Duplicate check
    existing = Application.query.filter_by(student_id=profile.id, drive_id=drive_id).first()
    if existing:
        return jsonify({'error': 'Already applied to this drive'}), 409

    drive = PlacementDrive.query.get_or_404(drive_id)
    if drive.status != 'approved':
        return jsonify({'error': 'Drive is not open for applications'}), 400

    now = datetime.now(timezone.utc)
    if drive.deadline and drive.deadline.replace(tzinfo=timezone.utc) < now:
        return jsonify({'error': 'Application deadline has passed'}), 400

    # Eligibility
    if drive.eligibility_cgpa and profile.cgpa is not None and profile.cgpa < drive.eligibility_cgpa:
        return jsonify({'error': 'You do not meet the CGPA requirement'}), 400
    if drive.eligibility_year and profile.year is not None and drive.eligibility_year != profile.year:
        return jsonify({'error': 'You do not meet the year requirement'}), 400
    branch_req = (drive.eligibility_branch or '').strip()
    if branch_req and branch_req.upper() != 'ALL':
        if profile.branch:
            allowed = [b.strip().lower() for b in branch_req.split(',') if b.strip()]
            if profile.branch.lower() not in allowed:
                return jsonify({'error': 'Your branch is not eligible for this drive'}), 400

    app_obj = Application(student_id=profile.id, drive_id=drive_id)
    db.session.add(app_obj)
    db.session.commit()

    # Invalidate application cache
    cache_delete(f'applications:student:{profile.id}')

    # Trigger async confirmation task
    try:
        from ..tasks import celery
        celery.send_task(
            'backend.tasks.send_application_confirmation',
            args=[app_obj.id, profile.name, profile.user.email,
                  drive.job_title, drive.company.company_name]
        )
    except Exception:
        pass  # Non-blocking

    return jsonify(app_obj.to_dict()), 201


@student_bp.route('/applications', methods=['GET'])
@jwt_required()
def my_applications():
    profile, err, code = get_student_or_403()
    if err: return err, code

    cache_key = f'applications:student:{profile.id}'
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    apps = Application.query.filter_by(student_id=profile.id)\
                            .order_by(Application.applied_at.desc()).all()
    data = [a.to_dict() for a in apps]
    cache_set(cache_key, data, Config.CACHE_APPLICATIONS_TTL)
    return jsonify(data)


# ── Placement History ──────────────────────────────────────────────────────────

@student_bp.route('/history', methods=['GET'])
@jwt_required()
def placement_history():
    """Returns complete placement history (all statuses, all time)."""
    profile, err, code = get_student_or_403()
    if err: return err, code

    apps = Application.query.filter_by(student_id=profile.id)\
                            .order_by(Application.applied_at.desc()).all()
    history = []
    for a in apps:
        d = a.to_dict()
        d['is_selected'] = (a.status == 'selected')
        history.append(d)

    summary = {
        'total_applied': len(apps),
        'shortlisted': sum(1 for a in apps if a.status == 'shortlisted'),
        'selected': sum(1 for a in apps if a.status == 'selected'),
        'rejected': sum(1 for a in apps if a.status == 'rejected'),
    }
    return jsonify({'history': history, 'summary': summary})


# ── CSV Export (async Celery job) ──────────────────────────────────────────────

@student_bp.route('/export', methods=['POST'])
@jwt_required()
def export_applications():
    """Triggers a Celery task to export applications as CSV."""
    profile, err, code = get_student_or_403()
    if err: return err, code

    try:
        from ..tasks import celery
        task = celery.send_task('backend.tasks.export_applications_csv', args=[profile.id])
        return jsonify({
            'message': 'Export started! You will be notified via email when ready.',
            'task_id': task.id
        }), 202
    except Exception as e:
        # If Celery/Redis not available, run synchronously as fallback
        try:
            from ..tasks import export_applications_csv
            result = export_applications_csv(profile.id)
            return jsonify({
                'message': 'Export complete (sync fallback).',
                'result': result,
                'download_url': f'/api/student/export/download/{result["file"]}'
            }), 200
        except Exception as e2:
            return jsonify({'error': str(e2)}), 500


@student_bp.route('/export/status/<task_id>', methods=['GET'])
@jwt_required()
def export_status(task_id):
    """Check status of an async export task."""
    profile, err, code = get_student_or_403()
    if err: return err, code

    try:
        from ..tasks import celery
        from celery.result import AsyncResult
        result = AsyncResult(task_id, app=celery)
        if result.ready():
            info = result.get()
            return jsonify({
                'status': 'done',
                'download_url': f'/api/student/export/download/{info["file"]}'
            })
        return jsonify({'status': result.status.lower()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/export/download/<filename>', methods=['GET'])
@jwt_required()
def download_export(filename):
    """Serves the exported CSV file."""
    profile, err, code = get_student_or_403()
    if err: return err, code

    # Security: only allow files for this student
    if not filename.startswith(f'applications_{profile.id}_'):
        return jsonify({'error': 'Unauthorized'}), 403

    export_dir = Config.EXPORT_DIR
    if not os.path.exists(os.path.join(export_dir, filename)):
        return jsonify({'error': 'File not found'}), 404

    return send_from_directory(export_dir, filename, as_attachment=True)
