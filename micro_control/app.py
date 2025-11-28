from flask import Flask, jsonify, request
import random
import time
from datetime import datetime

app = Flask(__name__)

# List of device IDs to randomly choose from
device_IDs = ["78u001y"] #, "78u001x" "65w789x"]

# Track emergency shutdown status
emergency_status = {
    "shutdown_active": False,
    "shutdown_timestamp": None,
    "shutdown_by": None
}

# Initial device state dictionaries for each device
device_data = {
    "78u001y": {
        "battery_level": 10,
        "solar_output": 0,
        "solar_direction": 1,
        "counter": 0,
        "device_states": {
            "kitchen_light": "OFF",
            "dining_light": "OFF",
            "bed_light": "OFF",
            "security_light": "OFF",
            "sound_system": "OFF",
            "tv": "OFF"
        },
        # New dictionary to track manual control flags
        "manual_control": {
            "kitchen_light": False,
            "dining_light": False,
            "bed_light": False,
            "security_light": False,
            "sound_system": False,
            "tv": False
        },
        # New dictionary to store manual states
        "manual_states": {
            "kitchen_light": "OFF",
            "dining_light": "OFF",
            "bed_light": "OFF",
            "security_light": "OFF",
            "sound_system": "OFF",
            "tv": "OFF"
        }
    },
    "78u001x": {
        "battery_level": 150,
        "solar_output": 100,
        "solar_direction": 0,
        "counter": 15,
        "device_states": {
            "kitchen_light": "OFF",
            "dining_light": "OFF",
            "bed_light": "OFF",
            "security_light": "OFF",
            "sound_system": "OFF",
            "tv": "OFF"
        },
        "manual_control": {
            "kitchen_light": False,
            "dining_light": False,
            "bed_light": False,
            "security_light": False,
            "sound_system": False,
            "tv": False
        },
        "manual_states": {
            "kitchen_light": "OFF",
            "dining_light": "OFF",
            "bed_light": "OFF",
            "security_light": "OFF",
            "sound_system": "OFF",
            "tv": "OFF"
        }
    },
    "65w789x": {
        "battery_level": 50,
        "solar_output": 5,
        "solar_direction": -1,
        "counter": 30,
        "device_states": {
            "kitchen_light": "OFF",
            "dining_light": "OFF",
            "bed_light": "OFF",
            "security_light": "OFF",
            "sound_system": "OFF",
            "tv": "OFF"
        },
        "manual_control": {
            "kitchen_light": False,
            "dining_light": False,
            "bed_light": False,
            "security_light": False,
            "sound_system": False,
            "tv": False
        },
        "manual_states": {
            "kitchen_light": "OFF",
            "dining_light": "OFF",
            "bed_light": "OFF",
            "security_light": "OFF",
            "sound_system": "OFF",
            "tv": "OFF"
        }
    }
}


def update_device_states(device_id):
    """
    Updates the device states based on the current counter value for a specific device.
    For devices under manual control, the counter-based logic is bypassed.
    If emergency shutdown is active, all devices are kept OFF regardless of manual settings.
    """
    counter = device_data[device_id]["counter"]
    device_states = device_data[device_id]["device_states"]
    manual_control = device_data[device_id]["manual_control"]
    manual_states = device_data[device_id]["manual_states"]
    
    # If emergency shutdown is active, force all devices to OFF
    if emergency_status["shutdown_active"]:
        for device_name in device_states:
            device_states[device_name] = "OFF"
        return
    
    # Normal operation - update states based on counter only for devices not under manual control
    if not manual_control["kitchen_light"]:
        device_states["kitchen_light"] = "ON" if 1 <= counter <= 18 else "OFF"
    else:
        device_states["kitchen_light"] = manual_states["kitchen_light"]
        
    if not manual_control["dining_light"]:
        device_states["dining_light"] = "ON" if 13 <= counter <= 18 else "OFF"
    else:
        device_states["dining_light"] = manual_states["dining_light"]
        
    if not manual_control["bed_light"]:
        device_states["bed_light"] = "ON" if 24 <= counter <= 43 else "OFF"
    else:
        device_states["bed_light"] = manual_states["bed_light"]
        
    if not manual_control["security_light"]:
        device_states["security_light"] = "ON" if 38 <= counter <= 45 else "OFF"
    else:
        device_states["security_light"] = manual_states["security_light"]
        
    if not manual_control["sound_system"]:
        device_states["sound_system"] = "ON" if 50 <= counter <= 65 else "OFF"
    else:
        device_states["sound_system"] = manual_states["sound_system"]
        
    if not manual_control["tv"]:
        device_states["tv"] = "ON" if 30 <= counter <= 69 else "OFF"
    else:
        device_states["tv"] = manual_states["tv"]
    
    device_data[device_id]["device_states"] = device_states


def update_device_data(device_id):
    """
    Updates the solar output and battery level for a specific device
    based on a set of probabilistic rules.
    """
    # Extract current device data
    device = device_data[device_id]
    
    # Increment the counter (simulate passage of time)
    device["counter"] += 1
    if device["counter"] > 70:  # Reset counter after max range
        device["counter"] = 1

    # Update device states based on the counter
    update_device_states(device_id)

    ### Solar Logic ###
    # Decide if solar should increase, decrease, or hold steady
    solar_trend_decider = random.randint(1, 100)
    if 1 <= solar_trend_decider <= 10:
        device["solar_direction"] = -1  # Decrease
    elif 90 <= solar_trend_decider <= 100:
        device["solar_direction"] = 1   # Increase
    elif 50 <= solar_trend_decider <= 60:
        device["solar_direction"] = 0   # Hold steady

    # Adjust solar output with smooth increments/decrements
    if device["solar_direction"] == 1 and device["solar_output"] < 1000:
        device["solar_output"] += random.randint(1, 5)
    elif device["solar_direction"] == -1 and device["solar_output"] > 10:
        device["solar_output"] -= random.randint(1, 5)
    # If stable, no change.
    device["solar_output"] = max(10, min(device["solar_output"], 1000))

    ### Battery Logic ###
    # We want the battery to mostly be below the solar value and to:
    # - Decrease only if the battery_decider is between 1 and 5.
    # - Increase when battery_decider is between 80 and 100.
    # - Use the difference between solar_output and battery_level to decide how fast to charge.
    battery_decider = random.randint(1, 100)

    # If battery is already full, simulate slight consumption/usage.
    if device["battery_level"] >= 1000:
        device["battery_level"] = random.randint(980, 1000)
    else:
        # If battery is above the solar output, force a decrease.
        if device["battery_level"] > device["solar_output"]:
            device["battery_level"] -= random.randint(1, 5)
        else:
            if battery_decider <= 5:
                # Decrease the battery slightly (simulate usage)
                device["battery_level"] -= random.randint(1, 3)
            elif battery_decider >= 80:
                # Increase the battery based on how far it is from the solar value.
                diff = device["solar_output"] - device["battery_level"]
                # If the solar is much higher than the battery, increase faster.
                if diff > 50:
                    increment = random.randint(3, 7)
                else:
                    increment = random.randint(1, 3)
                device["battery_level"] += increment
            else:
                # In most cases, only slight fluctuation occurs.
                device["battery_level"] += random.randint(-1, 1)

    # Enforce battery boundaries
    device["battery_level"] = max(10, min(device["battery_level"], 1000))

@app.route('/get_simulated_data', methods=['GET'])
def get_simulated_data():
    """
    Route to fetch the simulated data. This function randomly selects a device ID,
    updates its data, and returns the current state.
    """
    # Randomly select a device ID
    selected_device_id = random.choice(device_IDs)
    
    # Update the selected device's data
    update_device_data(selected_device_id)
    
    # Prepare the payload to be returned
    payload = {
        "device_ID": selected_device_id,
        "battery_level": device_data[selected_device_id]["battery_level"],
        "solar_output": device_data[selected_device_id]["solar_output"],
        "devices": device_data[selected_device_id]["device_states"],
        "emergency_shutdown_active": emergency_status["shutdown_active"]
    }
    
    return jsonify(payload), 200


@app.route('/control_device', methods=['POST'])
def control_device():
    """
    Route to handle manual control of devices. This endpoint allows setting
    devices to a manual state or returning them to automatic control.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Required fields
    required_fields = ["device_ID", "device_name", "control_action"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    device_id = data["device_ID"]
    device_name = data["device_name"]
    control_action = data["control_action"]
    
    # Check if device ID exists
    if device_id not in device_data:
        return jsonify({"error": f"Device ID {device_id} not found"}), 404
    
    # Check if device name exists
    if device_name not in device_data[device_id]["device_states"]:
        return jsonify({"error": f"Device name {device_name} not found"}), 404
    
    # If emergency shutdown is active, prevent manual control changes
    if emergency_status["shutdown_active"] and control_action != "OVERRIDE_EMERGENCY":
        return jsonify({
            "status": "error",
            "message": "Cannot change device state during emergency shutdown",
            "device_ID": device_id,
            "device_name": device_name,
            "current_state": "OFF",
            "control_mode": "Emergency Shutdown"
        }), 403
    
    # Special action to override emergency shutdown
    if control_action == "OVERRIDE_EMERGENCY":
        emergency_status["shutdown_active"] = False
        emergency_status["shutdown_timestamp"] = None
        return jsonify({
            "status": "success",
            "message": "Emergency shutdown override successful",
            "shutdown_active": False
        }), 200
    
    # Handle control actions
    if control_action == "AUTO":
        # Set device back to automatic control
        device_data[device_id]["manual_control"][device_name] = False
        message = f"Device {device_name} set to automatic control"
    elif control_action in ["ON", "OFF"]:
        # Set device to manual control with specified state
        device_data[device_id]["manual_control"][device_name] = True
        device_data[device_id]["manual_states"][device_name] = control_action
        # Update the device state immediately
        device_data[device_id]["device_states"][device_name] = control_action
        message = f"Device {device_name} manually set to {control_action}"
    else:
        return jsonify({"error": f"Invalid control action: {control_action}. Must be 'AUTO', 'ON', 'OFF', or 'OVERRIDE_EMERGENCY'"}), 400
    
    # Return the updated device state
    return jsonify({
        "status": "success",
        "message": message,
        "device_ID": device_id,
        "device_name": device_name,
        "current_state": device_data[device_id]["device_states"][device_name],
        "control_mode": "Manual" if device_data[device_id]["manual_control"][device_name] else "Automatic"
    }), 200


@app.route('/emergency_shutdown', methods=['POST'])
def emergency_shutdown():
    """
    Route to handle emergency shutdown requests.
    This will force all devices to OFF state until manually overridden.
    """
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
    
    # Update emergency status
    emergency_status["shutdown_active"] = True
    emergency_status["shutdown_timestamp"] = data["timestamp"]
    emergency_status["shutdown_by"] = data.get("user", "system")
    
    # Set all devices to OFF for all device IDs
    for device_id in device_data:
        for device_name in device_data[device_id]["device_states"]:
            device_data[device_id]["device_states"][device_name] = "OFF"
    
    # Simulate processing time
    time.sleep(1)
    
    # Return success message
    return jsonify({
        "status": "success",
        "message": "Emergency shutdown initiated successfully",
        "shutdown_active": True,
        "timestamp": datetime.now().isoformat(),
        "affected_devices": len(device_IDs)
    }), 200


@app.route('/shutdown_status', methods=['GET'])
def shutdown_status():
    """
    Route to check the current status of an emergency shutdown.
    Returns detailed information about the shutdown status for frontend polling.
    """
    # Calculate simulated progress if shutdown is active
    progress = None
    if emergency_status["shutdown_active"]:
        # If shutdown was recently initiated, calculate a progress value
        if emergency_status["shutdown_timestamp"]:
            try:
                # Parse the timestamp to calculate elapsed time
                shutdown_time = datetime.fromisoformat(emergency_status["shutdown_timestamp"].replace('Z', '+00:00'))
                current_time = datetime.now(shutdown_time.tzinfo)
                
                # Simulate progress over 5 seconds
                elapsed_seconds = (current_time - shutdown_time).total_seconds()
                if elapsed_seconds < 5:
                    progress = min(int(elapsed_seconds * 20), 99)  # 20% per second, max 99%
                else:
                    progress = 100  # Complete after 5 seconds
            except:
                # Default progress if timestamp parsing fails
                progress = 100
    
    return jsonify({
        "success": emergency_status["shutdown_active"],
        "status": "active" if emergency_status["shutdown_active"] else "inactive",
        "timestamp": emergency_status["shutdown_timestamp"],
        "initiated_by": emergency_status["shutdown_by"],
        "progress": progress,
        "message": "Emergency shutdown active - all systems disabled" if emergency_status["shutdown_active"] 
                else "Normal operation - no emergency shutdown in effect"
    }), 200

if __name__ == '__main__':
    app.run(port=5002, debug=True)
