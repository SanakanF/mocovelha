# Frontend MocoVelha

Interface estática do projeto MocoVelha com skin temática e melhorias interativas.

## Como visualizar

Basta abrir o arquivo `index.html` em um navegador moderno. Nenhuma dependência adicional é necessária neste estágio inicial.

## Estrutura

- `index.html`: marcação principal do tabuleiro, botões e painel de desenvolvedor oculto.
- `style.css`: estilos da skin "Capivara vs Berinjela" e visual do painel dev.
- `script.js`: lógica do jogo, integração com a API e camada de áudio Web Audio.

## Novidades do Plano 4

- **Skin Capivara x Berinjela**: as células usam classes `.cell-x` e `.cell-o` para aplicar o visual dos personagens via CSS.
- **Sons do jogo**: a camada `soundManager` gera efeitos de clique, vitória, empate e "pensando" utilizando Web Audio API.
- **Painel dev oculto**: pressione `Ctrl + Shift + M` para abrir o overlay com estatísticas retornadas pela rota `/state`.
