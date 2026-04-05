from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from backend.extensions import db


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False)   # admin | company | student
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    student_profile = db.relationship('StudentProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    company_profile = db.relationship('CompanyProfile', backref='user', uselist=False, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }


class StudentProfile(db.Model):
    __tablename__ = 'student_profiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    name = db.Column(db.String(120), nullable=False)
    branch = db.Column(db.String(80))
    cgpa = db.Column(db.Float, default=0.0)
    year = db.Column(db.Integer)
    phone = db.Column(db.String(20))
    resume_url = db.Column(db.String(300))
    skills = db.Column(db.Text)
    is_blacklisted = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    applications = db.relationship('Application', backref='student', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'branch': self.branch,
            'cgpa': self.cgpa,
            'year': self.year,
            'phone': self.phone,
            'resume_url': self.resume_url,
            'skills': self.skills,
            'is_blacklisted': self.is_blacklisted,
            'email': self.user.email if self.user else None,
            'username': self.user.username if self.user else None,
        }


class CompanyProfile(db.Model):
    __tablename__ = 'company_profiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    company_name = db.Column(db.String(150), nullable=False)
    hr_contact = db.Column(db.String(120))
    website = db.Column(db.String(200))
    description = db.Column(db.Text)
    industry = db.Column(db.String(100))
    approval_status = db.Column(db.String(20), default='pending')  # pending | approved | rejected
    is_blacklisted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    drives = db.relationship('PlacementDrive', backref='company', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'company_name': self.company_name,
            'hr_contact': self.hr_contact,
            'website': self.website,
            'description': self.description,
            'industry': self.industry,
            'approval_status': self.approval_status,
            'is_blacklisted': self.is_blacklisted,
            'email': self.user.email if self.user else None,
            'username': self.user.username if self.user else None,
        }


class PlacementDrive(db.Model):
    __tablename__ = 'placement_drives'
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company_profiles.id'), nullable=False)
    job_title = db.Column(db.String(150), nullable=False)
    job_description = db.Column(db.Text)
    eligibility_branch = db.Column(db.String(200))   # comma-separated or 'ALL'
    eligibility_cgpa = db.Column(db.Float, default=0.0)
    eligibility_year = db.Column(db.Integer)
    package_lpa = db.Column(db.Float)
    location = db.Column(db.String(150))
    deadline = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='pending')  # pending | approved | closed | rejected
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    applications = db.relationship('Application', backref='drive', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'company_name': self.company.company_name if self.company else None,
            'job_title': self.job_title,
            'job_description': self.job_description,
            'eligibility_branch': self.eligibility_branch,
            'eligibility_cgpa': self.eligibility_cgpa,
            'eligibility_year': self.eligibility_year,
            'package_lpa': self.package_lpa,
            'location': self.location,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'application_count': len(self.applications)
        }


class Application(db.Model):
    __tablename__ = 'applications'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profiles.id'), nullable=False)
    drive_id = db.Column(db.Integer, db.ForeignKey('placement_drives.id'), nullable=False)
    applied_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    status = db.Column(db.String(30), default='applied')  # applied | shortlisted | selected | rejected
    interview_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)

    __table_args__ = (db.UniqueConstraint('student_id', 'drive_id', name='unique_application'),)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'drive_id': self.drive_id,
            'student_name': self.student.name if self.student else None,
            'student_branch': self.student.branch if self.student else None,
            'student_cgpa': self.student.cgpa if self.student else None,
            'job_title': self.drive.job_title if self.drive else None,
            'company_name': self.drive.company.company_name if self.drive and self.drive.company else None,
            'applied_at': self.applied_at.isoformat(),
            'status': self.status,
            'interview_date': self.interview_date.isoformat() if self.interview_date else None,
            'notes': self.notes
        }
