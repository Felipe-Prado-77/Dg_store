# Implantar a atualização de segurança

Execute os comandos dentro da pasta do projeto.

## 1. Atualizar o banco

```powershell
npx supabase db push
```

## 2. Configurar os novos secrets

Gere uma chave aleatória no PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Copie o resultado e execute:

```powershell
npx supabase secrets set SITE_URL="https://felipe-prado-77.github.io/Dg_store" ALLOWED_ORIGINS="https://felipe-prado-77.github.io" RATE_LIMIT_SALT="COLE_A_CHAVE_GERADA"
```

Quando tiver o ID numérico da conta recebedora do Mercado Pago:

```powershell
npx supabase secrets set MERCADO_PAGO_USER_ID="ID_NUMERICO_DA_CONTA"
```

## 3. Publicar as funções

```powershell
npx supabase functions deploy create-checkout --no-verify-jwt
npx supabase functions deploy payment-status --no-verify-jwt
npx supabase functions deploy mercado-pago-webhook --no-verify-jwt
npx supabase functions deploy shipping-quote --no-verify-jwt
npx supabase functions deploy track-order --no-verify-jwt
```

## 4. Publicar o frontend

Envie os arquivos atualizados ao GitHub:

```powershell
git add .
git commit -m "Adiciona proteções de segurança"
git push
```

## 5. Bloquear cadastros públicos

No Supabase, abra **Authentication → Providers → Email** e desative a opção
que permite novos cadastros. Os administradores devem ser criados manualmente
em **Authentication → Users** e incluídos em `admin_profiles`.

## 6. Conferência

- Abra a loja em uma janela anônima.
- Calcule um frete.
- Inicie um checkout de teste, sem efetuar pagamento real.
- Confira os logs das cinco Edge Functions.
- Faça o teste de pagamento somente com uma conta de teste do Mercado Pago.
