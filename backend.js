(function () {
  const config = window.DG_BACKEND_CONFIG || {};
  const configured = Boolean(
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    window.supabase?.createClient
  );
  const client = configured
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const localKeys = {
    products: 'dgStoreProducts',
    orders: 'dgStoreOrders',
    bookings: 'dgStoreBookings',
    booking_slots: 'dgStoreAvailableSlots'
  };

  function digits(value) { return String(value || '').replace(/\D/g, ''); }
  function normaliseCity(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function isAllowedCity(city, list) {
    const target = normaliseCity(city);
    return (list || []).some(item => normaliseCity(item) === target);
  }
  async function invoke(name, body) {
    if (!client) throw new Error('Backend ainda não configurado.');
    const { data, error } = await client.functions.invoke(name, { body });
    if (error) throw new Error(error.message || 'Falha ao acessar o servidor.');
    if (data?.error) throw new Error(data.error);
    return data;
  }
  async function getProducts() {
    if (!client) return null;
    const { data, error } = await client.from('products').select('data').eq('active', true).order('created_at');
    if (error) throw error;
    return (data || []).map(row => row.data);
  }
  async function getAvailableSlots(date) {
    if (!client) return null;
    let query = client.from('booking_slots').select('data').eq('status', 'available').gte('date', new Date().toISOString().slice(0, 10)).order('date').order('time');
    if (date) query = query.eq('date', date);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(row => row.data);
  }
  async function getArmorPackages(options = {}) {
    if (!client) return null;
    let query = client
      .from('armor_packages')
      .select('*')
      .order('display_order')
      .order('created_at');
    if (!options.includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: Number(row.price) || 0,
      features: row.features || [],
      active: row.active,
      featured: row.featured,
      displayOrder: Number(row.display_order) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
  async function getHomeBanners(options = {}) {
    if (!client) return null;
    let query = client
      .from('home_banners')
      .select('*')
      .order('display_order')
      .order('created_at');
    if (!options.includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      imageUrl: row.image_url,
      altText: row.alt_text,
      buttonLabel: row.button_label,
      buttonUrl: row.button_url,
      active: row.active,
      displayOrder: Number(row.display_order) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
  async function loadStoreSettings() {
    if (!client) return config.store || {};
    const { data, error } = await client.from('store_settings').select('*').eq('id', true).single();
    if (error) return config.store || {};
    config.store = {
      ...(config.store || {}),
      name: data.store_name,
      address: data.store_address,
      cep: data.store_cep,
      whatsapp: data.whatsapp_number || '',
      instagram: data.instagram_url || '',
      contactEmail: data.contact_email || '',
      legalName: data.legal_name || '',
      documentNumber: data.document_number || '',
      localDeliveryPrice: Number(data.local_delivery_price) || 0,
      localCities: data.local_cities || [],
      armorHomeServiceCities: data.armor_home_service_cities || [],
      remoteShippingFallbackPrice: Number(data.remote_shipping_fallback_price) || 0
    };
    return config.store;
  }
  async function quoteShipping(payload) { return invoke('shipping-quote', payload); }
  async function createCheckout(payload) { return invoke('create-checkout', payload); }
  async function paymentStatus(sessionId, paymentId) { return invoke('payment-status', { sessionId, paymentId }); }
  async function trackOrder(id, phone) { return invoke('track-order', { id, phone }); }
  async function signIn(email, password) {
    if (!client) throw new Error('Configure o Supabase antes de entrar.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: profile, error: profileError } = await client.from('admin_profiles').select('user_id,display_name').eq('user_id', data.user.id).maybeSingle();
    if (profileError || !profile) {
      await client.auth.signOut();
      throw new Error('Este usuário não possui acesso administrativo.');
    }
    return profile;
  }
  async function signOut() { if (client) await client.auth.signOut(); }
  async function requireAdmin() {
    if (!client) return true;
    const { data } = await client.auth.getSession();
    if (!data.session) return false;
    const { data: profile } = await client.from('admin_profiles').select('user_id,display_name').eq('user_id', data.session.user.id).maybeSingle();
    return Boolean(profile);
  }
  async function hydrateAdmin() {
    if (!client) return;
    const tables = Object.keys(localKeys);
    const localSnapshots = Object.fromEntries(tables.map(table => {
      try {
        const value = JSON.parse(localStorage.getItem(localKeys[table]) || '[]');
        return [table, Array.isArray(value) ? value : []];
      } catch {
        return [table, []];
      }
    }));
    const results = await Promise.all(tables.map(table => client.from(table).select('data')));
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      const table = tables[index];
      if (result.error) throw result.error;
      if (!(result.data || []).length && localSnapshots[table].length) {
        await syncCollection(localKeys[table], localSnapshots[table]);
      } else {
        localStorage.setItem(localKeys[table], JSON.stringify((result.data || []).map(row => row.data)));
      }
    }
  }
  function databaseRow(table, item) {
    const base = { id: String(item.id), data: item, updated_at: new Date().toISOString() };
    if (table === 'products') return { ...base, name: item.name, category: item.category, price: Number(item.price) || 0, stock: Number(item.stock) || 0, active: item.active !== false, featured: item.featured === true };
    if (table === 'orders') return { ...base, phone_digits: digits(item.phone || item.customer?.phone), status: item.status === 'cancelled' ? 'cancelado' : (item.status || 'pagamento_pendente'), total: Number(item.total) || 0, profit: Number(item.profit) || 0, created_at: item.createdAt || new Date().toISOString() };
    if (table === 'bookings') return { ...base, phone_digits: digits(item.phone), status: item.status || 'awaiting_payment', date: item.date, time: item.time, created_at: item.createdAt || new Date().toISOString() };
    return {
      ...base,
      date: item.date,
      time: item.time,
      duration: Number(item.duration) || 60,
      status: item.status || 'available',
      reservation_session_id: (item.status || 'available') === 'available' ? null : (item.reservationSessionId || null),
      reserved_until: (item.status || 'available') === 'available' ? null : (item.reservedUntil || null),
      created_at: item.createdAt || new Date().toISOString()
    };
  }
  async function syncCollection(localKey, items) {
    if (!client) return;
    const table = Object.entries(localKeys).find(([, key]) => key === localKey)?.[0];
    if (!table) return;
    const rows = (items || []).map(item => databaseRow(table, item));
    if (rows.length) {
      const { error } = await client.from(table).upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
    if (table === 'products') {
      const variants = (items || []).flatMap(product => (product.variants || []).map(variant => ({
        id: String(variant.id),
        product_id: String(product.id),
        name: variant.name,
        price_adjustment: Number(variant.priceAdjustment) || 0,
        stock: Number(variant.stock) || 0,
        data: variant,
        updated_at: new Date().toISOString()
      })));
      if (variants.length) {
        const { error: variantError } = await client.from('product_variants').upsert(variants, { onConflict: 'id' });
        if (variantError) throw variantError;
      }
      const productIds = (items || []).map(product => String(product.id));
      const { data: currentVariants, error: currentVariantError } = productIds.length
        ? await client.from('product_variants').select('id').in('product_id', productIds)
        : { data: [], error: null };
      if (currentVariantError) throw currentVariantError;
      const keepVariants = new Set(variants.map(variant => variant.id));
      const removeVariants = (currentVariants || []).map(row => row.id).filter(id => !keepVariants.has(id));
      if (removeVariants.length) {
        const { error: deleteVariantError } = await client.from('product_variants').delete().in('id', removeVariants);
        if (deleteVariantError) throw deleteVariantError;
      }
    }
  }
  async function deleteRecord(localKey, id) {
    if (!client) return;
    const table = Object.entries(localKeys).find(([, key]) => key === localKey)?.[0];
    if (!table) return;
    const { error } = await client.from(table).delete().eq('id', String(id));
    if (error) throw error;
  }
  async function syncRecord(localKey, item) {
    if (!client) return;
    const table = Object.entries(localKeys).find(([, key]) => key === localKey)?.[0];
    if (!table) return;
    const { error } = await client.from(table).upsert(databaseRow(table, item), { onConflict: 'id' });
    if (error) throw error;
  }
  async function uploadProductImage(file) {
    if (!client) throw new Error('Backend não configurado.');
    const extension = (file.name.split('.').pop() || 'webp').replace(/[^a-z0-9]/gi, '');
    const path = `products/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return client.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }
  async function uploadSiteImage(file) {
    if (!client) throw new Error('Backend não configurado.');
    const extension = (file.name.split('.').pop() || 'webp').replace(/[^a-z0-9]/gi, '');
    const path = `banners/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from('site-images').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return client.storage.from('site-images').getPublicUrl(path).data.publicUrl;
  }
  async function lookupCep(cep) {
    const value = digits(cep);
    if (value.length !== 8) throw new Error('Informe um CEP com 8 números.');
    const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
    if (!response.ok) throw new Error('Não foi possível consultar o CEP.');
    const address = await response.json();
    if (address.erro) throw new Error('CEP não encontrado.');
    return address;
  }

  window.DGBackend = {
    enabled: configured,
    client,
    config,
    getProducts,
    getAvailableSlots,
    getArmorPackages,
    getHomeBanners,
    quoteShipping,
    createCheckout,
    paymentStatus,
    trackOrder,
    signIn,
    signOut,
    requireAdmin,
    hydrateAdmin,
    syncCollection,
    syncRecord,
    deleteRecord,
    uploadProductImage,
    uploadSiteImage,
    lookupCep,
    isAllowedCity,
    normaliseCity
  };
  window.DGBackend.ready = loadStoreSettings();
})();
