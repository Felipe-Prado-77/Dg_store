(function(){
  const cart=window.DGStore.readCart();
  const form=document.getElementById('checkoutForm');
  const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  let shipping=null;
  const subtotal=cart.reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.quantity)||1),0);
  const money=value=>currency.format(Number(value)||0);
  const backendEnabled=Boolean(window.DGBackend?.enabled);
  const finishButton=document.getElementById('finishOrderButton');
  if(!backendEnabled){
    finishButton.disabled=true;
    finishButton.textContent='Pagamento indisponível';
  }

  function maskPhone(event){let value=event.target.value.replace(/\D/g,'').slice(0,11);if(value.length>10)value=value.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3');else if(value.length>6)value=value.replace(/^(\d{2})(\d{4})(\d{0,4})$/,'($1) $2-$3');else if(value.length>2)value=value.replace(/^(\d{2})(\d{0,5})$/,'($1) $2');else if(value.length)value=value.replace(/^(\d{0,2})$/,'($1');event.target.value=value}
  function maskCpf(event){let value=event.target.value.replace(/\D/g,'').slice(0,11);value=value.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');event.target.value=value}
  function maskCep(event){let value=event.target.value.replace(/\D/g,'').slice(0,8);if(value.length>5)value=`${value.slice(0,5)}-${value.slice(5)}`;event.target.value=value;shipping=null;renderTotals()}
  document.getElementById('checkoutPhone').addEventListener('input',maskPhone);
  document.getElementById('checkoutCpf').addEventListener('input',maskCpf);
  document.getElementById('checkoutCep').addEventListener('input',maskCep);

  function renderCart(){
    const box=document.getElementById('checkoutItems');
    box.replaceChildren();
    cart.forEach(item=>{
      const row=document.createElement('div');row.className='checkout-item';
      const imageBox=document.createElement('div');imageBox.className='checkout-item-image';
      if(item.image){const image=document.createElement('img');image.src=item.image;image.alt=item.name;image.addEventListener('error',()=>{imageBox.textContent='◇'});imageBox.appendChild(image)}else imageBox.textContent='◇';
      const info=document.createElement('div');const name=document.createElement('strong');name.textContent=item.name;const quantity=document.createElement('span');quantity.textContent=`${Number(item.quantity)||1} unidade(s)${item.variant?` • ${item.variant}`:''}`;info.append(name,quantity);
      const price=document.createElement('b');price.textContent=money((Number(item.price)||0)*(Number(item.quantity)||1));
      row.append(imageBox,info,price);box.appendChild(row);
    });
    renderTotals();
  }
  function renderTotals(){document.getElementById('checkoutSubtotal').textContent=money(subtotal);document.getElementById('checkoutShippingValue').textContent=shipping?money(shipping.price):'A calcular';document.getElementById('checkoutTotal').textContent=money(subtotal+(shipping?.price||0))}
  function setError(field,message){const wrapper=field.closest('.field');wrapper?.classList.toggle('invalid',Boolean(message));const small=wrapper?.querySelector('small');if(small)small.textContent=message}
  function validate(){
    let valid=true;
    form.querySelectorAll('.field [required]').forEach(field=>{const message=field.value.trim()?'':'Campo obrigatório.';setError(field,message);if(message)valid=false});
    const phone=document.getElementById('checkoutPhone');if(phone.value.replace(/\D/g,'').length<10){setError(phone,'Telefone inválido.');valid=false}
    const email=document.getElementById('checkoutEmail');if(email.value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)){setError(email,'E-mail inválido.');valid=false}
    const cpf=document.getElementById('checkoutCpf');if(cpf.value.replace(/\D/g,'').length!==11){setError(cpf,'CPF deve ter 11 números.');valid=false}
    if(!shipping){document.getElementById('shippingCheckoutError').textContent='Calcule e selecione uma opção de entrega.';valid=false}else document.getElementById('shippingCheckoutError').textContent='';
    const consent=document.getElementById('checkoutConsent');document.getElementById('checkoutConsentError').textContent=consent.checked?'':'Você precisa aceitar os termos.';if(!consent.checked)valid=false;
    return valid;
  }
  form.addEventListener('input',event=>{if(event.target.closest('.field'))setError(event.target,'');if(event.target.id==='checkoutConsent')document.getElementById('checkoutConsentError').textContent=''});

  function backendItems(){
    return cart.map(item=>({
      id:item.id,
      productId:String(item.productId||item.id).split('::')[0],
      variantId:String(item.id).includes('::')?String(item.id).split('::')[1]:'',
      variant:item.variant||'',
      quantity:Number(item.quantity)||1,
      price:Number(item.price)||0
    }));
  }
  async function fillAddressByCep(){
    if(!backendEnabled)return;
    try{
      const data=await window.DGBackend.lookupCep(document.getElementById('checkoutCep').value);
      document.getElementById('checkoutStreet').value=data.logradouro||'';
      document.getElementById('checkoutNeighborhood').value=data.bairro||'';
      document.getElementById('checkoutCity').value=data.localidade||'';
      document.getElementById('checkoutState').value=data.uf||'';
    }catch{}
  }
  document.getElementById('calculateCheckoutShipping').addEventListener('click',async()=>{
    const cep=document.getElementById('checkoutCep');const error=document.getElementById('shippingCheckoutError');const container=document.getElementById('checkoutShippingOptions');error.textContent='';container.replaceChildren();const button=document.getElementById('calculateCheckoutShipping');button.disabled=true;button.textContent='...';
    try{
      await fillAddressByCep();
      if(!backendEnabled)throw new Error('O sistema de pagamento está temporariamente indisponível.');
      const result=await window.DGBackend.quoteShipping({cep:cep.value,items:backendItems()});
      (result.options||[]).forEach((option,index)=>{
        const label=document.createElement('label');label.className='shipping-choice';
        const input=document.createElement('input');input.type='radio';input.name='checkoutShipping';input.value=option.id;input.checked=index===0;
        input.addEventListener('change',()=>{shipping={...option,destination:result.destination,demo:result.demo};renderTotals()});
        const span=document.createElement('span');const info=document.createElement('span');const name=document.createElement('b');name.textContent=option.name;const time=document.createElement('small');time.textContent=option.id==='pickup'?(option.storeAddress||'Retirada combinada após o pagamento'):`${option.minDays} a ${option.maxDays} dias úteis`;info.append(name,time);const price=document.createElement('strong');price.textContent=Number(option.price)===0?'Grátis':money(option.price);span.append(info,price);label.append(input,span);container.appendChild(label);
      });
      const first=result.options?.[0];if(first){shipping={...first,destination:result.destination,demo:result.demo};renderTotals()}
      if(result.demo){const notice=document.createElement('p');notice.className='demo-payment-notice';notice.textContent='O valor dos Correios é provisório até configurar o Melhor Envio ou o contrato dos Correios.';container.appendChild(notice)}
    }catch(failure){error.textContent=failure.message||'Não foi possível calcular a entrega.'}
    finally{button.disabled=false;button.textContent='Calcular frete'}
  });

  function customer(){return{name:document.getElementById('checkoutName').value.trim(),phone:document.getElementById('checkoutPhone').value.trim(),email:document.getElementById('checkoutEmail').value.trim(),cpf:document.getElementById('checkoutCpf').value.trim()}}
  function address(){return{cep:document.getElementById('checkoutCep').value.trim(),street:document.getElementById('checkoutStreet').value.trim(),number:document.getElementById('checkoutNumber').value.trim(),complement:document.getElementById('checkoutComplement').value.trim(),neighborhood:document.getElementById('checkoutNeighborhood').value.trim(),city:document.getElementById('checkoutCity').value.trim(),state:document.getElementById('checkoutState').value,formatted:`${document.getElementById('checkoutStreet').value.trim()}, ${document.getElementById('checkoutNumber').value.trim()}${document.getElementById('checkoutComplement').value.trim()?` - ${document.getElementById('checkoutComplement').value.trim()}`:''}, ${document.getElementById('checkoutNeighborhood').value.trim()}, ${document.getElementById('checkoutCity').value.trim()} - ${document.getElementById('checkoutState').value}, ${document.getElementById('checkoutCep').value.trim()}`}}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!validate()){form.querySelector('.invalid input,.invalid select')?.focus();return}
    const button=document.getElementById('finishOrderButton');button.disabled=true;button.textContent='Abrindo Mercado Pago...';
    try{
      if(!backendEnabled)throw new Error('O sistema de pagamento está temporariamente indisponível.');
      const customerData=customer();sessionStorage.setItem('dgCheckoutPhone',customerData.phone);
      const result=await window.DGBackend.createCheckout({kind:'order',customer:customerData,address:address(),items:backendItems(),shippingId:shipping.id,siteUrl:window.DGBackend.config.siteUrl});
      if(!result?.initPoint)throw new Error('O Mercado Pago não retornou o endereço de pagamento.');
      location.href=result.initPoint;
    }catch(failure){window.DGStore.showToast(failure.message||'Não foi possível iniciar o pagamento.');button.disabled=!backendEnabled;button.textContent=backendEnabled?'Ir para o Mercado Pago':'Pagamento indisponível'}
  });
  async function init(){if(!cart.length){location.replace('carrinho.html');return}renderCart()}
  init();
})();
