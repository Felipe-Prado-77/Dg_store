# DG Store — ativação do backend

O projeto já contém banco, autenticação, funções de pagamento, entrega e rastreamento. O catálogo e a interface podem ser visualizados localmente, mas compras e agendamentos ficam bloqueados enquanto as credenciais não forem configuradas.

## 1. Criar o projeto Supabase

1. Crie um projeto em <https://supabase.com/dashboard>.
2. Instale a CLI do Supabase ou use `npx supabase`.
3. No terminal, dentro da pasta do site, execute:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

As migrations criam produtos, variações, pedidos, itens, histórico de status, agendamentos, horários, pacotes de blindagem, banners, configurações, logs, regras RLS e os buckets de imagens.

Se o projeto já estava funcionando antes da inclusão de pacotes e banners, basta executar novamente:

```bash
npx supabase db push
npx supabase functions deploy create-checkout
```

O primeiro comando aplica somente a nova migration. O segundo atualiza o cálculo seguro do pagamento para buscar o pacote e o preço diretamente no banco.

## 2. Configurar o frontend

No Supabase, abra **Project Settings → API** e copie:

- Project URL;
- chave `publishable` ou `anon`.

Cole somente esses dois valores em `backend-config.js`. Eles são públicos e protegidos pelas regras RLS.

Nunca coloque no frontend:

- `service_role`;
- Access Token do Mercado Pago;
- assinatura secreta do webhook;
- token do Melhor Envio ou credenciais dos Correios.

## 3. Criar o administrador

1. No Supabase, abra **Authentication → Users**.
2. Crie o usuário do administrador com e-mail e senha forte.
3. Copie o UUID do usuário.
4. Execute no SQL Editor:

```sql
insert into public.admin_profiles (user_id, display_name)
values ('UUID_DO_USUARIO', 'Administrador DG Store');
```

Depois abra `admin-login.html`. O arquivo `admin.html` redireciona usuários não autenticados para o login.

## 4. Mercado Pago

1. Crie uma aplicação em <https://www.mercadopago.com.br/developers/panel/app>.
2. Copie o Access Token de teste.
3. Em **Webhooks**, configure o evento **Pagamentos**.
4. Use esta URL:

```text
https://SEU_PROJECT_REF.supabase.co/functions/v1/mercado-pago-webhook
```

5. Revele e copie a assinatura secreta do webhook.
6. Configure os secrets:

```bash
npx supabase secrets set \
  SITE_URL="https://seu-dominio.com.br" \
  MERCADO_PAGO_ACCESS_TOKEN="SEU_ACCESS_TOKEN" \
  MERCADO_PAGO_WEBHOOK_SECRET="SUA_ASSINATURA_SECRETA"
```

O pedido ou agendamento só é confirmado depois que o webhook:

- valida a assinatura HMAC;
- consulta o pagamento diretamente no Mercado Pago;
- recebe o status `approved`;
- executa a finalização idempotente no banco.

## 5. Entrega local, retirada e Correios

Entre no painel e abra **Configurações**. Preencha:

- endereço da loja;
- CEP de origem;
- valor da entrega local;
- valor provisório para regiões distantes;
- cidades atendidas.

O padrão já inclui:

- Americana;
- Nova Odessa;
- Santa Bárbara d’Oeste;
- Sumaré;
- Hortolândia.

Para os Correios, o projeto usa a API do Melhor Envio como intermediadora, evitando a necessidade de contrato direto com os Correios.

1. Crie uma conta no sandbox do Melhor Envio.
2. Gere um token com permissão de cálculo de frete.
3. Configure:

```bash
npx supabase secrets set \
  MELHOR_ENVIO_TOKEN="SEU_TOKEN" \
  MELHOR_ENVIO_API_URL="https://sandbox.melhorenvio.com.br" \
  MELHOR_ENVIO_USER_AGENT="DG Store contato@seu-dominio.com.br"
```

Sem o token, o sistema mostra um valor provisório claramente identificado. Não publique esse valor como cotação definitiva.

## 6. Publicar as funções

```bash
npx supabase functions deploy create-checkout
npx supabase functions deploy mercado-pago-webhook --no-verify-jwt
npx supabase functions deploy payment-status --no-verify-jwt
npx supabase functions deploy shipping-quote --no-verify-jwt
npx supabase functions deploy track-order --no-verify-jwt
```

O `config.toml` já define quais funções públicas não usam JWT. O webhook valida a assinatura própria do Mercado Pago.

## 7. Testar antes da produção

1. Cadastre um produto no painel.
2. Edite um pacote de blindagem e confirme se o novo preço aparece no agendamento.
3. Cadastre dois banners, teste o carrossel e depois deixe somente um ativo para testar o modo estático.
4. Cadastre horários para a blindagem.
5. Use credenciais e contas de teste do Mercado Pago.
6. Faça uma compra e use o simulador de Webhooks do painel do Mercado Pago para validar a notificação de teste.
7. Confirme se o pedido aprovado aparece no painel.
8. Mude os status e teste o rastreio.
9. Teste CEP local, retirada e CEP distante.
10. Teste blindagem dentro e fora dos cinco municípios.
11. Só depois troque tokens de teste por produção.

## 8. Segurança e manutenção

- Ative MFA no usuário administrador.
- Revogue imediatamente qualquer token exposto.
- Mantenha confirmação de e-mail ativa.
- Confira os logs das Edge Functions e `audit_logs`.
- Ative backups diários e recuperação pontual no plano do Supabase escolhido.
- Configure alertas de erros e consumo.
- Revise `politicas.html` com os dados reais da empresa e orientação jurídica.
- Nunca confirme pagamento usando apenas os parâmetros da URL de retorno.
