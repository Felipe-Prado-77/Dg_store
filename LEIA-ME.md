# DG Store — projeto melhorado

Abra `index.html` com uma extensão de servidor local, como Live Server, para testar a navegação.

O projeto agora possui dois modos:

- **visualização local:** catálogo e interface podem ser vistos sem contas externas, mas compras e agendamentos exigem o backend;
- **backend real:** Supabase + Mercado Pago + Melhor Envio/Correios.

Para ativar o backend, siga [BACKEND-SETUP.md](BACKEND-SETUP.md).

## Arquivos

- `index.html` + `style.css` + `home-content.js`: página principal com banner estático ou carrossel administrável e texto abaixo da imagem.
- `blindagem.html` + `blindagem.css` + `blindagem.js`: informações, pacotes e FAQ.
- `carrinho.html` + `carrinho.css` + `carrinho.js`: carrinho salvo no `localStorage`.
- `checkout.html` + `checkout.css` + `checkout.js`: dados do cliente, endereço, frete e pagamento obrigatório pelo Mercado Pago.
- `agendamento.html` + `agendamento.css` + `agendamento.js`: dados, pacote, pagamento e confirmação.
- `dashboard.html`: atalho direto para abrir o Dashboard.
- `admin.html` + `admin.css` + `admin.js` + `admin-content.js`: painel completo com Dashboard, vendas, blindagens, horários, pacotes, produtos e banners.
- `rastreio.html` + `rastreio.css` + `rastreio-extra.css` + `rastreio.js`: consulta do andamento do pedido pelo ID e telefone.
- `produtos.html` + `produtos.css`: catálogo geral com ambientação tecnológica.
- `relogios.html` + `relogios.css`: catálogo de relógios com ambientação própria.
- `catalogo.css` + `catalogo-extra.css` + `catalogo.js`: grade, busca, ordenação, promoção e cards compartilhados pelos catálogos.
- `produto.html` + `produto.css` + `produto-extra.css` + `produto.js`: página individual com galeria, variações, descrição, preço, estoque, carrinho, especificações e frete.
- `store-data.js`: ponto único para conectar catálogo e cálculo de frete ao backend futuramente.
- `common.css` + `common.js`: menu, rodapé, responsividade e contador do carrinho compartilhados.
- `backend-config.js` + `backend.js`: conexão pública e adaptador do Supabase.
- `site-settings.js`: aplica WhatsApp, Instagram e dados públicos nos rodapés e nas políticas.
- `admin-login.html`: login protegido do administrador.
- `pagamento-retorno.html`: confirmação do Mercado Pago após o checkout.
- `supabase/`: migrations, regras RLS, storage, cron e Edge Functions.
- `politicas.html` + `politicas.css`: modelo de políticas para revisão antes da publicação.
- `404.html`: página de erro para endereços inexistentes.

## Painel administrativo

Abra `dashboard.html` ou `admin.html` para acessar o painel. Nele é possível:

- visualizar lucro total, faturamento, ticket médio, lucro mensal, vendas e blindagens efetuadas;
- acompanhar gráficos de lucro e produtos mais vendidos;
- mudar o status de uma venda desde `Pagamento pendente` até `Entregue` ou `Cancelado`;
- consultar e concluir agendamentos de blindagem;
- cadastrar os horários que aparecem na página de agendamento;
- adicionar, editar, destacar, ativar e excluir pacotes de blindagem com preço e itens incluídos;
- adicionar, editar, ativar, destacar, desativar e excluir produtos;
- adicionar, ordenar, ativar, editar e excluir banners da página inicial;
- cadastrar WhatsApp, Instagram, e-mail e identificação do fornecedor;
- escolher se o produto aparece em `Produtos` ou em `Relógios`;
- cadastrar marca, modelo, garantia, promoção, dimensões, peso, imagens, especificações e variações;
- informar o custo do produto para estimar o lucro.

O cliente pode abrir `rastreio.html` e consultar o status usando o ID da compra e o telefone. Ao concluir o checkout, o link já abre o rastreio preenchido.

## Pasta de imagens e modelos

O logo e o banner estão incluídos. Os modelos 3D abaixo eram referências do site original e precisam ser copiados para `assets/models` caso você queira exibi-los:

- `assets/models/iphone.glb`
- `assets/models/airpods.glb`
- `assets/models/relogio.glb`

## Pacotes e banners administráveis

Os pacotes ficam na tabela `armor_packages`. A página de blindagem e o agendamento mostram somente os ativos, na ordem definida pelo administrador. O preço enviado pelo navegador nunca é aceito como fonte de verdade: a função `create-checkout` busca novamente o pacote ativo e o preço no banco antes de criar o pagamento.

Os banners ficam na tabela `home_banners`. Um único banner ativo permanece estático. Com dois ou mais, a página inicial cria controles e alternância automática. As imagens enviadas pelo painel são salvas no bucket público `site-images`.

O texto do banner aparece abaixo da imagem para não esconder detalhes da arte.

## Confirmação da blindagem pelo WhatsApp

Depois que o servidor confirma o pagamento da blindagem, `payment-status` devolve somente os dados necessários daquela reserva. A página de retorno monta uma mensagem com nome, local, endereço quando for em domicílio, pacote, data, horário e código.

O WhatsApp é aberto automaticamente com a mensagem preenchida. Por segurança e pelas regras do WhatsApp, o cliente ainda precisa tocar em **Enviar**. Envio sem essa confirmação exigiria uma integração separada com a API oficial do WhatsApp Business.

O número usado nesse fluxo é o mesmo cadastrado em **Painel administrativo → Configurações** e exibido no rodapé.

## Checkout e pagamento real

Sem configuração, o checkout e o agendamento ficam bloqueados. Com o Supabase ativado, eles criam uma sessão segura no servidor e redirecionam para o Checkout Pro do Mercado Pago. Não existe aprovação simulada no navegador.

Para ativar pagamento real:

O backend incluído:

1. recalcula produtos, estoque, pacote e frete no servidor;
2. cria a preferência do Mercado Pago;
3. valida a assinatura do webhook;
4. consulta o pagamento diretamente na API;
5. confirma o pedido ou agendamento de forma idempotente;
6. atualiza estoque e reserva o horário.

Siga `BACKEND-SETUP.md` para ativar as credenciais.

## Adicionar produtos ao carrinho

Nos botões de produtos futuros, chame:

```js
DGCart.addItem({
  id: "produto-1",
  name: "Nome do produto",
  variant: "Cor ou modelo",
  price: 199.90,
  image: "assets/produtos/produto-1.png",
  quantity: 1
});
```

O carrinho é salvo na chave `dgStoreCart` do `localStorage`.

Os produtos cadastrados no painel aparecem automaticamente em `produtos.html` ou `relogios.html`, conforme a categoria escolhida. Cada card abre `produto.html?id=ID_DO_PRODUTO`.

## Catálogo, imagens e frete com banco de dados

Quando `backend-config.js` está preenchido, `store-data.js` carrega o catálogo do Supabase e solicita o frete por uma Edge Function. Sem configuração, usa `localStorage`.

No painel autenticado, as imagens são enviadas ao bucket `product-images`. No modo local, elas continuam sendo comprimidas e salvas como dados de demonstração.

## Próximo passo recomendado

1. Criar as contas do Supabase, Mercado Pago e Melhor Envio.
2. Preencher `backend-config.js` e os secrets descritos em `BACKEND-SETUP.md`.
3. Informar o endereço real da loja no painel.
4. Testar pagamentos e entregas em sandbox.
5. Revisar `politicas.html` com os dados reais da empresa e orientação jurídica.

## Dados usados no modo local

- `dgStoreOrders`: vendas e status de entrega.
- `dgStoreBookings`: agendamentos de blindagem.
- `dgStoreAvailableSlots`: horários disponíveis.
- `dgStoreProducts`: catálogo criado no painel.

O `localStorage` serve como demonstração e cache. Quando o backend está ativo, o painel sincroniza esses dados com o Supabase e exige login administrativo.
