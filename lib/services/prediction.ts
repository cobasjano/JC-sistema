
export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy';
export type TouristFlow = 'high' | 'medium' | 'low' | 'arrival' | 'departure';

export interface Forecast {
  morning: { status: string; icon: string };
  afternoon: { status: string; icon: string };
  night: { status: string; icon: string };
  tip: string;
  growth: number; // percentage
}

const WEATHER_ICONS = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️'
};

export interface POSCharacteristics {
  morningBoost: number;
  noonBoost: number;
  afternoonBoost: number;
  touristSensitivity: number;
}

const DEFAULT_CHARACTERISTICS: POSCharacteristics = {
  morningBoost: 1,
  noonBoost: 1,
  afternoonBoost: 1,
  touristSensitivity: 0.5
};

export const predictionService = {
  getInflectionPoint(date: Date = new Date()): boolean {
    const day = date.getDate();
    return [1, 7, 8, 14, 15, 21, 22, 30, 31].includes(day);
  },

  getTouristFlow(date: Date = new Date()): TouristFlow {
    const day = date.getDate();
    const isRecambio = [1, 7, 8, 14, 15, 21, 22, 30, 31].includes(day);
    
    if (isRecambio) {
      const hours = date.getHours();
      if (hours < 14) return 'arrival';
      return 'departure';
    }

    return 'low';
  },

  getForecast(
    posNumber: number,
    weather: WeatherCondition = 'sunny',
    flowOverride?: TouristFlow,
    date: Date = new Date(),
    characteristics?: POSCharacteristics,
    seasonalityMonths: number[] = [0, 1]
  ): Forecast {
    const isInflection = this.getInflectionPoint(date);
    const flow = flowOverride || this.getTouristFlow(date);
    const month = date.getMonth();
    const chars = characteristics || DEFAULT_CHARACTERISTICS;
    
    let baseGrowth = 0;
    
    // Month Factor (Seasonality)
    if (seasonalityMonths.includes(month)) baseGrowth += 40; 
    
    // Flow Factor
    if (flow === 'high') baseGrowth += 20;
    if (flow === 'arrival') baseGrowth += 35;
    if (flow === 'departure') baseGrowth -= 10;
    if (flow === 'medium') baseGrowth += 15;
    
    // Weather Factor
    if (weather === 'sunny') baseGrowth += 15;
    if (weather === 'cloudy') baseGrowth += 5;
    if (weather === 'rainy') baseGrowth -= 25;

    // Inflection point (usually related to salary/bill cycles)
    if (isInflection) baseGrowth -= 5;

    const morningStatus = (weather === 'rainy' || flow === 'departure') ? 'Bajo' : (chars.morningBoost > 1.2 || flow === 'arrival' ? 'Alto' : 'Normal');
    const afternoonStatus = (weather === 'sunny' || flow === 'arrival') ? 'Pico' : 'Normal';
    const nightStatus = weather === 'rainy' ? 'Bajo' : 'Estable';

    let tip = '';
    if (flow === 'arrival') {
      tip = 'Llegada de turistas: Incrementar disponibilidad operativa y personal.';
    } else if (flow === 'departure') {
      tip = 'Salida de turistas: Optimizar recursos para menor flujo esperado.';
    } else if (weather === 'sunny' && (flow === 'high' || flow === 'medium')) {
      tip = 'Condiciones óptimas: Alta demanda proyectada.';
    } else if (weather === 'rainy') {
      tip = 'Clima adverso: Probable reducción de tráfico peatonal.';
    } else if (isInflection) {
      tip = 'Punto de inflexión: Monitorear flujo de caja y compromisos financieros.';
    } else {
      tip = 'Operación estable: Mantener estándares de servicio habituales.';
    }

    return {
      morning: { status: morningStatus, icon: WEATHER_ICONS[weather] },
      afternoon: { status: afternoonStatus, icon: weather === 'sunny' ? '☀️' : WEATHER_ICONS[weather] },
      night: { status: nightStatus, icon: '🌙' },
      tip,
      growth: baseGrowth
    };
  }
};
