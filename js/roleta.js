/**
 * roleta.js
 * Sorteio, desenho/animação do giro e registro dos resultados.
 *
 * Importante: a cor é sorteada ANTES da animação, com Math.random().
 * A animação apenas leva a roleta até a metade sorteada — ela não
 * altera a chance matemática (seção 9 da especificação).
 */
const Roleta = (function () {
  'use strict';

  const historico = [];

  /** Sorteio equiprovável entre as duas cores (RF03). */
  function sortearCor() {
    return Math.random() < 0.5 ? 'Vermelho' : 'Preto';
  }

  /* ---------- Registro dos resultados (RF07, RF09) ---------- */

  function registrarGiro(cor, previsao) {
    const giro = {
      numero: historico.length + 1,
      cor: cor,
      previsao: previsao || null,
      acertou: previsao ? previsao === cor : null
    };
    historico.push(giro);
    return giro;
  }

  function obterHistorico() {
    return historico.slice();
  }

  function limparHistorico() {
    historico.length = 0;
  }

  /* ---------- Desenho da roleta (SVG) ---------- */

  function desenhar(container) {
    // Pontinhos dourados da borda
    let luzes = '';
    for (let i = 0; i < 24; i++) {
      const a = (i * 15 * Math.PI) / 180;
      const x = (100 + 95.5 * Math.sin(a)).toFixed(2);
      const y = (100 - 95.5 * Math.cos(a)).toFixed(2);
      luzes += '<circle cx="' + x + '" cy="' + y + '" r="1.7"/>';
    }

    // Metade direita (0° a 180°, sentido horário a partir do topo) = Vermelho
    // Metade esquerda (180° a 360°) = Preto
    container.innerHTML =
      '<div class="roleta__ponteiro" aria-hidden="true"></div>' +
      '<div class="roleta__roda">' +
        '<svg viewBox="0 0 200 200" role="img" aria-label="Roleta com duas metades iguais: vermelho e preto">' +
          '<circle cx="100" cy="100" r="100" class="roleta__aro"/>' +
          '<g class="roleta__luzes">' + luzes + '</g>' +
          '<path d="M100 100 L100 9 A91 91 0 0 1 100 191 Z" class="roleta__metade roleta__metade--vermelho"/>' +
          '<path d="M100 100 L100 191 A91 91 0 0 1 100 9 Z" class="roleta__metade roleta__metade--preto"/>' +
          '<circle cx="100" cy="100" r="91" class="roleta__contorno"/>' +
          '<circle cx="100" cy="100" r="70" class="roleta__anel"/>' +
          '<line x1="100" y1="9" x2="100" y2="191" class="roleta__divisa"/>' +
          '<text x="146" y="98" class="roleta__nome">VERMELHO</text>' +
          '<text x="146" y="117" class="roleta__perc">50%</text>' +
          '<text x="54" y="98" class="roleta__nome">PRETO</text>' +
          '<text x="54" y="117" class="roleta__perc">50%</text>' +
        '</svg>' +
      '</div>' +
      '<div class="roleta__brilho" aria-hidden="true"></div>' +
      '<div class="roleta__centro" aria-hidden="true"></div>';
  }

  /* ---------- Animação do giro ---------- */

  function criar(container) {
    const roda = container.querySelector('.roleta__roda');
    let rotacao = 0;
    let girando = false;

    /**
     * Gira a roleta até parar na cor informada.
     * Retorna uma Promise resolvida quando a animação termina,
     * ou null se já houver um giro em andamento (RF04).
     */
    function girar(cor) {
      if (girando) return null;
      girando = true;
      container.classList.add('is-girando');
      container.removeAttribute('data-resultado');

      const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duracao = reduzirMovimento ? 900 : 4200;
      const voltas = reduzirMovimento ? 1 : 5 + Math.floor(Math.random() * 3);

      // Ângulo (na roda) que deve parar sob o ponteiro, longe da divisa
      const margem = 14;
      const inicioMetade = cor === 'Vermelho' ? 0 : 180;
      const alvo = inicioMetade + margem + Math.random() * (180 - 2 * margem);

      const atual = ((rotacao % 360) + 360) % 360;
      const desejado = (360 - alvo) % 360;
      const delta = ((desejado - atual) + 360) % 360;
      rotacao += voltas * 360 + delta;

      roda.style.transitionDuration = duracao + 'ms';
      roda.style.transform = 'rotate(' + rotacao + 'deg)';

      return new Promise(function (resolve) {
        let concluido = false;

        function finalizar(evento) {
          if (evento && (evento.target !== roda || evento.propertyName !== 'transform')) return;
          if (concluido) return;
          concluido = true;
          roda.removeEventListener('transitionend', finalizar);
          girando = false;
          container.classList.remove('is-girando');
          container.setAttribute('data-resultado', cor);
          resolve(cor);
        }

        roda.addEventListener('transitionend', finalizar);
        setTimeout(finalizar, duracao + 200); // garantia caso o evento não dispare
      });
    }

    function limparDestaque() {
      container.removeAttribute('data-resultado');
    }

    return {
      girar: girar,
      limparDestaque: limparDestaque,
      get girando() { return girando; }
    };
  }

  return {
    sortearCor: sortearCor,
    registrarGiro: registrarGiro,
    obterHistorico: obterHistorico,
    limparHistorico: limparHistorico,
    desenhar: desenhar,
    criar: criar
  };
})();
