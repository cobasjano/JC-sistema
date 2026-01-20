import { supabase } from '@/lib/supabase';
import { Customer, CustomerRanking } from '@/lib/types';

export const customerService = {
  async getAll(tenantId: string, posNumber?: number): Promise<Customer[]> {
    try {
      let query = supabase.from('customers').select('*').eq('tenant_id', tenantId);
      if (posNumber) {
        query = query.eq('pos_number', posNumber);
      }
      const { data, error } = await query.order('full_name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  },

  async search(term: string, tenantId: string, posNumber?: number): Promise<Customer[]> {
    try {
      let query = supabase.from('customers').select('*').eq('tenant_id', tenantId);
      if (posNumber) {
        query = query.eq('pos_number', posNumber);
      }
      const { data, error } = await query
        .or(`full_name.ilike.%${term}%,phone_number.ilike.%${term}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  },

  async create(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([customer])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase Error Details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Full Error Object:', error);
      return null;
    }
  },

  async getById(id: string, tenantId: string): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching customer by id:', error);
      return null;
    }
  },

  async getRanking(tenantId: string, posNumber?: number): Promise<CustomerRanking[]> {
    try {
      // Get all customers
      const customers = await this.getAll(tenantId, posNumber);
      
      // Get all sales for these customers
      const { data: sales, error } = await supabase
        .from('sales')
        .select('customer_id, total')
        .eq('tenant_id', tenantId)
        .not('customer_id', 'is', null);
      
      if (error) throw error;

      const salesMap: Record<string, { count: number; spent: number }> = {};
      sales.forEach((sale: { customer_id: string; total: number }) => {
        if (!salesMap[sale.customer_id]) {
          salesMap[sale.customer_id] = { count: 0, spent: 0 };
        }
        salesMap[sale.customer_id].count += 1;
        salesMap[sale.customer_id].spent += Number(sale.total);
      });

      const ranking: CustomerRanking[] = customers.map(c => ({
        ...c,
        total_purchases: salesMap[c.id]?.count || 0,
        total_spent: salesMap[c.id]?.spent || 0
      }));

      return ranking.sort((a, b) => b.total_spent - a.total_spent || b.total_purchases - a.total_purchases);
    } catch (error) {
      console.error('Error getting customer ranking:', error);
      return [];
    }
  },

  async update(id: string, tenantId: string, updates: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating customer:', error);
      return null;
    }
  },

  async delete(id: string, tenantId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  }
};
