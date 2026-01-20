import { supabase } from '@/lib/supabase';
import { User, Tenant } from '@/lib/types';
import { tenantService } from './tenants';
import crypto from 'crypto';

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; token: string; tenant: Tenant | null } | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return null;
      }

      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      if (user.password_hash !== passwordHash) {
        return null;
      }

      let tenant = null;
      if (user.role !== 'superadmin') {
        if (!user.tenant_id) return null;
        tenant = await tenantService.getTenant(user.tenant_id);
        if (!tenant) return null;
      }

      const token = crypto.randomBytes(32).toString('hex');

      const { error: tokenError } = await supabase
        .from('sessions')
        .insert([{ user_id: user.id, token, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }]);

      if (tokenError) {
        return null;
      }

      return { user, token, tenant };
    } catch {
      return null;
    }
  },

  async register(
    email: string,
    password: string,
    role: 'admin' | 'pos',
    tenantId: string,
    posNumber?: number
  ): Promise<User | null> {
    try {
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            email,
            password_hash: passwordHash,
            role,
            tenant_id: tenantId,
            pos_number: posNumber,
          },
        ])
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

  async validateToken(token: string): Promise<{ user: User; tenant: Tenant | null } | null> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('user_id')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user_id)
        .single();

      if (userError || !user) {
        return null;
      }

      let tenant = null;
      if (user.role !== 'superadmin') {
        if (!user.tenant_id) return null;
        tenant = await tenantService.getTenant(user.tenant_id);
        if (!tenant) return null;
      }

      return { user, tenant };
    } catch {
      return null;
    }
  },

  async logout(token: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('token', token);

      return !error;
    } catch {
      return false;
    }
  },
};
