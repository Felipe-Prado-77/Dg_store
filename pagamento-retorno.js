(function(){
  const params=new URLSearchParams(location.search);
  const session=params.get('session');
  const paymentId=params.get('payment_id');
  const result=params.get('result');
  const loader=document.getElementById('statusLoader');
  const eyebrow=document.getElementById('returnEyebrow');
  const title=document.getElementById('returnTitle');
  const message=document.getElementById('returnMessage');
  const code=document.getElementById('returnCode');
  const actions=document.getElementById('returnActions');
  const primary=document.getElementById('returnPrimary');
  const checkAgain=document.getElementById('checkAgain');
  const whatsappNote=document.getElementById('whatsappRedirectNote');
  let attempts=0;

  function formatDate(value){
    const date=value?new Date(`${value}T12:00:00`):null;
    return date&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat('pt-BR').format(date):String(value||'');
  }
  function bookingMessage(data){
    const booking=data.booking||{};
    const locationText=booking.serviceMode==='home'
      ? `A domicílio — ${[booking.address,booking.city].filter(Boolean).join(', ')}`
      : `Na DG Store — ${data.storeAddress||'endereço da loja'}`;
    return [
      'Olá! Quero confirmar minha blindagem.',
      '',
      `Nome: ${booking.customerName||'Cliente'}`,
      `Local: ${locationText}`,
      `Pacote: ${booking.packageName||'Blindagem'}`,
      `Data: ${formatDate(booking.date)}`,
      `Horário: ${String(booking.time||'').slice(0,5)}`,
      `Código: ${data.resultId}`,
      '',
      'Confirmado ✅'
    ].join('\n');
  }
  async function showApproved(data){
    loader.className='status-loader approved';
    eyebrow.textContent='PAGAMENTO APROVADO';
    title.textContent=data.kind==='booking'?'Blindagem agendada':'Pedido confirmado';
    message.textContent=data.kind==='booking'?'Seu horário foi reservado. Agora confirme os dados pelo WhatsApp da DG Store.':'Seu pedido já está no sistema. Guarde o código para acompanhar a entrega.';
    code.hidden=false;code.textContent=data.resultId;
    actions.hidden=false;
    const phone=sessionStorage.getItem('dgCheckoutPhone')||'';
    if(data.kind==='booking'){
      await window.DGContacts?.ready;
      const whatsapp=data.storeWhatsapp||window.DGBackend?.config?.store?.whatsapp||'';
      const whatsappUrl=window.DGContacts?.whatsappUrl(whatsapp,bookingMessage(data))||'';
      if(whatsappUrl){
        primary.href=whatsappUrl;
        primary.textContent='Confirmar no WhatsApp';
        whatsappNote.hidden=false;
        const redirectKey=`dgBookingWhatsappOpened:${session}`;
        if(!sessionStorage.getItem(redirectKey)){
          sessionStorage.setItem(redirectKey,'true');
          setTimeout(()=>location.assign(whatsappUrl),1800);
        }
      }else{
        primary.href='index.html';
        primary.textContent='Voltar para a loja';
        whatsappNote.hidden=false;
        whatsappNote.textContent='O pagamento foi confirmado, mas o WhatsApp da loja ainda não foi configurado no painel administrativo.';
      }
    }else{
      primary.href=`rastreio.html?id=${encodeURIComponent(data.resultId)}&phone=${encodeURIComponent(phone)}`;
      primary.textContent='Rastrear pedido';
    }
    if(data.kind==='order'){localStorage.setItem('dgStoreCart','[]');window.DGStore?.updateCartBadge?.()}
  }
  function showPending(){
    loader.className='status-loader';
    eyebrow.textContent='PAGAMENTO EM PROCESSAMENTO';
    title.textContent='Estamos aguardando a confirmação';
    message.textContent='O Mercado Pago ainda está processando. Você pode verificar novamente em alguns segundos.';
    checkAgain.hidden=false;
  }
  function showFailed(text){
    loader.className='status-loader failed';
    eyebrow.textContent='PAGAMENTO NÃO CONCLUÍDO';
    title.textContent='Não foi possível confirmar';
    message.textContent=text||'Tente novamente ou escolha outra forma de pagamento.';
    actions.hidden=false;primary.href='carrinho.html';primary.textContent='Voltar ao carrinho';
  }
  async function check(){
    checkAgain.hidden=true;
    if(!session||!window.DGBackend?.enabled){showFailed('A referência do pagamento ou o backend não está configurado.');return}
    try{
      const data=await window.DGBackend.paymentStatus(session,paymentId);
      if(data.status==='approved'&&data.resultId){await showApproved(data);return}
      if(['rejected','cancelled','expired'].includes(data.status)||result==='failure'){showFailed();return}
      attempts+=1;
      if(attempts<4){setTimeout(check,2500);return}
      showPending();
    }catch(error){showFailed(error.message)}
  }
  checkAgain.addEventListener('click',()=>{attempts=0;check()});
  check();
})();
