'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Tenant, User } from '@/lib/types';
import { authService } from '@/lib/services/auth';
import { tenantService } from '@/lib/services/tenants';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  
  // New/Edit Tenant Form
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'superadmin') {
      router.push('/');
      return;
    }

    fetchTenants();
  }, [user, router]);

  const fetchTenants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTenants(data);
    }
    setLoading(false);
  };

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // 1. Create Tenant
      const { data: tenant, error: tError } = await supabase
        .from('tenants')
        .insert([{ name: tenantName, slug: tenantSlug }])
        .select()
        .single();

      if (tError || !tenant) {
        throw new Error('Error al crear el comercio: ' + tError?.message);
      }

      // 2. Create Admin User for this Tenant
      const result = await authService.register(
        adminEmail,
        adminPassword,
        'admin',
        tenant.id
      );

      if (!result) {
        // Cleanup tenant if user creation fails
        await supabase.from('tenants').delete().eq('id', tenant.id);
        throw new Error('Error al crear el usuario administrador');
      }

      // Success
      setTenantName('');
      setTenantSlug('');
      setAdminEmail('');
      setAdminPassword('');
      setShowAddTenant(false);
      fetchTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setError('');
    setIsSubmitting(true);

    try {
      const success = await tenantService.updateTenant(editingTenant.id, {
        name: tenantName,
        slug: tenantSlug,
      });

      if (!success) throw new Error('Error al actualizar el comercio');

      setEditingTenant(null);
      setTenantName('');
      setTenantSlug('');
      fetchTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este comercio? Se borrarán todos sus datos.')) return;
    
    try {
      const success = await tenantService.deleteTenant(id);
      if (success) {
        fetchTenants();
      } else {
        alert('Error al eliminar el comercio');
      }
    } catch (err) {
      console.error(err);
      alert('Error inesperado');
    }
  };

  if (!user || user.role !== 'superadmin') return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Panel SuperAdmin SaaS</h1>
            <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold opacity-60">Gestión Global de Comercios</p>
          </div>
          <button
            onClick={() => setShowAddTenant(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-orange-500/20 flex items-center gap-2"
          >
            <span>+</span> Nuevo Comercio
          </button>
        </div>

        {showAddTenant && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/10">
              <h2 className="text-2xl font-bold mb-6 tracking-tight">Configurar Nuevo Cliente</h2>
              <form onSubmit={handleAddTenant} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Nombre del Comercio</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => {
                      setTenantName(e.target.value);
                      setTenantSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    placeholder="Ej: Juguetería Central"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Slug (URL)</label>
                  <input
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-400 text-xs"
                    required
                  />
                </div>
                <div className="pt-2 border-t border-gray-50 dark:border-gray-700">
                  <label className="block text-[10px] font-bold text-orange-500 mb-4 uppercase tracking-widest">Credenciales del Dueño</label>
                  <div className="space-y-4">
                    <input
                      type="email"
                      placeholder="Email del administrador"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      required
                    />
                    <input
                      type="password"
                      placeholder="Contraseña inicial"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-lg">{error}</p>}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddTenant(false)}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold transition hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition disabled:opacity-50 shadow-lg shadow-orange-500/20"
                  >
                    {isSubmitting ? 'Creando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingTenant && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/10">
              <h2 className="text-2xl font-bold mb-6 tracking-tight">Editar Comercio</h2>
              <form onSubmit={handleUpdateTenant} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Nombre del Comercio</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => {
                      setTenantName(e.target.value);
                      setTenantSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    placeholder="Ej: Juguetería Central"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Slug (URL)</label>
                  <input
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-400 text-xs"
                    required
                  />
                </div>
                {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-lg">{error}</p>}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingTenant(null)}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold transition hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition disabled:opacity-50 shadow-lg shadow-orange-500/20"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-xl">
                    🏢
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingTenant(tenant);
                        setTenantName(tenant.name);
                        setTenantSlug(tenant.slug);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-orange-500"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDeleteTenant(tenant.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{tenant.name}</h3>
                <p className="text-xs text-gray-400 font-mono mb-4">slug: {tenant.slug}</p>
                
                <div className="flex flex-col gap-2 pt-4 border-t border-gray-50 dark:border-gray-700">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <span>Creado:</span>
                    <span className="text-gray-400">{new Date(tenant.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {tenants.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                <p className="text-gray-400 font-medium italic">No hay comercios registrados aún.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
