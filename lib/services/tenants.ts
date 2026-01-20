import { supabase } from '@/lib/supabase';

export interface TenantSettings {
  pos_names: Record<number, string>;
  pos_locations: Record<number, string>;
  pos_phones: Record<number, string>;
  weather_coordinates: Record<string, { lat: number, lon: number }>;
  delete_catalog_password?: string;
  delete_sale_password?: string;
  commissions?: Record<string, number>;
  seasonality_months?: number[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: TenantSettings = {
  pos_names: {
    1: 'Costa del Este',
    2: 'Mar de las Pampas',
    3: 'Costa Esmeralda',
  },
  pos_locations: {
    1: 'Costa del Este',
    2: 'Mar de las Pampas',
    3: 'Costa Esmeralda'
  },
  pos_phones: {
    1: '5492257542170',
    2: '5492257542171',
    3: '5492257660073'
  },
  weather_coordinates: {
    'Costa del Este': { lat: -36.4333, lon: -56.7167 },
    'Mar de las Pampas': { lat: -37.3333, lon: -57.0167 },
    'Costa Esmeralda': { lat: -37.1328, lon: -56.7456 }
  },
  delete_catalog_password: 'laviudanegradebernal1994',
  delete_sale_password: '1004',
  commissions: {
    'Efectivo': 0,
    'Transferencia': 0,
    'QR': 0.008,
    'Débito': 0.015,
    'Crédito': 0.035,
    'Mixto': 0.01
  },
  seasonality_months: [0, 1]
};

export const tenantService = {
  async getTenant(id: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching tenant:', error);
        return null;
      }

      return {
        ...data,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(data.settings || {})
        }
      };
    } catch (error) {
      console.error('Unexpected error in getTenant:', error);
      return null;
    }
  },

  async updateSettings(id: string, settings: Partial<TenantSettings>): Promise<boolean> {
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', id)
        .single();

      const newSettings = {
        ...(tenant?.settings || {}),
        ...settings
      };

      const { error } = await supabase
        .from('tenants')
        .update({ settings: newSettings })
        .eq('id', id);

      return !error;
    } catch (error) {
      console.error('Error updating tenant settings:', error);
      return false;
    }
  }
};
