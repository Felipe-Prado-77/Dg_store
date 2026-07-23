(function(){
  const form=document.getElementById('trackingForm');
  const phone=document.getElementById('trackingPhone');
  const labels={em_preparo:'Em preparo',a_caminho:'A caminho',entregue:'Entregue'};
  const orderSteps=['em_preparo','a_caminho','entregue'];
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
    document.getElementById('resultAddress').textContent=order.address||customer.address||'Não informado';
    const current=Math.max(0,orderSteps.indexOf(order.status||'em_preparo'));
    const steps=[...document.querySelectorAll('[data-status-step]')];
    steps.forEach((step,index)=>{step.classList.toggle('complete',index<current);step.classList.toggle('active',index===current);step.querySelector('span').textContent=index<=current?'✓':String(index+1)});
    document.querySelectorAll('.timeline-line').forEach((line,index)=>line.classList.toggle('complete',index<current));
    const updated=new Date(order.statusUpdatedAt||order.createdAt||Date.now());
    document.getElementById('resultUpdated').textContent=`Última atualização: ${dateTime.format(updated)}`;
    const section=document.getElementById('trackingResultSection');section.hidden=false;section.scrollIntoView({behavior:'smooth',block:'start'});
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const id=document.getElementById('trackingId').value.trim().toLowerCase();
    const number=digits(phone.value);
    const error=document.getElementById('trackingError');
    if(!id||number.length<10){error.textContent='Informe o ID da compra e um telefone válido.';return}
    const order=readOrders().find(item=>String(item.id||'').toLowerCase()===id&&digits(item.phone||item.customer?.phone)===number);
    if(!order){error.textContent='Pedido não encontrado. Confira o ID e o telefone.';document.getElementById('trackingResultSection').hidden=true;return}
    error.textContent='';render(order);
  });
})();
