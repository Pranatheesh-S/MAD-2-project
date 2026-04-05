from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from ..extensions import db
from ..models import User, StudentProfile, CompanyProfile

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register/student', methods=['POST'])
def register_student():
    data = request.get_json()
    required = ['username', 'email', 'password', 'name', 'branch', 'cgpa', 'year']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if User.query.filter((User.username == data['username']) | (User.email == data['email'])).first():
        return jsonify({'error': 'Username or email already exists'}), 409

    user = User(username=data['username'], email=data['email'], role='student')
    user.set_password(data['password'])
    db.session.add(user)
    db.session.flush()

    profile = StudentProfile(
        user_id=user.id,
        name=data['name'],
        branch=data.get('branch'),
        cgpa=float(data.get('cgpa', 0)),
        year=int(data.get('year', 1)),
        phone=data.get('phone'),
        skills=data.get('skills')
    )
    db.session.add(profile)
    db.session.commit()

    token = create_access_token(identity=str(user.id), additional_claims={'role': user.role})
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@auth_bp.route('/register/company', methods=['POST'])
def register_company():
    data = request.get_json()
    required = ['username', 'email', 'password', 'company_name', 'hr_contact']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if User.query.filter((User.username == data['username']) | (User.email == data['email'])).first():
        return jsonify({'error': 'Username or email already exists'}), 409

    user = User(username=data['username'], email=data['email'], role='company')
    user.set_password(data['password'])
    db.session.add(user)
    db.session.flush()

    profile = CompanyProfile(
        user_id=user.id,
        company_name=data['company_name'],
        hr_contact=data.get('hr_contact'),
        website=data.get('website'),
        description=data.get('description'),
        industry=data.get('industry')
    )
    db.session.add(profile)
    db.session.commit()

    token = create_access_token(identity=str(user.id), additional_claims={'role': user.role})
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=data['email']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 403

    token = create_access_token(identity=str(user.id), additional_claims={'role': user.role})
    return jsonify({'token': token, 'user': user.to_dict()}), 200
