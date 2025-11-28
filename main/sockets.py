from flask import Blueprint, jsonify, request, session
from .models import RealTimeData, User, Logs, TotalConsumption, AggregateData
from . import db
import requests
from datetime import datetime, timezone, time


sems = Blueprint('main', __name__)

AVERAGE_POWER_RATINGS = {
    'kitchen_light': 0.005,  # kW (5W)
    'dining_light': 0.005,  # kW
    'bed_light': 0.005,     # kW
    'security_light': 0.005, # kW
    'sound_system': 0.015,  # kW (15W)
    'tv': 0.04              # kW (40W)
}

# Global thread dictionary to track active devices and their start times
device_thread = {}


def calculate_all_consumptions():
   
    consumptions = {}

    # Current time for calculation
    now = datetime.utcnow()

    # Iterate through devices in the thread
    for device_name, start_time in device_thread.items():
        # Calculate time difference in hours
        duration_seconds = (now - start_time).total_seconds()
        duration_hours = duration_seconds / 3600  # Convert seconds to hours

        # Fetch device-specific power rating (in kW)
        power_rating = AVERAGE_POWER_RATINGS.get(device_name, 0)

        # Calculate consumption in kWh
        consumption = duration_hours * power_rating
        consumptions[device_name] = round(consumption, 6)  # Round to 6 decimal places for precision

    # Add zeros for devices not in the thread
    all_devices = list(AVERAGE_POWER_RATINGS.keys())  # Ensure all devices are accounted for
    for device_name in all_devices:
        if device_name not in device_thread:
            consumptions[device_name] = 0.0

    return consumptions


@sems.route('/save_simulated_data', methods=['GET'])
def save_simulated_data():
    """
    Fetch simulated data, validate it, calculate energy consumption, and save to the database.
    """
    try:
        # Step 1: Fetch simulated data
        data, error = fetch_simulated_data()
        if error:
            return error

        # Step 2: Validate the data
        error = validate_data(data)
        if error:
            return error

        # Extract core fields
        device_id = data['device_ID']
        
        # Step 3: Check device ID consistency with session
        error = check_session_device_id(device_id)
        if error:
            return error

        # Step 4: Process device states and log changes
        new_data, log_changes = process_device_states(device_id, data)
        
        # Step 5: Update device threads and calculate consumption
        update_device_threads(device_id, data["devices"])
        
        # Step 6: Save realtime data (high priority) - follows the same logic as original
        new_realtime_data = save_realtime_data(device_id, data)
        
        # Step 7: Save logs if there are changes
        if log_changes:
            save_logs(device_id, log_changes)
        
        # Step 8: Process incoming data (same as original)
        process_incoming_data11(device_id)
        
        # Step 9: Prepare response data
        saved_data = prepare_response_data(new_realtime_data)
        
        return jsonify({"message": "Data processed and saved successfully", "data": saved_data}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

def fetch_simulated_data():
    """Fetch simulated data from the API."""
    response = requests.get('http://127.0.0.1:5002/get_simulated_data')
    if response.status_code != 200:
        return None, jsonify({"error": f"Failed to fetch data: {response.status_code}"}), 400
    return response.json(), None

def validate_data(data):
    """Validate required fields in the data."""
    required_fields = ['solar_output', 'battery_level', 'device_ID']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
    return None

def check_session_device_id(device_id):
    """Check device ID consistency with session."""
    session_device_id = session.get('device_id')
    if session_device_id != device_id:
        return jsonify({"error": "Device ID mismatch"}), 403
    return None

def process_device_states(device_id, data):
    """Process device states and identify changes from previous state."""
    devices = data.get('devices', {})
    new_data = {f"{device}_state": details for device, details in devices.items()}
    
    # Query the latest record for the device
    earlier_record = RealTimeData.query.filter_by(device_ID=device_id).order_by(RealTimeData.timestamp.desc()).first()
    
    log_changes = []
    if earlier_record:
        # Process changes if an earlier record exists
        for key, new_value in new_data.items():
            old_value = getattr(earlier_record, key, None)
            device_name = key.replace('_state', '')
            if old_value != new_value:
                log_changes.append(f"{device_name} turned {new_value}")
    
    return new_data, log_changes

def update_device_threads(device_id, devices):
    """Update device threads and calculate consumption for devices turning off."""
    for device_name, state in devices.items():
        if state == "ON":
            # Device is ON
            if device_name not in device_thread:
                # Add to thread with the current timestamp
                device_thread[device_name] = datetime.utcnow()
        elif state == "OFF" and device_name in device_thread:
            # Device is OFF and is in the thread
            start_time = device_thread.pop(device_name)  # Remove from thread and get start time
            
            # Calculate final consumption
            duration_seconds = (datetime.utcnow() - start_time).total_seconds()
            duration_hours = duration_seconds / 3600  # Convert seconds to hours
            power_rating = AVERAGE_POWER_RATINGS.get(device_name, 0)
            energy_consumed = round(duration_hours * power_rating, 6)

            # Save the final consumption to the TotalConsumption DB
            save_consumption_record(device_id, device_name, energy_consumed, start_time)

def save_consumption_record(device_id, device_name, energy_consumed, start_time):
    """Save a consumption record to the database."""
    new_consumption_record = TotalConsumption(
        device_ID=device_id,
        device_name=device_name,
        energy_consumed=energy_consumed,
        start_time=start_time,
        end_time=datetime.utcnow(),
        timestamp=datetime.utcnow()
    )
    db.session.add(new_consumption_record)
    db.session.commit()

def save_logs(device_id, log_changes):
    """Save log changes to the database and cleanup old logs."""
    # Add the new log entry
    log_entry = Logs(
        device_ID=device_id,
        timestamp=datetime.utcnow(),
        changes="\n".join(log_changes)
    )
    db.session.add(log_entry)
    db.session.commit()

    # Cleanup step: keep only the latest 15 logs for the device
    logs_to_delete = Logs.query.filter_by(device_ID=device_id) \
        .order_by(Logs.timestamp.desc()) \
        .offset(15).all()

    # Delete the older logs
    for log in logs_to_delete:
        db.session.delete(log)
    db.session.commit()

def save_realtime_data(device_id, data):
    """Save data to the RealTimeData table."""
    solar_output = data.get('solar_output')
    battery_level = data.get('battery_level')
    
    # Calculate consumption
    consumptions = calculate_all_consumptions()
    
    # Prepare a new record for RealTimeData
    new_realtime_data = RealTimeData(
        device_ID=device_id,
        solar_output=solar_output,
        battery_level=battery_level,
        timestamp=datetime.utcnow(),  # Current timestamp
        **{
            f"{device}_state": state for device, state in data["devices"].items()
        },
        **{
            f"{device}_consumption": consumptions.get(device, 0.0) for device in AVERAGE_POWER_RATINGS.keys()
        }
    )
    
    # Save the new real-time data record
    db.session.add(new_realtime_data)
    db.session.commit()
    
    return new_realtime_data

def prepare_response_data(new_realtime_data):
    """Format the response data for the API."""
    return {
        "device_ID": new_realtime_data.device_ID,
        "solar_output": new_realtime_data.solar_output,
        "battery_level": new_realtime_data.battery_level,
        "timestamp": new_realtime_data.timestamp,
        "states": {
            device: getattr(new_realtime_data, f"{device}_state", None)
            for device in AVERAGE_POWER_RATINGS.keys()
        },
        "consumptions": {
            device: getattr(new_realtime_data, f"{device}_consumption", 0.0)
            for device in AVERAGE_POWER_RATINGS.keys()
        }
    }



from sqlalchemy.event import listen
from . import socketio  # Import your existing socketio instance


@sems.route('/fetch_database_data', methods=['GET'])
def fetch_latest_data():
    try:
        # Get the device_ID from the session correctly
        device_id = session.get('device_id')  # ✅ FIXED

        if not device_id:
            return jsonify({"error": "device_ID is required"}), 400

        # Query the latest record for the specified device ID
        latest_record = RealTimeData.query.filter_by(device_ID=device_id).order_by(RealTimeData.timestamp.desc()).first()

        if latest_record:
            data = {
                "timestamp": latest_record.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "battery_level": latest_record.battery_level,
                "solar_output": latest_record.solar_output,
                "devices": {
                    "kitchen_light": {
                        "state": latest_record.kitchen_light_state,
                        "consumption": latest_record.kitchen_light_consumption
                    },
                    "dining_light": {
                        "state": latest_record.dining_light_state,
                        "consumption": latest_record.dining_light_consumption
                    },
                    "bed_light": {
                        "state": latest_record.bed_light_state,
                        "consumption": latest_record.bed_light_consumption
                    },
                    "security_light": {
                        "state": latest_record.security_light_state,
                        "consumption": latest_record.security_light_consumption
                    },
                    "sound_system": {
                        "state": latest_record.sound_system_state,
                        "consumption": latest_record.sound_system_consumption
                    },
                    "tv": {
                        "state": latest_record.tv_state,
                        "consumption": latest_record.tv_consumption
                    }
                }
            }
            return jsonify(data), 200
        else:
            return jsonify({"error": "No data found for the specified device_ID"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500  # ✅ Fixed error message key

def emit_data_to_room(data, user_id):
    """
    Emits data via WebSocket to a specific user's room.
    
    Args:
        data: The data payload to emit
        user_id: The user ID to target
    """
    user_room = f"user_{user_id}"
    socketio.emit('database_update', data, room=user_room)
    print(f"✅ WebSocket Event Emitted to room: {user_room}")


def on_data_update(mapper, connection, target):
    print("🔥 on_data_update triggered!") # Debugging log
    user_id = session.get('user_id') # Retrieve user_id from session
    
    if not user_id:
        print("❌ No user_id found in session.")
        return # If no user is logged in, do nothing
        
    latest_record = target # The new data entry
    print(f"🆕 New Data Received: {latest_record.device_ID}") # Debugging
    
    user = User.query.get(user_id) # Fetch user details
    if not user:
        print("❌ User not found in database.")
        return # If the user does not exist, stop
        
    if latest_record.device_ID != user.device_id:
        print("❌ Device ID mismatch. Ignoring update.")
        return # Ignore updates that don't match the user's device
        
    print("✅ Emitting WebSocket event...") # Debugging
    
    data = {
        "timestamp": latest_record.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "battery_level": latest_record.battery_level,
        "solar_output": latest_record.solar_output,
        "devices": {
            "kitchen_light": {
                "state": latest_record.kitchen_light_state,
                "consumption": latest_record.kitchen_light_consumption
            },
            "dining_light": {
                "state": latest_record.dining_light_state,
                "consumption": latest_record.dining_light_consumption
            },
            "bed_light": {
                "state": latest_record.bed_light_state,
                "consumption": latest_record.bed_light_consumption
            },
            "security_light": {
                "state": latest_record.security_light_state,
                "consumption": latest_record.security_light_consumption
            },
            "sound_system": {
                "state": latest_record.sound_system_state,
                "consumption": latest_record.sound_system_consumption
            },
            "tv": {
                "state": latest_record.tv_state,
                "consumption": latest_record.tv_consumption
            }
        }
    }
    
    # Call the emit function with the user_id using background task
    socketio.start_background_task(emit_data_to_room, data, user_id)


listen(RealTimeData, 'after_insert', on_data_update)
listen(RealTimeData, 'after_update', on_data_update)
    
def emit_logs_to_room(logs_data, user_id=None):
    """
    Emits log data via WebSocket to a specific user's room or all users.
    
    Args:
        logs_data: The log entries to emit
        user_id: The user ID to target (optional)
    """
    if user_id:
        user_room = f"user_{user_id}"
        socketio.emit('log_update', {"logs": logs_data}, room=user_room)
        print(f"✅ Log update emitted to room: {user_room}")
    else:
        socketio.emit('log_update', {"logs": logs_data})
        print("✅ Log update broadcasted to all connected clients")


def on_log_insert(mapper, connection, target):
    """Query the latest logs when a new log is inserted."""
    device_id = target.device_ID  # Get the device ID from the new log entry
    
    if 'device_id' in session and session['device_id'] == device_id:
        # Get the user_id from session
        user_id = session.get('user_id')
        
        # Query the latest 15 logs for the device
        logs = Logs.query.filter_by(device_ID=device_id).order_by(Logs.timestamp.desc()).limit(15).all()
        logs_list = [
            {
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "changes": log.changes
            }
            for log in logs
        ]
        
        # Call the emission function using background task
        socketio.start_background_task(emit_logs_to_room, logs_list, user_id)
listen(Logs, 'after_insert', on_log_insert)



def on_aggregate_insert(mapper, connection, target):
    """Prepare new aggregated consumption data when a new record is inserted."""
    try:
        device_id = target.device_id  # Get device ID from the new aggregate entry

        # Retrieve the latest aggregate entry for the device
        latest_aggregate = AggregateData.query.filter_by(device_id=device_id).order_by(AggregateData.timestamp.desc()).first()
        
        if not latest_aggregate or not latest_aggregate.devices_total_consumption:
            return  # No valid data to emit

        # Sort devices by energy consumed (highest first)
        sorted_devices = sorted(latest_aggregate.devices_total_consumption.items(), key=lambda x: x[1], reverse=True)

        # Convert to JSON format for frontend
        sorted_consumption = [{"device_name": name, "energy_consumed": energy} for name, energy in sorted_devices]

        # ✅ Store data in a global queue (or call a separate function to emit later)
        socketio.start_background_task(emit_aggregated_data, sorted_consumption)
        print('some data were sent here///////////////////////////////////////////////////')

    except Exception as e:
        print(f"❌ Error in on_aggregate_insert: {e}")

# Attach event listener for aggregation data insertions
listen(AggregateData, 'after_insert', on_aggregate_insert)


def emit_aggregated_data(sorted_consumption):
    """Emit aggregated consumption data in a valid WebSocket context."""
    socketio.emit('aggregated_consumption_update', {"devices": sorted_consumption})
    print('some aggregated were sent forwar👴')





def emit_battery_solar_update(data_batch, user_id):
    """
    Emit battery and solar data for a specific device in a batch to a user's room.
    
    Args:
        data_batch: List of data points to emit
        user_id: The user ID to target
    """
    user_room = f"user_{user_id}"
    socketio.emit('battery_solar_update', {
        "data": data_batch  # Sending the entire batch as a list
    }, room=user_room)
    print(f'Emitted {len(data_batch)} data points to room: {user_room}')
    print('I emitted some data for the solar and battery graph')


def on_realtime_insert(mapper, connection, target):
    """Listener for new inserts into RealTimeData table."""
    user_id = session.get('user_id')  # Get user_id from session
    session_device_id = session.get('device_id')  # Get device_id from session
    
    if not session_device_id or session_device_id != target.device_ID:
        return  # Skip if session device doesn't match target
    
    try:
        # Get the timestamp for today's 6 AM
        today_six_am = get_today_six_am()
        # Fetch all real-time entries for this device after 6 AM
        entries = db.session.query(RealTimeData).filter(
            RealTimeData.device_ID == target.device_ID,
            RealTimeData.timestamp >= today_six_am
        ).order_by(RealTimeData.timestamp).all()
        
        if entries:
            # Convert data to JSON format (batch emit)
            data_batch = [
                {
                    "timestamp": entry.timestamp.isoformat(),
                    "battery_level": entry.battery_level,
                    "solar_output": entry.solar_output
                }
                for entry in entries
            ]
            
            # Emit all data in a single batch using background task
            # Pass user_id to the emit function for room targeting
            socketio.start_background_task(
                emit_battery_solar_update,
                data_batch,  # Sending as a list
                user_id      # Passing user_id for room targeting
            )
    except Exception as e:
        print(f"Error in on_realtime_insert: {e}")


# Attach listener to RealTimeData table
listen(RealTimeData, 'after_insert', on_realtime_insert)
    
    
    
SIMULATOR_API_URL = "http://localhost:5002"  # The URL of the micro-control simulator

@sems.route('/proxy_device_control', methods=['POST'])
def proxy_device_control():
    """
    Proxy endpoint to forward device control requests to the simulator API
    """
    try:
        # Get data from the client request
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get device_ID from session if not provided
        if "device_ID" not in data and "device_id" in session:
            data["device_ID"] = session.get("device_id")
        
        # Required fields
        required_fields = ["device_ID", "device_name", "control_action"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Forward the request to the simulator API
        response = requests.post(
            f"{SIMULATOR_API_URL}/control_device",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        # Return the response from the simulator API
        return response.json(), response.status_code
    
    except requests.RequestException as e:
        # Handle connection errors
        return jsonify({"error": f"Failed to connect to simulator API: {str(e)}"}), 500
    except Exception as e:
        # Handle other errors
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
        

@sems.route('/api/emergency-shutdown', methods=['POST'])
def emergency_shutdown():
    """
    Endpoint to receive and forward emergency shutdown requests to the simulator API
    """
    try:
        # Get data from the client request
        data = request.get_json()
       
        if not data:
            return jsonify({"error": "No data provided"}), 400
       
        # Validate required fields
        required_fields = ["action", "timestamp"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
       
        # Validate action type
        if data["action"] != "shutdown":
            return jsonify({"error": "Invalid action type. Expected 'shutdown'"}), 400
           
        # Forward the request to the simulator API
        response = requests.post(
            f"{SIMULATOR_API_URL}/emergency_shutdown",
            json=data,
            headers={"Content-Type": "application/json"}
        )
       
        # First response to acknowledge receipt
        if response.status_code == 200:
            return jsonify({
                "status": "acknowledged",
                "message": "Emergency shutdown request received and processing",
                "timestamp": datetime.now().isoformat()
            }), 200
        else:
            # Return error from simulator
            return response.json(), response.status_code
           
    except requests.RequestException as e:
        # Handle connection errors
        return jsonify({
            "status": "error",
            "message": f"Failed to connect to control system: {str(e)}"
        }), 500
    except Exception as e:
        # Handle other errors
        return jsonify({
            "status": "error",
            "message": f"An error occurred: {str(e)}"
        }), 500

@sems.route('/api/emergency-shutdown/status', methods=['GET'])
def check_shutdown_status():
    """
    Endpoint to poll and forward status requests to the simulator API
    """
    try:
        # Forward the status request to the simulator API
        response = requests.get(f"{SIMULATOR_API_URL}/shutdown_status")
        
        if response.status_code == 200:
            simulator_status = response.json()
            
            # Map simulator status format to what the frontend expects
            status_data = {
                "status": "completed" if simulator_status["success"] else "failed",
                "message": simulator_status["message"],
                "timestamp": simulator_status["timestamp"]
            }
            
            # Add progress info if available
            if "progress" in simulator_status:
                status_data["progress"] = simulator_status["progress"]
                
            return jsonify(status_data), 200
        else:
            return response.json(), response.status_code
            
    except requests.RequestException as e:
        return jsonify({
            "status": "failed",
            "message": f"Failed to connect to control system: {str(e)}"
        }), 500
    except Exception as e:
        return jsonify({
            "status": "failed", 
            "message": f"An error occurred: {str(e)}"
        }), 500

#/////////////////////////////////////////////Process incoming data as well as saving the Aggregate//////////////////
def process_incoming_data11(device_id):
    try:
        if not device_id:
            return {"error": "Device ID is required"}, 400

        utc_now = datetime.utcnow().replace(tzinfo=timezone.utc)

        # ✅ 1️⃣ Get latest RealTimeData
        latest_realtime = RealTimeData.query.filter_by(device_ID=device_id).order_by(RealTimeData.timestamp.desc()).first()
        if not latest_realtime:
            return {"error": "No real-time data available"}, 404

        latest_realtime_time = latest_realtime.timestamp.replace(tzinfo=timezone.utc)

        # ✅ 2️⃣ Get the last aggregation timestamp
        last_aggregate = AggregateData.query.filter_by(device_id=device_id).order_by(AggregateData.timestamp.desc()).first()
        last_agg_time = last_aggregate.timestamp.replace(tzinfo=timezone.utc) if last_aggregate else None

        # ✅ Load previous totals if they exist
        prev_total_energy = last_aggregate.total_energy if last_aggregate else 0
        prev_devices_total_consumption = last_aggregate.devices_total_consumption if last_aggregate else {}

        # 🚨 If no previous aggregation, initialize with default values
        if not last_aggregate or (utc_now - last_agg_time).total_seconds() > 86400:  # 24-hour reset
            total_battery = latest_realtime.battery_level
            total_solar = latest_realtime.solar_output
            prev_devices_total_consumption = {}  # Reset device consumption

            new_entry = AggregateData(
                timestamp=utc_now,
                device_id=device_id,
                avg_power=0,
                total_energy=0,
                battery_level=total_battery,
                solar_output=total_solar,
                devices_total_consumption=prev_devices_total_consumption
            )

            db.session.add(new_entry)
            db.session.commit()
            print(f"✅ Aggregation initialized for {device_id}")

            last_agg_time = utc_now  # Reset aggregation timestamp
            prev_total_energy = 0  # Reset total energy

        # ✅ 3️⃣ Ensure at least 1 minute has passed since last aggregation
        if (latest_realtime_time - last_agg_time).total_seconds() < 60:
            return {"message": "Not yet time to save aggregates"}, 200

        # ✅ 4️⃣ Fetch RealTimeData since last aggregation
        realtime_entries = RealTimeData.query.filter(
            RealTimeData.device_ID == device_id,
            RealTimeData.timestamp > last_agg_time
        ).all()

        total_battery = sum(entry.battery_level for entry in realtime_entries) if realtime_entries else 0
        total_solar = sum(entry.solar_output for entry in realtime_entries) if realtime_entries else 0

        # ✅ 5️⃣ Fetch TotalConsumption data since last aggregation
        total_entries = TotalConsumption.query.filter(
            TotalConsumption.device_ID == device_id,
            TotalConsumption.timestamp > last_agg_time
        ).all()

        # 🔢 Compute total energy consumption (accumulate previous energy)
        total_energy = prev_total_energy + sum(entry.energy_consumed for entry in total_entries) if total_entries else prev_total_energy

        # 🔢 Compute per-device total consumption (accumulate previous values)
        devices_total_consumption = prev_devices_total_consumption.copy()

        for entry in total_entries:
            device_name = entry.device_name
            energy_consumed = entry.energy_consumed
            devices_total_consumption[device_name] = devices_total_consumption.get(device_name, 0) + energy_consumed

        # ✅ 6️⃣ Save aggregated data
        new_entry = AggregateData(
            timestamp=utc_now,
            device_id=device_id,
            avg_power=total_energy / 60 if total_energy else 0,  # Avoid division by zero
            total_energy=total_energy,
            battery_level=total_battery,
            solar_output=total_solar,
            devices_total_consumption=devices_total_consumption
        )

        db.session.add(new_entry)
        db.session.commit()

        print(f"✅ Aggregation saved successfully for device {device_id}")
        return {"message": "Aggregation saved successfully"}, 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ Aggregation failed for {device_id}: {str(e)}")
        return {"error": str(e)}, 500

def get_today_six_am():
    """Returns the timestamp for today's 6 AM."""
    now = datetime.now()
    return datetime.combine(now.date(), time(6, 0, 0))  # Use time() from datetime module
