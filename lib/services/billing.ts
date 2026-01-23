import { supabase } from '@/lib/supabase';
import { TenantBilling } from '@/lib/types';
import { notificationService } from './notifications';

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

  async registerTransaction(
    transaction: Omit<TenantBilling, 'id' | 'created_at'>, 
    extendDays: number = 0
  ): Promise<boolean> {
    try {
      // 1. Register the transaction
      const { data: newTx, error } = await supabase
        .from('tenant_billing')
        .insert([transaction])
        .select()
        .single();

      if (error) {
        console.error('Error registering transaction:', error);
        return false;
      }

      // 2. If it's a payment and we have extendDays, update the tenant's paid_until
      if (transaction.type === 'payment' && extendDays > 0) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('paid_until, name')
          .eq('id', transaction.tenant_id)
          .single();

        if (tenant) {
          const currentPaidUntil = tenant.paid_until ? new Date(tenant.paid_until) : new Date();
          const baseDate = currentPaidUntil > new Date() ? currentPaidUntil : new Date();
          const newPaidUntil = new Date(baseDate);
          newPaidUntil.setDate(newPaidUntil.getDate() + extendDays);

          await supabase
            .from('tenants')
            .update({ paid_until: newPaidUntil.toISOString() })
            .eq('id', transaction.tenant_id);
            
          // 3. Notify SuperAdmin
          await notificationService.notifyPayment(tenant.name, transaction.amount, transaction.description);
        }
      }

      return true;
    } catch (error) {
      console.error('Unexpected error in registerTransaction:', error);
      return false;
    }
  },

  async uploadReceipt(tenantId: string, transactionId: string, file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/${transactionId}-${Math.random()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('billing')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('billing')
        .getPublicUrl(filePath);

      // Update the transaction with the receipt URL
      const { error: updateError } = await supabase
        .from('tenant_billing')
        .update({ receipt_url: publicUrl })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      return publicUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      return null;
    }
  },

  async updateTransaction(id: string, updates: Partial<TenantBilling>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tenant_billing')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating transaction:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error in updateTransaction:', error);
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
  },

  async checkOverdueDebts(): Promise<void> {
    try {
      // 1. Get all tenants with their names
      const { data: tenants } = await supabase.from('tenants').select('id, name');
      if (!tenants) return;

      for (const tenant of tenants) {
        // 2. Get the oldest unpaid debt for each tenant
        // For simplicity, we check if they have a 'debt' transaction older than 30 days
        // and if their current balance is still positive (meaning they still owe money)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: oldDebts } = await supabase
          .from('tenant_billing')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('type', 'debt')
          .lt('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (oldDebts && oldDebts.length > 0) {
          const balance = await this.getBalance(tenant.id);
          if (balance > 0) {
            // They have an old debt and still owe money
            const oldestDebt = new Date(oldDebts[0].created_at);
            const daysOfDebt = Math.floor((new Date().getTime() - oldestDebt.getTime()) / (1000 * 60 * 60 * 24));
            
            await notificationService.notifyDebt(tenant.name, daysOfDebt);
          }
        }
      }
    } catch (error) {
      console.error('Error checking overdue debts:', error);
    }
  }
};
