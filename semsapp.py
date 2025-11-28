from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_socketio import emit, disconnect, join_room, leave_room
from flask_login import LoginManager, login_user, login_required, logout_user, current_user, UserMixin
import time
import random
import mimetypes
from main import create_app, socketio, db  # Ensure db is imported
from secretconfig import SECRET_KEY
from main.models import User
import requests  # For forwarding registration data
from werkzeug.security import generate_password_hash

app = create_app()
app.config['SECRET_KEY'] = SECRET_KEY

mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/javascript', '.js')

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'




@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


# ///////////////////////////////////////////// Authentication Routes //////////////////////////////////////////////////
@app.route('/session_debug')
def session_debug():
    return {
        "user_id": session.get("user_id"),
        "device_id": session.get("device_id")
    }

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            login_user(user)
            session['device_id'] = user.device_id  # Store device ID in session
            session['user_id'] = user.id  # Store user ID in session
            return redirect(url_for('home'))  # Redirect to main page

        return "Invalid username or password", 401

    return render_template('login.html')


@app.route('/register', methods=['POST'])
def register():
    device_id = request.form.get('device_id')
    email = request.form.get('email')
    username = request.form.get('username')
    password = request.form.get('password')

    # Validate required fields
    if not all([device_id, email, username, password]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Hash the password before saving
        hashed_password = generate_password_hash(password)

        # Create new user instance
        new_user = User(device_id=device_id, email=email, username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()  # Commit changes

        print(f"User {username} registered successfully!")

        return redirect(url_for('login'))  # Redirect to login page after successful registration

    except Exception as e:
        db.session.rollback()  # Rollback if there’s an error
        print("Database error:", str(e))
        return jsonify({"error": str(e)}), 500



@app.route('/logout')
@login_required
def logout():
    user_room = f"user_{session.get('device_id')}"
    leave_room(user_room)  # Ensure they leave the WebSocket room

    logout_user()
    session.pop('device_id', None)  # Remove device ID from session
    session.pop('user_id', None)  # Remove user ID from session
    
    return redirect(url_for('login'))


# ///////////////////////////////////////////// Main Route //////////////////////////////////////////////////

@app.route('/home')
@login_required
def home():
    return render_template('semsindex.html', user=current_user, mimetype='text/javascript')


# ///////////////////////////////////////////// WebSocket Handling //////////////////////////////////////////////////

@socketio.on('connect')
def handle_connect():
    if not current_user.is_authenticated:
        disconnect()
        return
    
    user_room = f"user_{current_user.id}"
    join_room(user_room)  # Add user to their room
    print(f"✅ {current_user.username} joined room: {user_room}")

    emit('server_response', {'data': f'Welcome {current_user.username}, connected to server'}, room=user_room)


@socketio.on('client_message')
def handle_client_message(message):
    device_id = session.get('device_id')
    if not current_user.is_authenticated:
        disconnect()
        return
    print(f'{current_user.username} sent: {message["data"]}')
    emit('server_response', {'data': f"{current_user.username} {device_id}sent: {message['data']} at {time.strftime('%H:%M:%S')}"})


@socketio.on('request_data')
@login_required  # Ensures only logged-in users get updates
def handle_data_request():
    new_data = {
        'timestamp': time.strftime('%H:%M:%S'),
        'value': random.randint(1, 100),
        'status': random.choice(['normal', 'warning', 'critical'])
    }
    emit('data_update', new_data)


if __name__ == '__main__':
    socketio.run(app, debug=True, port=8500)
