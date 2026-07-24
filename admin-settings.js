(function(){
  const form=document.getElementById('storeSettingsForm');
  if(!form)return;
  function toast(message){const item=document.getElementById('adminToast');item.textContent=message;item.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>item.classList.remove('show'),2600)}
  const split=value=>String(value||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  const join=value=>(value||[]).join('\n');
  async function load(){
    await window.DGBackend?.ready;
    const settings=window.DGBackend?.config?.store||{};
    document.getElementById('settingStoreAddress').value=settings.address||'';
    document.getElementById('settingStoreCep').value=settings.cep||'';
    document.getElementById('settingLocalPrice').value=settings.localDeliveryPrice??12;
    document.getElementById('settingRemotePrice').value=settings.remoteShippingFallbackPrice??29.9;
    document.getElementById('settingLocalCities').value=join(settings.localCities);
    document.getElementById('settingArmorCities').value=join(settings.armorHomeServiceCities);
  }
  document.getElementById('settingStoreCep').addEventListener('input',event=>{let value=event.target.value.replace(/\D/g,'').slice(0,8);if(value.length>5)value=`${value.slice(0,5)}-${value.slice(5)}`;event.target.value=value});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=event.submitter;button.disabled=true;button.textContent='Salvando...';
    const publicSettings={
      address:document.getElementById('settingStoreAddress').value.trim(),
      cep:document.getElementById('settingStoreCep').value.trim(),
      localDeliveryPrice:Number(document.getElementById('settingLocalPrice').value)||0,
      remoteShippingFallbackPrice:Number(document.getElementById('settingRemotePrice').value)||0,
      localCities:split(document.getElementById('settingLocalCities').value),
      armorHomeServiceCities:split(document.getElementById('settingArmorCities').value)
    };
    try{
      if(window.DGBackend?.enabled){
        const {error}=await window.DGBackend.client.from('store_settings').update({
          store_address:publicSettings.address,
          store_cep:publicSettings.cep,
          local_delivery_price:publicSettings.localDeliveryPrice,
          remote_shipping_fallback_price:publicSettings.remoteShippingFallbackPrice,
          local_cities:publicSettings.localCities,
          armor_home_service_cities:publicSettings.armorHomeServiceCities
        }).eq('id',true);
        if(error)throw error;
      }
      Object.assign(window.DGBackend.config.store,publicSettings);
      toast('Configurações salvas.');
    }catch(error){toast(error.message||'Não foi possível salvar.')}
    finally{button.disabled=false;button.textContent='Salvar configurações'}
  });
  load();
})();
