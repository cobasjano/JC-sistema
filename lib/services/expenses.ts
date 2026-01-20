import { supabase, supabaseAdmin } from '@/lib/supabase';
import { Expense, ExpenseCategory, ExpenseItem } from '@/lib/types';

export const expenseService = {
  async createExpense(
    createdBy: string,
    tenantId: string,
    category: ExpenseCategory,
    items: ExpenseItem[],
    subtotal: number,
    total: number,
    posNumber?: number,
    shippingCost?: number,
    notes?: string
  ): Promise<Expense | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('expenses')
        .insert([
          {
            created_by: createdBy,
            tenant_id: tenantId,
            pos_number: posNumber || null,
            category,
            items,
            subtotal,
            shipping_cost: shippingCost || 0,
            total,
            notes: notes || null,
            status: 'pendiente',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating expense:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating expense:', error);
      return null;
    }
  },

  async getExpenseById(expenseId: string, tenantId: string): Promise<Expense | null> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expenseId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  },

  async getExpensesByAdmin(tenantId: string, limit = 100): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  },

  async getExpensesByPos(posNumber: number, tenantId: string, limit = 100): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('pos_number', posNumber)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  },

  async getExpensesByCategory(category: ExpenseCategory, tenantId: string, limit = 100): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('category', category)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  },

  async getExpensesByStatus(status: 'pendiente' | 'aprobado' | 'rechazado', tenantId: string, limit = 100): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('status', status)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  },

  async updateExpenseStatus(
    expenseId: string,
    tenantId: string,
    status: 'pendiente' | 'aprobado' | 'rechazado'
  ): Promise<Expense | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('expenses')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', expenseId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  },

  async getTotalExpensesByCategory(tenantId: string): Promise<Record<ExpenseCategory, number>> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('category, total')
        .eq('tenant_id', tenantId)
        .eq('status', 'aprobado');

      if (error) {
        return {
          'Compra de Inventario': 0,
          'Expensas': 0,
          'Luz': 0,
          'Internet': 0,
          'Agua': 0,
          'Otros': 0,
        };
      }

      const result: Record<ExpenseCategory, number> = {
        'Compra de Inventario': 0,
        'Expensas': 0,
        'Luz': 0,
        'Internet': 0,
        'Agua': 0,
        'Otros': 0,
      };

      if (data && Array.isArray(data)) {
        data.forEach((expense: any) => {
          const category = expense?.category as ExpenseCategory;
          const total = expense?.total || 0;
          if (category && category in result) {
            result[category] += total;
          }
        });
      }

      return result;
    } catch {
      return {
        'Compra de Inventario': 0,
        'Expensas': 0,
        'Luz': 0,
        'Internet': 0,
        'Agua': 0,
        'Otros': 0,
      };
    }
  },

  async getTotalExpensesByPos(tenantId: string): Promise<Record<number, number>> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('pos_number, total')
        .eq('tenant_id', tenantId)
        .eq('status', 'aprobado')
        .not('pos_number', 'is', null);

      if (error) {
        return {};
      }

      const result: Record<number, number> = {};

      (data || []).forEach((expense: any) => {
        if (expense.pos_number) {
          result[expense.pos_number] = (result[expense.pos_number] || 0) + expense.total;
        }
      });

      return result;
    } catch {
      return {};
    }
  },

  async getTotalExpenses(tenantId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('total')
        .eq('tenant_id', tenantId)
        .eq('status', 'aprobado');

      if (error) {
        return 0;
      }

      return (data || []).reduce((sum, exp) => sum + (exp.total || 0), 0);
    } catch {
      return 0;
    }
  },
};
