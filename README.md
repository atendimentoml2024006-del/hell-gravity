# Hell Gravity Dash 🔥 Jogo Infernal Mobile

Um jogo arcade *dark cartoon* viciante, responsivo e extremamente polido, desenvolvido inteiramente em **HTML5 Canvas, Vanilla CSS e Web Audio API (Sintetizador Procedural)**.

O jogador guiará um pequeno diabinho carismático por cavernas vulcânicas repletas de lava, pilares pontiagudos e projéteis de fogo horizontais, desafiando seus próprios reflexos!

---

## 🎮 Como Jogar

O jogo suporta tanto controles por **Toque/Clique** quanto por **Teclado (WASD & Setas)**, ideal para mobile e desktop:

| Comando | Teclado WASD | Setas do Teclado | Mobile / Touch |
|:---|:---:|:---:|:---:|
| **Saltar no Ar (Subir)** | `W` | `ArrowUp` | **Toque na Tela** / clique |
| **Mover Esquerda** | `A` | `ArrowLeft` | — |
| **Mover Direita** | `D` | `ArrowRight` | — |
| **Mergulho Rápido** | `S` | `ArrowDown` | — |

### Regras do Jogo
1. **Pontuação por Barreira**: Os pontos são obtidos apenas ao atravessar completamente o vão entre os pilares pontiagudos de pedra.
2. **Níveis Progressivos**: Cada barreira cruzada faz você avançar um nível (`Nível = Pontos + 1`). Toda subida de nível é celebrada com efeitos visuais e sonoros premium!
3. **Armadilhas Vulcânicas (Após Nível 20)**: Ao atingir o **Nível 21** (20 pontos), canhões infernais disparam **bolas de fogo horizontais rápidas**. Fique atento ao indicador visual de `🔥 AVISO` na lateral direita da tela!
4. **Coleta de Recursos**: Pegue moedas douradas demoníacas e power-ups para aumentar sua resistência:
   * 🛡️ **ESCUDO (Ciano)**: Protege contra uma colisão com pilar, lava ou bola de fogo.
   * 🧲 **ÍMÃ (Roxo)**: Atrai todas as moedas na tela automaticamente.
   * ⚡ **BOOST (Dourado)**: Acelera o diabinho, tornando-o invulnerável a qualquer obstáculo ou dano temporariamente.

---

## 🛠️ Tecnologias e Arquitetura

O jogo foi construído focando em desempenho máximo e fidelidade estética, utilizando 100% de tecnologias web nativas sem frameworks pesados:

1. **HTML5 Canvas**: Motor de renderização de alto desempenho para desenhar camadas de fundo parallax, animações suaves do diabinho (incluindo rotação dinâmica e *squash & stretch*), trilhas de movimento e partículas de chamas.
2. **Web Audio API**: Sintetizador procedural completo que gera música chiptune infernal e efeitos sonoros dinâmicos (pulo, coleta de moeda, quebra de escudo, morte) em tempo real, sem carregar arquivos pesados de áudio.
3. **Vanilla CSS**: Folha de estilos premium com design glassmorphism, efeitos neon de glow e animações de interface fluidas.
4. **Design Responsivo**: Adaptado tanto para layouts retrato mobile (com controles nativos de toque) quanto para telas de desktop.

---

## 🚀 Execução Local

Você não precisa de instalações pesadas para rodar o jogo localmente. Basta abrir o arquivo `index.html` em qualquer navegador moderno ou rodar um servidor local simples:

```bash
# Servidor Python simples
python -m http.server 5173

# Ou use qualquer servidor web estático de sua preferência!
```

---

## 👿 Licença

Desenvolvido para entretenimento e aprendizado de física, áudio procedural e efeitos visuais em navegadores. Sinta-se livre para clonar, aprimorar e compartilhar sua pontuação mais alta!
