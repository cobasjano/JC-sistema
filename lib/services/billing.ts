import { supabase } from '@/lib/supabase';
import { TenantBilling } from '@/lib/types';

export const billingService = {
  async getBillingHistory(tenantId: string): Promise<TenantBilling[]> {
    try {
      const { data, error } = await supabase
        .from('tenant_billing')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching billing history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error in getBillingHistory:', error);
      return [];
    }
  },

  async registerTransaction(transaction: Omit<TenantBilling, 'id' | 'created_at'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tenant_billing')
        .insert([transaction]);

      if (error) {
        console.error('Error registering transaction:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error in registerTransaction:', error);
      return false;
    }
  },

  async getBalance(tenantId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('tenant_billing')
        .select('amount, type')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching balance:', error);
        return 0;
      }

      return (data || []).reduce((acc, curr) => {
        const amount = Number(curr.amount);
        if (curr.type === 'payment') return acc - amount;
        if (curr.type === 'debt') return acc + amount;
        return acc;
      }, 0);
    } catch (error) {
      console.error('Unexpected error in getBalance:', error);
      return 0;
    }
  }
};
