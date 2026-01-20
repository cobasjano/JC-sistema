import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Product, TenantSettings } from '@/lib/types';

export const importExportService = {
  async importProductsFromExcel(file: File): Promise<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const products = jsonData.map((row: any) => ({
            name: row['Nombre'] || '',
            category: row['Categoria'] || '',
            subcategory: row['SubCAT'] || '',
            description: row['Descripcion'] || '',
            price: parseFloat(row['Precio Venta']) || 0,
            image_url: row['Imagen'] || '',
            stock: 0,
          }));

          resolve(products);
        } catch (error) {
          reject(new Error('Error al leer el archivo Excel'));
        }
      };
      reader.readAsArrayBuffer(file);
    });
  },

  async exportProductsToExcel(products: Product[]): Promise<void> {
    const data = products.map((p) => ({
      ID: p.id,
      Nombre: p.name,
      Categoria: p.category || '',
      SubCAT: p.subcategory || '',
      Descripcion: p.description,
      'Precio Venta': p.price,
      Stock: p.stock,
      Imagen: p.image_url,
      'Fecha Creacion': p.created_at ? new Date(p.created_at).toLocaleString('es-AR') : '',
      'Ultima Actualizacion': p.updated_at ? new Date(p.updated_at).toLocaleString('es-AR') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    worksheet['!cols'] = [
      { wch: 36 }, // ID
      { wch: 25 }, // Nombre
      { wch: 18 }, // Categoria
      { wch: 18 }, // SubCAT
      { wch: 30 }, // Descripcion
      { wch: 15 }, // Precio Venta
      { wch: 10 }, // Stock
      { wch: 35 }, // Imagen
      { wch: 20 }, // Fecha Creacion
      { wch: 20 }, // Ultima Actualizacion
    ];

    XLSX.writeFile(workbook, `productos_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async exportInsightsToPDF(
    dashboardData: any, 
    allSales: any[], 
    salesPerDay: any[] = [], 
    settings?: TenantSettings,
    tenantName?: string
  ): Promise<void> {
    const pdf = new jsPDF();
    let yPosition = 10;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;

    const addSection = (title: string) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 10;
      }
      pdf.setFontSize(14);
      pdf.setFont('', 'bold');
      pdf.text(title, margin, yPosition);
      yPosition += 8;
      pdf.setDrawColor(230, 126, 34);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;
    };

    const addText = (label: string, value: string, isBold = false) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 10;
      }
      pdf.setFontSize(11);
      pdf.setFont('', isBold ? 'bold' : 'normal');
      pdf.text(`${label}: ${value}`, margin + 5, yPosition);
      yPosition += 6;
    };

    const posNames = settings?.pos_names || {};

    const getTopProductsPerPOS = (posNumber: number, limit: number) => {
      const posSales = allSales.filter((s) => s.pos_number === posNumber);
      const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

      posSales.forEach((sale: any) => {
        sale.items.forEach((item: any) => {
          const productName = item.product_name || item.name || 'Desconocido';
          const existing = productMap.get(productName) || {
            name: productName,
            quantity: 0,
            revenue: 0,
          };
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal || item.quantity * (item.price || 0);
          productMap.set(productName, existing);
        });
      });

      return Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit);
    };

    pdf.setFontSize(18);
    pdf.setFont('', 'bold');
    pdf.text(`Reporte de Insights - ${tenantName || 'Sistema Central'}`, margin, yPosition);
    yPosition += 12;

    pdf.setFontSize(10);
    pdf.setFont('', 'normal');
    pdf.text(`Generado: ${new Date().toLocaleString('es-AR')}`, margin, yPosition);
    yPosition += 10;

    addSection('Resumen General');
    addText('Total de Ventas', dashboardData.total_sales.toString(), true);
    addText('Ingresos Totales', `$${dashboardData.total_revenue.toFixed(2)}`, true);
    addText('Items Vendidos', dashboardData.total_items_sold.toString(), true);

    const totalDays = new Set(
      allSales.map((s) => new Date(s.created_at).toDateString())
    ).size;
    const avgDaily = dashboardData.total_revenue / (totalDays || 1);
    addText('Promedio Diario', `$${avgDaily.toFixed(2)}`);

    addSection('Ventas por Negocio');
    const posNumbersInSales = Array.from(new Set(allSales.map(s => s.pos_number))).sort((a, b) => a - b);
    
    for (let posNum of posNumbersInSales) {
      const posSales = allSales.filter((s) => s.pos_number === posNum);
      if (posSales.length === 0) continue;

      const posTotal = posSales.reduce((sum, s) => sum + s.total, 0);
      const posItems = posSales.reduce((sum, s) => sum + s.items.reduce((isum: number, i: any) => isum + i.quantity, 0), 0);
      const posDays = new Set(
        posSales.map((s) => new Date(s.created_at).toDateString())
      ).size;
      const posAvgDaily = posTotal / (posDays || 1);

      if (yPosition > 240) {
        pdf.addPage();
        yPosition = 10;
      }

      pdf.setFontSize(12);
      pdf.setFont('', 'bold');
      pdf.setTextColor(230, 126, 34);
      pdf.text(`${posNames[posNum] || `POS ${posNum}`}`, margin + 3, yPosition);
      pdf.setTextColor(0, 0, 0);
      yPosition += 6;

      addText('  Ventas', posSales.length.toString());
      addText('  Ingresos', `$${posTotal.toFixed(2)}`);
      addText('  Items', posItems.toString());
      addText('  Promedio Diario', `$${posAvgDaily.toFixed(2)}`);
      yPosition += 2;
    }

    addSection('Ventas por Día (Últimos días)');
    if (salesPerDay.length > 0) {
      pdf.setFontSize(9);
      const recentSales = salesPerDay.slice(-30);
      
      // Dynamic columns based on POS in recent sales
      const posInRecent = new Set<number>();
      recentSales.forEach(day => {
        Object.keys(day).forEach(key => {
          if (key.startsWith('pos')) {
            posInRecent.add(Number(key.replace('pos', '')));
          }
        });
      });
      const sortedPosInRecent = Array.from(posInRecent).sort((a, b) => a - b);
      const numCols = 2 + sortedPosInRecent.length;
      const columnWidth = (pageWidth - 2 * margin) / numCols;

      if (yPosition > 200) {
        pdf.addPage();
        yPosition = 10;
      }

      pdf.setFont('', 'bold');
      pdf.text('Fecha', margin, yPosition);
      pdf.text('Total', margin + columnWidth, yPosition);
      sortedPosInRecent.forEach((posNum, idx) => {
        pdf.text(posNames[posNum] || `POS ${posNum}`, margin + columnWidth * (2 + idx), yPosition);
      });
      yPosition += 5;

      pdf.setFont('', 'normal');
      recentSales.forEach((day) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 10;
        }
        pdf.text(day.date, margin, yPosition);
        pdf.text(`$${day.total.toFixed(0)}`, margin + columnWidth, yPosition);
        sortedPosInRecent.forEach((posNum, idx) => {
          const val = day[`pos${posNum}`] || 0;
          pdf.text(`$${val.toFixed(0)}`, margin + columnWidth * (2 + idx), yPosition);
        });
        yPosition += 5;
      });
    }

    addSection('Top Productos por Punto de Venta');
    const prodColWidth = (pageWidth - 2 * margin) / 3;

    for (let posNum of posNumbersInSales) {
      const topPosProducts = getTopProductsPerPOS(posNum, 10);
      if (topPosProducts.length === 0) continue;

      if (yPosition > 230) {
        pdf.addPage();
        yPosition = 10;
      }

      pdf.setFontSize(11);
      pdf.setFont('', 'bold');
      pdf.setTextColor(230, 126, 34);
      pdf.text(posNames[posNum] || `POS ${posNum}`, margin, yPosition);
      pdf.setTextColor(0, 0, 0);
      yPosition += 6;

      pdf.setFontSize(8);
      pdf.setFont('', 'bold');
      pdf.text('Producto', margin, yPosition);
      pdf.text('Cant.', margin + prodColWidth * 1.5, yPosition);
      pdf.text('Ingresos', margin + prodColWidth * 2.2, yPosition);
      yPosition += 4;

      pdf.setFont('', 'normal');
      topPosProducts.forEach((p: any) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 10;
        }
        const productText = p.name.substring(0, 45);
        pdf.text(productText, margin, yPosition);
        pdf.text(p.quantity.toString(), margin + prodColWidth * 1.5, yPosition);
        pdf.text(`$${p.revenue.toFixed(0)}`, margin + prodColWidth * 2.2, yPosition);
        yPosition += 4;
      });

      yPosition += 5;
    }

    pdf.save(`insights_${new Date().toISOString().split('T')[0]}.pdf`);
  },
};
