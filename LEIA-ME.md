# DG Store — projeto melhorado

Abra `index.html` com uma extensão de servidor local, como Live Server, para testar a navegação.

## Arquivos

- `index.html` + `style.css`: página principal.
- `blindagem.html` + `blindagem.css` + `blindagem.js`: informações, pacotes e FAQ.
- `carrinho.html` + `carrinho.css` + `carrinho.js`: carrinho salvo no `localStorage`.
- `agendamento.html` + `agendamento.css` + `agendamento.js`: dados, pacote, pagamento e confirmação.
- `common.css` + `common.js`: menu, rodapé, responsividade e contador do carrinho compartilhados.

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
