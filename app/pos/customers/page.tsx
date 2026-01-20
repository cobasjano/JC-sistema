'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/lib/store';
import { customerService } from '@/lib/services/customers';
import { Customer, CustomerRanking } from '@/lib/types';

export default function CustomersPage() {
  const router = useRouter();
  const { user, tenant } = useAuthStore();
  const [customers, setCustomers] = useState<CustomerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'pos') {
      router.push('/');
      return;
    }

    const fetchCustomers = async () => {
      setLoading(true);
      const data = await customerService.getRanking(user.tenant_id, user.pos_number);
      setCustomers(data);
      setLoading(false);
    };

    fetchCustomers();
  }, [user, router, tenant]);

  const fetchCustomersData = async () => {
    if (!user) return;
    const data = await customerService.getRanking(user.tenant_id, user.pos_number);
    setCustomers(data);
  };

  const validatePhone = (phone: string) => {
    // Permite cualquier formato: +549..., 1121..., 011..., etc.
    // Solo quita espacios/guiones para validar que sean números
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const regex = /^\+?\d{7,15}$/;
    return regex.test(cleanPhone);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !phoneNumber.trim()) {
      setFormError('Todos los campos son obligatorios');
      return;
    }

    if (!validatePhone(phoneNumber)) {
      setFormError('Formato de teléfono no válido');
      return;
    }

    setIsSubmitting(true);
    const newCustomer = await customerService.create({
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      tenant_id: user.tenant_id,
      pos_number: user.pos_number || 0
    });

    if (newCustomer) {
      setFullName('');
      setPhoneNumber('');
      setShowAddForm(false);
      fetchCustomersData();
    } else {
      setFormError('Error al crear cliente. El nombre o teléfono ya pueden existir.');
    }
    setIsSubmitting(false);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone_number.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clientes - {user.name || `POS ${user.pos_number}`}</h1>
            <p className="text-gray-500 mt-1">{tenant?.name}</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-orange-500/20 flex items-center gap-2"
          >
            <span>+</span> Nuevo Cliente
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-5 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-sm"
          />
        </div>

        {/* Modal for adding customer */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">Agregar Cliente</h2>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1 uppercase tracking-widest">Nombre y Apellido</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1 uppercase tracking-widest">Teléfono</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej: +54 9 11 1234 5678 o 11 1234 5678"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">Formatos nacionales e internacionales permitidos</p>
                </div>
                {formError && <p className="text-red-500 text-sm">{formError}</p>}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Ranking List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
            <p className="text-gray-400">Cargando clientes...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Rango</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Teléfono</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Compras</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Monto Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredCustomers.map((customer, index) => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 text-center">
                        <span className={`
                          inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs
                          ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}
                        `}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-800 dark:text-white uppercase tracking-tight">
                        {customer.full_name}
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-medium">
                        {customer.phone_number}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                          {customer.total_purchases}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-green-600">
                        ${customer.total_spent.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">
                        No se encontraron clientes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
