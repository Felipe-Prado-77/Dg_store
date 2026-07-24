(function(){
  const form=document.getElementById('adminLoginForm');
  const error=document.getElementById('loginError');
  const warning=document.getElementById('backendWarning');
  if(!window.DGBackend?.enabled){
    warning.hidden=false;
    form.querySelector('button').disabled=true;
  }else{
    window.DGBackend.requireAdmin().then(ok=>{if(ok)location.replace('admin.html')});
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    error.textContent='';
    const button=event.submitter;
    button.disabled=true;
    button.textContent='Entrando...';
    try{
      await window.DGBackend.signIn(document.getElementById('adminEmail').value.trim(),document.getElementById('adminPassword').value);
      location.replace('admin.html');
    }catch(failure){
      error.textContent=failure.message||'Não foi possível entrar.';
      button.disabled=false;
      button.textContent='Entrar no painel';
    }
  });
})();
