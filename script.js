/**
 * WEATHER VISUALIZER SYSTEM
 * Handles Canvas rendering for different weather types
 */
const canvas = document.getElementById('weatherCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let animationId;
let particles = [];
let clouds = [];
let stars = [];
let lightningTimer = 0;
let lightningFlash = 0;

// Configuration for active weather effect
let weatherState = {
    type: 'clear', // clear, cloudy, rain, snow, storm, fog
    isDay: true,
    intensity: 1 // 0 to 1
};

// Mouse Interaction for parallax
let mouseXRel = 0; 

document.addEventListener('mousemove', (e) => {
    mouseXRel = (e.clientX - width/2) / width; // -0.5 to 0.5
});

// Resize handler
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Extended Color Palettes for Day/Night support across all types
const PALETTES = {
    // format: [Top Color, Bottom Color]
    clearDay: ['#0ea5e9', '#38bdf8'],
    clearNight: ['#0f172a', '#1e293b'],
    
    cloudyDay: ['#64748b', '#94a3b8'],
    cloudyNight: ['#1e293b', '#334155'],
    
    rainDay: ['#475569', '#64748b'],
    rainNight: ['#0f172a', '#1e293b'],
    
    stormDay: ['#312e81', '#4338ca'],
    stormNight: ['#020617', '#172554'],
    
    snowDay: ['#94a3b8', '#cbd5e1'],
    snowNight: ['#1e293b', '#334155'],
    
    fogDay: ['#94a3b8', '#cbd5e1'],
    fogNight: ['#1e293b', '#334155']
};

class Star {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * (height / 2); // Stars mostly in top half
        this.size = Math.random() * 2;
        this.opacity = Math.random();
        this.twinkleSpeed = Math.random() * 0.02 + 0.005;
    }
    update() {
        this.opacity += this.twinkleSpeed;
        if (this.opacity > 1 || this.opacity < 0.2) this.twinkleSpeed *= -1;
    }
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

class RainDrop {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * -height;
        this.z = Math.random() * 0.5 + 0.5;
        this.len = Math.random() * 20 + 10;
        this.speed = Math.random() * 10 + 15;
    }
    update() {
        this.y += this.speed * this.z;
        if (this.y > height) this.reset();
    }
    draw() {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * this.z})`;
        ctx.lineWidth = 1.5 * this.z;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.len);
        ctx.stroke();
    }
}

class SnowFlake {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * -height;
        this.size = Math.random() * 3 + 1;
        this.speed = Math.random() * 2 + 1;
        this.sway = Math.random() * 0.02;
        this.swayOffset = Math.random() * Math.PI * 2;
    }
    update() {
        this.y += this.speed;
        this.x += Math.sin(this.y * this.sway + this.swayOffset);
        if (this.y > height) this.reset();
    }
    draw() {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Improved Realistic Cloud Class
class Cloud {
    constructor() {
        this.reset(true); // true = start anywhere on screen
    }
    reset(randomX = false) {
        this.x = randomX ? Math.random() * width : -300;
        this.y = Math.random() * (height / 2.5); // Keep in top portion
        this.speed = Math.random() * 0.3 + 0.1;
        this.scale = Math.random() * 0.5 + 0.5;
        this.opacity = Math.random() * 0.2 + 0.4;
        
        // Create cloud "puffs" to form a shape
        this.puffs = [];
        const puffCount = Math.floor(Math.random() * 5) + 4; // 4 to 8 puffs
        for(let i=0; i<puffCount; i++) {
            this.puffs.push({
                dx: (Math.random() * 100 - 50) * this.scale,
                dy: (Math.random() * 40 - 20) * this.scale,
                radius: (Math.random() * 40 + 30) * this.scale
            });
        }
    }
    update() {
        this.x += this.speed;
        if (this.x > width + 300) this.reset(false);
    }
    draw(isDay) {
        // Cloud color: White for day, Dark Grey/Blue for night
        const baseColor = isDay ? "255, 255, 255" : "150, 160, 180";
        
        ctx.fillStyle = `rgba(${baseColor}, ${this.opacity})`;
        
        // Draw each puff
        for (let puff of this.puffs) {
            ctx.beginPath();
            ctx.arc(this.x + puff.dx, this.y + puff.dy, puff.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Lightning {
    constructor() {
        this.active = false;
        this.segments = [];
        this.life = 0;
    }
    trigger() {
        this.active = true;
        this.life = 10;
        this.segments = [];
        let x = Math.random() * width;
        let y = 0;
        this.segments.push({x, y});
        
        while (y < height) {
            x += (Math.random() - 0.5) * 50;
            y += Math.random() * 20 + 10;
            this.segments.push({x, y});
        }
    }
    draw() {
        if (!this.active) return;
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = "white";
        
        ctx.moveTo(this.segments[0].x, this.segments[0].y);
        for (let i = 1; i < this.segments.length; i++) {
            ctx.lineTo(this.segments[i].x, this.segments[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        this.life--;
        if (this.life <= 0) this.active = false;
    }
}

// Main Render Loop
function render() {
    const isDay = weatherState.isDay;
    const type = weatherState.type;

    // 1. Determine Background Palette
    let palette;
    if (type === 'rain') palette = isDay ? PALETTES.rainDay : PALETTES.rainNight;
    else if (type === 'snow') palette = isDay ? PALETTES.snowDay : PALETTES.snowNight;
    else if (type === 'storm') palette = isDay ? PALETTES.stormDay : PALETTES.stormNight;
    else if (type === 'cloudy' || type === 'fog') palette = isDay ? PALETTES.cloudyDay : PALETTES.cloudyNight;
    else palette = isDay ? PALETTES.clearDay : PALETTES.clearNight;

    const grd = ctx.createLinearGradient(0, 0, 0, height);
    grd.addColorStop(0, palette[0]);
    grd.addColorStop(1, palette[1]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    // 2. Celestial Bodies (Sun/Moon) - Only visible if clear or light clouds
    if (type === 'clear' || type === 'cloudy') {
        const cx = width * 0.8;
        const cy = height * 0.2;
        const radius = 60;
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        if (isDay) {
            // Sun
            ctx.fillStyle = '#fde047';
            ctx.shadowBlur = 60;
            ctx.shadowColor = 'rgba(253, 224, 71, 0.6)';
        } else {
            // Moon
            ctx.fillStyle = '#f8fafc';
            ctx.shadowBlur = 30;
            ctx.shadowColor = 'rgba(248, 250, 252, 0.5)';
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Moon Craters (Subtle detail)
        if (!isDay) {
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath(); ctx.arc(cx - 15, cy - 10, 8, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 10, cy + 15, 5, 0, Math.PI*2); ctx.fill();
        }
    }

    // 3. Stars (Only at night and mostly clear)
    if (!isDay && (type === 'clear' || type === 'cloudy')) {
        stars.forEach(s => { s.update(); s.draw(); });
    }

    // 4. Clouds (Layer 1 - Background)
    clouds.forEach((c, index) => { 
        if (index % 2 === 0) { 
            c.x += mouseXRel * 0.5; // Parallax
            c.update(); 
            c.draw(isDay); 
        }
    });

    // 5. Precip Particles
    particles.forEach(p => { 
        p.x += mouseXRel * 2; // Wind effect from mouse
        p.update(); 
        p.draw(); 
    });

    // 6. Clouds (Layer 2 - Foreground for depth)
    clouds.forEach((c, index) => { 
        if (index % 2 !== 0) { 
            c.x += mouseXRel * 1.5; // Stronger parallax
            c.update(); 
            c.draw(isDay); 
        }
    });

    // 7. Lightning
    if (type === 'storm') {
        if (Math.random() < 0.01) {
            lightningSystem.trigger();
            lightningFlash = 5; 
        }
        lightningSystem.draw();
        
        if (lightningFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${lightningFlash * 0.15})`; // Brighter flash
            ctx.fillRect(0,0,width,height);
            lightningFlash--;
        }
    }

    animationId = requestAnimationFrame(render);
}

// Initialize Systems
const lightningSystem = new Lightning();

function setWeatherVisuals(type, isDay) {
    weatherState.type = type;
    weatherState.isDay = isDay;
    
    // Reset Arrays
    particles = [];
    clouds = [];
    stars = [];

    // Populate Stars (Night only)
    if (!isDay) {
        for (let i = 0; i < 50; i++) stars.push(new Star());
    }

    // Populate Clouds
    let cloudCount = 0;
    if (type === 'cloudy' || type === 'fog') cloudCount = 15;
    else if (type === 'rain' || type === 'storm') cloudCount = 12; // Darker thicker clouds
    else if (type === 'snow') cloudCount = 10;
    else if (type === 'clear') cloudCount = 3; // Just a few wisps
    
    for (let i = 0; i < cloudCount; i++) clouds.push(new Cloud());

    // Populate Precipitation
    if (type === 'rain' || type === 'storm') {
        for (let i = 0; i < 200; i++) particles.push(new RainDrop());
    } else if (type === 'snow') {
        for (let i = 0; i < 150; i++) particles.push(new SnowFlake());
    }
}

// Start Loop
render();


/**
 * APP LOGIC & API
 */
const searchInput = document.getElementById('cityInput');
const searchContainer = document.querySelector('.search-container');
const loadingIndicator = document.getElementById('loadingIndicator');
const weatherCard = document.getElementById('weatherCard');
const initialState = document.getElementById('initialState');
const locationBtn = document.getElementById('locationBtn');
const timeDisplay = document.getElementById('timeDisplay');
const smartTip = document.getElementById('smartTip');
const tipText = document.getElementById('tipText');

let currentTimeInterval;
let mouseX = 0;
let mouseY = 0;

// Interaction
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Smart Tips Logic
function updateSmartTip(code, temp, isDay) {
    let tip = "";
    const t = Math.round(temp);
    
    // Temperature based
    if (t > 30) tip = "It's scorching! Stay hydrated and wear sunscreen.";
    else if (t > 25) tip = "Great weather for outdoor activities! Light clothing recommended.";
    else if (t > 15) tip = "Comfortable weather. A t-shirt or light layer is fine.";
    else if (t > 10) tip = "Getting chilly. A jacket or hoodie is a good idea.";
    else if (t > 0) tip = "It's cold! Wear a coat and keep warm.";
    else tip = "Freezing temperatures! Bundle up with layers, gloves, and a hat.";

    // Weather Code Overrides
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) tip = "Rain expected. Don't forget your umbrella!";
    if ([71, 73, 75, 77, 85, 86].includes(code)) tip = "Snow conditions. drive carefully and wear boots.";
    if ([95, 96, 99].includes(code)) tip = "Stormy weather. Best to stay indoors.";
    
    if (tip) {
        smartTip.classList.remove('hidden');
        smartTip.classList.add('flex');
        tipText.textContent = tip;
    } else {
        smartTip.classList.add('hidden');
    }
}

// Initialize 3D Tilt Effect on all glass panels
function initTilt() {
        VanillaTilt.init(document.querySelectorAll(".glass-panel"), {
        max: 10,
        speed: 400,
        glare: true,
        "max-glare": 0.2,
        scale: 1.02
    });
}


// Weather Code Map (WMO Code -> Visual Type)
function getWeatherType(code) {
    if ([0, 1].includes(code)) return 'clear';
    if ([2, 3, 45, 48].includes(code)) return 'cloudy';
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ([95, 96, 99].includes(code)) return 'storm';
    return 'clear';
}

function getWeatherIcon(code, isDay) {
    const base = 'ph-fill ph-';
    // Simple mapping - can be expanded
    if (code === 0) return base + (isDay ? 'sun' : 'moon');
    if (code === 1 || code === 2) return base + (isDay ? 'cloud-sun' : 'cloud-moon');
    if (code === 3) return base + 'cloud';
    if (code === 45 || code === 48) return base + 'cloud-fog';
    if ([51,53,55].includes(code)) return base + 'cloud-drizzle';
    if ([61,63,65].includes(code)) return base + 'cloud-rain';
    if ([71,73,75].includes(code)) return base + 'cloud-snow';
    if ([95,96,99].includes(code)) return base + 'cloud-lightning';
    return base + 'question';
}

function getWeatherDescription(code) {
    const codes = {
        0: "Clear Sky",
        1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
        45: "Fog", 48: "Depositing Rime Fog",
        51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
        61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
        71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow",
        95: "Thunderstorm", 96: "Thunderstorm with Hail", 99: "Heavy Thunderstorm"
    };
    return codes[code] || "Unknown";
}

function updateClock() {
    const now = new Date();
    timeDisplay.textContent = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', second: '2-digit' 
    });
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getDayName(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

async function fetchWeather(lat, lon, name) {
    try {
        loadingIndicator.classList.remove('hidden');
        
        // Fetch Weather (Forecast)
        const weatherPromise = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure,visibility&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`);
        
        // Fetch Air Quality
        const airPromise = fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`);

        const [weatherRes, airRes] = await Promise.all([weatherPromise, airPromise]);
        
        if(!weatherRes.ok) throw new Error("Weather API Error");
        
        const weatherData = await weatherRes.json();
        const airData = airRes.ok ? await airRes.json() : null;
        
        updateUI(weatherData, airData, name);
        
        loadingIndicator.classList.add('hidden');
        initialState.classList.add('hidden');
        weatherCard.classList.remove('hidden');
        weatherCard.classList.add('flex');
        
        // Re-init tilt for new elements if any (though currently robust)
        setTimeout(initTilt, 100);

    } catch (error) {
        console.error(error);
        loadingIndicator.classList.add('hidden');
        alert("Could not fetch weather data. " + error.message);
    }
}

function updateUI(data, airData, locationName) {
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    // 1. Basic Info
    document.getElementById('cityName').textContent = locationName;
    document.getElementById('temperature').textContent = Math.round(current.temperature_2m);
    document.getElementById('conditionText').textContent = getWeatherDescription(current.weather_code);
    
    // Smart Tip
    updateSmartTip(current.weather_code, current.temperature_2m, current.is_day);

    // Date
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateDisplay').textContent = now.toLocaleDateString('en-US', options);

    // Start Clock
    if(currentTimeInterval) clearInterval(currentTimeInterval);
    updateClock();
    currentTimeInterval = setInterval(updateClock, 1000);

    // 2. Main Visuals
    const visualType = getWeatherType(current.weather_code);
    setWeatherVisuals(visualType, current.is_day === 1);

    const iconClass = getWeatherIcon(current.weather_code, current.is_day === 1);
    const iconEl = document.getElementById('weatherIcon');
    iconEl.className = `${iconClass} text-8xl md:text-9xl mb-4 drop-shadow-2xl`;
    
    if(visualType === 'clear') iconEl.classList.add(current.is_day ? 'text-yellow-400' : 'text-blue-100');
    else if(visualType === 'rain') iconEl.classList.add('text-blue-400');
    else if(visualType === 'storm') iconEl.classList.add('text-purple-400');
    else if(visualType === 'snow') iconEl.classList.add('text-white');
    else iconEl.classList.add('text-gray-200');

    // 3. Hourly Forecast (Next 6h)
    const hourlyContainer = document.getElementById('hourlyForecast');
    hourlyContainer.innerHTML = '';
    
    // Find current hour index
    const currentHourISO = now.toISOString().slice(0, 13); // Match YYYY-MM-DDTHH
    let startIndex = hourly.time.findIndex(t => t.startsWith(currentHourISO));
    if(startIndex === -1) startIndex = 0;

    for(let i = startIndex; i < startIndex + 6 && i < hourly.time.length; i++) {
        const timeStr = hourly.time[i];
        const temp = Math.round(hourly.temperature_2m[i]);
        const code = hourly.weather_code[i];
        const isDay = hourly.is_day[i];
        
        const timeLabel = i === startIndex ? 'Now' : new Date(timeStr).toLocaleTimeString('en-US', {hour:'numeric'});
        const icon = getWeatherIcon(code, isDay === 1);

        const el = document.createElement('div');
        el.className = 'glass-panel rounded-xl p-3 flex flex-col items-center transition-transform hover:scale-105';
        el.innerHTML = `
            <span class="text-xs text-gray-300 mb-2">${timeLabel}</span>
            <i class="${icon} text-2xl mb-2 text-white"></i>
            <span class="font-semibold">${temp}°</span>
        `;
        hourlyContainer.appendChild(el);
    }

    // 4. Weekly Forecast
    const weeklyContainer = document.getElementById('weeklyForecast');
    weeklyContainer.innerHTML = '';
    
    for(let i = 0; i < daily.time.length; i++) {
        const dayName = i === 0 ? 'Today' : getDayName(daily.time[i]);
        const code = daily.weather_code[i];
        const max = Math.round(daily.temperature_2m_max[i]);
        const min = Math.round(daily.temperature_2m_min[i]);
        const icon = getWeatherIcon(code, true);

        const el = document.createElement('div');
        el.className = 'flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors';
        el.innerHTML = `
            <span class="w-16 font-medium text-gray-200">${dayName}</span>
            <div class="flex items-center gap-3 flex-1 justify-center">
                <i class="${icon} text-xl text-gray-300"></i>
                <span class="text-sm text-gray-400 w-24 text-center">${getWeatherDescription(code)}</span>
            </div>
            <div class="flex gap-4 w-20 justify-end">
                <span class="font-bold">${max}°</span>
                <span class="text-gray-400">${min}°</span>
            </div>
        `;
        weeklyContainer.appendChild(el);
    }

    // 5. Air Quality
    if (airData && airData.current) {
        const aqi = Math.round(airData.current.us_aqi);
        document.getElementById('aqiValue').textContent = aqi;
        document.getElementById('aqiBar').style.width = Math.min(aqi, 300) / 3 + '%'; // Approx scale
        
        let label = "Good";
        let colorClass = "text-green-300";
        let bgClass = "bg-green-500/20";
        let desc = "Air quality is satisfactory.";

        if (aqi > 50) { label = "Moderate"; colorClass = "text-yellow-300"; bgClass = "bg-yellow-500/20"; desc = "Air quality is acceptable."; }
        if (aqi > 100) { label = "Unhealthy"; colorClass = "text-orange-300"; bgClass = "bg-orange-500/20"; desc = "Sensitive groups may be affected."; }
        if (aqi > 150) { label = "Poor"; colorClass = "text-red-300"; bgClass = "bg-red-500/20"; desc = "Everyone may begin to experience health effects."; }

        const lblEl = document.getElementById('aqiLabel');
        lblEl.textContent = label;
        lblEl.className = `px-2 py-1 rounded text-xs font-bold ${bgClass} ${colorClass}`;
        document.getElementById('aqiDesc').textContent = desc;
    }

    // 6. Grid Details
    // Wind
    document.getElementById('windSpeed').textContent = `${current.wind_speed_10m} km/h`;
    // Humidity
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    // Pressure
    document.getElementById('pressure').textContent = `${current.surface_pressure} hPa`;
    // Feels Like
    document.getElementById('feelsLike').textContent = `${Math.round(current.apparent_temperature)}°`;
    // Visibility (m -> km)
    const visKm = current.visibility ? (current.visibility / 1000).toFixed(1) : '--';
    document.getElementById('visibility').textContent = `${visKm} km`;
    
    if(hourly && hourly.uv_index) {
        
            const currentHourISO = now.toISOString().slice(0, 13);
            let hIndex = hourly.time.findIndex(t => t.startsWith(currentHourISO));
            if(hIndex === -1) hIndex = 0;
            
    }

    if(daily && daily.uv_index_max) {
            document.getElementById('uvIndex').textContent = daily.uv_index_max[0];
    }

    // Sun Times
    if(daily && daily.sunrise && daily.sunrise[0]) {
        document.getElementById('sunriseTime').textContent = formatTime(daily.sunrise[0]);
        document.getElementById('sunsetTime').textContent = formatTime(daily.sunset[0]);
    }
}

async function getCoordinates(city) {
    try {
        loadingIndicator.classList.remove('hidden');
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`);
        const data = await response.json();
        
        if (!data.results) {
            alert("City not found");
            loadingIndicator.classList.add('hidden');
            return;
        }
        
        const { latitude, longitude, name, country } = data.results[0];
        fetchWeather(latitude, longitude, `${name}, ${country}`);
        
    } catch (error) {
        console.error(error);
        loadingIndicator.classList.add('hidden');
    }
}

// Search Listeners
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        getCoordinates(searchInput.value);
    }
});

locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        loadingIndicator.classList.remove('hidden');
        navigator.geolocation.getCurrentPosition(async (position) => {
            fetchWeather(position.coords.latitude, position.coords.longitude, "My Location");
        }, () => {
            alert("Location access denied.");
            loadingIndicator.classList.add('hidden');
        });
    }
});

// Init Default Visuals
setWeatherVisuals('clear', true);

/**
 * LANDING PAGE LOGIC
 */
const landingPage = document.getElementById('landingPage');
const startBtn = document.getElementById('getStartedBtn');

// Check Local Storage
const hasVisited = localStorage.getItem('atmosphere_visited');

if (!hasVisited) {
    // First time: Show landing page
    landingPage.classList.remove('hidden');
}

startBtn.addEventListener('click', () => {
    // Fade out
    landingPage.classList.add('opacity-0');
    landingPage.style.pointerEvents = 'none'; // Prevent clicks during fade
    
    // Set flag
    localStorage.setItem('atmosphere_visited', 'true');

    // Wait for transition to finish before hiding completely (for performance)
    setTimeout(() => {
        landingPage.classList.add('hidden');
    }, 700);
});

/**
 * BUG REPORT LOGIC
 */
const bugBtn = document.getElementById('bugBtn');
const bugModal = document.getElementById('bugModal');
const closeBugBtn = document.getElementById('closeBugBtn');

function toggleModal(show) {
    if(show) {
        bugModal.classList.remove('hidden');
        // Trigger reflow for transition
        void bugModal.offsetWidth;
        bugModal.classList.remove('opacity-0');
        bugModal.children[0].classList.remove('scale-95');
        bugModal.children[0].classList.add('scale-100');
    } else {
        bugModal.classList.add('opacity-0');
        bugModal.children[0].classList.remove('scale-100');
        bugModal.children[0].classList.add('scale-95');
        setTimeout(() => {
            bugModal.classList.add('hidden');
        }, 300);
    }
}

bugBtn.addEventListener('click', () => toggleModal(true));
closeBugBtn.addEventListener('click', () => toggleModal(false));

// Close on outside click
bugModal.addEventListener('click', (e) => {
    if(e.target === bugModal) toggleModal(false);
});