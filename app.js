// Default location: Boca Raton, FL
const DEFAULT = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

// Open-Meteo weather codes -> [description, icon]
const CODES = {
  0: ["Clear", "☀️"], 1: ["Mostly Clear", "🌤️"], 2: ["Partly Cloudy", "⛅"], 3: ["Cloudy", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
  51: ["Light Drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy Drizzle", "🌧️"],
  61: ["Light Rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy Rain", "🌧️"],
  71: ["Light Snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy Snow", "❄️"],
  80: ["Showers", "🌦️"], 81: ["Showers", "🌧️"], 82: ["Heavy Showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"],
};
const describe = (code) => CODES[code] || ["Unknown", "🌡️"];
const $ = (id) => document.getElementById(id);

async function loadWeather({ name, lat, lon }) {
  $("error").textContent = "";
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&hourly=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather request failed");
    render(name, await res.json());
  } catch (err) {
    $("error").textContent = "Could not load weather. Please try again.";
  }
}

function render(name, data) {
  const c = data.current, d = data.daily, h = data.hourly;
  const [desc] = describe(c.weather_code);

  $("location").textContent = name;
  $("temp").textContent = `${Math.round(c.temperature_2m)}°`;
  $("condition").textContent = desc;
  $("hilo").textContent = `H:${Math.round(d.temperature_2m_max[0])}°  L:${Math.round(d.temperature_2m_min[0])}°`;
  $("feels").textContent = `${Math.round(c.apparent_temperature)}°`;
  $("humidity").textContent = `${c.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(c.wind_speed_10m)} mph`;
  $("uv").textContent = Math.round(d.uv_index_max[0]);

  // Next 24 hours, starting from the current hour
  const start = h.time.findIndex((t) => t >= c.time.slice(0, 13));
  $("hourly").innerHTML = h.time.slice(start, start + 24).map((t, i) => {
    const idx = start + i;
    const label = i === 0 ? "Now" : formatHour(t);
    return `<div class="hour"><span>${label}</span><span class="icon">${describe(h.weather_code[idx])[1]}</span><span>${Math.round(h.temperature_2m[idx])}°</span></div>`;
  }).join("");

  // 7-day with range bars scaled to the week's min/max
  const weekMin = Math.min(...d.temperature_2m_min);
  const weekMax = Math.max(...d.temperature_2m_max);
  const span = weekMax - weekMin || 1;
  $("daily").innerHTML = d.time.map((t, i) => {
    const lo = d.temperature_2m_min[i], hi = d.temperature_2m_max[i];
    const left = ((lo - weekMin) / span) * 100;
    const width = ((hi - lo) / span) * 100;
    const day = i === 0 ? "Today" : new Date(t + "T12:00").toLocaleDateString("en-US", { weekday: "short" });
    return `<div class="day"><span>${day}</span><span class="icon">${describe(d.weather_code[i])[1]}</span>
      <div class="range"><span class="lo">${Math.round(lo)}°</span><div class="bar"><span style="left:${left}%;width:${width}%"></span></div><span class="hi">${Math.round(hi)}°</span></div></div>`;
  }).join("");
}

function formatHour(iso) {
  const hr = parseInt(iso.slice(11, 13), 10);
  return `${hr % 12 || 12}${hr < 12 ? "AM" : "PM"}`;
}

// City search via Open-Meteo geocoding
$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = $("city").value.trim();
  if (!query) return;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
    const { results } = await res.json();
    if (!results || !results.length) {
      $("error").textContent = `No results for "${query}".`;
      return;
    }
    const r = results[0];
    loadWeather({ name: r.name, lat: r.latitude, lon: r.longitude });
    $("city").value = "";
  } catch {
    $("error").textContent = "Search failed. Please try again.";
  }
});

loadWeather(DEFAULT);
