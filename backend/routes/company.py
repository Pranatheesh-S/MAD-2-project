from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from datetime import datetime, timezone
from ..extensions import db
from ..models import User, CompanyProfile, PlacementDrive, Application
from ..cache import cache_get, cache_set, cache_delete_pattern
from ..config import Config

company_bp = Blueprint('company', __name__, url_prefix='/api/company')


def parse_datetime_to_utc(value):
    if not value:
        return None
    if isinstance(value, str):
        value = value.strip()
        if value.endswith('Z'):
            value = value[:-1] + '+00:00'
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.replace(tzinfo=None)



def get_company_or_403():
    claims = get_jwt()
    if claims.get('role') != 'company':
        return None, jsonify({'error': 'Company access required'}), 403
    user_id = int(get_jwt_identity())
    profile = CompanyProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return None, jsonify({'error': 'Company profile not found'}), 404
    return profile, None, None


# ── Profile ────────────────────────────────────────────────────────────────────

@company_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    profile, err, code = get_company_or_403()
    if err: return err, code

    cache_key = f'company:{profile.id}:profile'
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    data = profile.to_dict()
    cache_set(cache_key, data, Config.CACHE_COMPANY_TTL)
    return jsonify(data)


@company_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    profile, err, code = get_company_or_403()
    if err: return err, code

    data = request.get_json()
    if 'company_name' in data: profile.company_name = data['company_name']
    if 'hr_contact' in data: profile.hr_contact = data['hr_contact']
    if 'website' in data: profile.website = data['website']
    if 'description' in data: profile.description = data['description']
    if 'industry' in data: profile.industry = data['industry']

    db.session.commit()
    cache_delete_pattern(f'company:{profile.id}:*')
    return jsonify(profile.to_dict())


# ── Drives ──────────────────────────────────────────────────────────────────────

@company_bp.route('/drives', methods=['GET'])
@jwt_required()
def list_drives():
    profile, err, code = get_company_or_403()
    if err: return err, code

    drives = PlacementDrive.query.filter_by(company_id=profile.id).all()
    return jsonify([d.to_dict() for d in drives])


@company_bp.route('/drives', methods=['POST'])
@jwt_required()
def create_drive():
    profile, err, code = get_company_or_403()
    if err: return err, code

    if profile.approval_status != 'approved':
        return jsonify({'error': 'Company not approved yet. Contact admin.'}), 403
    if profile.is_blacklisted:
        return jsonify({'error': 'Company is blacklisted.'}), 403

    data = request.get_json()
    required = ['job_title', 'deadline']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400

    try:
        deadline = parse_datetime_to_utc(data['deadline'])
    except ValueError:
        return jsonify({'error': 'Invalid deadline format (use ISO format)'}), 400

    ey = data.get('eligibility_year')
    ey = int(ey) if ey not in [None, '', 'ALL', 'Any'] else None
    branch = (data.get('eligibility_branch') or 'ALL').strip() or 'ALL'

    drive = PlacementDrive(
        company_id=profile.id,
        job_title=data['job_title'],
        job_description=data.get('job_description'),
        eligibility_branch=branch,
        eligibility_cgpa=float(data.get('eligibility_cgpa') or 0),
        eligibility_year=ey,
        package_lpa=data.get('package_lpa'),
        location=data.get('location'),
        deadline=deadline,
        status='pending'
    )
    db.session.add(drive)
    db.session.commit()
    cache_delete_pattern('drives:*')
    return jsonify(drive.to_dict()), 201


@company_bp.route('/drives/<int:drive_id>', methods=['PUT'])
@jwt_required()
def update_drive(drive_id):
    profile, err, code = get_company_or_403()
    if err: return err, code

    drive = PlacementDrive.query.filter_by(id=drive_id, company_id=profile.id).first_or_404()
    data = request.get_json()

    allowed_edit_statuses = ('pending',)
    if drive.status not in allowed_edit_statuses:
        return jsonify({'error': 'Can only edit pending drives'}), 400

    for field in ('job_title', 'job_description', 'location'):
        if field in data:
            setattr(drive, field, data[field])
    if 'eligibility_branch' in data:
        drive.eligibility_branch = (data.get('eligibility_branch') or 'ALL').strip() or 'ALL'
    if 'eligibility_cgpa' in data:
        drive.eligibility_cgpa = float(data['eligibility_cgpa'])
    if 'eligibility_year' in data:
        ey = data['eligibility_year']
        drive.eligibility_year = int(ey) if ey not in [None, '', 'ALL', 'Any'] else None

    if 'package_lpa' in data:
        drive.package_lpa = data['package_lpa']
    if 'deadline' in data:
        drive.deadline = parse_datetime_to_utc(data['deadline'])

    db.session.commit()
    cache_delete_pattern('drives:*')
    return jsonify(drive.to_dict())


# ── Applications ────────────────────────────────────────────────────────────────

@company_bp.route('/drives/<int:drive_id>/applications', methods=['GET'])
@jwt_required()
def drive_applications(drive_id):
    profile, err, code = get_company_or_403()
    if err: return err, code

    drive = PlacementDrive.query.filter_by(id=drive_id, company_id=profile.id).first_or_404()
    apps = Application.query.filter_by(drive_id=drive.id).all()
    return jsonify([a.to_dict() for a in apps])



@company_bp.route('/applications/new', methods=['GET'])
@jwt_required()
def get_new_applications():
    profile, err, code = get_company_or_403()
    if err: return err, code
    apps = Application.query.join(PlacementDrive).filter(
        PlacementDrive.company_id == profile.id,
        Application.status == 'applied'
    ).order_by(Application.applied_at.desc()).all()
    return jsonify([a.to_dict() for a in apps])

@company_bp.route('/applications/approved', methods=['GET'])
@jwt_required()
def get_approved_applications():
    profile, err, code = get_company_or_403()
    if err: return err, code
    apps = Application.query.join(PlacementDrive).filter(
        PlacementDrive.company_id == profile.id,
        Application.status != 'applied'
    ).order_by(Application.applied_at.desc()).all()
    return jsonify([a.to_dict() for a in apps])


@company_bp.route('/applications/<int:app_id>/status', methods=['PUT'])


@jwt_required()
def update_application_status(app_id):
    profile, err, code = get_company_or_403()
    if err: return err, code

    app_obj = Application.query.get_or_404(app_id)
    drive = PlacementDrive.query.filter_by(id=app_obj.drive_id, company_id=profile.id).first()
    if not drive:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    valid_statuses = ('applied', 'shortlisted', 'selected', 'approved', 'rejected')
    if data.get('status') not in valid_statuses:
        return jsonify({'error': f'status must be one of {valid_statuses}'}), 400

    app_obj.status = data['status']
    if 'interview_date' in data and data['interview_date']:
        try:
            app_obj.interview_date = parse_datetime_to_utc(data['interview_date'])
        except ValueError:
            return jsonify({'error': 'Invalid interview_date format'}), 400
    if 'notes' in data:
        app_obj.notes = data['notes']

    db.session.commit()
    # Invalidate student applications cache
    from ..cache import cache_delete
    cache_delete(f'applications:student:{app_obj.student_id}')
    return jsonify(app_obj.to_dict())
