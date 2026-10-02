const https = require('https');
// Openhab Ortsnetz V: 0.2.2
// Version Date: 2026-10-01

const args = process.argv.slice(2);
const l1 = parseFloat(args[0]) || 230.0;
const l2 = parseFloat(args[1]) || 230.0;
const l3 = parseFloat(args[2]) || 230.0;
const hz = parseFloat(args[3]) || 50.0;

const rawKwp = args[4];
const rawForecast = args[5];
const rawSmartmeterModel = args[8];

const rawLat = parseFloat(args[6]) || 53.164100;
const rawLon = parseFloat(args[7]) || 7.336100;

const lat = parseFloat(rawLat.toFixed(6));
const lon = parseFloat(rawLon.toFixed(6));

// ISO-Zeitstempel sauber ohne Millisekunden bauen
const now = new Date().toISOString().split('.')[0] + 'Z';

const dataObject = {
  observed_at: now,
  latitude: lat,
  longitude: lon,
  l1_v: l1,
  l2_v: l2,
  l3_v: l3,
  grid_frequency_hz: hz,
  integration_version: 'Openhab Ortsnetz V: 0.2.2'
};

if (rawForecast && rawForecast.trim() !== "" && !isNaN(rawForecast)) { dataObject.pv_forecast_kwh = parseFloat(rawForecast); }
if (rawKwp && rawKwp.trim() !== "" && !isNaN(rawKwp)) { dataObject.plant_capacity_kwp = parseFloat(rawKwp); }
if (typeof rawSmartmeterModel === "string" && rawSmartmeterModel.trim() !== "" && rawSmartmeterModel.trim().length <= 120) {
  dataObject.smartmeter_model = rawSmartmeterModel.trim();
}

const payload = JSON.stringify(dataObject);

const options = {
  hostname: 'www.ortsnetz-auslastung.de',
  port: 443,
  path: '/v1/measurements',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    // Tarnt das Skript als echten Windows Chrome-Browser
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    let apiResponse;
    try {
      apiResponse = JSON.parse(body);
    } catch(e) {
      apiResponse = body;
    }

    // Übergibt das saubere JSON-Objekt an openHAB zurück
    console.log(JSON.stringify({
      api_reply: apiResponse,
      debug_payload: dataObject
    }));
  });
});

req.on('error', (e) => {
  console.log(JSON.stringify({
    api_reply: { error: e.message },
    debug_payload: dataObject
  }));
});

req.write(payload);
req.end();

