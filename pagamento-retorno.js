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
  let attempts=0;

  function showApproved(data){
    loader.className='status-loader approved';
    eyebrow.textContent='PAGAMENTO APROVADO';
    title.textContent=data.kind==='booking'?'Blindagem agendada':'Pedido confirmado';
    message.textContent=data.kind==='booking'?'Seu horário foi reservado. Guarde o código abaixo.':'Seu pedido já está no sistema. Guarde o código para acompanhar a entrega.';
    code.hidden=false;code.textContent=data.resultId;
    actions.hidden=false;
    const phone=sessionStorage.getItem('dgCheckoutPhone')||'';
    primary.href=data.kind==='booking'?'index.html':`rastreio.html?id=${encodeURIComponent(data.resultId)}&phone=${encodeURIComponent(phone)}`;
    primary.textContent=data.kind==='booking'?'Voltar para a loja':'Rastrear pedido';
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
      if(data.status==='approved'&&data.resultId){showApproved(data);return}
      if(['rejected','cancelled','expired'].includes(data.status)||result==='failure'){showFailed();return}
      attempts+=1;
      if(attempts<4){setTimeout(check,2500);return}
      showPending();
    }catch(error){showFailed(error.message)}
  }
  checkAgain.addEventListener('click',()=>{attempts=0;check()});
  check();
})();
