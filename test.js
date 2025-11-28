// Initial DOM setup function - call this once when the page loads
function initializeDashboard() {
    const container = document.getElementById('data-container');

    // Create main dashboard header
    const maindevices = document.createElement('section');
    maindevices.innerHTML = `
      <h1 style="display: flex; justify-content: space-between; align-items: center;">
        <span>Dashboard</span>
        <span id="timestamp-display" style="font-size: 0.8rem; color: gray;"></span>
      </h1>
    `;

    // Create devices container
    const devices = document.createElement('div');
    devices.classList.add('maindevices-styles');

    // Create battery section
    const batterySection = document.createElement('section');
    batterySection.className = 'data-section battery-section';
    batterySection.id = 'battery-section';

    // Create solar section
    const solarSection = document.createElement('section');
    solarSection.className = 'data-section solar-section';
    solarSection.id = 'solar-section';

    // Add sections to devices container
    devices.appendChild(batterySection);
    devices.appendChild(solarSection);

    // Add devices to main container
    maindevices.append(devices);
    container.appendChild(maindevices);

    // Create lights section
    const lightsSection = document.createElement('section');
    lightsSection.classList.add('devices-section');
    lightsSection.innerHTML = '<h2>Lights</h2>';
    lightsSection.id = 'lights-section';

    // Create lights grid
    const lightsGrid = document.createElement('div');
    lightsGrid.classList.add('devices-grid');
    lightsGrid.id = 'lights-grid';
    lightsSection.appendChild(lightsGrid);

    // Create non-lights section
    const nonLightsSection = document.createElement('section');
    nonLightsSection.classList.add('non-lights-section');
    nonLightsSection.innerHTML = '<h2>Other Devices</h2>';
    nonLightsSection.id = 'non-lights-section';

    // Create non-lights table
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
      <tbody id="non-lights-tbody"></tbody>
    `;
    nonLightsSection.appendChild(table);

    // Add sections to container
    container.appendChild(lightsSection);
    container.appendChild(nonLightsSection);

    // Hide loading indicator and show navigation content
    document.getElementById("loading-state").classList.add("hidden");
    document.getElementById("nav-content").classList.remove("hidden");
}

// Socket event handler for database updates
socket.on(`database_update`, (data) => {
    console.log('new data has been received', data);

    // Display an error message if the data contains an error
    if (data.error) {
        const container = document.getElementById('data-container');
        container.innerHTML = `<p>Error: ${data.error}</p>`;
        return;
    }

    // Update timestamp
    document.getElementById('timestamp-display').textContent = `Data from: ${new Date(data.timestamp).toLocaleString()}`;

    // Update battery and solar sections (complete recreation as per requirements)
    updateBatterySection(data);
    updateSolarSection(data);

    // Update lights data without recreating DOM elements
    updateLightsData(data);

    // Update non-lights data without recreating DOM elements
    updateNonLightsData(data);

    // Apply dynamic styles if needed
    applyDynamicStyles(data);
});

// Function to update battery section
function updateBatterySection(data) {
    const batterySection = document.getElementById('battery-section');

    // Clear previous content
    batterySection.innerHTML = '';

    // Create wrapper and header
    const batteryContentWrapper = document.createElement('div');
    batteryContentWrapper.className = 'battery-content-wrapper';

    const batteryHeader = document.createElement('div');
    batteryHeader.className = 'battery-header';
    batteryHeader.innerHTML = '<h2>Battery Level</h2>';

    // Create battery info container
    const batteryInfoContainer = document.createElement('div');
    batteryInfoContainer.className = 'battery-info-container';

    // Create battery level row
    const batteryLevelRow = document.createElement('div');
    batteryLevelRow.className = 'battery-level-row';

    const batteryValue = Object.assign(document.createElement('p'), {
        className: 'battery-value',
        textContent: `${data.battery_level}%`
    });

    const batteryIcon = Object.assign(document.createElement('img'), {
        src: 'main/static/images/OIP.jpg',
        alt: '🔋',
        className: 'battery-icon',
        onerror() {
            this.replaceWith(Object.assign(document.createElement('span'), {
                textContent: '🔋',
                className: 'battery-icon-emoji'
            }));
        }
    });

    // Create battery visualization and safe mode button
    const batteryVis = createBatteryVisualization(data.battery_level, data.solar_output);

    const safeModeButton = Object.assign(document.createElement('button'), {
        className: 'safe-mode-button',
        textContent: 'Safe Mode',
        title: 'Enable safe mode to stop charging when battery is full'
    });

    // Assemble components
    batteryLevelRow.append(batteryValue, batteryIcon);
    batteryInfoContainer.append(batteryLevelRow, batteryVis, safeModeButton);
    batteryContentWrapper.append(batteryHeader, batteryInfoContainer);
    batterySection.appendChild(batteryContentWrapper);
}

// Function to update solar section
function updateSolarSection(data) {
    const solarSection = document.getElementById('solar-section');

    // Clear previous content
    solarSection.innerHTML = '';

    // Create solar content wrapper and header
    const solarContentWrapper = document.createElement('div');
    solarContentWrapper.className = 'solar-content-wrapper';

    const solarHeader = document.createElement('div');
    solarHeader.className = 'solar-header';
    solarHeader.innerHTML = '<h2>Solar Output</h2>';

    // Create solar info container
    const solarInfoContainer = document.createElement('div');
    solarInfoContainer.className = 'solar-info-container';

    // Create level row with wattage and icon
    const solarLevelRow = document.createElement('div');
    solarLevelRow.className = 'solar-level-row';

    const solarValue = document.createElement('p');
    solarValue.className = 'solar-value';
    solarValue.textContent = `${data.solar_output}W`;

    const solarIcon = document.createElement('img');
    solarIcon.src = '/assets/icons/solar-icon.svg';
    solarIcon.alt = '☀️';
    solarIcon.className = 'solar-icon';
    solarIcon.onerror = () => {
        solarIcon.replaceWith(Object.assign(document.createElement('span'), {
            textContent: '☀️',
            className: 'solar-icon-emoji'
        }));
    };

    // Create solar visualization and status
    const solarStatus = Object.assign(document.createElement('div'), {
        className: `solar-status ${data.solar_output > 0 ? 'active' : 'inactive'}`,
        textContent: data.solar_output > 0 ? 'Charging' : 'Not Charging'
    });

    // Assemble components
    solarLevelRow.append(solarValue, solarIcon);
    solarInfoContainer.append(solarLevelRow, createSolarVisualization(data.solar_output), solarStatus);
    solarContentWrapper.append(solarHeader, solarInfoContainer);
    solarSection.appendChild(solarContentWrapper);
}

// Function to initially set up lights grid (call once)
function setupLightsGrid(data) {
    const lightsGrid = document.getElementById('lights-grid');

    // Clear lights grid first
    lightsGrid.innerHTML = '';

    // Create light cards for each light device
    Object.entries(data.devices).forEach(([device, details]) => {
        if (device.includes('light')) {
            // Create card with unique ID for easy updates
            let lightCard;
            switch (device) {
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
                    lightCard = renderGenericLight(device, details, data);
            }

            // Set ID for the card for future updates
            lightCard.id = `card-${device}`;
            lightsGrid.appendChild(lightCard);
        }
    });
}

// Function to update lights data without recreating DOM
function updateLightsData(data) {
    // Check if lights grid exists
    const lightsGrid = document.getElementById('lights-grid');
    if (!lightsGrid) {
        // If grid doesn't exist yet, set it up
        setupLightsGrid(data);
        return;
    }

    // Update existing light cards or create new ones if needed
    Object.entries(data.devices).forEach(([device, details]) => {
        if (device.includes('light')) {
            const cardId = `card-${device}`;
            const existingCard = document.getElementById(cardId);

            if (existingCard) {
                // Update existing card data
                updateLightCardData(existingCard, device, details, data);
            } else {
                // Create new card if it doesn't exist
                let lightCard;
                switch (device) {
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
                        lightCard = renderGenericLight(device, details, data);
                }

                lightCard.id = cardId;
                lightsGrid.appendChild(lightCard);
            }
        }
    });

    // Remove cards for devices that no longer exist
    Array.from(lightsGrid.children).forEach(card => {
        const deviceId = card.id.replace('card-', '');
        if (!data.devices[deviceId]) {
            card.remove();
        }
    });
}

// Function to update data in an existing light card
function updateLightCardData(card, device, details, data) {
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
    const consumptionElement = card.querySelector('.consumption-value');
    if (consumptionElement) {
        consumptionElement.textContent = `${consumptionDisplay} kWh`;
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
    updateDeviceSpecificControls(card, device, isOn, details);
}

// Function to update device-specific controls based on device type
function updateDeviceSpecificControls(card, device, isOn, details) {
    switch (device) {
        case 'kitchen_light':
            // Update brightness controls
            const brightnessSlider = card.querySelector('#kitchen-brightness');
            if (brightnessSlider) {
                brightnessSlider.disabled = !isOn;
            }
            break;

        case 'dining_light':
            // Update color temperature controls
            const colorSelect = card.querySelector('#dining-color-temp');
            if (colorSelect) {
                colorSelect.disabled = !isOn;
            }
            break;

        case 'bed_light':
            // Update sleep mode controls
            const sleepModeToggle = card.querySelector('#sleep-mode-toggle');
            const sleepTimer = card.querySelector('#sleep-timer');
            if (sleepModeToggle && sleepTimer) {
                sleepModeToggle.disabled = !isOn;
                sleepTimer.disabled = !isOn || !sleepModeToggle.checked;
            }
            break;

        case 'security_light':
            // Update motion detection controls
            const motionDetection = card.querySelector('#motion-detection');
            const sensitivitySelect = card.querySelector('#sensitivity');
            const autoSchedule = card.querySelector('#auto-schedule');
            if (motionDetection && sensitivitySelect && autoSchedule) {
                motionDetection.disabled = !isOn;
                sensitivitySelect.disabled = !isOn || !motionDetection.checked;
                autoSchedule.disabled = !isOn;
            }
            break;
    }
}

// Function to set up non-lights table (call once)
function setupNonLightsTable(data) {
    const tableBody = document.getElementById('non-lights-tbody');

    // Clear table body first
    tableBody.innerHTML = '';

    // Add rows for each non-light device
    Object.entries(data.devices).forEach(([device, details]) => {
        if (!device.includes('light')) {
            const row = document.createElement('tr');
            row.id = `row-${device}`;

            // Format consumption value
            const consumption = details.consumption;
            let consumptionDisplay;
            if (consumption < 0.01 && consumption > 0) {
                consumptionDisplay = consumption.toExponential(2);
            } else {
                consumptionDisplay = (consumption || 0).toFixed(2);
            }

            row.innerHTML = `
          <td>${device.replace('_', ' ')}</td>
          <td class="device-state">${details.state}</td>
          <td class="device-consumption">${consumptionDisplay} kWh</td>
          <td><button onclick="toggleDevice('${device}')">Toggle</button></td>
        `;

            tableBody.appendChild(row);
        }
    });
}

// Function to update non-lights data without recreating DOM
function updateNonLightsData(data) {
    // Check if tbody exists
    const tableBody = document.getElementById('non-lights-tbody');
    if (!tableBody) {
        // If table doesn't exist yet, set it up
        setupNonLightsTable(data);
        return;
    }

    // Update existing rows or create new ones if needed
    Object.entries(data.devices).forEach(([device, details]) => {
        if (!device.includes('light')) {
            const rowId = `row-${device}`;
            const existingRow = document.getElementById(rowId);

            // Format consumption value
            const consumption = details.consumption;
            let consumptionDisplay;
            if (consumption < 0.01 && consumption > 0) {
                consumptionDisplay = consumption.toExponential(2);
            } else {
                consumptionDisplay = (consumption || 0).toFixed(2);
            }

            if (existingRow) {
                // Update existing row data
                const stateCell = existingRow.querySelector('.device-state');
                const consumptionCell = existingRow.querySelector('.device-consumption');

                if (stateCell) stateCell.textContent = details.state;
                if (consumptionCell) consumptionCell.textContent = `${consumptionDisplay} kWh`;
            } else {
                // Create new row if it doesn't exist
                const row = document.createElement('tr');
                row.id = rowId;
                row.innerHTML = `
            <td>${device.replace('_', ' ')}</td>
            <td class="device-state">${details.state}</td>
            <td class="device-consumption">${consumptionDisplay} kWh</td>
            <td><button onclick="toggleDevice('${device}')">Toggle</button></td>
          `;
                tableBody.appendChild(row);
            }
        }
    });

    // Remove rows for devices that no longer exist
    Array.from(tableBody.children).forEach(row => {
        const deviceId = row.id.replace('row-', '');
        if (!data.devices[deviceId]) {
            row.remove();
        }
    });
}

// Call this function when the page loads to set up the initial structure
document.addEventListener('DOMContentLoaded', function () {
    initializeDashboard();

    // Set up mock data listener for testing (remove in production)
    // mockDatabaseUpdates();
});

// Keep the existing light rendering functions unchanged
// renderKitchenLight, renderDiningLight, renderBedLight, renderSecurityLight, renderGenericLight
// These functions will be called during initial setup, but subsequent updates
// will only modify the necessary parts of the DOM