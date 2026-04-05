import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'ppa-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = 'sqlite:///ppa.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'ppa-jwt-secret-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
    JWT_TOKEN_LOCATION = ['headers']

    # Redis / Celery
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    # Redis / Celery
    broker_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    result_backend = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

    # Cache TTLs (seconds)
    CACHE_DRIVES_TTL = 300        # 5 minutes
    CACHE_STATS_TTL = 600         # 10 minutes
    CACHE_COMPANY_TTL = 300       # 5 minutes
    CACHE_APPLICATIONS_TTL = 120  # 2 minutes

    # Email (SMTP) — set via environment or .env
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', 'pranatheeshs@gmail.com')       # e.g. yourapp@gmail.com
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', 'yvwfvdmxsewigipe')       # App password
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_USERNAME', '24f2007139@ds.study.iitm.ac.in')
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'pranatheeshs@gmail.com')

    # Google Chat Webhook (optional)
    GCHAT_WEBHOOK_URL = os.environ.get('GCHAT_WEBHOOK_URL', '')

    # Export directory
    EXPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'exports')
