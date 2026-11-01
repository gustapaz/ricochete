# Ricochete — máquina de impulso

Arcade local de precisão para teclado, mouse e toque. Referência de gênero: rebater uma bola contra alvos; arte, regras, áudio e arenas originais. Phaser 3.90 + TypeScript, sem serviço externo.

## Loop e regras
Mover o rebatedor inferior, lançar o pulso e destruir todos os alvos. Inverter a gravidade muda a trajetória da bola e abre novos ângulos; há intervalo de 0,8 segundo entre inversões. O ponto de contato no rebatedor determina o ângulo de saída. Acertos em sequência aumentam o multiplicador até 5; perder a bola reinicia a sequência e consome uma das cinco cargas. Sem cargas, a partida termina. Limpar uma arena repõe uma carga até o limite de cinco. Cinco arenas autorais terminam a campanha. Sem relógio punitivo. Alvos resistentes precisam de dois impactos; o segundo fica visualmente marcado. A bola nunca deve ficar presa em trajetória horizontal.

## Conteúdo fechado
Cinco composições: Sinal, Desvio, Colmeia, Contrapeso e Ressonância. Dificuldade aumenta com resistência, espaçamento e velocidade. Menu inicial, ajuda reabrível, tutorial curto, partida, pausa, transição de arena, derrota, vitória e nova partida. Recorde e preferências locais com validação e fallback sem storage.

## Direção
Arena vertical de impressora cinética: papel marfim, tinta preta, alvos coral e azul-cobalto, marcas de registro e tipografia grande. Tela principal é a própria máquina, sem landing page, cards ou dashboard. Caudas de trajetória e ondas curtas mostram causalidade, com opção de efeitos reduzidos. Áudio procedural discreto começa apenas por gesto e pode ser silenciado. Nenhuma imagem, música ou marca de terceiros.

## Controles e acesso
Setas/A e D ou ponteiro para mover; Espaço para lançar/inverter; P/Escape para pausar. No toque, arrastar na arena move o rebatedor; botão separado lança/inverte. Menus HTML com foco visível, rótulos e mensagens de estado. Perder foco pausa; retomar exige ação. O gameplay visual não é anunciado como totalmente acessível a leitores de tela.

## Aceitação
Simulação testável em passo fixo, colisões com limites/subpassos, pontuação única, reset integral, progressão e conclusão. Build publicado na subpasta /ricochete/. Jogar em navegador real, testar pausa, foco, áudio, reinício, resize e resultado; registrar honestamente limites de teste de toque físico. Dependências auditadas, staged/histórico/build examinados com scanner redigido. Repo público, commits noreply, apenas gustapaz contribuidor, Pages gratuito sem cartão/faturamento.
