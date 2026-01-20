'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/lib/store';
import { customerService } from '@/lib/services/customers';
import { CustomerRanking } from '@/lib/types';
import Link from 'next/link';

export default function AdminCustomersPage() {
  const router = useRouter();
  const { user, tenant } = useAuthStore();
  const [customers, setCustomers] = useState<CustomerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPos, setSelectedPos] = useState<string>('all');
  
  // Create State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPos, setNewPos] = useState('1');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }

    const fetchCustomers = async () => {
      setLoading(true);
      const data = await customerService.getRanking(user.tenant_id);
      setCustomers(data);
      setLoading(false);
    };

    fetchCustomers();
  }, [user, router]);

  const posOptions = useMemo(() => {
    if (!tenant) return [];
    return Object.entries(tenant.settings.pos_names).map(([number, name]) => ({
      value: number,
      label: `POS ${number} - ${name}`
    }));
  }, [tenant]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim() || !newPhone.trim()) return;

    setIsCreating(true);
    const created = await customerService.create({
      tenant_id: user.tenant_id,
      full_name: newName.trim(),
      phone_number: newPhone.trim(),
      pos_number: parseInt(newPos)
    });

    if (created) {
      setNewName('');
      setNewPhone('');
      setShowCreateModal(false);
      // Re-fetch ranking manually
      const data = await customerService.getRanking(user.tenant_id);
      setCustomers(data);
    }
    setIsCreating(false);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phone_number.includes(searchTerm);
      const matchesPos = selectedPos === 'all' || c.pos_number.toString() === selectedPos;
      return matchesSearch && matchesPos;
    });
  }, [customers, searchTerm, selectedPos]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extralight text-slate-900 tracking-tight">Gestión de Clientes</h1>
            <p className="text-slate-500 text-sm mt-1">Base de datos centralizada de clientes y su valor de vida (LTV)</p>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto items-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 mb-0.5"
            >
              <span>+</span> Nuevo Cliente
            </button>
            <div className="flex flex-col gap-1.5 flex-1 md:w-64">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Buscar</label>
              <input
                type="text"
                placeholder="Nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 md:flex-none">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Origen (POS)</label>
              <select
                value={selectedPos}
                onChange={(e) => setSelectedPos(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all min-w-[150px]"
              >
                <option value="all">Todos los POS</option>
                {posOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-slate-200 shadow-sm">
            <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-500 font-light tracking-widest uppercase text-xs">Sincronizando clientes...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-slate-200 shadow-sm">
            <p className="text-slate-400 font-light italic">No se encontraron clientes con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teléfono</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">POS Origen</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Compras</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Gastado</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                            {customer.full_name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ID: {customer.id.substring(0, 8)}...
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                        {customer.phone_number}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          POS {customer.pos_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                          {customer.total_purchases}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">
                        ${customer.total_spent.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/admin/customers/${customer.id}`}
                          className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-600 transition-colors bg-orange-50 px-4 py-2 rounded-xl border border-orange-100"
                        >
                          VER HISTORIAL
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">Registrar Nuevo Cliente</h3>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Base de Datos Centralizada</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                <input
                  type="text"
                  placeholder="Ej: 1122334455"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">POS de Origen</label>
                <select
                  value={newPos}
                  onChange={(e) => setNewPos(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                >
                  {posOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50"
                >
                  {isCreating ? 'Registrando...' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
