import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { posId, posNumber, items, total, paymentMethod, paymentBreakdown, customerId, tenant_id } = await request.json();

    if (!posId || !items || !Array.isArray(items) || items.length === 0 || !total || !tenant_id) {
      return NextResponse.json(
        { error: 'Datos incompletos o items inválidos' },
        { status: 400 }
      );
    }

    if (total < 0) {
      return NextResponse.json(
        { error: 'El total no puede ser negativo' },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.product_id || !item.product_name || typeof item.quantity !== 'number' || !item.unit_price) {
        return NextResponse.json(
          { error: 'Items con datos incompletos o inválidos' },
          { status: 400 }
        );
      }

      if (item.quantity <= 0) {
        return NextResponse.json(
          { error: 'La cantidad de cada producto debe ser mayor a 0' },
          { status: 400 }
        );
      }

      if (item.unit_price < 0) {
        return NextResponse.json(
          { error: 'El precio no puede ser negativo' },
          { status: 400 }
        );
      }

      if (Math.abs(item.subtotal - (item.unit_price * item.quantity)) > 0.01) {
        return NextResponse.json(
          { error: `Subtotal incorrecto para ${item.product_name}` },
          { status: 400 }
        );
      }

      if (item.product_name.toLowerCase().includes('desconocido')) {
        return NextResponse.json(
          { error: `Producto desconocido detectado (ID: ${item.product_id})` },
          { status: 400 }
        );
      }
    }

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .in('id', items.map((item) => item.product_id));

    const uniqueItemIds = [...new Set(items.map(item => item.product_id))];
    if (!products || products.length !== uniqueItemIds.length) {
      const foundIds = products?.map((p) => p.id) || [];
      const missingIds = uniqueItemIds.filter((id) => !foundIds.includes(id));
      
      return NextResponse.json(
        { error: `Productos no encontrados en la base de datos: ${missingIds.join(', ')}` },
        { status: 400 }
      );
    }

    let calculatedTotal = 0;
    for (const item of items) {
      calculatedTotal += item.subtotal;
    }

    if (Math.abs(calculatedTotal - total) > 0.01) {
      return NextResponse.json(
        { error: `Total incorrecto. Se esperaba ${calculatedTotal.toFixed(2)}, pero se recibió ${total.toFixed(2)}` },
        { status: 400 }
      );
    }

    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('settings')
      .eq('id', tenant_id)
      .single();

    const decrementStock = tenantData?.settings?.decrement_stock ?? true;

    const { data: sale, error } = await supabaseAdmin
      .from('sales')
      .insert([{ 
        pos_id: posId, 
        pos_number: posNumber, 
        total, 
        items,
        payment_method: paymentMethod,
        payment_breakdown: paymentBreakdown,
        customer_id: customerId,
        tenant_id: tenant_id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error al crear la venta:', error);
      return NextResponse.json(
        { error: 'Error al crear la venta' },
        { status: 500 }
      );
    }

    // Decrementar stock si la configuración lo permite
    if (decrementStock) {
      for (const item of items) {
        // Intentar usar el RPC para una actualización atómica
        const { error: stockError } = await supabaseAdmin.rpc('decrement_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity
        });

        // Si el RPC falla (por ejemplo, porque la función no existe en la DB), usar fallback manual
        if (stockError) {
          console.warn(`RPC decrement_product_stock falló, usando fallback manual para ${item.product_id}:`, stockError.message);
          
          // Fallback: Obtener stock actual y actualizar (menos seguro pero funciona sin RPC)
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();

          if (product) {
            await supabaseAdmin
              .from('products')
              .update({ stock: (product.stock || 0) - item.quantity })
              .eq('id', item.product_id);
          }
        }
      }
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error('Error interno:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const posId = request.nextUrl.searchParams.get('posId');

    if (!posId) {
      return NextResponse.json(
        { error: 'posId es requerido' },
        { status: 400 }
      );
    }

    const { data: sales, error } = await supabaseAdmin
      .from('sales')
      .select('*')
      .eq('pos_id', posId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Error al obtener ventas' },
        { status: 500 }
      );
    }

    return NextResponse.json(sales);
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
