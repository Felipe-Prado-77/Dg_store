(function(){
  const form=document.getElementById('trackingForm');
  const phone=document.getElementById('trackingPhone');
  const labels={pagamento_pendente:'Pagamento pendente',pagamento_aprovado:'Pagamento aprovado',pedido_confirmado:'Pedido confirmado',em_preparo:'Em preparo',aguardando_transportadora:'Aguardando transportadora',a_caminho:'A caminho',entregue:'Entregue',cancelado:'Cancelado'};
  const orderSteps=['pagamento_aprovado','pedido_confirmado','em_preparo','aguardando_transportadora','a_caminho','entregue'];
  const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const dateTime=new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short'});
  phone.addEventListener('input',event=>{let value=event.target.value.replace(/\D/g,'').slice(0,11);if(value.length>10)value=value.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3');else if(value.length>6)value=value.replace(/^(\d{2})(\d{4})(\d{0,4})$/,'($1) $2-$3');else if(value.length>2)value=value.replace(/^(\d{2})(\d{0,5})$/,'($1) $2');else if(value.length)value=value.replace(/^(\d{0,2})$/,'($1');event.target.value=value});
  function digits(value){return String(value||'').replace(/\D/g,'')}
  function readOrders(){try{const value=JSON.parse(localStorage.getItem('dgStoreOrders')||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
  function render(order){
    const customer=order.customer||{};
    document.getElementById('resultId').textContent=order.id;
    const created=new Date(order.createdAt||Date.now());
    document.getElementById('resultDate').textContent=`Realizado em ${dateTime.format(created)}`;
    document.getElementById('resultStatus').textContent=labels[order.status]||order.status||'Em preparo';
    document.getElementById('resultCustomer').textContent=order.customerName||customer.name||'Cliente';
    document.getElementById('resultProducts').textContent=(order.items||[]).map(item=>`${Number(item.quantity)||1}× ${item.name}`).join(', ')||order.productName||'Produto';
    document.getElementById('resultTotal').textContent=currency.format(Number(order.total)||0);
    document.getElementById('resultAddress').textContent=order.address||order.addressData?.formatted||customer.address||'Não informado';
    const current=order.status==='cancelado'?-1:Math.max(0,orderSteps.indexOf(order.status||'pedido_confirmado'));
    const steps=[...document.querySelectorAll('[data-status-step]')];
    steps.forEach((step,index)=>{step.classList.toggle('complete',index<current);step.classList.toggle('active',index===current);step.querySelector('span').textContent=index<=current?'✓':String(index+1)});
    document.querySelectorAll('.timeline-line').forEach((line,index)=>line.classList.toggle('complete',index<current));
    const updated=new Date(order.statusUpdatedAt||order.createdAt||Date.now());
    document.getElementById('resultUpdated').textContent=`Última atualização: ${dateTime.format(updated)}`;
    const section=document.getElementById('trackingResultSection');section.hidden=false;section.scrollIntoView({behavior:'smooth',block:'start'});
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const id=document.getElementById('trackingId').value.trim().toLowerCase();
    const number=digits(phone.value);
    const error=document.getElementById('trackingError');
    if(!id||number.length<10){error.textContent='Informe o ID da compra e um telefone válido.';return}
    const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Consultando...';
    try{
      const order=window.DGBackend?.enabled
        ?(await window.DGBackend.trackOrder(id,number)).order
        :readOrders().find(item=>String(item.id||'').toLowerCase()===id&&digits(item.phone||item.customer?.phone)===number);
      if(!order)throw new Error('Pedido não encontrado. Confira o ID e o telefone.');
      error.textContent='';render(order);
    }catch(failure){
      error.textContent=failure.message||'Pedido não encontrado. Confira o ID e o telefone.';
      document.getElementById('trackingResultSection').hidden=true;
    }finally{
      button.disabled=false;button.textContent='Consultar pedido';
    }
  });
  const params=new URLSearchParams(location.search);
  if(params.get('id'))document.getElementById('trackingId').value=params.get('id');
  if(params.get('phone')){phone.value=params.get('phone');phone.dispatchEvent(new Event('input'))}
  if(params.get('id')&&params.get('phone'))form.requestSubmit();
})();
