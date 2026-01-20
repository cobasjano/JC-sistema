'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/lib/store';
import { authService } from '@/lib/services/auth';
import { User, UserRole } from '@/lib/types';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, tenant } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('pos');
  const [name, setName] = useState('');
  const [posNumber, setPosNumber] = useState(1);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [user, tenant, router]);

  const fetchUsers = async () => {
    if (!tenant) return;
    setLoading(true);
    const data = await authService.getUsersByTenant(tenant.id);
    setUsers(data);
    setLoading(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setRole('pos');
    setName('');
    setPosNumber(1);
    setError('');
    setEditingUser(null);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEmail(u.email);
    setPassword(''); // Don't show password
    setRole(u.role);
    setName(u.name || '');
    setPosNumber(u.pos_number || 1);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setError('');
    setIsSubmitting(true);

    try {
      if (editingUser) {
        const updates: any = {
          email,
          role,
          name,
          pos_number: role === 'pos' ? posNumber : 0,
        };
        if (password) updates.password = password;
        
        const success = await authService.updateUser(editingUser.id, updates);
        if (!success) throw new Error('Error al actualizar el usuario');
      } else {
        if (!password) throw new Error('La contraseña es requerida para nuevos usuarios');
        const newUser = await authService.register(
          email,
          password,
          role as 'admin' | 'pos',
          tenant.id,
          role === 'pos' ? posNumber : 0
        );
        if (!newUser) throw new Error('Error al crear el usuario');
        
        // Update name if provided (register doesn't take name currently)
        if (name) {
          await authService.updateUser(newUser.id, { name });
        }
      }

      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === user?.id) {
      alert('No puedes eliminar tu propio usuario administrador.');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    const success = await authService.deleteUser(id);
    if (success) {
      fetchUsers();
    } else {
      alert('Error al eliminar el usuario');
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extralight text-slate-900 tracking-tight">Gestión de Usuarios</h1>
            <p className="text-slate-500 mt-2">Administra los accesos de administradores y cajas de tu comercio.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold transition shadow-xl flex items-center gap-2"
          >
            <span>+</span> Nuevo Usuario
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((u) => (
              <div key={u.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                    u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {u.role === 'admin' ? '👤' : '🏪'}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenEdit(u)}
                      className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-900"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{u.name || 'Sin nombre'}</h3>
                <p className="text-sm text-slate-500 mb-4">{u.email}</p>
                
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-50">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Rol:</span>
                    <span className={u.role === 'admin' ? 'text-indigo-600' : 'text-orange-600'}>{u.role}</span>
                  </div>
                  {u.role === 'pos' && (
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Número de Caja:</span>
                      <span className="text-slate-900">{u.pos_number}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 tracking-tight text-slate-900">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Nombre Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                    placeholder="email@ejemplo.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">
                    {editingUser ? 'Nueva Contraseña (dejar en blanco para mantener)' : 'Contraseña'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                    placeholder="••••••••"
                    required={!editingUser}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Rol</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-5 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                  >
                    <option value="pos">Caja (POS)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                {role === 'pos' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Número de Caja</label>
                    <input
                      type="number"
                      value={posNumber}
                      onChange={(e) => setPosNumber(Number(e.target.value))}
                      className="w-full px-5 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                      min="1"
                      required
                    />
                  </div>
                )}
                {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-4 rounded-2xl">{error}</p>}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold transition hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition disabled:opacity-50 shadow-lg"
                  >
                    {isSubmitting ? 'Procesando...' : (editingUser ? 'Guardar' : 'Crear')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
