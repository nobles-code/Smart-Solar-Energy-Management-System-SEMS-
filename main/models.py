from . import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash


# Real-time data model (bind to 'realtime' database)
class RealTimeData(db.Model):
    __bind_key__ = 'realtime'
    id = db.Column(db.Integer, primary_key=True)
    device_ID = db.Column(db.String, nullable=False, index=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    battery_level = db.Column(db.Integer, nullable=False)
    solar_output = db.Column(db.Integer, nullable=False)
    kitchen_light_state = db.Column(db.String(20), nullable=False)
    kitchen_light_consumption = db.Column(db.Float, nullable=False)  # Updated to Float for calculated consumption
    dining_light_state = db.Column(db.String(20), nullable=False)
    dining_light_consumption = db.Column(db.Float, nullable=False)
    bed_light_state = db.Column(db.String(20), nullable=False)
    bed_light_consumption = db.Column(db.Float, nullable=False)
    security_light_state = db.Column(db.String(20), nullable=False)
    security_light_consumption = db.Column(db.Float, nullable=False)
    sound_system_state = db.Column(db.String(20), nullable=False)
    sound_system_consumption = db.Column(db.Float, nullable=False)
    tv_state = db.Column(db.String(20), nullable=False)
    tv_consumption = db.Column(db.Float, nullable=False)

# User model for authentication (bind to 'auth' database)
""""""
class User(db.Model, UserMixin):
    __bind_key__ = 'auth'
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(7), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

#here we have the database for saving user logs
class Logs(db.Model):
    __bind_key__ = 'logs'  # Using the same bind as RealTimeData
    id = db.Column(db.Integer, primary_key=True)
    device_ID = db.Column(db.String, nullable=False, index=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    changes = db.Column(db.Text, nullable=False)  # Stores the changes as text

#recording devices consumption according to how they uses energy

class TotalConsumption(db.Model):
    __bind_key__ = 'realtime'
    id = db.Column(db.Integer, primary_key=True)
    device_ID = db.Column(db.String, nullable=False, index=True)  # Device identifier
    device_name = db.Column(db.String, nullable=False)  # Device name
    energy_consumed = db.Column(db.Float, nullable=False, default=0.0)  # Energy consumed in Wh
    start_time = db.Column(db.DateTime, nullable=False)  # When the device turned ON
    end_time = db.Column(db.DateTime, nullable=True)  # When the device turned OFF
    timestamp = db.Column(db.DateTime, nullable=False )  # Record creation timestamp


class AggregateData(db.Model):
    __bind_key__ = 'realtime'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    timestamp = db.Column(db.DateTime, index=True)  # Time of aggregation
    device_id = db.Column(db.String(50), nullable=False, index=True)  # Critical for queries
    avg_power = db.Column(db.Float, nullable=False, default=0.0)  # Average power consumption (W)
    total_energy = db.Column(db.Float, nullable=False, default=0.0)  # Total energy consumed (Wh)
    battery_level = db.Column(db.Float, nullable=True)  # Battery level at this timestamp
    solar_output = db.Column(db.Float, nullable=True)  # Solar power generation at this timestamp
    devices_total_consumption = db.Column(db.JSON, nullable=False, default={})  # Stores per-device total energy (last 24h)
