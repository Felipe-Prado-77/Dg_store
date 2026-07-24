/*
  CONFIGURAÇÃO PÚBLICA DO FRONTEND

  1. Crie o projeto no Supabase.
  2. Cole abaixo a URL e a chave publishable/anon.
  3. Nunca coloque service_role, token do Mercado Pago ou senha dos Correios aqui.
*/
window.DG_BACKEND_CONFIG = {
  supabaseUrl: 'https://pedhvdpulstizkftdevf.supabase.co',
  supabaseAnonKey: 'sb_publishable_EKDes7JHGlBxsmWADpNZUw_i-oLWcRZ',
  siteUrl: new URL('.', window.location.href).href.replace(/\/$/, ''),
  store: {
    name: 'DG Store',
    address: 'CONFIGURE O ENDEREÇO DA LOJA',
    cep: '',
    localDeliveryPrice: 12,
    localCities: [
      'Americana',
      'Nova Odessa',
      'Santa Bárbara d’Oeste',
      'Sumaré',
      'Hortolândia'
    ],
    armorHomeServiceCities: [
      'Americana',
      'Nova Odessa',
      'Santa Bárbara d’Oeste',
      'Sumaré',
      'Hortolândia'
    ]
  }
};
