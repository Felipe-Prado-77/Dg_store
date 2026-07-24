(function(){
  const form=document.getElementById('storeSettingsForm');
  if(!form)return;
  function toast(message){const item=document.getElementById('adminToast');item.textContent=message;item.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>item.classList.remove('show'),2600)}
  const split=value=>String(value||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  const join=value=>(value||[]).join('\n');
  const whatsappDigits=value=>{let digits=String(value||'').replace(/\D/g,'');if(digits.length===10||digits.length===11)digits=`55${digits}`;return digits};
  async function load(){
    await window.DGBackend?.ready;
    const settings=window.DGBackend?.config?.store||{};
    document.getElementById('settingWhatsapp').value=settings.whatsapp||'';
    document.getElementById('settingInstagram').value=settings.instagram||'';
    document.getElementById('settingContactEmail').value=settings.contactEmail||'';
    document.getElementById('settingLegalName').value=settings.legalName||'';
    document.getElementById('settingDocumentNumber').value=settings.documentNumber||'';
    document.getElementById('settingStoreAddress').value=settings.address||'';
    document.getElementById('settingStoreCep').value=settings.cep||'';
    document.getElementById('settingLocalPrice').value=settings.localDeliveryPrice??12;
    document.getElementById('settingRemotePrice').value=settings.remoteShippingFallbackPrice??29.9;
    document.getElementById('settingLocalCities').value=join(settings.localCities);
    document.getElementById('settingArmorCities').value=join(settings.armorHomeServiceCities);
  }
  document.getElementById('settingWhatsapp').addEventListener('input',event=>{let value=event.target.value.replace(/\D/g,'').slice(0,13);if(value.startsWith('55')&&value.length>2)value=value.slice(2);if(value.length>10)value=value.replace(/^(\d{2})(\d{5})(\d{0,4})$/,'($1) $2-$3');else if(value.length>6)value=value.replace(/^(\d{2})(\d{4})(\d{0,4})$/,'($1) $2-$3');else if(value.length>2)value=value.replace(/^(\d{2})(\d{0,5})$/,'($1) $2');event.target.value=value});
  document.getElementById('settingStoreCep').addEventListener('input',event=>{let value=event.target.value.replace(/\D/g,'').slice(0,8);if(value.length>5)value=`${value.slice(0,5)}-${value.slice(5)}`;event.target.value=value});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=event.submitter||form.querySelector('[type="submit"]');button.disabled=true;button.textContent='Salvando...';
    const whatsapp=whatsappDigits(document.getElementById('settingWhatsapp').value);
    if(whatsapp.length<12||whatsapp.length>13){toast('Informe um WhatsApp válido com DDD.');button.disabled=false;button.textContent='Salvar configurações';return}
    const publicSettings={
      whatsapp,
      instagram:document.getElementById('settingInstagram').value.trim(),
      contactEmail:document.getElementById('settingContactEmail').value.trim(),
      legalName:document.getElementById('settingLegalName').value.trim(),
      documentNumber:document.getElementById('settingDocumentNumber').value.trim(),
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
          whatsapp_number:publicSettings.whatsapp,
          instagram_url:publicSettings.instagram,
          contact_email:publicSettings.contactEmail,
          legal_name:publicSettings.legalName,
          document_number:publicSettings.documentNumber,
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
