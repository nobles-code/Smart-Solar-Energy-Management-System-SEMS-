// import * as Utils from './lights_render.js';

const socket = io();

document.addEventListener('DOMContentLoaded', function () {
    // Connect to the WebSocket server
    
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const requestDataButton = document.getElementById('request-data');

    // Handle connection event
    socket.on('connect', function () {
        addMessage('Connected to server');
    });

    // Handle server responses
    socket.on('server_response', function (msg) {
        addMessage(msg.data);
    });

    // Handle data updates
    socket.on('data_update', function (data) {
        document.getElementById('timestamp').textContent = data.timestamp;
        document.getElementById('value').textContent = data.value;

        const statusElement = document.getElementById('status');
        statusElement.textContent = data.status;

        // Reset classes
        statusElement.classList.remove('normal', 'warning', 'critical');
        // Add appropriate class
        statusElement.classList.add(data.status);

        addMessage(`Received new data: value=${data.value}, status=${data.status}`);
    });
    
    

    // Send message button handler
    sendButton.addEventListener('click', function () {
        sendMessage();
    });

    // Also send on enter key
    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Request data button handler
    requestDataButton.addEventListener('click', function () {
        socket.emit('request_data');
        addMessage('Requesting new data...');
    });

    // Function to send a message
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            socket.emit('client_message', {
                data: message
            });
            addMessage('You: ' + message);
            messageInput.value = '';
        }
    }

    // Function to add a message to the log
    function addMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messagesDiv.appendChild(messageElement);
        // Auto-scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    initializeUI()
});


    let aggregatedConsumptionData = null; // Store fetched data

    // Listen for real-time updates from the backend
    socket.on('aggregated_consumption_update', (data) => {
        console.log("New aggregated data received:", data);

        if (data.devices) {
            aggregatedConsumptionData = data.devices; // Save new data
            updateUsageContainer(); // Update UI
        } else {
            console.warn("Received update with no devices data.");
        }
    });
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 // main.js - Contains the route handler and DOM content creation logic

// Global references to DOM elements that need to be updated
let domReferences = {
    batterySection: null,
    solarSection: null,
    deviceCards: {},      // Maps device IDs to their card elements
    deviceRows: {},       // Maps device IDs to their table rows
    timestamp: null       // Reference to timestamp display
};

// Initial setup function to be called when page loads
function initializeUI() {
    // Create the initial DOM structure
    createDOMStructure();
    
    // Fetch initial data
    fetchLatestData();
    
    // Set up refresh button if needed
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', fetchLatestData);
    }
}

// Function to fetch latest data from the server
function fetchLatestData() {
    // Show loading state if needed
    document.getElementById("loading-state")?.classList.remove("hidden");
    
    fetch('/sems_in/fetch_database_data')
        .then(response => response.json())
        .then(result => {
            // Check that the result contains the expected keys
            if (result && result.hasOwnProperty('battery_level') && result.hasOwnProperty('devices')) {
                // Update the UI with the fetched data
                updateUIWithData(result);
                
                // Hide loading indicator and show navigation content
                document.getElementById("loading-state")?.classList.add("hidden");
                document.getElementById("nav-content")?.classList.remove("hidden");
            } else {
                console.error('Error in fetched data:', result);
                displayError(result.error || "Error fetching data.");
            }
        })
        .catch(error => {
            console.error("Error fetching data:", error);
            displayError("Error fetching data.");
        });
}

// Function to display error messages
function displayError(message) {
    const container = document.getElementById('data-container');
    if (container) {
        container.innerHTML = `<p>Error: ${message}</p>`;
    }
    
    // Hide loading and show nav if applicable
    document.getElementById("loading-state")?.classList.add("hidden");
    document.getElementById("nav-content")?.classList.remove("hidden");
}

// Main function to create the entire DOM structure
function createDOMStructure() {
    const container = document.getElementById('data-container');
    if (!container) {
        console.error('Data container not found');
        return;
    }
    
    // Clear previous content
    container.innerHTML = '';
    
    // Create main dashboard section
    const mainDevices = document.createElement('section');
    
    // Create main header with timestamp placeholder
    const mainHeader = document.createElement('h1');
    mainHeader.style.display = 'flex';
    mainHeader.style.justifyContent = 'space-between';
    mainHeader.style.alignItems = 'center';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Dashboard';
    
    const timestampSpan = document.createElement('span');
    timestampSpan.style.fontSize = '0.8rem';
    timestampSpan.style.color = 'gray';
    timestampSpan.textContent = 'Data from: Loading...';
    domReferences.timestamp = timestampSpan; // Store reference
    
    mainHeader.appendChild(titleSpan);
    mainHeader.appendChild(timestampSpan);
    mainDevices.appendChild(mainHeader);
    
    // Create devices container
    const devices = document.createElement('div');
    devices.classList.add('maindevices-styles');
    
    // Create placeholder for battery section
    const batterySection = createBatterySection();
    domReferences.batterySection = batterySection;
    devices.appendChild(batterySection);
    
    // Create placeholder for solar section
    const solarSection = createSolarSection();
    domReferences.solarSection = solarSection;
    devices.appendChild(solarSection);
    
    // Append devices to main section
    mainDevices.appendChild(devices);
    container.appendChild(mainDevices);
    
    // Create lights section
    const lightsSection = document.createElement('section');
    lightsSection.classList.add('devices-section');
    lightsSection.innerHTML = '<h2>Lights</h2>';
    
    const lightsGrid = document.createElement('div');
    lightsGrid.classList.add('devices-grid');
    lightsSection.appendChild(lightsGrid);
    container.appendChild(lightsSection);
    
    // Create non-light devices section
    const nonLightsSection = document.createElement('section');
    nonLightsSection.classList.add('non-lights-section');
    nonLightsSection.innerHTML = '<h2>Other Devices</h2>';
    
    const table = document.createElement('table');
    table.classList.add('devices-table');
    table.innerHTML = `
        <thead>
          <tr>
            <th>Device</th>
            <th>Status</th>
            <th>Consumption (kWh)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody></tbody>
    `;
    
    nonLightsSection.appendChild(table);
    container.appendChild(nonLightsSection);
    
    // Return important DOM references for later updates
    return {
        lightsGrid,
        nonLightsTableBody: table.querySelector('tbody')
    };
}

// Create a placeholder battery section
// Global state variable to track safe mode status
let isSafeModeEnabled = false;

function createBatterySection() {
    const batterySection = document.createElement('section');
    batterySection.className = 'data-section battery-section';
   
    const batteryContentWrapper = document.createElement('div');
    batteryContentWrapper.className = 'battery-content-wrapper';
   
    const batteryHeader = document.createElement('div');
    batteryHeader.className = 'battery-header';
    
    // Create the heading based on current state
    batteryHeader.innerHTML = `<h2>Battery Level ${isSafeModeEnabled ? '<span id="safe-mode-indicator" title="Safe Mode enabled: System will automatically disconnect charging when battery is full">🛡️</span>' : ''}</h2>`;
   
    const batteryInfoContainer = document.createElement('div');
    batteryInfoContainer.className = 'battery-info-container';
   
    const batteryLevelRow = document.createElement('div');
    batteryLevelRow.className = 'battery-level-row';
   
    const batteryValue = document.createElement('p');
    batteryValue.className = 'battery-value';
    batteryValue.textContent = 'Loading...';
   
    const batteryIcon = document.createElement('img');
    batteryIcon.className = 'battery-icon';
    batteryIcon.onerror = function() {
        this.replaceWith(Object.assign(document.createElement('span'), {
            textContent: '🔋',
            className: 'battery-icon-emoji'
        }));
    };
   
    // Create a placeholder for battery visualization
    const batteryVisPlaceholder = document.createElement('div');
    batteryVisPlaceholder.className = 'battery-visualization-placeholder';
   
    // Enhanced safe mode button with text based on current state
    const safeModeButton = document.createElement('button');
    safeModeButton.className = 'safe-mode-button';
    safeModeButton.textContent = isSafeModeEnabled ? 'Disable Safe Mode' : 'Enable Safe Mode';
    safeModeButton.title = 'Safe mode prevents overcharging by disconnecting power when battery is full';
    
    // Add the click handler that updates the global state
    safeModeButton.onclick = function() {
        isSafeModeEnabled = !isSafeModeEnabled;
        
        // Update localStorage to persist between page refreshes if needed
        localStorage.setItem('safeModeEnabled', isSafeModeEnabled);
        
        console.log('Safe mode toggled:', isSafeModeEnabled ? 'ON' : 'OFF');
        
        if (isSafeModeEnabled) {
            // Show warning about disabling not recommended
            const warningMessage = document.createElement('div');
            warningMessage.className = 'warning-message';
            warningMessage.textContent = 'Not recommended to disable';
            warningMessage.style.fontSize = '10px';
            warningMessage.style.color = '#d32f2f';
            warningMessage.style.position = 'absolute';
            warningMessage.style.bottom = '-15px';
            warningMessage.style.left = '0';
            warningMessage.style.width = '100%';
            warningMessage.style.textAlign = 'center';
            
            this.style.position = 'relative';
            this.appendChild(warningMessage);
            
            setTimeout(function() {
                warningMessage.remove();
            }, 3000);
        }
        
        // Force refresh of the battery section to reflect new state
        const currentSection = document.querySelector('.battery-section');
        if (currentSection) {
            const newSection = createBatterySection();
            currentSection.replaceWith(newSection);
        }
        
        return false;
    };
   
    // Assemble components
    batteryLevelRow.append(batteryValue, batteryIcon);
    batteryInfoContainer.append(batteryLevelRow, batteryVisPlaceholder, safeModeButton);
    batteryContentWrapper.append(batteryHeader, batteryInfoContainer);
    batterySection.appendChild(batteryContentWrapper);
    
    return batterySection;
}

// Initialize safe mode state from localStorage if available
function initializeSafeMode() {
    const savedState = localStorage.getItem('safeModeEnabled');
    if (savedState !== null) {
        isSafeModeEnabled = savedState === 'true';
        console.log('Initialized safe mode from storage:', isSafeModeEnabled ? 'ON' : 'OFF');
    }
}

// Call this when your page loads
initializeSafeMode();

// Create a placeholder solar section
function createSolarSection() {
    const solarSection = document.createElement('section');
    solarSection.className = 'data-section solar-section';
    
    const solarContentWrapper = document.createElement('div');
    solarContentWrapper.className = 'solar-content-wrapper';
    
    const solarHeader = document.createElement('div');
    solarHeader.className = 'solar-header';
    solarHeader.innerHTML = '<h2>Solar Output</h2>';
    
    const solarInfoContainer = document.createElement('div');
    solarInfoContainer.className = 'solar-info-container';
    
    const solarLevelRow = document.createElement('div');
    solarLevelRow.className = 'solar-level-row';
    
    const solarValue = document.createElement('p');
    solarValue.className = 'solar-value';
    solarValue.textContent = 'Loading...';
    
    const solarIcon = document.createElement('img');
    // solarIcon.src = '/assets/icons/solar-icon.svg';
    // solarIcon.alt = '☀️';
    solarIcon.className = 'solar-icon';
    solarIcon.onerror = function() {
        this.replaceWith(Object.assign(document.createElement('span'), {
            textContent: '☀️',
            className: 'solar-icon-emoji'
        }));
    };
    
    // Create a placeholder for solar visualization
    const solarVisPlaceholder = document.createElement('div');
    solarVisPlaceholder.className = 'solar-visualization-placeholder';
    
    const solarStatus = document.createElement('div');
    solarStatus.className = 'solar-status';
    solarStatus.textContent = 'Loading...';
    
    // Assemble components
    solarLevelRow.append(solarValue, solarIcon);
    solarInfoContainer.append(solarLevelRow, solarVisPlaceholder, solarStatus);
    solarContentWrapper.append(solarHeader, solarInfoContainer);
    solarSection.appendChild(solarContentWrapper);
    
    return solarSection;
}

// Main function to update the UI with new data
function updateUIWithData(data) {
    if (!data) return;
   
    // Update timestamp
    if (domReferences.timestamp) {
        domReferences.timestamp.textContent = `Data from: ${new Date(data.timestamp).toLocaleString()}`;
    }
   
    // Update battery and solar sections (complete replacement for simplicity)
    updateBatterySection(data);
    updateSolarSection(data);
   
    // Get references to the light grid and non-light table body
    const lightsGrid = document.querySelector('.devices-grid');
    const nonLightsTableBody = document.querySelector('.devices-table tbody');
   
    // Check if we need to create device cards and rows for the first time
    const isFirstLoad = Object.keys(domReferences.deviceCards).length === 0;
   
    // Process all devices
    Object.entries(data.devices).forEach(([device, details]) => {
        // Check if this is a light device
        if (device.includes('light')) {
            if (isFirstLoad) {
                // First time - create the light card
                let lightCard;
                switch(device) {
                    case 'kitchen_light':
                        lightCard = renderKitchenLight(device, details, data);
                        break;
                    case 'dining_light':
                        lightCard = renderDiningLight(device, details, data);
                        break;
                    case 'bed_light':
                        lightCard = renderBedLight(device, details, data);
                        break;
                    case 'security_light':
                        lightCard = renderSecurityLight(device, details, data);
                        break;
                    default:
                        // Fallback to generic light renderer
                        lightCard = renderGenericLight(device, details, data);
                }
                lightsGrid.appendChild(lightCard);
                domReferences.deviceCards[device] = lightCard;
            } else {
                // Update existing light card
                updateLightCard(device, details, data);
            }
        } else {
            // Handle non-light devices
            if (isFirstLoad) {
                // First time - create the enhanced device row
                const row = renderNonLightDevice(device, details, data);
                nonLightsTableBody.appendChild(row);
                domReferences.deviceRows[device] = row;
            } else {
                // Update existing device row with our enhanced method
                updateDeviceRow(device, details);
            }
        }
    });
   
    // Apply any dynamic styles if needed
    if (typeof applyDynamicStyles === 'function') {
        applyDynamicStyles(data);
    }
}





// Update just the values in an existing light card
function updateLightCard(device, details, data) {
    const card = domReferences.deviceCards[device];
    if (!card) return;
    
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
    
    // Update consumption text
    const consumptionText = card.querySelector('.consumption-value');
    if (consumptionText) {
        consumptionText.textContent = `${consumptionDisplay} kWh`;
    }
    
    // Update power indicator
    const powerIndicator = card.querySelector('.power-indicator');
    if (powerIndicator) {
        powerIndicator.className = 'power-indicator';
        if (device === 'security_light' && isOn) {
            powerIndicator.classList.add('security-on');
        } else {
            powerIndicator.classList.add(isOn ? 'on' : 'off');
        }
    }
    
    // Update toggle button
    const toggleButton = card.querySelector('.toggle-button');
    if (toggleButton) {
        toggleButton.textContent = isOn ? 'Turn Off' : 'Turn On';
    }
    
    // Update device-specific controls
    if (device === 'kitchen_light') {
        const brightnessSlider = card.querySelector('#kitchen-brightness');
        if (brightnessSlider) {
            brightnessSlider.disabled = !isOn;
        }
    } else if (device === 'dining_light') {
        const colorSelect = card.querySelector('#dining-color-temp');
        if (colorSelect) {
            colorSelect.disabled = !isOn;
        }
    } else if (device === 'bed_light') {
        const sleepModeToggle = card.querySelector('#sleep-mode-toggle');
        const sleepTimer = card.querySelector('#sleep-timer');
        if (sleepModeToggle && sleepTimer) {
            sleepModeToggle.disabled = !isOn;
            sleepTimer.disabled = !isOn || !sleepModeToggle.checked;
        }
    } else if (device === 'security_light') {
        const motionDetection = card.querySelector('#motion-detection');
        const sensitivitySelect = card.querySelector('#sensitivity');
        const autoSchedule = card.querySelector('#auto-schedule');
        if (motionDetection && sensitivitySelect && autoSchedule) {
            motionDetection.disabled = !isOn;
            sensitivitySelect.disabled = !isOn || !motionDetection.checked;
            autoSchedule.disabled = !isOn;
        }
    }
}

// Update just the values in an existing device row
// function updateDeviceRow(device, details) {
//     const row = domReferences.deviceRows[device];
//     if (!row) return;
    
//     // Format consumption value
//     const consumption = details.consumption;
//     let consumptionDisplay;
//     if (consumption < 0.01 && consumption > 0) {
//         consumptionDisplay = consumption.toExponential(2);
//     } else {
//         consumptionDisplay = (consumption || 0).toFixed(2);
//     }
    
//     // Update status and consumption
//     const stateCell = row.querySelector('.device-state');
//     const consumptionCell = row.querySelector('.device-consumption');
    
//     if (stateCell) {
//         stateCell.textContent = details.state;
//     }
    
//     if (consumptionCell) {
//         consumptionCell.textContent = `${consumptionDisplay} kWh`;
//     }
// }

function updateDeviceRow(device, details) {
    const row = domReferences.deviceRows[device];
    if (!row) return;
   
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
   
    // Calculate usage index percentage based on aggregated data
    let usagePercentage = 0;
    let consumptionTrend = 'neutral'; // 'up', 'down', or 'neutral'
    
    if (aggregatedConsumptionData) {
        // Calculate total energy consumed across all devices
        const totalConsumption = aggregatedConsumptionData.reduce((total, dev) => {
            return total + dev.energy_consumed;
        }, 0);
        
        // Find this device in aggregated data
        const deviceData = aggregatedConsumptionData.find(dev => dev.device_name === device);
        
        if (deviceData && totalConsumption > 0) {
            usagePercentage = (deviceData.energy_consumed / totalConsumption * 100).toFixed(1);
            
            // Determine if consumption is trending up or down
            // This would ideally compare with previous readings
            // For now we'll simulate with a comparison to average
            const avgConsumption = totalConsumption / aggregatedConsumptionData.length;
            if (deviceData.energy_consumed > avgConsumption * 1.2) {
                consumptionTrend = 'up';
            } else if (deviceData.energy_consumed < avgConsumption * 0.8) {
                consumptionTrend = 'down';
            }
        }
    }
    
    // Get consumption rank label
    const consumptionRankLabel = getConsumptionRankLabel(usagePercentage);
    
    // Update status cell with status indicator
    const stateCell = row.querySelector('.device-state');
    if (stateCell) {
        const statusColor = details.state === 'ON' ? 'green' : 'gray';
        stateCell.innerHTML = `
            <div class="status-container">
                <span class="status-indicator" style="background-color: ${statusColor};"></span>
                <span>${details.state}</span>
            </div>
        `;
    }
   
    // Update consumption cell with usage metrics
    const consumptionCell = row.querySelector('.device-consumption');
    if (consumptionCell) {
        const trendArrow = consumptionTrend === 'up' ? 
            '<span class="trend-arrow up">↑</span>' : 
            (consumptionTrend === 'down' ? '<span class="trend-arrow down">↓</span>' : '');
            
        consumptionCell.innerHTML = `
            <div class="consumption-container">
                <div>${consumptionDisplay} kWh</div>
                <div class="usage-metrics">
                    <span class="usage-rank ${consumptionTrend}">${consumptionRankLabel}</span>
                    <span class="usage-percentage">${usagePercentage}%</span>
                    ${trendArrow}
                </div>
            </div>
        `;
    }
    
    // Update action cell with icons
    const actionCell = row.querySelector('td:last-child');
    if (actionCell) {
        actionCell.innerHTML = `
            <div class="action-icons">
                <button class="icon-button settings-btn" onclick="showDeviceSettings('${device}')">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="icon-button toggle-btn" onclick="handleDeviceToggle('${device}', '${details.state}')">
                    <i class="fas fa-power-off"></i>
                </button>
                <button class="icon-button info-btn" onclick="showDeviceInfo('${device}')">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        `;
    }
}

// Helper function to get consumption rank label
function getConsumptionRankLabel(percentage) {
    if (percentage > 40) return "High Consumer";
    if (percentage > 20) return "Medium Consumer";
    return "Low Consumer";
}

// Function to handle device toggle with simulated scanning


// Function to show scanning popup
function showScanningPopup(device) {
    const popup = document.createElement('div');
    popup.className = 'scanning-popup';
    popup.innerHTML = `
        <div class="scanning-content">
            <div class="scanning-header">
                <h3>Scanning Device</h3>
                <button onclick="this.parentNode.parentNode.parentNode.remove()">×</button>
            </div>
            <div class="scanning-body">
                <div class="spinner"></div>
                <p>Scanning if ${device.replace('_', ' ')} can be turned on remotely...</p>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            </div>
            <div class="scanning-footer">
                <p class="scanning-note">This is a simulation. No actual connection is being made.</p>
                <button onclick="this.parentNode.parentNode.parentNode.remove()">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Animate progress bar
    const progressFill = popup.querySelector('.progress-fill');
    let width = 0;
    const interval = setInterval(() => {
        if (width >= 100) {
            clearInterval(interval);
            popup.querySelector('.scanning-body').innerHTML = `
                <div class="bi bi-exclamation-triangle text-warning">✓</div>
                <p>Cannot turn on remotely!</p>
                <button class="proceed-btn" onclick="proceedWithToggle('${device}')">Turn On</button>
            `;
        } else {
            width += 2;
            progressFill.style.width = width + '%';
        }
    }, 50);
}

// Function to proceed with toggle after scanning
function proceedWithToggle(device) {
    // Close any open scanning popups
    const popups = document.querySelectorAll('.scanning-popup');
    popups.forEach(popup => popup.remove());
    
    // Actually toggle the device
    toggleDevice(device);
}

// Function to show device settings
function showDeviceSettings(device) {
    const deviceName = device.replace('_', ' ');
    const popup = document.createElement('div');
    popup.className = 'settings-popup';
    popup.innerHTML = `
        <div class="settings-content">
            <div class="settings-header">
                <h3>Device Settings</h3>
                <button onclick="this.parentNode.parentNode.parentNode.remove()">×</button>
            </div>
            <div class="settings-body">
                <div class="setting-group">
                    <label for="device-name">Device Name:</label>
                    <input type="text" id="device-name" value="${deviceName}">
                </div>
                <div class="setting-group">
                    <label for="device-location">Location:</label>
                    <select id="device-location">
                        <option>Living Room</option>
                        <option>Kitchen</option>
                        <option>Bedroom</option>
                        <option>Other</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label>Auto-shutdown:</label>
                    <div class="toggle-switch">
                        <input type="checkbox" id="auto-shutdown">
                        <label for="auto-shutdown"></label>
                    </div>
                </div>
            </div>
            <div class="settings-footer">
                <p class="settings-note">This is a simulation. Settings won't be saved.</p>
                <button onclick="this.parentNode.parentNode.parentNode.remove()">Cancel</button>
                <button class="save-btn" onclick="simulateSaveSettings(this)">Save</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
}

// Function to simulate saving settings
function simulateSaveSettings(button) {
    const popup = button.closest('.settings-popup');
    popup.querySelector('.settings-body').innerHTML = `
        <div class="success-message">
            <div class="success-icon">✓</div>
            <p>Settings saved successfully!</p>
        </div>
    `;
    
    setTimeout(() => {
        popup.remove();
    }, 1500);
}

// Function to show device info
function showDeviceInfo(device) {
    const deviceName = device.replace('_', ' ');
    
    // Find the device in aggregated data
    let deviceData = null;
    if (aggregatedConsumptionData) {
        deviceData = aggregatedConsumptionData.find(dev => dev.device_name === device);
    }
    
    const popup = document.createElement('div');
    popup.className = 'info-popup';
    popup.innerHTML = `
        <div class="info-content">
            <div class="info-header">
                <h3>${deviceName} Information</h3>
                <button onclick="this.parentNode.parentNode.parentNode.remove()">×</button>
            </div>
            <div class="info-body">
                <div class="info-group">
                    <h4>Energy Statistics</h4>
                    <div class="info-stats">
                        <div class="stat-item">
                            <span>Total Energy Used:</span>
                            <span>${deviceData ? deviceData.energy_consumed.toFixed(4) : '0.0000'} kWh</span>
                        </div>
                        <div class="stat-item">
                            <span>Avg. Daily Usage:</span>
                            <span>${deviceData ? (deviceData.energy_consumed / 7).toFixed(4) : '0.0000'} kWh</span>
                        </div>
                        <div class="stat-item">
                            <span>Peak Usage Time:</span>
                            <span>18:00 - 21:00</span>
                        </div>
                    </div>
                </div>
                <div class="info-group">
                    <h4>Device Details</h4>
                    <div class="info-stats">
                        <div class="stat-item">
                            <span>Model:</span>
                            <span>Smart${deviceName.charAt(0).toUpperCase() + deviceName.slice(1)} v2</span>
                        </div>
                        <div class="stat-item">
                            <span>Connected Since:</span>
                            <span>Jan 15, 2025</span>
                        </div>
                        <div class="stat-item">
                            <span>Firmware:</span>
                            <span>v1.2.4</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="info-footer">
                <button onclick="this.parentNode.parentNode.parentNode.remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
}

// Function to initialize first-time rendering for non-light devices
function renderNonLightDevice(device, details, data) {
    const row = document.createElement('tr');
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    // Calculate initial usage metrics
    let usagePercentage = 0;
    let consumptionTrend = 'neutral';
    let consumptionRankLabel = "Low Consumer";
    
    if (aggregatedConsumptionData) {
        // Calculate and set initial metrics
        // Similar logic to updateDeviceRow
        const totalConsumption = aggregatedConsumptionData.reduce((total, dev) => {
            return total + dev.energy_consumed;
        }, 0);
        
        const deviceData = aggregatedConsumptionData.find(dev => dev.device_name === device);
        
        if (deviceData && totalConsumption > 0) {
            usagePercentage = (deviceData.energy_consumed / totalConsumption * 100).toFixed(1);
            consumptionRankLabel = getConsumptionRankLabel(usagePercentage);
            
            const avgConsumption = totalConsumption / aggregatedConsumptionData.length;
            if (deviceData.energy_consumed > avgConsumption * 1.2) {
                consumptionTrend = 'up';
            } else if (deviceData.energy_consumed < avgConsumption * 0.8) {
                consumptionTrend = 'down';
            }
        }
    }
    
    const statusColor = details.state === 'ON' ? 'green' : 'gray';
    const trendArrow = consumptionTrend === 'up' ? 
        '<span class="trend-arrow up">↑</span>' : 
        (consumptionTrend === 'down' ? '<span class="trend-arrow down">↓</span>' : '');
    
    row.innerHTML = `
        <td>${device.replace('_', ' ')}</td>
        <td class="device-state">
            <div class="status-container">
                <span class="status-indicator" style="background-color: ${statusColor};"></span>
                <span>${details.state}</span>
            </div>
        </td>
        <td class="device-consumption">
            <div class="consumption-container">
                <div>${consumptionDisplay} kWh</div>
                <div class="usage-metrics">
                    <span class="usage-rank ${consumptionTrend}">${consumptionRankLabel}</span>
                    <span class="usage-percentage">${usagePercentage}%</span>
                    ${trendArrow}
                </div>
            </div>
        </td>
        <td>
            <div class="action-icons">
                <button class="icon-button settings-btn" onclick="showDeviceSettings('${device}')">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="icon-button toggle-btn" onclick="handleDeviceToggle('${device}', '${details.state}')">
                    <i class="fas fa-power-off"></i>
                </button>
                <button class="icon-button info-btn" onclick="showDeviceInfo('${device}')">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}


// Update battery section with new data
function updateBatterySection(data) {
    if (!domReferences.batterySection || !data.hasOwnProperty('battery_level')) return;
    
    // Clear the section and recreate it with new data
    domReferences.batterySection.innerHTML = '';
    
    const batteryContentWrapper = document.createElement('div');
    batteryContentWrapper.className = 'battery-content-wrapper';
    
    const batteryHeader = document.createElement('div');
    batteryHeader.className = 'battery-header';
    batteryHeader.innerHTML = '<h2>Battery Level</h2>';
    
    const batteryInfoContainer = document.createElement('div');
    batteryInfoContainer.className = 'battery-info-container';
    
    const batteryLevelRow = document.createElement('div');
    batteryLevelRow.className = 'battery-level-row';
    
    const batteryValue = document.createElement('p');
    batteryValue.className = 'battery-value';
    batteryValue.textContent = `${data.battery_level}%`;
    
    const batteryIcon = document.createElement('img');
    batteryIcon.src = 'main/static/images/OIP.jpg';
    batteryIcon.alt = '🔋';
    batteryIcon.className = 'battery-icon';
    batteryIcon.onerror = function() {
        this.replaceWith(Object.assign(document.createElement('span'), {
            textContent: '🔋',
            className: 'battery-icon-emoji'
        }));
    };
    
    // Create battery visualization using createBatteryVisualization function
    let batteryVis;
    if (typeof createBatteryVisualization === 'function') {
        batteryVis = createBatteryVisualization(data.battery_level, data.solar_output);
    } else {
        // Fallback if function doesn't exist
        batteryVis = document.createElement('div');
        batteryVis.className = 'battery-visualization-placeholder';
        batteryVis.textContent = `Battery Level: ${data.battery_level}%`;
    }
    
    const safeModeButton = document.createElement('button');
    safeModeButton.className = 'safe-mode-button';
    safeModeButton.textContent = 'Safe Mode';
    safeModeButton.title = 'Enable safe mode to stop charging when battery is full';
    
    // Assemble components
    batteryLevelRow.append(batteryValue, batteryIcon);
    batteryInfoContainer.append(batteryLevelRow, batteryVis, safeModeButton);
    batteryContentWrapper.append(batteryHeader, batteryInfoContainer);
    domReferences.batterySection.appendChild(batteryContentWrapper);
}

// Update solar section with new data
function updateSolarSection(data) {
    if (!domReferences.solarSection || !data.hasOwnProperty('solar_output')) return;
    
    // Clear the section and recreate it with new data
    domReferences.solarSection.innerHTML = '';
    
    const solarContentWrapper = document.createElement('div');
    solarContentWrapper.className = 'solar-content-wrapper';
    
    const solarHeader = document.createElement('div');
    solarHeader.className = 'solar-header';
    solarHeader.innerHTML = '<h2>Solar Output</h2>';
    
    const solarInfoContainer = document.createElement('div');
    solarInfoContainer.className = 'solar-info-container';
    
    const solarLevelRow = document.createElement('div');
    solarLevelRow.className = 'solar-level-row';
    
    const solarValue = document.createElement('p');
    solarValue.className = 'solar-value';
    solarValue.textContent = `${data.solar_output}W`;
    
    const solarIcon = document.createElement('img');
    solarIcon.src = '/assets/icons/solar-icon.svg';
    solarIcon.alt = '☀️';
    solarIcon.className = 'solar-icon';
    solarIcon.onerror = function() {
        this.replaceWith(Object.assign(document.createElement('span'), {
            textContent: '☀️',
            className: 'solar-icon-emoji'
        }));
    };
    
    // Create solar visualization using createSolarVisualization function
    let solarVis;
    if (typeof createSolarVisualization === 'function') {
        solarVis = createSolarVisualization(data.solar_output);
    } else {
        // Fallback if function doesn't exist
        solarVis = document.createElement('div');
        solarVis.className = 'solar-visualization-placeholder';
        solarVis.textContent = `Solar Output: ${data.solar_output}W`;
    }
    
    const solarStatus = document.createElement('div');
    solarStatus.className = `solar-status ${data.solar_output > 0 ? 'active' : 'inactive'}`;
    solarStatus.textContent = data.solar_output > 0 ? 'Charging' : 'Not Charging';
    
    // Assemble components
    solarLevelRow.append(solarValue, solarIcon);
    solarInfoContainer.append(solarLevelRow, solarVis, solarStatus);
    solarContentWrapper.append(solarHeader, solarInfoContainer);
    domReferences.solarSection.appendChild(solarContentWrapper);
}

// Export functions for use in other modules
window.fetchLatestData = fetchLatestData;
window.updateUIWithData = updateUIWithData;
window.initializeUI = initializeUI;

// Initialize the UI when the document is ready
initializeUI();



// Helper function to create battery visualization
function createBatteryVisualization(batteryLevel, solarOutput) {
    // Calculate battery percentage (0-100)
    const batteryPercentage = Math.min(100, Math.max(0, (batteryLevel / 1000) * 100));
    
    // Calculate how many bars to display (out of 10)
    const maxBars = 10;
    const filledBars = Math.round((batteryPercentage / 100) * maxBars);
    
    // Check if it's charging
    const isCharging = solarOutput > 0;
    
    // Create battery container with improved styling
    const batteryContainer = document.createElement('div');
    batteryContainer.classList.add('battery-visualization');
    batteryContainer.style.display = 'flex';
    batteryContainer.style.alignItems = 'center';
    batteryContainer.style.padding = '8px';
    batteryContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    batteryContainer.style.borderRadius = '10px';
    batteryContainer.style.boxShadow = isCharging ? 
        '0 0 10px rgba(0, 255, 150, 0.5)' : 
        '0 0 10px rgba(100, 100, 100, 0.3)';
    
    // Create battery body with improved styling
    const batteryBody = document.createElement('div');
    batteryBody.classList.add('battery-body');
    batteryBody.style.position = 'relative';
    batteryBody.style.width = '120px';
    batteryBody.style.height = '35px';
    batteryBody.style.borderRadius = '3px';
    batteryBody.style.border = '2px solid #888';
    batteryBody.style.padding = '2px';
    batteryBody.style.boxSizing = 'border-box';
    batteryBody.style.background = 'rgba(40, 40, 40, 0.7)';
    batteryBody.style.overflow = 'hidden';
    batteryBody.style.display = 'flex';
    batteryBody.style.justifyContent = 'space-between';
    
    // Create battery cap with improved styling
    const batteryCap = document.createElement('div');
    batteryCap.classList.add('battery-cap');
    batteryCap.style.width = '5px';
    batteryCap.style.height = '15px';
    batteryCap.style.borderRadius = '0 2px 2px 0';
    batteryCap.style.background = '#888';
    batteryCap.style.marginLeft = '2px';
    
    // Create battery percentage indicator
    const percentageIndicator = document.createElement('div');
    percentageIndicator.classList.add('battery-percentage');
    percentageIndicator.style.position = 'absolute';
    percentageIndicator.style.bottom = '3px';
    percentageIndicator.style.right = '5px';
    percentageIndicator.style.fontSize = '10px';
    percentageIndicator.style.fontWeight = 'bold';
    percentageIndicator.style.color = '#fff';
    percentageIndicator.style.textShadow = '0 0 2px #000';
    percentageIndicator.style.zIndex = '2';
    percentageIndicator.textContent = `${Math.round(batteryPercentage)}%`;
    
    // Add charging indicator if applicable
    if (isCharging) {
        const chargingIndicator = document.createElement('div');
        chargingIndicator.classList.add('charging-indicator');
        chargingIndicator.style.position = 'absolute';
        chargingIndicator.style.top = '3px';
        chargingIndicator.style.right = '5px';
        chargingIndicator.style.fontSize = '10px';
        chargingIndicator.style.color = '#3f3';
        chargingIndicator.style.zIndex = '2';
        chargingIndicator.innerHTML = '⚡';
        chargingIndicator.style.animation = 'pulse 1.5s infinite alternate';
        batteryBody.appendChild(chargingIndicator);
    }
    
    // Add styles for animations
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @keyframes pulse {
            0% { opacity: 0.4; }
            100% { opacity: 1; }
        }
        
        @keyframes flicker {
            0% { opacity: 0.6; }
            10% { opacity: 0.9; }
            20% { opacity: 0.5; }
            30% { opacity: 1; }
            40% { opacity: 0.7; }
            50% { opacity: 0.8; }
            60% { opacity: 1; }
            70% { opacity: 0.6; }
            80% { opacity: 0.9; }
            90% { opacity: 0.7; }
            100% { opacity: 1; }
        }
        
        @keyframes charge-flow {
            0% { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
        }
    `;
    document.head.appendChild(styleElement);
    
    // Choose between bars or solid display based on charging state
    if (isCharging) {
        // Create bars with dynamic spacing and styling
        const barWidth = (120 - 8) / maxBars - 2;
        
        for (let i = 0; i < maxBars; i++) {
            const bar = document.createElement('div');
            bar.classList.add('battery-bar');
            bar.style.width = `${barWidth}px`;
            bar.style.height = '25px';
            bar.style.borderRadius = '2px';
            bar.style.margin = '0 1px';
            
            // Define color based on battery level
            let barColor;
            if (batteryPercentage < 20) {
                barColor = 'rgba(255, 50, 50, 0.9)'; // Red for low battery
            } else if (batteryPercentage < 50) {
                barColor = 'rgba(255, 180, 0, 0.9)'; // Orange for medium battery
            } else {
                barColor = 'rgba(50, 220, 50, 0.9)'; // Green for high battery
            }
            
            if (i < filledBars) {
                bar.style.background = barColor;
                bar.style.boxShadow = `0 0 4px ${barColor}`;
                
                // Make the top-most filled bar flicker when charging
                if (i === filledBars - 1) {
                    bar.style.animation = 'flicker 1.2s infinite';
                    bar.style.background = `linear-gradient(45deg, ${barColor} 0%, rgba(255,255,255,0.8) 50%, ${barColor} 100%)`;
                    bar.style.backgroundSize = '200% 100%';
                    bar.style.boxShadow = `0 0 8px ${barColor}`;
                    
                    // Add additional animation for charging effect
                    if (isCharging) {
                        bar.style.animation = 'flicker 1.2s infinite, charge-flow 2s infinite linear';
                    }
                }
            } else {
                // Empty bars styling
                bar.style.background = 'rgba(80, 80, 80, 0.2)';
                bar.style.border = '1px solid rgba(100, 100, 100, 0.3)';
            }
            
            batteryBody.appendChild(bar);
        }
    } else {
        // Create solid battery indicator with gradient when not charging
        const solidLevel = document.createElement('div');
        solidLevel.classList.add('battery-level-solid');
        solidLevel.style.position = 'absolute';
        solidLevel.style.bottom = '2px';
        solidLevel.style.left = '2px';
        solidLevel.style.height = '27px';
        solidLevel.style.width = `${(batteryPercentage / 100) * (120 - 8)}px`;
        solidLevel.style.borderRadius = '2px';
        solidLevel.style.transition = 'width 0.5s ease-in-out';
        
        // Choose color based on battery level
        if (batteryPercentage < 20) {
            solidLevel.style.background = 'linear-gradient(to top, #f00, #f55)';
            solidLevel.style.boxShadow = '0 0 5px rgba(255, 0, 0, 0.7)';
        } else if (batteryPercentage < 50) {
            solidLevel.style.background = 'linear-gradient(to top, #f80, #fd5)';
            solidLevel.style.boxShadow = '0 0 5px rgba(255, 150, 0, 0.7)';
        } else {
            solidLevel.style.background = 'linear-gradient(to top, #0d0, #5f5)';
            solidLevel.style.boxShadow = '0 0 5px rgba(0, 255, 0, 0.7)';
        }
        
        batteryBody.appendChild(solidLevel);
    }
    
    // Add battery level indicator to body
    batteryBody.appendChild(percentageIndicator);
    
    // Append parts to battery container
    batteryContainer.appendChild(batteryBody);
    batteryContainer.appendChild(batteryCap);
    
    return batteryContainer;
}
// Helper function to create solar visualization
function createSolarVisualization(solarOutput) {
    // Configuration
    const maxOutput = 1000; // Maximum expected output in watts
    const intensity = solarOutput / maxOutput; // Normalized intensity (0-1)
    const elementsPerRow = 12; // Number of elements in each row
    
    // Create main container
    const solarContainer = document.createElement('div');
    solarContainer.classList.add('solar-visualization');
    solarContainer.style.display = 'flex';
    solarContainer.style.flexDirection = 'column';
    solarContainer.style.alignItems = 'center';
    solarContainer.style.padding = '10px';
    solarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    solarContainer.style.borderRadius = '10px';
    solarContainer.style.boxShadow = '0 0 15px rgba(255, 150, 0, 0.5)';
    
    // Create sun orb (center visualization)
    const sunOrb = document.createElement('div');
    sunOrb.classList.add('sun-orb');
    sunOrb.style.width = '60px';
    sunOrb.style.height = '60px';
    sunOrb.style.borderRadius = '50%';
    sunOrb.style.background = `radial-gradient(circle, rgba(255,180,0,1) 0%, rgba(255,100,0,1) 100%)`;
    sunOrb.style.boxShadow = `0 0 ${20 * intensity}px ${10 * intensity}px rgba(255, 150, 0, 0.7)`;
    sunOrb.style.position = 'relative';
    sunOrb.style.margin = '5px 0';
    sunOrb.style.animation = `pulse ${1.5 - intensity}s infinite alternate`;
    
    // Create two rows of energy elements
    for (let row = 0; row < 2; row++) {
        const rowContainer = document.createElement('div');
        rowContainer.classList.add('solar-row');
        rowContainer.style.display = 'flex';
        rowContainer.style.justifyContent = 'center';
        rowContainer.style.width = '100%';
        rowContainer.style.margin = row === 0 ? '0 0 5px 0' : '5px 0 0 0';
        
        // Determine number of active elements based on intensity
        const activeElements = Math.ceil(intensity * elementsPerRow);
        
        for (let i = 0; i < elementsPerRow; i++) {
            const element = document.createElement('div');
            element.classList.add('solar-element');
            
            // Base styling for all elements
            element.style.width = '10px';
            element.style.height = '4px';
            element.style.margin = '0 4px';
            element.style.borderRadius = '2px';
            
            // Determine if this element should be active
            const isActive = i < activeElements;
            
            if (isActive) {
                // Style active elements with gradient and glow
                element.style.background = 'linear-gradient(90deg, rgba(255,215,0,1) 0%, rgba(255,140,0,1) 100%)';
                element.style.boxShadow = '0 0 8px 2px rgba(255, 140, 0, 0.6)';
                
                // Add randomized flickering animation
                const flickerSpeed = 0.2 + (Math.random() * 0.8); // Random speed between 0.2s and 1s
                const flickerDelay = Math.random() * 2; // Random delay for more natural effect
                const flickerIntensity = 0.4 + (0.6 * intensity); // Higher intensity = less flickering
                
                element.style.animation = `flicker ${flickerSpeed}s ${flickerDelay}s infinite alternate`;
                element.style.opacity = flickerIntensity;
                
                // Add data attribute to use in the animation
                element.dataset.flickerMin = (0.4 + (0.3 * intensity)).toString();
                element.dataset.flickerMax = '1';
            } else {
                // Style inactive elements
                element.style.background = 'rgba(100, 100, 100, 0.3)';
                element.style.boxShadow = 'none';
            }
            
            rowContainer.appendChild(element);
        }
        
        // Determine where to place the row (above or below the sun orb)
        if (row === 0) {
            solarContainer.appendChild(rowContainer);
        } else {
            solarContainer.appendChild(sunOrb);
            solarContainer.appendChild(rowContainer);
        }
    }
    
    // Create energy level indicator
    const energyIndicator = document.createElement('div');
    energyIndicator.classList.add('energy-indicator');
    energyIndicator.style.fontSize = '12px';
    energyIndicator.style.color = '#FFA500';
    energyIndicator.style.marginTop = '8px';
    energyIndicator.style.fontFamily = 'monospace';
    energyIndicator.style.letterSpacing = '1px';
    energyIndicator.style.textShadow = '0 0 5px rgba(255, 165, 0, 0.7)';
    energyIndicator.textContent = `⚡ ${solarOutput}W`;
    
    solarContainer.appendChild(energyIndicator);
    
    // Add style for animations
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @keyframes flicker {
            0% {
                opacity: var(--min-opacity, 0.4);
            }
            100% {
                opacity: var(--max-opacity, 1);
            }
        }
        
        @keyframes pulse {
            0% {
                transform: scale(1);
                box-shadow: 0 0 ${10 * intensity}px ${5 * intensity}px rgba(255, 150, 0, 0.7);
            }
            100% {
                transform: scale(1.05);
                box-shadow: 0 0 ${20 * intensity}px ${10 * intensity}px rgba(255, 150, 0, 0.9);
            }
        }
        
        .solar-element {
            transition: background 0.3s ease;
            --min-opacity: attr(data-flicker-min);
            --max-opacity: attr(data-flicker-max);
        }
        
        .solar-visualization {
            transition: box-shadow 0.5s ease;
        }
    `;
    
    document.head.appendChild(styleElement);
    
    // Add hot spots to the sun based on intensity
    const numHotSpots = Math.floor(intensity * 8); // Up to 8 hot spots at max intensity
    
    for (let i = 0; i < numHotSpots; i++) {
        const hotSpot = document.createElement('div');
        hotSpot.classList.add('hot-spot');
        
        // Random position within the sun
        const angle = Math.random() * 360;
        const distance = Math.random() * 20; // Distance from center (px)
        
        hotSpot.style.position = 'absolute';
        hotSpot.style.width = '6px';
        hotSpot.style.height = '6px';
        hotSpot.style.borderRadius = '50%';
        hotSpot.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        hotSpot.style.boxShadow = '0 0 4px 2px rgba(255, 255, 255, 0.6)';
        hotSpot.style.left = `calc(50% + ${Math.cos(angle) * distance}px)`;
        hotSpot.style.top = `calc(50% + ${Math.sin(angle) * distance}px)`;
        hotSpot.style.transform = 'translate(-50%, -50%)';
        
        // Add pulsing animation to hot spots
        const pulseSpeed = 0.5 + (Math.random() * 1.5);
        hotSpot.style.animation = `hotSpotPulse ${pulseSpeed}s infinite alternate`;
        
        sunOrb.appendChild(hotSpot);
    }
    
    // Add additional animation for hot spots
    styleElement.textContent += `
        @keyframes hotSpotPulse {
            0% {
                opacity: 0.4;
                transform: translate(-50%, -50%) scale(0.8);
            }
            100% {
                opacity: 0.9;
                transform: translate(-50%, -50%) scale(1.2);
            }
        }
    `;
    
    return solarContainer;
}

socket.on('database_update', (data) => {
    console.log('New data received via socket:', data);
    
    // Check that the data is valid and contains expected properties
    if (data && !data.error) {
        // Update the UI using the same function the route handler uses
        updateUIWithData(data);
    } else {
        // Display error message if there's an issue with the data
        displayError(data.error || "Error in received data");
    }
});
    
    

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const deviceIcons = {
        'tv': 'fa-tv',
        'sound_system': 'fa-volume-high',
        'kitchen_light': 'fa-lightbulb',
        'dining_light': 'fa-lightbulb',
        'bed_light': 'fa-lightbulb',
        'security_light': 'fa-shield',
        'default': 'fa-plug'
    };

    // Format device name for display
    function formatDeviceName(name) {
        return name.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Handle log updates
    socket.on('log_update', (data) => {
        console.log("Received updated logs:", data);
        const logContainer = document.getElementById('log-container');
        logContainer.innerHTML = ''; // Clear existing logs
        
        data.logs.forEach(log => {
            const changes = log.changes.split('\n');
            
            changes.forEach(change => {
                // Parse the change
                const match = change.match(/(.+) turned (ON|OFF)/);
                if (!match) return;
                
                const deviceName = match[1];
                const status = match[2];
                const isOn = status === 'ON';
                
                // Create log entry
                const logEntry = document.createElement('div');
                logEntry.className = `log-entry ${isOn ? 'log-on' : 'log-off'}`;
                
                // Create log icon
                const logIcon = document.createElement('div');
                logIcon.className = 'log-icon';
                
                const iconElement = document.createElement('i');
                const iconClass = deviceIcons[deviceName] || deviceIcons.default;
                iconElement.className = `fas ${iconClass}`;
                logIcon.appendChild(iconElement);
                
                // Create log content
                const logContent = document.createElement('div');
                logContent.className = 'log-content';
                
                const logDevice = document.createElement('div');
                logDevice.className = 'log-device';
                logDevice.textContent = formatDeviceName(deviceName);
                
                const logStatus = document.createElement('span');
                logStatus.className = `log-status ${isOn ? 'status-on' : 'status-off'}`;
                logStatus.textContent = status;
                logDevice.appendChild(logStatus);
                
                const logTime = document.createElement('div');
                logTime.className = 'log-time';
                
                // Format the timestamp
                const timestamp = new Date(log.timestamp);
                const now = new Date();
                const isToday = timestamp.toDateString() === now.toDateString();
                
                logTime.textContent = isToday ? 
                    `Today at ${timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
                    timestamp.toLocaleString();
                
                logContent.appendChild(logDevice);
                logContent.appendChild(logTime);
                
                logEntry.appendChild(logIcon);
                logEntry.appendChild(logContent);
                
                logContainer.appendChild(logEntry);
            });
        });
    });
    
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



    let chart; // Global chart variable
    let cachedData = []; // Store previously fetched data


    socket.on('battery_solar_update', (data) => {
        console.log("Received real-time data:", data); // Debugging: Log received data

        if (!cachedData.length) {
            cachedData = data.data; // Store initial dataset
        } else {
            // Append only new data points
            const lastTimestamp = new Date(cachedData[cachedData.length - 1].timestamp);
            const newData = data.data.filter(entry => new Date(entry.timestamp) > lastTimestamp);
            cachedData.push(...newData);
        }

        updateGraph(); // Update the graph with new data
    });

    function createGraph() {
        console.log("Initializing the graph...");
        const ctx = document.getElementById('solarBatteryChart').getContext('2d');
        if (!ctx) {
            console.error("Error: Canvas element not found!");
            return;
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: cachedData.map(entry => new Date(entry.timestamp).toLocaleTimeString()),
                datasets: [{
                        label: 'Battery Level (%)',
                        data: cachedData.map(entry => entry.battery_level),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.3)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 1,
                        borderWidth: 1,
                        pointBackgroundColor: '#2980b9'
                    },
                    {
                        label: 'Solar Output (W)',
                        data: cachedData.map(entry => entry.solar_output),
                        borderColor: '#e67e22',
                        backgroundColor: 'rgba(230, 126, 34, 0.3)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 1,
                        borderWidth: 1,
                        pointBackgroundColor: '#d35400'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500,
                    easing: 'easeOutQuart'
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            color: '#333'
                        },
                        grid: {
                            color: 'rgba(200,200,200,0.3)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Value',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            color: '#333'
                        },
                        grid: {
                            color: 'rgba(200,200,200,0.2)'
                        },
                        ticks: {
                            stepSize: 100,
                            beginAtZero: true
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: context => `${context.dataset.label}: ${context.parsed.y}`
                        }
                    }
                }
            }
        });
        console.log("Graph initialized successfully.");
    }

    /**
     * Update the graph with new cachedData.
     */
    function updateGraph() {
        console.log("Updating graph with new data...");
        if (!chart) {
            console.warn("Graph not initialized yet. Creating it now...");
            createGraph();
        } else {
            chart.data.labels = cachedData.map(entry => new Date(entry.timestamp).toLocaleTimeString());
            chart.data.datasets[0].data = cachedData.map(entry => entry.battery_level);
            chart.data.datasets[1].data = cachedData.map(entry => entry.solar_output);
            chart.update();
        }
    }

    // Function to dynamically update battery and solar UI
    function applyDynamicStyles(data) {
        const batteryValue = document.querySelector('.battery-value');
        const solarValue = document.querySelector('.solar-value');

        const batterySection = document.querySelector('.battery-section');
        const solarSection = document.querySelector('.solar-section');

        const batteryIcon = document.querySelector('.battery-icon');
        const solarIcon = document.querySelector('.solar-icon');

        // Update Battery Color & Icon
        if (data.battery_level < 20) {
            batterySection.style.background = "linear-gradient(135deg, #ff4d4d, #ff9999)";
            batteryIcon.innerHTML = "⚠️"; // Warning sign
        } else {
            batterySection.style.background = "linear-gradient(135deg, #32a852, #62d96b)";
            batteryIcon.innerHTML = "🔋"; // Battery icon
        }

        // Update Solar Color & Icon
        if (data.solar_output > 0) {
            solarSection.style.background = "linear-gradient(135deg, #ffd700, #ff8c00)";
            solarIcon.innerHTML = "☀️"; // Sun icon
        } else {
            solarSection.style.background = "linear-gradient(135deg, #222, #444)";
            solarIcon.innerHTML = "🌙✨"; // Moon & stars icon
        }

        // Apply Growing Effect
        batteryValue.classList.add("grow-effect");
        solarValue.classList.add("grow-effect");

        setTimeout(() => {
            batteryValue.classList.remove("grow-effect");
            solarValue.classList.remove("grow-effect");
        }, 500);
    }

    function callSaveSimulatedData() {
        setInterval(() => {
            fetch('http://127.0.0.1:8500/sems_in/save_simulated_data')
                .then(response => {
                    if (!response.ok) {
                        console.error(`Error: ${response.status} - ${response.statusText}`);
                    } else {
                        console.log('Data saved successfully');
                    }
                })
                .catch(error => {
                    console.error('Fetch error:', error);
                });
        }, 3000);
    }
   callSaveSimulatedData();

   function updateUsageContainer() {
    if (!aggregatedConsumptionData) {
        console.warn("No aggregated consumption data available yet.");
        return;
    }
    
    const usageContainer = document.getElementById('usage-container');
    usageContainer.innerHTML = ''; // Clear previous data
    
    // Find the highest energy consumption for scaling
    const maxConsumption = Math.max(...aggregatedConsumptionData.map(device => device.energy_consumed));
    
    // Get the total consumption for percentage calculation
    const totalConsumption = aggregatedConsumptionData.reduce((sum, device) => sum + device.energy_consumed, 0);
    
    aggregatedConsumptionData.forEach((device, index) => {
        const deviceEntry = document.createElement('div');
        deviceEntry.className = 'usage-entry';
        
        // Add ranking badge
        const rankBadge = document.createElement('div');
        let rankClass = 'rank-other';
        if (index === 0) rankClass = 'rank-1';
        else if (index === 1) rankClass = 'rank-2';
        else if (index === 2) rankClass = 'rank-3';
        
        rankBadge.className = `usage-rank ${rankClass}`;
        rankBadge.textContent = index + 1;
        deviceEntry.appendChild(rankBadge);
        
        // Create content container
        const usageContent = document.createElement('div');
        usageContent.className = 'usage-content';
        
        // Create device icon
        const deviceIcon = document.createElement('div');
        deviceIcon.className = 'device-icon';
        
        // Set device-specific icon color
        if (index === 0) deviceIcon.style.backgroundColor = '#ff9500';
        else if (index === 1) deviceIcon.style.backgroundColor = '#a0a0a0';
        else if (index === 2) deviceIcon.style.backgroundColor = '#cd7f32';
        
        const iconElement = document.createElement('i');
        const iconClass = deviceIcons[device.device_name] || deviceIcons.default;
        iconElement.className = `fas ${iconClass}`;
        deviceIcon.appendChild(iconElement);
        
        // Create device details container
        const deviceDetails = document.createElement('div');
        deviceDetails.className = 'device-details';
        
        // Device name
        const deviceName = document.createElement('div');
        deviceName.className = 'device-name';
        deviceName.textContent = formatDeviceName(device.device_name);
        
        // Energy value
        const energyUsed = document.createElement('div');
        energyUsed.className = 'energy-used';
        energyUsed.textContent = `${device.energy_consumed.toFixed(4)} kWh`;
        
        // Add all to device details
        deviceDetails.appendChild(deviceName);
        deviceDetails.appendChild(energyUsed);
        
        // Add icon and details to content
        usageContent.appendChild(deviceIcon);
        usageContent.appendChild(deviceDetails);
        
        // Create usage bar container
        const barContainer = document.createElement('div');
        barContainer.className = 'usage-bar-container';
        
        // Create usage bar
        const bar = document.createElement('div');
        bar.className = 'usage-bar';
        
        // Calculate percentage relative to max consumption
        const percentage = (device.energy_consumed / maxConsumption) * 100;
        bar.style.width = `${percentage}%`;
        
        // Set bar color based on rank
        if (index === 0) bar.style.backgroundColor = '#ff9500';
        else if (index === 1) bar.style.backgroundColor = '#a0a0a0'; 
        else if (index === 2) bar.style.backgroundColor = '#cd7f32';
        
        barContainer.appendChild(bar);
        
        // Add percentage text
        const percentageText = document.createElement('div');
        percentageText.className = 'usage-percentage';
        const usagePercentage = (device.energy_consumed / totalConsumption * 100).toFixed(1);
        percentageText.textContent = `${usagePercentage}% of total consumption`;
        
        // Add all elements to the device entry
        deviceEntry.appendChild(usageContent);
        deviceEntry.appendChild(barContainer);
        deviceEntry.appendChild(percentageText);
        
        usageContainer.appendChild(deviceEntry);
    });
}



// Wrapper function for toggle functionality that shows/hides spinner
function toggleDeviceWithSpinner(device) {
    // Show spinner
    const spinner = document.getElementById(`spinner-${device}`);
    if (spinner) spinner.style.display = 'flex';
    
    // Disable toggle button
    const toggleButton = document.getElementById(`toggle-${device}`);
    if (toggleButton) toggleButton.disabled = true;
    
    // Call your existing toggle function which handles backend communication
    toggleDevice(device);
    
    // Set up an observer to watch for status changes
    const statusElement = document.querySelector(`.light-card[data-device="${device}"] .status-text`);
    if (statusElement) {
        const observer = new MutationObserver((mutations) => {
            // State has changed, hide spinner and re-enable button
            spinner.style.display = 'none';
            toggleButton.disabled = false;
            observer.disconnect();
        });
        
        observer.observe(statusElement, { childList: true });
        
        // Failsafe: If after 10 seconds the state hasn't changed, reset UI
        setTimeout(() => {
            if (spinner.style.display !== 'none') {
                spinner.style.display = 'none';
                toggleButton.disabled = false;
                observer.disconnect();
            }
        }, 10000);
    }
}

function renderKitchenLight(device, details, data) {
    const isOn = details.state === 'ON';
    const card = document.createElement('div');
    card.className = `light-card kitchen-light`;
    card.setAttribute('data-device', device);
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    card.innerHTML = `
        <div class="power-indicator ${isOn ? 'on' : 'off'}"></div>
        <h3>Kitchen Light</h3>
        <div class="setting-btn-container">
            <button class="settings-button" onclick="showSettings('${device}')">⚙️</button>
        </div>
        <div class="device-status">
            Status: <span class="status-text">${isOn ? 'ON' : 'OFF'}</span>
        </div>
        <div class="consumption">
            Energy: <span class="consumption-value">${consumptionDisplay} kWh</span>
        </div>
        <div class="controls-panel">
            <div class="control-group">
                <label for="kitchen-brightness">Brightness</label>
                <input type="range" id="kitchen-brightness" min="1" max="100" value="${details.brightness || 75}" ${!isOn ? 'disabled' : ''} 
                       onchange="updateDeviceSetting('${device}', 'brightness', this.value)">
                <span class="brightness-value">${details.brightness || 75}%</span>
            </div>
        </div>
        <div class="spinner-container" id="spinner-${device}" style="display: none;">
            <div class="spinner"></div>
        </div>
        <button class="toggle-button" id="toggle-${device}" onclick="toggleDeviceWithSpinner('${device}')">${isOn ? 'Turn Off' : 'Turn On'}</button>
    `;
    
    // Add event listeners after the element is created
    setTimeout(() => {
        const brightnessSlider = card.querySelector('#kitchen-brightness');
        if (brightnessSlider) {
            brightnessSlider.addEventListener('input', function() {
                card.querySelector('.brightness-value').textContent = this.value + '%';
            });
        }
    }, 0);
    
    return card;
}

// Render a dining light with color temperature control
function renderDiningLight(device, details, data) {
    const isOn = details.state === 'ON';
    const card = document.createElement('div');
    card.className = `light-card dining-light`;
    card.setAttribute('data-device', device);
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    // Get color temperature value or default to neutral
    const colorTemp = details.colorTemp || 'neutral';
    
    card.innerHTML = `
        <div class="power-indicator ${isOn ? 'on' : 'off'}"></div>
        <h3>Dining Light</h3>
        <div class="setting-btn-container">
            <button class="settings-button" onclick="showSettings('${device}')">⚙️</button>
        </div>
        <div class="device-status">
            Status: <span class="status-text">${isOn ? 'ON' : 'OFF'}</span>
        </div>
        <div class="consumption">
            Energy: <span class="consumption-value">${consumptionDisplay} kWh</span>
        </div>
        <div class="controls-panel">
            <div class="control-group">
                <label for="dining-color-temp">Color Temperature</label>
                <select id="dining-color-temp" ${!isOn ? 'disabled' : ''} 
                        onchange="updateDeviceSetting('${device}', 'colorTemp', this.value)">
                    <option value="warm" ${colorTemp === 'warm' ? 'selected' : ''}>Warm</option>
                    <option value="neutral" ${colorTemp === 'neutral' ? 'selected' : ''}>Neutral</option>
                    <option value="cool" ${colorTemp === 'cool' ? 'selected' : ''}>Cool</option>
                </select>
            </div>
        </div>
        <div class="spinner-container" id="spinner-${device}" style="display: none;">
            <div class="spinner"></div>
        </div>
        <button class="toggle-button" id="toggle-${device}" onclick="toggleDeviceWithSpinner('${device}')">${isOn ? 'Turn Off' : 'Turn On'}</button>
    `;
    
    return card;
}

// Render a bedroom light with sleep mode
function renderBedLight(device, details, data) {
    const isOn = details.state === 'ON';
    const card = document.createElement('div');
    card.className = `light-card bed-light`;
    card.setAttribute('data-device', device);
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    // Get sleep mode settings or use defaults
    const sleepMode = details.sleepMode || false;
    const sleepTimer = details.sleepTimer || 30;
    
    card.innerHTML = `
        <div class="power-indicator ${isOn ? 'on' : 'off'}"></div>
        <h3>Bedroom Light</h3>
        <div class="device-status">
            Status: <span class="status-text">${isOn ? 'ON' : 'OFF'}</span>
        </div>
        <div class="consumption">
            Energy: <span class="consumption-value">${consumptionDisplay} kWh</span>
        </div>
        <div class="controls-panel">
            <div class="control-group">
                <label>
                    <input type="checkbox" id="sleep-mode-toggle" ${!isOn ? 'disabled' : ''} 
                           ${sleepMode ? 'checked' : ''} 
                           onchange="updateDeviceSetting('${device}', 'sleepMode', this.checked)">
                    Sleep Mode
                </label>
            </div>
            <div class="control-group">
                <label for="sleep-timer">Auto-off Timer (min)</label>
                <input type="number" id="sleep-timer" min="5" max="120" value="${sleepTimer}" 
                       ${!isOn ? 'disabled' : ''} 
                       onchange="updateDeviceSetting('${device}', 'sleepTimer', this.value)">
            </div>
        </div>
        <div class="spinner-container" id="spinner-${device}" style="display: none;">
            <div class="spinner"></div>
        </div>
        <button class="toggle-button" id="toggle-${device}" onclick="toggleDeviceWithSpinner('${device}')">${isOn ? 'Turn Off' : 'Turn On'}</button>
    `;
    
    return card;
}

// Render a security light with motion detection settings
function renderSecurityLight(device, details, data) {
    const isOn = details.state === 'ON';
    const card = document.createElement('div');
    card.className = `light-card security-light`;
    card.setAttribute('data-device', device);
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    // Get security settings or use defaults
    const motionDetection = details.motionDetection !== undefined ? details.motionDetection : true;
    const sensitivity = details.sensitivity || 'medium';
    const autoSchedule = details.autoSchedule !== undefined ? details.autoSchedule : false;
    
    card.innerHTML = `
        <div class="power-indicator ${isOn ? 'security-on' : 'off'}"></div>
        <h3>Security Light</h3>
        <div class="device-status">
            Status: <span class="status-text">${isOn ? 'ON' : 'OFF'}</span>
        </div>
        <div class="consumption">
            Energy: <span class="consumption-value">${consumptionDisplay} kWh</span>
        </div>
        <div class="controls-panel">
            <div class="control-group">
                <label>
                    <input type="checkbox" id="motion-detection" ${!isOn ? 'disabled' : ''} 
                           ${motionDetection ? 'checked' : ''} 
                           onchange="updateDeviceSetting('${device}', 'motionDetection', this.checked)">
                    Motion Detection
                </label>
            </div>
            <div class="control-group">
                <label for="sensitivity">Sensitivity</label>
                <select id="sensitivity" ${!isOn ? 'disabled' : ''} 
                        onchange="updateDeviceSetting('${device}', 'sensitivity', this.value)">
                    <option value="low" ${sensitivity === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${sensitivity === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${sensitivity === 'high' ? 'selected' : ''}>High</option>
                </select>
            </div>
            <div class="control-group">
                <label>
                    <input type="checkbox" id="auto-schedule" ${!isOn ? 'disabled' : ''} 
                           ${autoSchedule ? 'checked' : ''} 
                           onchange="updateDeviceSetting('${device}', 'autoSchedule', this.checked)">
                    Auto Schedule (6pm-6am)
                </label>
            </div>
        </div>
        <div class="spinner-container" id="spinner-${device}" style="display: none;">
            <div class="spinner"></div>
        </div>
        <button class="toggle-button" id="toggle-${device}" onclick="toggleDeviceWithSpinner('${device}')">${isOn ? 'Turn Off' : 'Turn On'}</button>
    `;
    
    return card;
}

// Generic light renderer for any other lights
function renderGenericLight(device, details, data) {
    const isOn = details.state === 'ON';
    const card = document.createElement('div');
    card.className = `light-card generic-light`;
    card.setAttribute('data-device', device);
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    // Format the device name for display
    const displayName = device.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    card.innerHTML = `
        <div class="power-indicator ${isOn ? 'on' : 'off'}"></div>
        <h3>${displayName}</h3>
        <div class="device-status">
            Status: <span class="status-text">${isOn ? 'ON' : 'OFF'}</span>
        </div>
        <div class="consumption">
            Energy: <span class="consumption-value">${consumptionDisplay} kWh</span>
        </div>
        <div class="spinner-container" id="spinner-${device}" style="display: none;">
            <div class="spinner"></div>
        </div>
        <button class="toggle-button" id="toggle-${device}" onclick="toggleDeviceWithSpinner('${device}')">${isOn ? 'Turn Off' : 'Turn On'}</button>
    `;
    
    return card;
}



// Function to update an existing light card when data changes
function updateLightCard(device, details, data) {
    const card = domReferences.deviceCards[device];
    if (!card) return;
    
    const isOn = details.state === 'ON';
    
    // Format consumption value
    const consumption = details.consumption;
    let consumptionDisplay;
    if (consumption < 0.01 && consumption > 0) {
        consumptionDisplay = consumption.toExponential(2);
    } else {
        consumptionDisplay = (consumption || 0).toFixed(2);
    }
    
    // Update common elements
    const powerIndicator = card.querySelector('.power-indicator');
    if (powerIndicator) {
        powerIndicator.className = `power-indicator ${device === 'security_light' && isOn ? 'security-on' : (isOn ? 'on' : 'off')}`;
    }
    
    const statusText = card.querySelector('.status-text');
    if (statusText) {
        statusText.textContent = isOn ? 'ON' : 'OFF';
    }
    
    const consumptionElement = card.querySelector('.consumption-value');
    if (consumptionElement) {
        consumptionElement.textContent = `${consumptionDisplay} kWh`;
    }
    
    const toggleButton = card.querySelector('.toggle-button');
    if (toggleButton) {
        toggleButton.textContent = isOn ? 'Turn Off' : 'Turn On';
    }
    
    // Update device-specific controls
    if (device === 'kitchen_light') {
        const brightnessSlider = card.querySelector('#kitchen-brightness');
        if (brightnessSlider) {
            brightnessSlider.disabled = !isOn;
            if (details.brightness !== undefined) {
                brightnessSlider.value = details.brightness;
                const brightnessValue = card.querySelector('.brightness-value');
                if (brightnessValue) {
                    brightnessValue.textContent = `${details.brightness}%`;
                }
            }
        }
    } else if (device === 'dining_light') {
        const colorTempSelect = card.querySelector('#dining-color-temp');
        if (colorTempSelect) {
            colorTempSelect.disabled = !isOn;
            if (details.colorTemp) {
                colorTempSelect.value = details.colorTemp;
            }
        }
    } else if (device === 'bed_light') {
        const sleepModeToggle = card.querySelector('#sleep-mode-toggle');
        if (sleepModeToggle) {
            sleepModeToggle.disabled = !isOn;
            if (details.sleepMode !== undefined) {
                sleepModeToggle.checked = details.sleepMode;
            }
        }
        
        const sleepTimer = card.querySelector('#sleep-timer');
        if (sleepTimer) {
            sleepTimer.disabled = !isOn;
            if (details.sleepTimer !== undefined) {
                sleepTimer.value = details.sleepTimer;
            }
        }
    } else if (device === 'security_light') {
        const motionDetection = card.querySelector('#motion-detection');
        if (motionDetection) {
            motionDetection.disabled = !isOn;
            if (details.motionDetection !== undefined) {
                motionDetection.checked = details.motionDetection;
            }
        }
        
        const sensitivity = card.querySelector('#sensitivity');
        if (sensitivity) {
            sensitivity.disabled = !isOn;
            if (details.sensitivity) {
                sensitivity.value = details.sensitivity;
            }
        }
        
        const autoSchedule = card.querySelector('#auto-schedule');
        if (autoSchedule) {
            autoSchedule.disabled = !isOn;
            if (details.autoSchedule !== undefined) {
                autoSchedule.checked = details.autoSchedule;
            }
        }
    }
}

// Device settings modal handling
function showSettings(device) {
    // Create a modal if it doesn't exist already
    let modal = document.getElementById('device-settings-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'device-settings-modal';
        modal.className = 'settings-modal';
        document.body.appendChild(modal);
    }
    
    // Get device details
    const details = window.latestData?.devices[device] || {};
    const isOn = details.state === 'ON';
    
    // Format the device name for display
    const displayName = device.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Populate modal with device-specific settings
    let settingsHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${displayName} Settings</h2>
                <span class="close-modal" onclick="closeSettingsModal()">&times;</span>
            </div>
            <div class="modal-body">
    `;
    
    // Common settings for all lights
    settingsHTML += `
        <div class="setting-group">
            <h3>Basic Settings</h3>
            <div class="setting-item">
                <label for="device-name">Device Name:</label>
                <input type="text" id="device-name" value="${displayName}" 
                       onchange="updateDeviceSetting('${device}', 'displayName', this.value)">
            </div>
            <div class="setting-item">
                <label for="auto-off-enabled">
                    <input type="checkbox" id="auto-off-enabled" ${details.autoOffEnabled ? 'checked' : ''} 
                           onchange="updateDeviceSetting('${device}', 'autoOffEnabled', this.checked)">
                    Enable Auto-Off
                </label>
            </div>
            <div class="setting-item">
                <label for="auto-off-time">Auto-Off After (minutes):</label>
                <input type="number" id="auto-off-time" min="1" max="1440" value="${details.autoOffTime || 60}" 
                       ${!details.autoOffEnabled ? 'disabled' : ''} 
                       onchange="updateDeviceSetting('${device}', 'autoOffTime', this.value)">
            </div>
        </div>
    `;
    
    // Device-specific settings
    if (device === 'kitchen_light') {
        settingsHTML += `
            <div class="setting-group">
                <h3>Kitchen Light Settings</h3>
                <div class="setting-item">
                    <label for="default-brightness">Default Brightness:</label>
                    <input type="range" id="default-brightness" min="1" max="100" value="${details.defaultBrightness || 75}" 
                           onchange="updateDeviceSetting('${device}', 'defaultBrightness', this.value)">
                    <span id="default-brightness-value">${details.defaultBrightness || 75}%</span>
                </div>
                <div class="setting-item">
                    <label for="kitchen-mode">
                        <input type="checkbox" id="kitchen-mode" ${details.cookingMode ? 'checked' : ''} 
                               onchange="updateDeviceSetting('${device}', 'cookingMode', this.checked)">
                        Cooking Mode (Extra Brightness)
                    </label>
                </div>
            </div>
        `;
    } else if (device === 'dining_light') {
        settingsHTML += `
            <div class="setting-group">
                <h3>Dining Light Settings</h3>
                <div class="setting-item">
                    <label for="default-color-temp">Default Color Temperature:</label>
                    <select id="default-color-temp" 
                            onchange="updateDeviceSetting('${device}', 'defaultColorTemp', this.value)">
                        <option value="warm" ${(details.defaultColorTemp || 'neutral') === 'warm' ? 'selected' : ''}>Warm</option>
                        <option value="neutral" ${(details.defaultColorTemp || 'neutral') === 'neutral' ? 'selected' : ''}>Neutral</option>
                        <option value="cool" ${(details.defaultColorTemp || 'neutral') === 'cool' ? 'selected' : ''}>Cool</option>
                    </select>
                </div>
                <div class="setting-item">
                    <label for="dinner-mode">
                        <input type="checkbox" id="dinner-mode" ${details.dinnerMode ? 'checked' : ''} 
                               onchange="updateDeviceSetting('${device}', 'dinnerMode', this.checked)">
                        Dinner Mode (Dimmed Warm Light)
                    </label>
                </div>
            </div>
        `;
    }
    
    // Common footer with save/cancel buttons
    settingsHTML += `
            </div>
            <div class="modal-footer">
                <button onclick="saveDeviceSettings('${device}')">Save</button>
                <button onclick="closeSettingsModal()">Cancel</button>
            </div>
        </div>
    `;
    
    modal.innerHTML = settingsHTML;
    modal.style.display = 'flex';
    
    // Add event listener for brightness display
    setTimeout(() => {
        const defaultBrightness = document.getElementById('default-brightness');
        const defaultBrightnessValue = document.getElementById('default-brightness-value');
        if (defaultBrightness && defaultBrightnessValue) {
            defaultBrightness.addEventListener('input', function() {
                defaultBrightnessValue.textContent = this.value + '%';
            });
        }
        
        // Auto-off time enable/disable based on checkbox
        const autoOffEnabled = document.getElementById('auto-off-enabled');
        const autoOffTime = document.getElementById('auto-off-time');
        if (autoOffEnabled && autoOffTime) {
            autoOffEnabled.addEventListener('change', function() {
                autoOffTime.disabled = !this.checked;
            });
        }
    }, 0);
}

// Close the settings modal
function closeSettingsModal() {
    const modal = document.getElementById('device-settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Save device settings
function saveDeviceSettings(device) {
    // In a real application, this would save to a server
    // For now, we'll just update our local data and close the modal
    console.log(`Saving settings for ${device}`);
    closeSettingsModal();
    
    // Optionally refresh the UI
    if (window.latestData) {
        updateUIWithData(window.latestData);
    }
}

// Update a single device setting
function updateDeviceSetting(device, setting, value) {
    // In a real application, this would update the setting on the server
    console.log(`Updating ${device} - ${setting}: ${value}`);
    
    // Update our local data if we have it
    if (window.latestData && window.latestData.devices[device]) {
        window.latestData.devices[device][setting] = value;
    }
}

/**
 * Toggles a device on or off by communicating with the backend proxy
 * @param {string} deviceName - The name of the device to toggle (e.g., "kitchen_light")
 */
function toggleDevice(deviceName) {
    // Get the current device state to determine the new state
    const deviceElement = document.querySelector(`.${deviceName.replace('_', '-')}`);
    const currentState = deviceElement.querySelector('.status-text').textContent;
    const newState = currentState === 'ON' ? 'OFF' : 'ON';
    
    // Prepare the data for the control request
    const controlData = {
        device_name: deviceName,
        control_action: newState
        // device_ID will be added by the proxy from the session
    };
    
    // Send the control request to our proxy endpoint
    fetch('/sems_in/proxy_device_control', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(controlData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Failed to toggle device');
            });
        }
        return response.json();
    })
    .then(result => {
        console.log(`Device ${deviceName} toggled:`, result);
        // The UI will be updated on the next data refresh cycle
    })
    .catch(error => console.error('Error toggling device:', error));
}
