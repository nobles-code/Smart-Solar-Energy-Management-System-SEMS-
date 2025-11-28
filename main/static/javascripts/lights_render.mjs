/**
 * Device-specific rendering functions for light devices
 * This file should be imported into your main JavaScript file
 */

/**
 * Renders a kitchen light with its specific features
 * @param {string} device - Device identifier
 * @param {Object} details - Device details from backend
 * @param {Object} data - Complete data from backend
 * @returns {HTMLElement} - The light card container
 */
function renderKitchenLight(device, details, data) {
    const lightCard = document.createElement('div');
    lightCard.classList.add('device-card', 'kitchen-light-card');
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    // Determine if light is on or off
    const isOn = details.state === 'ON';
    
    // Create power indicator
    const powerIndicator = document.createElement('div');
    powerIndicator.classList.add('power-indicator', isOn ? 'on' : 'off');
    
    // Create device header
    const header = document.createElement('h3');
    header.textContent = 'Kitchen Light';
    
    // Create consumption text
    const consumptionText = document.createElement('div');
    consumptionText.classList.add('consumption-text');
    consumptionText.innerHTML = `Consumption: <span class="consumption-value">${consumptionDisplay} kWh</span>`;
    
    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.classList.add('toggle-button');
    toggleButton.textContent = isOn ? 'Turn Off' : 'Turn On';
    toggleButton.onclick = () => toggleDevice(device);
    
    // Create settings button
    const settingsButton = document.createElement('button');
    settingsButton.classList.add('settings-button');
    settingsButton.textContent = 'Settings';
    settingsButton.onclick = () => openKitchenLightSettings(device);
    
    // Create brightness control (unique to kitchen light)
    const brightnessControl = document.createElement('div');
    brightnessControl.classList.add('brightness-control');
    brightnessControl.innerHTML = `
        <label for="kitchen-brightness">Brightness:</label>
        <input type="range" id="kitchen-brightness" min="1" max="100" value="75" 
               ${!isOn ? 'disabled' : ''}>
        <span class="brightness-value">75%</span>
    `;
    
    // Add brightness slider functionality
    const brightnessSlider = brightnessControl.querySelector('input');
    const brightnessValue = brightnessControl.querySelector('.brightness-value');
    brightnessSlider.addEventListener('input', () => {
        brightnessValue.textContent = `${brightnessSlider.value}%`;
        updateKitchenBrightness(device, brightnessSlider.value);
    });
    
    // Create canvas for graph
    const canvas = document.createElement('canvas');
    canvas.classList.add('canva');
    canvas.id = `canva-${device}`;
    
    // Assemble all elements
    buttonsContainer.appendChild(toggleButton);
    buttonsContainer.appendChild(settingsButton);
    
    lightCard.appendChild(powerIndicator);
    lightCard.appendChild(header);
    lightCard.appendChild(consumptionText);
    lightCard.appendChild(canvas);
    lightCard.appendChild(brightnessControl);
    lightCard.appendChild(buttonsContainer);
    
    return lightCard;
}

/**
 * Renders a dining light with its specific features
 * @param {string} device - Device identifier
 * @param {Object} details - Device details from backend
 * @param {Object} data - Complete data from backend
 * @returns {HTMLElement} - The light card container
 */
function renderDiningLight(device, details, data) {
    const lightCard = document.createElement('div');
    lightCard.classList.add('device-card', 'dining-light-card');
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    // Determine if light is on or off
    const isOn = details.state === 'ON';
    
    // Create power indicator
    const powerIndicator = document.createElement('div');
    powerIndicator.classList.add('power-indicator', isOn ? 'on' : 'off');
    
    // Create device header
    const header = document.createElement('h3');
    header.textContent = 'Dining Light';
    
    // Create consumption text
    const consumptionText = document.createElement('div');
    consumptionText.classList.add('consumption-text');
    consumptionText.innerHTML = `Consumption: <span class="consumption-value">${consumptionDisplay} kWh</span>`;
    
    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.classList.add('toggle-button');
    toggleButton.textContent = isOn ? 'Turn Off' : 'Turn On';
    toggleButton.onclick = () => toggleDevice(device);
    
    // Create settings button
    const settingsButton = document.createElement('button');
    settingsButton.classList.add('settings-button');
    settingsButton.textContent = 'Settings';
    settingsButton.onclick = () => openDiningLightSettings(device);
    
    // Color temperature control (unique to dining light)
    const colorControl = document.createElement('div');
    colorControl.classList.add('color-control');
    colorControl.innerHTML = `
        <label for="dining-color-temp">Color Temperature:</label>
        <select id="dining-color-temp" ${!isOn ? 'disabled' : ''}>
            <option value="warm">Warm</option>
            <option value="neutral" selected>Neutral</option>
            <option value="cool">Cool</option>
        </select>
    `;
    
    // Add color temperature functionality
    const colorSelect = colorControl.querySelector('select');
    colorSelect.addEventListener('change', () => {
        updateDiningLightColor(device, colorSelect.value);
    });
    
    // Create canvas for graph
    const canvas = document.createElement('canvas');
    canvas.classList.add('canva');
    canvas.id = `canva-${device}`;
    
    // Assemble all elements
    buttonsContainer.appendChild(toggleButton);
    buttonsContainer.appendChild(settingsButton);
    
    lightCard.appendChild(powerIndicator);
    lightCard.appendChild(header);
    lightCard.appendChild(consumptionText);
    lightCard.appendChild(canvas);
    lightCard.appendChild(colorControl);
    lightCard.appendChild(buttonsContainer);
    
    return lightCard;
}

/**
 * Renders a bedroom light with its specific features
 * @param {string} device - Device identifier
 * @param {Object} details - Device details from backend
 * @param {Object} data - Complete data from backend
 * @returns {HTMLElement} - The light card container
 */
function renderBedLight(device, details, data) {
    const lightCard = document.createElement('div');
    lightCard.classList.add('device-card', 'bed-light-card');
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    // Determine if light is on or off
    const isOn = details.state === 'ON';
    
    // Create power indicator
    const powerIndicator = document.createElement('div');
    powerIndicator.classList.add('power-indicator', isOn ? 'on' : 'off');
    
    // Create device header
    const header = document.createElement('h3');
    header.textContent = 'Bedroom Light';
    
    // Create consumption text
    const consumptionText = document.createElement('div');
    consumptionText.classList.add('consumption-text');
    consumptionText.innerHTML = `Consumption: <span class="consumption-value">${consumptionDisplay} kWh</span>`;
    
    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.classList.add('toggle-button');
    toggleButton.textContent = isOn ? 'Turn Off' : 'Turn On';
    toggleButton.onclick = () => toggleDevice(device);
    
    // Create settings button
    const settingsButton = document.createElement('button');
    settingsButton.classList.add('settings-button');
    settingsButton.textContent = 'Settings';
    settingsButton.onclick = () => openBedLightSettings(device);
    
    // Sleep mode control (unique to bed light)
    const sleepModeControl = document.createElement('div');
    sleepModeControl.classList.add('sleep-mode-control');
    sleepModeControl.innerHTML = `
        <label>
            <input type="checkbox" id="sleep-mode-toggle" ${!isOn ? 'disabled' : ''}>
            Sleep Mode
        </label>
        <div class="sleep-timer ${!isOn ? 'disabled' : ''}">
            <label for="sleep-timer">Auto-off in:</label>
            <select id="sleep-timer" ${!isOn ? 'disabled' : ''}>
                <option value="0">Disabled</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
            </select>
        </div>
    `;
    
    // Add sleep mode functionality
    const sleepModeToggle = sleepModeControl.querySelector('#sleep-mode-toggle');
    const sleepTimer = sleepModeControl.querySelector('#sleep-timer');
    sleepModeToggle.addEventListener('change', () => {
        updateBedLightSleepMode(device, sleepModeToggle.checked);
        sleepTimer.disabled = !sleepModeToggle.checked || !isOn;
    });
    
    sleepTimer.addEventListener('change', () => {
        updateBedLightTimer(device, sleepTimer.value);
    });
    
    // Create canvas for graph
    const canvas = document.createElement('canvas');
    canvas.classList.add('canva');
    canvas.id = `canva-${device}`;
    
    // Assemble all elements
    buttonsContainer.appendChild(toggleButton);
    buttonsContainer.appendChild(settingsButton);
    
    lightCard.appendChild(powerIndicator);
    lightCard.appendChild(header);
    lightCard.appendChild(consumptionText);
    lightCard.appendChild(canvas);
    lightCard.appendChild(sleepModeControl);
    lightCard.appendChild(buttonsContainer);
    
    return lightCard;
}

/**
 * Renders a security light with its specific features
 * @param {string} device - Device identifier
 * @param {Object} details - Device details from backend
 * @param {Object} data - Complete data from backend
 * @returns {HTMLElement} - The light card container
 */
function renderSecurityLight(device, details, data) {
    const lightCard = document.createElement('div');
    lightCard.classList.add('device-card', 'security-light-card');
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    // Determine if light is on or off
    const isOn = details.state === 'ON';
    
    // Create power indicator with special alert colors for security
    const powerIndicator = document.createElement('div');
    powerIndicator.classList.add('power-indicator', isOn ? 'security-on' : 'off');
    
    // Create device header
    const header = document.createElement('h3');
    header.textContent = 'Security Light';
    
    // Create consumption text
    const consumptionText = document.createElement('div');
    consumptionText.classList.add('consumption-text');
    consumptionText.innerHTML = `Consumption: <span class="consumption-value">${consumptionDisplay} kWh</span>`;
    
    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.classList.add('toggle-button');
    toggleButton.textContent = isOn ? 'Turn Off' : 'Turn On';
    toggleButton.onclick = () => toggleDevice(device);
    
    // Create settings button
    const settingsButton = document.createElement('button');
    settingsButton.classList.add('settings-button');
    settingsButton.textContent = 'Settings';
    settingsButton.onclick = () => openSecurityLightSettings(device);
    
    // Motion sensor controls (unique to security light)
    const motionControls = document.createElement('div');
    motionControls.classList.add('motion-controls');
    motionControls.innerHTML = `
        <div class="security-mode">
            <label>
                <input type="checkbox" id="motion-detection" ${!isOn ? 'disabled' : ''} checked>
                Motion Detection
            </label>
        </div>
        <div class="security-settings">
            <label for="sensitivity">Sensitivity:</label>
            <select id="sensitivity" ${!isOn ? 'disabled' : ''}>
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
            </select>
        </div>
        <div class="schedule-control">
            <label>
                <input type="checkbox" id="auto-schedule" ${!isOn ? 'disabled' : ''} checked>
                Auto Schedule (Dusk to Dawn)
            </label>
        </div>
    `;
    
    // Add motion detection functionality
    const motionDetection = motionControls.querySelector('#motion-detection');
    const sensitivitySelect = motionControls.querySelector('#sensitivity');
    const autoSchedule = motionControls.querySelector('#auto-schedule');
    
    motionDetection.addEventListener('change', () => {
        updateSecurityLightMotion(device, motionDetection.checked);
        sensitivitySelect.disabled = !motionDetection.checked || !isOn;
    });
    
    sensitivitySelect.addEventListener('change', () => {
        updateSecurityLightSensitivity(device, sensitivitySelect.value);
    });
    
    autoSchedule.addEventListener('change', () => {
        updateSecurityLightSchedule(device, autoSchedule.checked);
    });
    
    // Create canvas for graph
    const canvas = document.createElement('canvas');
    canvas.classList.add('canva');
    canvas.id = `canva-${device}`;
    
    // Assemble all elements
    buttonsContainer.appendChild(toggleButton);
    buttonsContainer.appendChild(settingsButton);
    
    lightCard.appendChild(powerIndicator);
    lightCard.appendChild(header);
    lightCard.appendChild(consumptionText);
    lightCard.appendChild(canvas);
    lightCard.appendChild(motionControls);
    lightCard.appendChild(buttonsContainer);
    
    return lightCard;
}

/**
 * Generic light renderer for any other light devices
 * @param {string} device - Device identifier
 * @param {Object} details - Device details from backend
 * @param {Object} data - Complete data from backend
 * @returns {HTMLElement} - The light card container
 */
function renderGenericLight(device, details, data) {
    const lightCard = document.createElement('div');
    lightCard.classList.add('device-card');
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    // Determine if light is on or off
    const isOn = details.state === 'ON';
    
    // Create power indicator
    const powerIndicator = document.createElement('div');
    powerIndicator.classList.add('power-indicator', isOn ? 'on' : 'off');
    
    // Create basic HTML structure
    lightCard.innerHTML = `
        <h3>${device.replace('_', ' ')}</h3>
        <div class="consumption-text">Consumption: <span class="consumption-value">${consumptionDisplay} kWh</span></div>
    `;
    
    // Create canvas for graphs
    const canvas = document.createElement('canvas');
    canvas.classList.add('canva');
    canvas.id = `canva-${device}`;
    
    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.classList.add('toggle-button');
    toggleButton.textContent = isOn ? 'Turn Off' : 'Turn On';
    toggleButton.onclick = () => toggleDevice(device);
    
    // Create settings button
    const settingsButton = document.createElement('button');
    settingsButton.classList.add('settings-button');
    settingsButton.textContent = 'Settings';
    settingsButton.onclick = () => openSettings(device);
    
    // Assemble buttons
    buttonsContainer.appendChild(toggleButton);
    buttonsContainer.appendChild(settingsButton);
    
    // Append elements to the card
    lightCard.appendChild(powerIndicator);
    lightCard.appendChild(canvas);
    lightCard.appendChild(buttonsContainer);
    
    return lightCard;
}

// Helper functions for device-specific actions
function updateKitchenBrightness(device, value) {
    console.log(`Setting brightness of ${device} to ${value}%`);
    // TODO: Send to backend
    // socket.emit('update_device', { device, action: 'set_brightness', value });
}

function updateDiningLightColor(device, colorTemp) {
    console.log(`Setting color temperature of ${device} to ${colorTemp}`);
    // TODO: Send to backend
    // socket.emit('update_device', { device, action: 'set_color_temp', value: colorTemp });
}

function updateBedLightSleepMode(device, enabled) {
    console.log(`Setting sleep mode for ${device} to ${enabled ? 'enabled' : 'disabled'}`);
    // TODO: Send to backend
    // socket.emit('update_device', { device, action: 'set_sleep_mode', value: enabled });
}

function updateBedLightTimer(device, minutes) {
    console.log(`Setting sleep timer for ${device} to ${minutes} minutes`);
    // TODO: Send to backend
    // socket.emit('update_device', { device, action: 'set_sleep_timer', value: minutes });
}

function updateSecurityLightMotion(device, enabled) {
    console.log(`Setting motion detection for ${device} to ${enabled ? 'enabled' : 'disabled'}`);
    // TODO: Send to backend
    // socket.emit('update_device', { device, action: 'set_motion_detection', value: enabled });
}

function updateSecurityLightSensitivity(device, sensitivity) {
    console.log(`Setting motion sensitivity for ${device} to ${sensitivity}`);
    // TODO: Send to backend
    // socket.emit('update_device', { device, action: 'set_sensitivity', value: sensitivity });
}

function updateSecurityLightSchedule(device, enabled) {
    console.log(`Setting auto schedule for ${device} to ${enabled ? 'enabled' : 'disabled'}`);
    // TODO: Send to backend
    // socket.emit('update_device', { device, action: 'set_auto_schedule', value: enabled });
}

// Settings modal functions
function openKitchenLightSettings(device) {
    console.log(`Opening settings for ${device}`);
    openSettings(device, 'kitchen');
}

function openDiningLightSettings(device) {
    console.log(`Opening settings for ${device}`);
    openSettings(device, 'dining');
}

function openBedLightSettings(device) {
    console.log(`Opening settings for ${device}`);
    openSettings(device, 'bedroom');
}

function openSecurityLightSettings(device) {
    console.log(`Opening settings for ${device}`);
    openSettings(device, 'security');
}

// Generic settings opener that can be customized based on device type
function openSettings(device, type = 'generic') {
    console.log(`Opening ${type} settings modal for ${device}`);
    // TODO: Implement settings modal logic
    // This would typically show a modal with device-specific settings
}

// Device toggle function (already exists in your codebase)
// function toggleDevice(device) {
//     console.log(`Toggling ${device}`);
//     // This likely makes a socket call to toggle the device state
// }
