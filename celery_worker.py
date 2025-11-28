from main import celery, create_app

# Create a Flask app instance for the Celery worker
app = create_app()
app.app_context().push()  # Push an application context