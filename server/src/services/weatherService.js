/**
 * Open-Meteo Weather Service
 * Fetches precipitation, rain, wind, and forecast data based on incident coordinates
 * to calculate flood risk indicators and enhance emergency decision support.
 */

export async function fetchWeatherRisk(latitude, longitude) {
  const timeoutMs = 4000;
  const baseUrl = process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1/forecast';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const url = `${baseUrl}?latitude=${latitude}&longitude=${longitude}&current=precipitation,rain,showers,weather_code,wind_speed_10m&hourly=precipitation,rain&forecast_days=1`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const current = data.current || {};
      const hourly = data.hourly || {};

      const currentPrecip = current.precipitation || 0;
      const rain = current.rain || 0;
      const windSpeed = current.wind_speed_10m || 0;

      // Calculate total forecasted rain for next 6 hours
      const next6hPrecip = (hourly.precipitation || []).slice(0, 6).reduce((a, b) => a + b, 0);

      // Determine flood risk indicator
      let floodRisk = 'Low';
      if (currentPrecip > 15 || next6hPrecip > 40) {
        floodRisk = 'Extreme Flash Flood Risk';
      } else if (currentPrecip > 5 || next6hPrecip > 20) {
        floodRisk = 'High Flood Warning';
      } else if (currentPrecip > 1 || next6hPrecip > 5) {
        floodRisk = 'Moderate Rain Hazard';
      }

      return {
        success: true,
        currentPrecipitationMm: currentPrecip,
        forecast6hPrecipitationMm: parseFloat(next6hPrecip.toFixed(1)),
        windSpeedKmH: windSpeed,
        floodRisk,
        summary: `Precipitation: ${currentPrecip} mm/h | 6h Forecast: ${next6hPrecip.toFixed(1)} mm | Risk: ${floodRisk}`,
        source: 'Open-Meteo API',
      };
    } else {
      console.warn(`[Open-Meteo Warning] API returned status ${res.status}. Using fallback.`);
    }
  } catch (err) {
    console.warn(`[Open-Meteo Graceful Fallback] ${err.message}. Defaulting to safe weather values.`);
  }

  // Graceful degradation fallback
  return {
    success: false,
    currentPrecipitationMm: 0,
    forecast6hPrecipitationMm: 0,
    windSpeedKmH: 0,
    floodRisk: 'Indeterminate (Offline Fallback)',
    summary: 'Weather data temporarily unavailable (Station offline). Standard precautions apply.',
    source: 'Weather Fallback Handler',
  };
}
