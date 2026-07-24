(function(){
  const PACKAGES={tela:{name:'Tela',description:'Proteção da tela',price:79.90},'tela-camera':{name:'Tela + câmera',description:'Tela e conjunto de câmeras',price:99.90},completo:{name:'Completo',description:'Tela, câmera e traseira',price:129.90}};
  const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const form=document.getElementById('bookingForm');
  const phone=document.getElementById('phone');
  const cep=document.getElementById('bookingCep');
  const city=document.getElementById('bookingCity');
  const serviceMode=document.getElementById('serviceMode');
  const date=document.getElementById('bookingDate');
  const timeSelect=document.getElementById('bookingTime');
  const packageOptions=document.getElementById('packageOptions');
  const packageError=document.getElementById('packageError');
  const consentError=document.getElementById('consentError');
  const paymentStatus=document.getElementById('paymentStatus');
  const generateButton=document.getElementById('generatePayment');
  const backendEnabled=Boolean(window.DGBackend?.enabled);
  let booking=null;
  let cepData=null;

  if(!backendEnabled){
    generateButton.disabled=true;
    paymentStatus.classList.add('pending');
    paymentStatus.querySelector('span').textContent='Pagamento indisponível. Recarregue a página ou contate a loja.';
  }
  Object.entries(PACKAGES).forEach(([id,item])=>{
    const label=document.createElement('label');label.className='package-option';
    label.innerHTML=`<input type="radio" name="package" value="${id}"><span class="package-card"><b>${item.name}</b><small>${item.description}</small><strong>${currency.format(item.price)}</strong></span>`;
    packageOptions.appendChild(label);
  });
  const requestedPackage=new URLSearchParams(location.search).get('pacote');
  if(PACKAGES[requestedPackage])packageOptions.querySelector(`[value="${requestedPackage}"]`).checked=true;
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);date.min=tomorrow.toISOString().split('T')[0];

  async function availableSlots(selectedDate){
    if(!backendEnabled)throw new Error('O sistema de agendamento está temporariamente indisponível.');
    return window.DGBackend.getAvailableSlots(selectedDate);
  }
  async function loadAvailableTimes(){
    const selectedDate=date.value;
    let slots=[];
    try{slots=selectedDate?(await availableSlots(selectedDate)).filter(slot=>slot.status!=='blocked'&&slot.status!=='reserved').sort((a,b)=>a.time.localeCompare(b.time)):[]}catch(error){window.DGStore?.showToast(error.message)}
    timeSelect.replaceChildren();
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=selectedDate?(slots.length?'Selecione um horário':'Nenhum horário disponível nesta data'):'Escolha uma data primeiro';timeSelect.appendChild(placeholder);
    slots.forEach(slot=>{const option=document.createElement('option');option.value=String(slot.time).slice(0,5);option.dataset.slotId=slot.id;option.textContent=`${String(slot.time).slice(0,5)} • ${slot.duration||60} min`;timeSelect.appendChild(option)});
    timeSelect.disabled=!selectedDate||slots.length===0;
    setFieldError(timeSelect,selectedDate&&!slots.length?'Escolha outra data ou aguarde novos horários.':'');
  }
  date.addEventListener('change',loadAvailableTimes);
  phone.addEventListener('input',event=>{let value=event.target.value.replace(/\D/g,'').slice(0,11);if(value.length>10)value=value.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3');else if(value.length>6)value=value.replace(/^(\d{2})(\d{4})(\d{0,4})$/,'($1) $2-$3');else if(value.length>2)value=value.replace(/^(\d{2})(\d{0,5})$/,'($1) $2');else if(value.length)value=value.replace(/^(\d{0,2})$/,'($1');event.target.value=value});
  cep.addEventListener('input',event=>{let value=event.target.value.replace(/\D/g,'').slice(0,8);if(value.length>5)value=`${value.slice(0,5)}-${value.slice(5)}`;event.target.value=value;city.value='';cepData=null;if(value.replace(/\D/g,'').length===8)lookupCep()});
  async function lookupCep(){
    try{
      cepData=backendEnabled?await window.DGBackend.lookupCep(cep.value):await fetch(`https://viacep.com.br/ws/${cep.value.replace(/\D/g,'')}/json/`).then(response=>response.json());
      if(cepData.erro)throw new Error('CEP não encontrado.');
      city.value=cepData.localidade||'';
      const address=document.getElementById('address');
      if(!address.value)address.value=[cepData.logradouro,cepData.bairro].filter(Boolean).join(', ');
      updateServiceAvailability();
      setFieldError(cep,'');
    }catch(error){setFieldError(cep,error.message||'CEP inválido.');city.value=''}
  }
  function homeAllowed(){
    const list=window.DGBackend?.config?.store?.armorHomeServiceCities||['Americana','Nova Odessa','Santa Bárbara d’Oeste','Sumaré','Hortolândia'];
    return window.DGBackend?.isAllowedCity?window.DGBackend.isAllowedCity(city.value,list):list.some(item=>item.toLowerCase()===city.value.toLowerCase());
  }
  function updateServiceAvailability(){
    const homeOption=serviceMode.querySelector('[value="home"]');
    const allowed=homeAllowed();
    homeOption.disabled=!allowed;
    if(!allowed)serviceMode.value='store';
    document.getElementById('serviceModeHelp').textContent=allowed?'A blindagem pode ser feita no endereço informado ou na loja.':'Para este município, a blindagem está disponível somente na loja.';
  }
  serviceMode.addEventListener('change',updateServiceAvailability);

  function setStep(step){document.querySelectorAll('[data-step-panel]').forEach(panel=>panel.classList.toggle('active',Number(panel.dataset.stepPanel)===step));document.querySelectorAll('[data-step-indicator]').forEach(indicator=>{const value=Number(indicator.dataset.stepIndicator);indicator.classList.toggle('active',value===step);indicator.classList.toggle('complete',value<step)});window.scrollTo({top:document.querySelector('.booking-content').offsetTop-90,behavior:'smooth'})}
  function setFieldError(field,message){const wrapper=field.closest('.field');wrapper?.classList.toggle('invalid',Boolean(message));const small=wrapper?.querySelector('small');if(small&&small.id!=='serviceModeHelp')small.textContent=message}
  function validate(){
    let valid=true;
    form.querySelectorAll('.field [required]').forEach(field=>{const message=field.value.trim()?'':'Este campo é obrigatório.';setFieldError(field,message);if(message)valid=false});
    if(phone.value.replace(/\D/g,'').length<10){setFieldError(phone,'Informe um telefone válido.');valid=false}
    if(cep.value.replace(/\D/g,'').length!==8||!city.value){setFieldError(cep,'Informe e consulte um CEP válido.');valid=false}
    if(serviceMode.value==='home'&&!homeAllowed()){setFieldError(serviceMode,'Atendimento em domicílio indisponível nesta cidade.');valid=false}
    const selectedPackage=form.querySelector('[name="package"]:checked');packageError.textContent=selectedPackage?'':'Selecione um pacote.';if(!selectedPackage)valid=false;
    const consent=document.getElementById('consent');consentError.textContent=consent.checked?'':'Autorize o uso dos dados para continuar.';if(!consent.checked)valid=false;
    return valid;
  }
  function collectBooking(){
    const packageId=form.querySelector('[name="package"]:checked').value;
    return{id:`DG-${Date.now()}`,customer:{name:document.getElementById('customerName').value.trim(),phone:phone.value.trim()},customerName:document.getElementById('customerName').value.trim(),phone:phone.value.trim(),device:document.getElementById('device').value.trim(),cep:cep.value.trim(),city:city.value,address:document.getElementById('address').value.trim(),serviceMode:serviceMode.value,packageId,packageName:PACKAGES[packageId].name,price:PACKAGES[packageId].price,date:date.value,time:timeSelect.value,slotId:timeSelect.selectedOptions[0]?.dataset.slotId||'',notes:document.getElementById('notes').value.trim(),createdAt:new Date().toISOString(),status:'awaiting_payment'};
  }
  function updateSummary(){if(!booking)return;document.getElementById('summaryEmpty').hidden=true;document.getElementById('summaryDetails').hidden=false;document.getElementById('summaryName').textContent=booking.customerName;document.getElementById('summaryDevice').textContent=booking.device;document.getElementById('summaryAddress').textContent=booking.serviceMode==='home'?`${booking.address}, ${booking.city}`:`Na loja — ${window.DGBackend?.config?.store?.address||'endereço a configurar'}`;document.getElementById('summaryPackage').textContent=booking.packageName;const formattedDate=new Intl.DateTimeFormat('pt-BR').format(new Date(`${booking.date}T12:00:00`));document.getElementById('summarySchedule').textContent=`${formattedDate} às ${booking.time}`;document.getElementById('summaryPrice').textContent=currency.format(booking.price)}
  form.addEventListener('input',event=>{if(event.target.matches('.field input,.field select'))setFieldError(event.target,'');if(event.target.name==='package')packageError.textContent='';if(event.target.id==='consent')consentError.textContent=''});
  form.addEventListener('submit',event=>{event.preventDefault();if(!backendEnabled){window.DGStore?.showToast('O pagamento está indisponível. Recarregue a página ou contate a loja.');return}if(!validate()){form.querySelector('.invalid input,.invalid select')?.focus();return}booking=collectBooking();updateSummary();setStep(2)});

  async function createPayment(){
    if(!booking)return;generateButton.disabled=true;generateButton.textContent='Gerando...';
    try{
      if(!backendEnabled)throw new Error('O sistema de pagamento está indisponível.');
      paymentStatus.classList.add('pending');
      paymentStatus.querySelector('span').textContent='Conectando ao Mercado Pago...';
      sessionStorage.setItem('dgCheckoutPhone',booking.phone);
      const result=await window.DGBackend.createCheckout({kind:'booking',...booking,siteUrl:window.DGBackend.config.siteUrl});
      if(!result?.initPoint)throw new Error('O Mercado Pago não retornou o endereço de pagamento.');
      location.href=result.initPoint;
    }catch(error){window.DGStore?.showToast(error.message||'Erro ao gerar pagamento.');paymentStatus.classList.remove('pending');paymentStatus.querySelector('span').textContent='Não foi possível abrir o pagamento.';generateButton.disabled=false;generateButton.textContent='Tentar novamente'}
  }
  generateButton.addEventListener('click',createPayment);
  document.getElementById('backToData').addEventListener('click',()=>{paymentStatus.classList.remove('pending');paymentStatus.querySelector('span').textContent='Pronto para abrir o Mercado Pago';generateButton.disabled=!backendEnabled;generateButton.textContent='Ir para o Mercado Pago';setStep(1)});
})();
