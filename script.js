// ============ DATA STORAGE ============
let devices = [
    { id: "ESP32_001", name: "Sensor Greenhouse Utara", type: "esp32", location: "Zona A", ip: "192.168.1.101", firmware: "v2.1.0", signal: -45, status: "online", lastSeen: new Date() },
    { id: "STM32_001", name: "Sensor Kolam Selatan", type: "stm32", location: "Zona B", ip: "192.168.1.102", firmware: "v1.8.3", signal: -62, status: "online", lastSeen: new Date() },
    { id: "ORANGEPI_001", name: "Gateway Pusat", type: "orangepi", location: "Server Room", ip: "192.168.1.100", firmware: "v3.0.0", signal: -30, status: "online", lastSeen: new Date() },
    { id: "ESP32_002", name: "Sensor Udara Barat", type: "esp32", location: "Zona C", ip: "192.168.1.103", firmware: "v2.1.0", signal: -78, status: "offline", lastSeen: new Date(Date.now() - 3600000) }
];

let notifications = [
    { id: 1, title: "Suhu melebihi batas normal", message: "Sensor Zona A mencatat suhu 32.5°C", time: new Date(Date.now() - 1200000), type: "warning", read: false },
    { id: 2, title: "Perangkat ESP32_002 offline", message: "Tidak ada koneksi selama 1 jam", time: new Date(Date.now() - 3600000), type: "critical", read: false },
    { id: 3, title: "Data pH stabil", message: "pH berada di range normal (6.8)", time: new Date(Date.now() - 7200000), type: "info", read: true },
    { id: 4, title: "Pembacaan sensor berhasil", message: "Semua sensor mengirim data normal", time: new Date(Date.now() - 86400000), type: "info", read: true }
];

let historicalData = {
    daily: { suhu: [28.1,28.3,28.4,28.2,28.5,28.7,28.6,28.4,28.5,28.8,28.9,28.7,28.6,28.5,28.4,28.3,28.5,28.6,28.7,28.5,28.4,28.3,28.2,28.5], ph: [6.7,6.8,6.8,6.7,6.9,6.8,6.8,6.7,6.8,6.9,6.8,6.7,6.8,6.8,6.9,6.8,6.7,6.8,6.8,6.9,6.8,6.7,6.8,6.8] },
    weekly: { suhu: [27.5,27.8,28.0,28.2,28.4,28.6,28.5], ph: [6.5,6.6,6.7,6.8,6.8,6.9,6.8] },
    monthly: { suhu: [26.2,26.8,27.3,27.9,28.2,28.5,28.4,28.1,27.8,27.5], ph: [6.4,6.5,6.6,6.7,6.8,6.8,6.9,6.8,6.7,6.6] }
};

let thresholds = { tempMax: 35, tempMin: 18, phMax: 8.5, phMin: 5.5, aqiMax: 150 };
let mqttConfig = { broker: "wss://broker.hivemq.com:8000/mqtt", user: "", pass: "" };

// Chart instances
let mainChart, historicalChart;

// ============ PAGE ROUTING ============
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.getAttribute('data-page') === pageId) {
            nav.classList.add('active');
        }
    });
    
    if (pageId === 'analytics') loadHistoricalChart();
    if (pageId === 'devices') renderDevices();
    if (pageId === 'notifications') renderNotifications();
}

// ============ DASHBOARD CHART ============
function initDashboardChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    let suhuData = [26.2,26.5,26.8,27.0,27.3,27.6,27.8,28.0,28.2,28.3,28.4,28.5,28.7,28.6,28.5,28.4,28.6,28.7,28.8,28.5,28.4,28.3,28.2,28.5];
    let kelembabanData = [62,63,63,64,64,65,65,66,66,65,65,64,65,65,66,65,64,63,63,64,65,65,64,65];
    let labels = [];
    for (let i = 23; i >= 0; i--) labels.push(i + ':00');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
    gradient.addColorStop(0.6, 'rgba(56, 189, 248, 0.1)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
    
    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Suhu (°C)', data: suhuData, borderColor: '#38BDF8', backgroundColor: gradient, borderWidth: 3, pointRadius: 3, pointBackgroundColor: '#0EA5E9', pointBorderColor: '#FFFFFF', tension: 0.3, fill: true },
                { label: 'Kelembaban (%)', data: kelembabanData, borderColor: '#A78BFA', borderWidth: 2.5, pointRadius: 2, pointBackgroundColor: '#8B5CF6', borderDash: [5,5], tension: 0.3, fill: false }
            ]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { tooltip: { mode: 'index', intersect: false }, legend: { labels: { color: '#CBD5E1' } } }, scales: { x: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#94A3B8' } }, y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#94A3B8' } } } }
    });
}

// ============ HISTORICAL CHART ============
function loadHistoricalChart() {
    const range = document.getElementById('timeRange')?.value || 'daily';
    const param = document.getElementById('paramSelect')?.value || 'suhu';
    const data = historicalData[range][param];
    const labels = range === 'daily' ? [...Array(24).keys()].map(i => i + ':00') : (range === 'weekly' ? ['Sen','Sel','Rab','Kam','Jum','Sab','Min'] : ['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10']);
    
    const ctx = document.getElementById('historicalChart').getContext('2d');
    if (historicalChart) historicalChart.destroy();
    
    historicalChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: param === 'suhu' ? 'Suhu (°C)' : (param === 'ph' ? 'pH' : (param === 'kelembaban' ? 'Kelembaban (%)' : 'AQI')), data: data, borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.1)', borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#38BDF8', tension: 0.3, fill: true }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
    
    // Update perbandingan
    const lastWeekAvg = 28.0, thisWeekAvg = 28.8;
    document.getElementById('compareValue').innerHTML = `${(thisWeekAvg - lastWeekAvg).toFixed(1)}°C`;
    document.getElementById('compareTrend').innerHTML = thisWeekAvg > lastWeekAvg ? 'Meningkat' : 'Menurun';
    document.getElementById('stabilityValue').innerHTML = '92%';
    
    // Update prediksi
    document.getElementById('predictionContent').innerHTML = `
        <div class="prediction-item"><i class="fas fa-flask"></i><span>Prediksi pH perlu ditambah dalam: <strong>2-3 hari</strong> (trend menurun)</span></div>
        <div class="prediction-item"><i class="fas fa-tint"></i><span>Konsumsi air: <strong>1.2 L/hari</strong> (Normal)</span></div>
        <div class="prediction-item"><i class="fas fa-temperature-high"></i><span>Peringatan suhu ekstrem dalam 5 hari: <strong>Tidak terdeteksi</strong></span></div>
    `;
}

// ============ RENDER DEVICES ============
function renderDevices() {
    const container = document.getElementById('devicesList');
    container.innerHTML = devices.map(device => `
        <div class="device-card ${device.status}">
            <div class="device-header">
                <span class="device-name"><i class="fas fa-microchip"></i> ${device.name}</span>
                <span class="device-status ${device.status === 'online' ? 'status-online' : 'status-offline'}">${device.status === 'online' ? '● Online' : '○ Offline'}</span>
            </div>
            <div class="device-details">
                <p><i class="fas fa-fingerprint"></i> ID: ${device.id}</p>
                <p><i class="fas fa-map-marker-alt"></i> Lokasi: ${device.location}</p>
                <p><i class="fas fa-network-wired"></i> IP: ${device.ip}</p>
                <p><i class="fas fa-code-branch"></i> Firmware: ${device.firmware}</p>
                <p><i class="fas fa-signal"></i> Sinyal: ${device.signal} dBm</p>
                <p><i class="fas fa-clock"></i> Terakhir: ${device.lastSeen.toLocaleTimeString()}</p>
            </div>
            <div class="device-actions">
                <button class="btn-reboot" onclick="rebootDevice('${device.id}')"><i class="fas fa-power-off"></i> Remote Reboot</button>
                <button class="btn-secondary" onclick="editDevice('${device.id}')" style="padding:6px 12px;"><i class="fas fa-edit"></i> Edit</button>
            </div>
        </div>
    `).join('');
}

function rebootDevice(deviceId) {
    if(confirm(`Yakin akan merestart perangkat ${deviceId}?`)) {
        addNotification(`Perangkat ${deviceId} di-restart dari jarak jauh`, 'info');
        alert(`Perintah reboot dikirim ke ${deviceId}`);
    }
}

function editDevice(deviceId) {
    alert(`Edit perangkat ${deviceId} - Fitur dalam pengembangan`);
}

// ============ RENDER NOTIFICATIONS ============
function renderNotifications(filter = 'all') {
    let filtered = notifications;
    if(filter === 'critical') filtered = notifications.filter(n => n.type === 'critical');
    else if(filter === 'warning') filtered = notifications.filter(n => n.type === 'warning');
    else if(filter === 'info') filtered = notifications.filter(n => n.type === 'info');
    
    const container = document.getElementById('notificationsList');
    container.innerHTML = filtered.map(notif => `
        <div class="notification-item ${notif.type} ${!notif.read ? 'unread' : ''}" onclick="markAsRead(${notif.id})">
            <div class="notification-content">
                <div class="notification-title">${notif.title}</div>
                <div class="notification-message" style="font-size:13px; color:#94A3B8;">${notif.message}</div>
                <div class="notification-time">${timeAgo(notif.time)}</div>
            </div>
            <span class="notification-badge badge-${notif.type}">${notif.type === 'critical' ? 'Kritis' : (notif.type === 'warning' ? 'Peringatan' : 'Info')}</span>
        </div>
    `).join('');
}

function markAsRead(id) {
    const notif = notifications.find(n => n.id === id);
    if(notif) notif.read = true;
    renderNotifications();
}

function markAllAsRead() {
    notifications.forEach(n => n.read = true);
    renderNotifications();
}

function addNotification(title, message, type = 'info') {
    const newNotif = { id: Date.now(), title, message, time: new Date(), type, read: false };
    notifications.unshift(newNotif);
    if(document.getElementById('page-notifications').classList.contains('active')) renderNotifications();
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if(seconds < 60) return `${seconds} detik lalu`;
    if(seconds < 3600) return `${Math.floor(seconds/60)} menit lalu`;
    if(seconds < 86400) return `${Math.floor(seconds/3600)} jam lalu`;
    return `${Math.floor(seconds/86400)} hari lalu`;
}

// ============ EXPORT DATA ============
function exportToCSV() {
    const range = document.getElementById('timeRange')?.value || 'daily';
    const data = historicalData[range];
    let csv = "Timestamp,Suhu (°C),pH\n";
    const labels = range === 'daily' ? [...Array(24).keys()] : (range === 'weekly' ? [1,2,3,4,5,6,7] : [1,2,3,4,5,6,7,8,9,10]);
    for(let i=0; i<data.suhu.length; i++) {
        csv += `${labels[i]},${data.suhu[i]},${data.ph[i]}\n`;
    }
    const blob = new Blob([csv], {type: 'text/csv'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sensor_data_${range}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    addNotification(`Data berhasil diekspor ke CSV`, 'info');
}

function exportToExcel() {
    alert('Export ke Excel - Hubungkan ke backend PHP/Node.js untuk fitur lengkap');
}

// ============ SETTINGS ============
function saveThresholds() {
    thresholds.tempMax = parseFloat(document.getElementById('tempMax').value);
    thresholds.tempMin = parseFloat(document.getElementById('tempMin').value);
    thresholds.phMax = parseFloat(document.getElementById('phMax').value);
    thresholds.phMin = parseFloat(document.getElementById('phMin').value);
    thresholds.aqiMax = parseInt(document.getElementById('aqiMax').value);
    addNotification('Pengaturan threshold berhasil disimpan', 'info');
    alert('Threshold disimpan!');
}

function saveMqttConfig() {
    mqttConfig.broker = document.getElementById('mqttBroker').value;
    mqttConfig.user = document.getElementById('mqttUser').value;
    mqttConfig.pass = document.getElementById('mqttPass').value;
    addNotification('Konfigurasi MQTT diperbarui, reconnect...', 'info');
    alert('Konfigurasi MQTT disimpan. Silakan refresh halaman untuk menerapkan koneksi baru.');
}

function changeTheme(theme) {
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
    if(theme === 'midnight') document.body.style.background = '#050914';
    else if(theme === 'ocean') document.body.style.background = '#0B1A2E';
    else document.body.style.background = '#0B1120';
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    initDashboardChart();
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.addEventListener('click', () => showPage(nav.getAttribute('data-page')));
    });
    
    // Analytics
    document.getElementById('refreshChartBtn')?.addEventListener('click', loadHistoricalChart);
    document.getElementById('exportCSVBtn')?.addEventListener('click', exportToCSV);
    document.getElementById('exportExcelBtn')?.addEventListener('click', exportToExcel);
    
    // Devices
    document.getElementById('addDeviceBtn')?.addEventListener('click', () => document.getElementById('addDeviceModal').classList.add('active'));
    document.querySelector('.close-modal')?.addEventListener('click', () => document.getElementById('addDeviceModal').classList.remove('active'));
    document.getElementById('addDeviceForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const newDevice = {
            id: document.getElementById('deviceId').value,
            name: document.getElementById('deviceName').value || document.getElementById('deviceId').value,
            type: document.getElementById('deviceType').value,
            location: document.getElementById('deviceLocation').value || 'Unknown',
            ip: '192.168.1.' + Math.floor(Math.random()*255),
            firmware: 'v1.0.0',
            signal: -50,
            status: 'online',
            lastSeen: new Date()
        };
        devices.push(newDevice);
        renderDevices();
        document.getElementById('addDeviceModal').classList.remove('active');
        addNotification(`Perangkat ${newDevice.id} berhasil ditambahkan`, 'info');
    });
    
    // Settings
    document.getElementById('saveThresholdBtn')?.addEventListener('click', saveThresholds);
    document.getElementById('saveMqttBtn')?.addEventListener('click', saveMqttConfig);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => changeTheme(btn.getAttribute('data-theme')));
    });
    
    // Notifications
    document.getElementById('markAllReadBtn')?.addEventListener('click', markAllAsRead);
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderNotifications(btn.getAttribute('data-filter'));
        });
    });
    
    // Simulasi data realtime
    setInterval(() => {
        const newSuhu = (28 + Math.random() * 2).toFixed(1);
        document.getElementById('suhuValue').innerText = newSuhu;
        if(parseFloat(newSuhu) > thresholds.tempMax) {
            addNotification(`⚠️ Suhu melebihi batas! (${newSuhu}°C > ${thresholds.tempMax}°C)`, 'warning');
        }
    }, 10000);
    
    renderDevices();
    renderNotifications();
});