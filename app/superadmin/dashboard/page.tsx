'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Tenant, User } from '@/lib/types';
import { authService } from '@/lib/services/auth';
import { tenantService } from '@/lib/services/tenants';
import { salesService } from '@/lib/services/sales';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<{ total_revenue: number; total_sales: number; tenant_count: number } | null>(null);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [managingUsersTenant, setManagingUsersTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
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
    fetchGlobalStats();
  }, [user, router]);

  const fetchGlobalStats = async () => {
    const stats = await salesService.getGlobalStats();
    setGlobalStats(stats);
  };

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

  const fetchTenantUsers = async (tenantId: string) => {
    setLoadingUsers(true);
    const data = await authService.getUsersByTenant(tenantId);
    setTenantUsers(data);
    setLoadingUsers(false);
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    const success = await authService.updateUser(userId, updates);
    if (success && managingUsersTenant) {
      fetchTenantUsers(managingUsersTenant.id);
    } else {
      alert('Error al actualizar el usuario');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    const success = await authService.deleteUser(userId);
    if (success && managingUsersTenant) {
      fetchTenantUsers(managingUsersTenant.id);
    } else {
      alert('Error al eliminar el usuario');
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

        {globalStats && (
          <div className="flex justify-center mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm min-w-[300px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Comercios Activos</span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{globalStats.tenant_count} clientes</div>
            </div>
          </div>
        )}

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
                    placeholder="Ej: Comercio Central"
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
                    placeholder="Ej: Comercio Central"
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

        {managingUsersTenant && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Usuarios de {managingUsersTenant.name}</h2>
                <button 
                  onClick={() => setManagingUsersTenant(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {loadingUsers ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tenantUsers.map(u => (
                      <div key={u.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-sm">{u.name || 'Sin nombre'}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={() => {
                              const newName = prompt('Nuevo nombre:', u.name || '');
                              if (newName !== null) handleUpdateUser(u.id, { name: newName });
                            }}
                            className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded"
                          >
                            Nombre
                          </button>
                          <button 
                            onClick={() => {
                              const newEmail = prompt('Nuevo email:', u.email);
                              if (newEmail) handleUpdateUser(u.id, { email: newEmail });
                            }}
                            className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded"
                          >
                            Email
                          </button>
                          <button 
                            onClick={() => {
                              const newRole = u.role === 'admin' ? 'pos' : 'admin';
                              if (confirm(`¿Cambiar rol a ${newRole}?`)) handleUpdateUser(u.id, { role: newRole });
                            }}
                            className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded"
                          >
                            Rol
                          </button>
                          <button 
                            onClick={() => {
                              const newPass = prompt('Nueva contraseña:');
                              if (newPass) handleUpdateUser(u.id, { password: newPass });
                            }}
                            className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded"
                          >
                            Pass
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded"
                          >
                            Borrar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-gray-400">Añadir Nuevo Administrador</h3>
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
                        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                        
                        const newUser = await authService.register(email, password, 'admin', managingUsersTenant.id);
                        if (newUser) {
                          if (name) await authService.updateUser(newUser.id, { name });
                          fetchTenantUsers(managingUsersTenant.id);
                          form.reset();
                        } else {
                          alert('Error al crear el usuario');
                        }
                      }}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                    >
                      <input name="name" placeholder="Nombre" className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-sm" required />
                      <input name="email" type="email" placeholder="Email" className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-sm" required />
                      <input name="password" type="password" placeholder="Contraseña" className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-sm" required />
                      <button type="submit" className="sm:col-span-3 bg-orange-500 text-white py-2 rounded-xl font-bold text-sm">Crear Administrador</button>
                    </form>
                  </div>
                </div>
              )}
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
                    <button 
                      onClick={() => {
                        setManagingUsersTenant(tenant);
                        fetchTenantUsers(tenant.id);
                      }}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-gray-400 hover:text-blue-500"
                      title="Administrar Usuarios"
                    >
                      👥
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
