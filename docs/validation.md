# Validação

## Regras e build

`npm test`: 12 testes determinísticos com Node Test Runner e tsx. Cobrem cinco arenas distintas, lançamento/inversão/recarga, pausa, paredes e teto em alta velocidade, ângulo do rebatedor, pontuação sem duplicação, alvos resistentes, derrota e reset, progressão até vitória, coordenadas inválidas, save corrompido, replay reproduzível e eventos de foco/visibilidade. Os testes de progressão preparam o último alvo de cada arena e usam a colisão real para concluir; não equivalem a completar manualmente a campanha.

`npm run build`: TypeScript estrito e build Vite de produção. Renderer Phaser Canvas 3.90.0. Bundle principal aproximadamente 1,21 MB sem compressão / 325 kB gzip, CSS aproximadamente 7 kB. Sem imagens ou fontes remotas. Simulação fixa em 120 Hz, render alvo em 60 Hz, efeitos limitados a 15 posições de cauda e 24 ondas simultâneas; não há alegação de FPS medido em aparelhos físicos.

`npm audit`: zero vulnerabilidades reportadas na execução local, incluindo ferramentas de desenvolvimento (01/11/2026). O lockfile é versionado e o CI repete a auditoria antes do deploy.

## Navegador

Build de produção servido via preview, subpasta `/ricochete/`: lançamento, pontuação em colisões, perda de cargas, inversão com indicação de recarga, pausa/retomada, manual reabrível e layout de 390 × 844. Arraste por pointer testado na área de jogo após resize. Cabeçalho móvel foi ajustado para evitar quebra do nome; manual usa rolagem quando necessário.

No build local, uma rodada foi jogada até derrota com 2.900 pontos, seguida de reinício: pontuação zerada, cinco cargas e primeira arena restauradas. Preferências de som e efeitos sobreviveram ao recarregamento. Na URL pública [GitHub Pages](https://gustapaz.github.io/ricochete/), foram verificados carregamento, lançamento, colisões com pontuação, inversão de gravidade, pausa e retomada. [Screenshot da partida publicada](public-gameplay.png). O workflow de testes/build/deploy do primeiro commit `6f1b71b` concluiu com sucesso.

Teste em navegador Chromium integrado. Viewport móvel e mouse/pointer não comprovam eventos de toque multitouch em telefone físico. Gameplay visual não tem equivalência completa em leitor de tela. O navegador integrado não reproduziu `blur`/`visibilitychange` ao trocar/ocultar suas abas; por isso esses eventos foram validados com EventTarget nos testes de integração do lifecycle, incluindo pausa sem avanço, limpeza do input e retomada somente explícita. Não se alega teste nativo de troca de foco em múltiplos navegadores.

## Segurança e custos

Sem APIs, credenciais ou serviços de execução. Somente arquivos estáticos necessários em `dist/`, com licenças. CI usa checkout sem credenciais persistidas; job de build tem leitura e job de deploy tem apenas Pages/OIDC. Nada de cartão, trial ou faturamento é necessário. `localStorage` é um recorde não confiável do próprio dispositivo, sem impacto sobre terceiros. Relatórios detalhados do scanner permanecem fora do repositório.

Gitleaks 8.30.1, configuração padrão confiável externa, redação integral e sem exclusões locais: staged, histórico completo de branches/tags e build examinados, sem achados. Secret scanning, proteção de push, alertas e atualizações de segurança habilitados no repositório público. Autor e committer do commit inicial confirmados como Gustavo Paz com noreply; a API de contribuidores retornou apenas `gustapaz`.
