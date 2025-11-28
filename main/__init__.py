from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from secretconfig import SECRET_KEY
from flask_socketio import SocketIO
from flask_session import Session  # Import Flask-Session
from celery import Celery

# Initialize extensions at module level
socketio = SocketIO()
db = SQLAlchemy()  # Single SQLAlchemy instance for multiple databases
celery = Celery()  # Initialize Celery at module level

def make_celery(app):
    """
    Configure Celery with the app's configuration
    """
    celery.conf.update(app.config)
    
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = ContextTask
    return celery

def create_app():
    app = Flask(__name__, template_folder='templates')

    # Configure multiple database bindings
    app.config['SQLALCHEMY_BINDS'] = {
        'realtime': 'sqlite:///realtime_data.db',
        'auth': 'sqlite:///auth.db',
        'logs': 'sqlite:///logs.db'
    }
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.secret_key = SECRET_KEY
    app.config['SESSION_TYPE'] = 'filesystem'  # Store sessions on the server
    app.config['SESSION_PERMANENT'] = True  # Ensure sessions persist

    # Celery configuration
    app.config.update(
        CELERY_BROKER_URL='redis://localhost:6379/0',
        CELERY_RESULT_BACKEND='redis://localhost:6379/0',
        # You can add other Celery configurations here
    )
    
    # Initialize extensions with the app
    Session(app)  # Initialize session management
    db.init_app(app)  # Initialize SQLAlchemy
    socketio.init_app(app)  # Initialize SocketIO
    
    # Configure Celery with the app
    make_celery(app)

    # Register blueprint for data routes
    from main.sockets import sems
    app.register_blueprint(sems, url_prefix="/sems_in")

    # Create tables for each bind
    with app.app_context():
        from main.models import User, RealTimeData, Logs, TotalConsumption, AggregateData

        engine_realtime = db.get_engine(app, bind='realtime')
        engine_auth = db.get_engine(app, bind='auth')
        engine_logs = db.get_engine(app, bind='logs')
        
        User.metadata.create_all(engine_auth)
        RealTimeData.metadata.create_all(engine_realtime)
        TotalConsumption.metadata.create_all(engine_realtime)
        AggregateData.metadata.create_all(engine_realtime)
        Logs.metadata.create_all(engine_logs)
    
    return app