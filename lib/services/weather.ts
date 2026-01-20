import { TenantSettings } from '../types';

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy';

export interface DayWeatherDetail {
  date: string;
  morning: string;
  afternoon: string;
  evening: string;
  summary: string;
  hasVariation: boolean;
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Despejado',
  1: 'Parcialmente nublado',
  2: 'Nublado',
  3: 'Nublado',
  45: 'Neblina',
  48: 'Neblina',
  51: 'Lluvia ligera',
  53: 'Lluvia',
  55: 'Lluvia fuerte',
  61: 'Lluvia',
  63: 'Lluvia',
  65: 'Lluvia fuerte',
  80: 'Lluvia',
  81: 'Lluvia',
  82: 'Lluvia fuerte',
};

export const weatherService = {
  async getCurrentWeather(posNumber: number, settings: TenantSettings): Promise<WeatherCondition> {
    try {
      const location = settings.pos_locations[posNumber];
      if (!location) return 'sunny';

      const coords = settings.weather_coordinates[location];
      if (!coords) return 'sunny';
      
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=weather_code&timezone=America/Argentina/Buenos_Aires`
      );
      
      if (!res.ok) throw new Error('Weather API failed');
      
      const data = await res.json();
      const code = data.current.weather_code;
      
      if (code <= 2) return 'sunny';
      if (code <= 3 || code === 45 || code === 48) return 'cloudy';
      return 'rainy';
    } catch (e) {
      console.error("Weather fetch failed", e);
      return 'sunny';
    }
  },

  async fetchHourlyWeather(latitude: number, longitude: number, days: number = 200) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = new Date().toISOString().split('T')[0];

      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startStr}&end_date=${endStr}&hourly=weather_code,precipitation&timezone=America/Argentina/Buenos_Aires`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather API error');
      
      const data = await response.json();
      return {
        times: data.hourly.time,
        codes: data.hourly.weather_code,
        precipitation: data.hourly.precipitation
      };
    } catch (error) {
      console.error('Error fetching weather:', error);
      return null;
    }
  },

  getWeatherSummaryForDay(times: string[], codes: number[], precipitation: number[], date: string): DayWeatherDetail {
    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayIndices = times
      .map((time, idx) => {
        const t = new Date(time);
        return t >= dayStart && t < dayEnd ? idx : -1;
      })
      .filter(idx => idx !== -1);

    if (dayIndices.length === 0) {
      return {
        date,
        morning: 'N/D',
        afternoon: 'N/D',
        evening: 'N/D',
        summary: 'Sin datos',
        hasVariation: false
      };
    }

    const getMostCommonWeather = (indices: number[]) => {
      const codes_in_range = indices.map(i => codes[i] || 0);
      const hasRain = indices.some(i => precipitation[i] > 0.1);
      
      if (hasRain) return 'Lluvia';
      const mostCommon = codes_in_range[0];
      return WEATHER_CODES[mostCommon] || 'Desconocido';
    };

    const morningIndices = dayIndices.filter(idx => {
      const h = new Date(times[idx]).getHours();
      return h >= 6 && h < 12;
    });

    const afternoonIndices = dayIndices.filter(idx => {
      const h = new Date(times[idx]).getHours();
      return h >= 12 && h < 18;
    });

    const eveningIndices = dayIndices.filter(idx => {
      const h = new Date(times[idx]).getHours();
      return h >= 18 || h < 6;
    });

    const morning = morningIndices.length > 0 ? getMostCommonWeather(morningIndices) : 'N/D';
    const afternoon = afternoonIndices.length > 0 ? getMostCommonWeather(afternoonIndices) : 'N/D';
    const evening = eveningIndices.length > 0 ? getMostCommonWeather(eveningIndices) : 'N/D';

    const conditions = [morning, afternoon, evening].filter(c => c !== 'N/D');
    const hasVariation = new Set(conditions).size > 1;
    
    const summary = hasVariation 
      ? `Mañana: ${morning}, Tarde: ${afternoon}, Noche: ${evening}`
      : morning;

    return {
      date,
      morning,
      afternoon,
      evening,
      summary,
      hasVariation
    };
  },

  async getWeatherHistoryByPos(posNumber: number, settings: TenantSettings, days: number = 200): Promise<Record<string, DayWeatherDetail>> {
    const location = settings.pos_locations[posNumber];
    if (!location) return {};
    const coords = settings.weather_coordinates[location];
    if (!coords) return {};

    const weatherData = await this.fetchHourlyWeather(coords.lat, coords.lon, days);
    if (!weatherData) return {};

    const result: Record<string, DayWeatherDetail> = {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      result[dateStr] = this.getWeatherSummaryForDay(
        weatherData.times,
        weatherData.codes,
        weatherData.precipitation,
        dateStr
      );
    }

    return result;
  }
};
