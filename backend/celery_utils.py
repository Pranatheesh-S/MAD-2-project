from celery import Celery


def make_celery(app):
    # Read broker/backend from Flask config (supports both lower and upper key names)
    broker = (
        app.config.get('CELERY_BROKER_URL')
        or app.config.get('broker_url')
        or 'redis://localhost:6379/0'
    )
    backend = (
        app.config.get('CELERY_RESULT_BACKEND')
        or app.config.get('result_backend')
        or 'redis://localhost:6379/0'
    )

    celery = Celery(app.import_name, broker=broker, backend=backend)
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery
