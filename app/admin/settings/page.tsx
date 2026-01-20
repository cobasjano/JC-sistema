'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/lib/store';
import { tenantService } from '@/lib/services/tenants';
import { ThemeSettings } from '@/lib/types';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, tenant, setTenant } = useAuthStore();
  const [primaryColor, setPrimaryColor] = useState('#f97316');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    if (tenant?.settings?.theme) {
      setPrimaryColor(tenant.settings.theme.primary || '#f97316');
      setSecondaryColor(tenant.settings.theme.secondary || '#0f172a');
    }
  }, [user, tenant, router]);

  const handleSave = async () => {
    if (!tenant) return;
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    const theme: ThemeSettings = {
      primary: primaryColor,
      secondary: secondaryColor,
    };

    const success = await tenantService.updateSettings(tenant.id, { theme });

    if (success) {
      setMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
      // Update local store to reflect changes immediately
      setTenant({
        ...tenant,
        settings: {
          ...tenant.settings,
          theme
        }
      });
    } else {
      setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
    }
    setIsSaving(false);
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6 lg:p-10">
        <div className="mb-10">
          <h1 className="text-4xl font-extralight text-slate-900 tracking-tight text-center sm:text-left">Configuración del Sistema</h1>
          <p className="text-slate-500 mt-2 text-center sm:text-left">Personaliza la apariencia y el comportamiento de tu plataforma.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 lg:p-12 shadow-sm border border-slate-100">
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">🎨</span> Personalización de Colores
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Color Primario</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-16 rounded-2xl border-none cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-5 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-900 outline-none transition-all font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Este color se usará para botones, acentos y elementos principales.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Color Secundario</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-16 h-16 rounded-2xl border-none cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 px-5 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-900 outline-none transition-all font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Este color se usará para fondos oscuros y elementos de contraste.</p>
                </div>
              </div>
            </div>

            <div className="mt-10 p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">Vista Previa</h3>
              <div className="flex flex-wrap gap-4">
                <button 
                  style={{ backgroundColor: primaryColor }} 
                  className="px-6 py-2 rounded-xl text-white font-bold text-sm shadow-lg opacity-90 transition-transform hover:scale-105"
                >
                  Botón Primario
                </button>
                <button 
                  style={{ borderColor: primaryColor, color: primaryColor }} 
                  className="px-6 py-2 rounded-xl border-2 font-bold text-sm transition-transform hover:scale-105"
                >
                  Botón Outline
                </button>
                <div 
                  style={{ backgroundColor: secondaryColor }} 
                  className="px-6 py-2 rounded-xl text-white font-bold text-sm shadow-lg transition-transform hover:scale-105"
                >
                  Fondo Secundario
                </div>
              </div>
            </div>
          </section>

          {message.text && (
            <div className={`mb-6 p-4 rounded-2xl text-sm font-bold text-center animate-in fade-in slide-in-from-top-4 duration-300 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              {message.type === 'success' ? '✅' : '❌'} {message.text}
            </div>
          )}

          <div className="flex justify-end border-t border-slate-50 pt-8">
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{ backgroundColor: primaryColor }}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl text-white font-bold transition disabled:opacity-50 shadow-xl hover:scale-[1.02] active:scale-[0.98] shadow-primary/20"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
