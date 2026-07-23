# DG Store — projeto melhorado

Abra `index.html` com uma extensão de servidor local, como Live Server, para testar a navegação.

## Arquivos

- `index.html` + `style.css`: página principal.
- `blindagem.html` + `blindagem.css` + `blindagem.js`: informações, pacotes e FAQ.
- `carrinho.html` + `carrinho.css` + `carrinho.js`: carrinho salvo no `localStorage`.
- `agendamento.html` + `agendamento.css` + `agendamento.js`: dados, pacote, pagamento e confirmação.
- `dashboard.html`: atalho direto para abrir o Dashboard.
- `admin.html` + `admin.css` + `admin.js`: painel completo com Dashboard, vendas, blindagens, horários e produtos.
- `rastreio.html` + `rastreio.css` + `rastreio.js`: consulta do andamento do pedido pelo ID e telefone.
- `produtos.html` + `produtos.css`: catálogo geral com ambientação tecnológica.
- `relogios.html` + `relogios.css`: catálogo de relógios com ambientação própria.
- `catalogo.css` + `catalogo.js`: grade, busca, ordenação e cards compartilhados pelos catálogos.
- `produto.html` + `produto.css` + `produto.js`: página individual com galeria, descrição, preço, estoque, carrinho, especificações e frete.
- `store-data.js`: ponto único para conectar catálogo e cálculo de frete ao backend futuramente.
- `common.css` + `common.js`: menu, rodapé, responsividade e contador do carrinho compartilhados.

## Painel administrativo

Abra `dashboard.html` ou `admin.html` para acessar o painel. Nele é possível:

- visualizar lucro total, lucro mensal, vendas e blindagens efetuadas;
- acompanhar gráficos de lucro e produtos mais vendidos;
- mudar o status de uma venda entre `Em preparo`, `A caminho` e `Entregue`;
- consultar e concluir agendamentos de blindagem;
- cadastrar os horários que aparecem na página de agendamento;
- adicionar, editar, ativar, desativar e excluir produtos;
- escolher se o produto aparece em `Produtos` ou em `Relógios`;
- cadastrar especificações que aparecem na página individual;
- informar o custo do produto para estimar o lucro.

O cliente pode abrir `rastreio.html` e consultar o status usando o ID da compra e o telefone.

## Pasta de imagens e modelos

Mantenha sua pasta `assets` ao lado dos arquivos. O projeto usa estes caminhos que já existiam no site original:

- `assets/logo.png`
- `assets/banner2.png`
- `assets/models/iphone.glb`
- `assets/models/airpods.glb`
- `assets/models/relogio.glb`

## Valores dos pacotes

Os preços atuais são demonstrativos. Altere o objeto `PACKAGES`, no começo de `agendamento.js`, antes de publicar.

## Pagamento real

O projeto abre em modo de demonstração porque um site somente com HTML, CSS e JavaScript não pode guardar com segurança a chave secreta de um provedor de pagamento.

Para ativar pagamento real:

1. Crie um endpoint no backend para gerar o Pix usando Mercado Pago, PagBank ou outro provedor.
2. Crie um endpoint para consultar o status do pagamento.
3. Preencha `PAYMENT_API_URL` no começo de `agendamento.js`.
4. Mantenha a chave secreta apenas no servidor.

O contrato esperado pela página está documentado nos comentários do próprio arquivo `agendamento.js`. O agendamento só é salvo quando o status recebido é `approved`.

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

## Catálogo e frete com banco de dados

No começo de `store-data.js` existem duas configurações:

- `PRODUCTS_ENDPOINT`: rota pública que deverá retornar a lista de produtos do banco.
- `SHIPPING_ENDPOINT`: rota do backend que deverá receber CEP, produto e quantidade e consultar a transportadora.

Enquanto essas rotas estiverem vazias, o catálogo usa `localStorage` e o frete funciona em modo de demonstração. Não coloque chaves secretas de transportadoras no JavaScript do navegador.

## Dados usados no modo local

- `dgStoreOrders`: vendas e status de entrega.
- `dgStoreBookings`: agendamentos de blindagem.
- `dgStoreAvailableSlots`: horários disponíveis.
- `dgStoreProducts`: catálogo criado no painel.

O `localStorage` serve apenas para demonstração no mesmo navegador. Para clientes e administrador usarem aparelhos diferentes, conecte essas quatro áreas a um banco de dados e proteja `admin.html` com autenticação feita no servidor.
