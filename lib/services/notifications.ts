import { supabase } from '../supabase';

export const notificationService = {
  async sendEmail(to: string, subject: string, body: string) {
    console.log(`Sending email to ${to}...`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    
    // In a real implementation, we would call an API route or a Supabase Edge Function
    // that uses a service like Resend, SendGrid, or Nodemailer.
    try {
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, body }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  },

  async notifyPayment(tenantName: string, amount: number, description?: string) {
    const superAdminEmail = 'superadmin@sistema.com'; // Default or fetch from config
    const subject = `Nuevo Pago Registrado: ${tenantName}`;
    const body = `
      El comercio "${tenantName}" ha registrado un nuevo pago.
      
      Monto: $${amount.toLocaleString()}
      Descripción: ${description || 'Sin descripción'}
      Fecha: ${new Date().toLocaleString()}
      
      Por favor, verifique el comprobante en el panel de SuperAdmin.
    `;
    
    return this.sendEmail(superAdminEmail, subject, body);
  },

  async notifyDebt(tenantName: string, daysOfDebt: number) {
    const superAdminEmail = 'superadmin@sistema.com';
    const subject = `Alerta de Deuda: ${tenantName}`;
    const body = `
      El comercio "${tenantName}" tiene una deuda pendiente de más de ${daysOfDebt} días.
      
      Por favor, tome las acciones necesarias desde el panel de SuperAdmin.
    `;
    
    return this.sendEmail(superAdminEmail, subject, body);
  }
};
