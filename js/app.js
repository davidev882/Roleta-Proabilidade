/**
 * app.js
 * Controle da interface: botões, previsões, mensagens e atualização da tela.
 */
(function () {
  'use strict';

  const $ = function (seletor) { return document.querySelector(seletor); };
  const fmt = Estatisticas.formatarPercentual;
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Montagem das roletas ---------- */
  document.querySelectorAll('[data-roleta]').forEach(Roleta.desenhar);
  const rodaPrincipal = Roleta.criar($('#roleta-principal'));
  const rodaDesafio = Roleta.criar($('#roleta-desafio'));

  /* ---------- Utilidades ---------- */
  function slug(cor) { return cor === 'Vermelho' ? 'vermelho' : 'preto'; }
  function oposta(cor) { return cor === 'Vermelho' ? 'Preto' : 'Vermelho'; }
  function plural(n, singular, pluralTxt) { return n === 1 ? singular : pluralTxt; }

  function anunciar(texto) {
    const el = $('#anuncio');
    el.textContent = '';
    setTimeout(function () { el.textContent = texto; }, 50);
  }

  function chipHTML(giro) {
    return '<li class="chip chip--' + slug(giro.cor) + '">' +
      '<span aria-hidden="true">' + giro.cor.charAt(0) + '</span>' +
      '<span class="sr-only">Giro ' + giro.numero + ': ' + giro.cor + '</span></li>';
  }

  function rolarPara(el) {
    el.scrollIntoView({ behavior: reduzirMovimento ? 'auto' : 'smooth', block: 'start' });
  }

  /* =========================================================
     ROLETA VIRTUAL
     ========================================================= */
  const botaoGirar = $('#botao-girar');
  const radiosPrevisao = document.querySelectorAll('input[name="previsao"]');
  const avisoPrevisao = $('#aviso-previsao');
  const resultadoEl = $('#resultado');
  const perguntaEl = $('#pergunta-sequencia');

  const MENSAGENS_INDEPENDENCIA = [
    'O próximo giro continua com 50% de chance para Vermelho e 50% para Preto.',
    'A roleta não tem memória: o próximo giro é um novo experimento, com 50% para cada cor.',
    'Este resultado não muda nada no próximo giro — cada cor continua com 50%.',
    'Acertar ou errar não muda a regra: no próximo giro, cada cor continua com 50%.'
  ];

  function obterPrevisao() {
    const marcado = document.querySelector('input[name="previsao"]:checked');
    return marcado ? marcado.value : null;
  }

  function atualizarPrevisaoAtual() {
    const previsao = obterPrevisao();
    $('#previsao-atual').innerHTML = previsao
      ? 'Sua previsão: <strong class="txt-' + slug(previsao) + '">' + previsao + '</strong>'
      : 'Sua previsão: <strong>nenhuma escolhida</strong>';
    if (previsao) avisoPrevisao.hidden = true;
  }

  radiosPrevisao.forEach(function (radio) {
    radio.addEventListener('change', atualizarPrevisaoAtual);
  });

  function travarControles(travar) {
    botaoGirar.setAttribute('aria-disabled', String(travar));
    botaoGirar.textContent = travar ? 'Girando…' : 'Girar roleta';
    radiosPrevisao.forEach(function (r) { r.disabled = travar; });
    $('#botao-reiniciar').disabled = travar;
  }

  botaoGirar.addEventListener('click', function () {
    if (rodaPrincipal.girando) return; // RF04: sem giros sobrepostos

    const previsao = obterPrevisao();
    if (!previsao) {
      avisoPrevisao.hidden = false;
      radiosPrevisao[0].focus();
      return;
    }

    const cor = Roleta.sortearCor();
    const giro = rodaPrincipal.girar(cor);
    if (!giro) return;

    travarControles(true);
    perguntaEl.hidden = true;
    resultadoEl.className = 'resultado resultado--girando';
    resultadoEl.innerHTML = '<p class="resultado__espera">Girando… sua previsão é <strong class="txt-' + slug(previsao) + '">' + previsao + '</strong>.</p>';

    giro.then(function () {
      const registro = Roleta.registrarGiro(cor, previsao);
      travarControles(false);
      mostrarResultado(registro);
      atualizarTudo();
      verificarSequencia();
    });
  });

  function mostrarResultado(giro) {
    const s = slug(giro.cor);
    const mensagem = MENSAGENS_INDEPENDENCIA[(giro.numero - 1) % MENSAGENS_INDEPENDENCIA.length];
    const comparacao = giro.acertou
      ? '<p class="resultado__comparacao is-acerto"><span aria-hidden="true">✓</span> Você previu ' + giro.previsao + ' e acertou.</p>'
      : '<p class="resultado__comparacao is-erro"><span aria-hidden="true">✗</span> Você previu ' + giro.previsao + '. Desta vez não acertou.</p>';

    resultadoEl.className = 'resultado resultado--' + s;
    resultadoEl.innerHTML =
      '<p class="resultado__rotulo">Resultado do giro nº ' + giro.numero + '</p>' +
      '<p class="resultado__cor"><span class="bolinha bolinha--' + s + '" aria-hidden="true"></span>' + giro.cor + '</p>' +
      comparacao +
      '<p class="resultado__explicacao">' + mensagem + '</p>';
  }

  /* Após 5+ resultados iguais seguidos, pergunta se a cor oposta ficou mais provável */
  function verificarSequencia() {
    const est = Estatisticas.calcular(Roleta.obterHistorico());
    const seq = est.sequenciaAtual;
    if (seq.tamanho < 5) { perguntaEl.hidden = true; return; }

    const outra = oposta(seq.cor);
    perguntaEl.innerHTML =
      '<p class="pergunta-sequencia__titulo">Saíram <strong>' + seq.tamanho + ' × ' + seq.cor + '</strong> seguidos!</p>' +
      '<p>Depois disso, a chance de sair <strong>' + outra + '</strong> no próximo giro aumentou?</p>' +
      '<div class="pergunta-sequencia__botoes">' +
        '<button type="button" class="botao botao--secundario botao--pequeno" data-resposta="sim">Sim, aumentou</button>' +
        '<button type="button" class="botao botao--secundario botao--pequeno" data-resposta="nao">Não, continua 50%</button>' +
      '</div>' +
      '<p class="pergunta-sequencia__retorno" hidden></p>';
    perguntaEl.hidden = false;

    perguntaEl.querySelectorAll('[data-resposta]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        const retorno = perguntaEl.querySelector('.pergunta-sequencia__retorno');
        const correto = botao.dataset.resposta === 'nao';
        retorno.className = 'pergunta-sequencia__retorno ' + (correto ? 'is-acerto' : 'is-erro');
        retorno.innerHTML = (correto
          ? '<strong>Isso mesmo!</strong> Cada giro é independente. '
          : '<strong>Essa é a Falácia do Apostador!</strong> A roleta não lembra dos giros anteriores. ') +
          'O próximo giro continua com <strong>50% para Vermelho e 50% para Preto</strong>. ' +
          'Uma sequência de cinco iguais tinha só 1/32 (3,125%) de chance antes de começar — mas, depois que ela aconteceu, não muda o próximo giro.';
        retorno.hidden = false;
        perguntaEl.querySelectorAll('[data-resposta]').forEach(function (b) {
          b.disabled = true;
          if (b === botao) b.classList.add('is-escolhido');
        });
      });
    });
  }

  /* =========================================================
     ESTATÍSTICAS, HISTÓRICO E CONCLUSÃO
     ========================================================= */
  function atualizarTudo() {
    const historico = Roleta.obterHistorico();
    const est = Estatisticas.calcular(historico);

    // Contadores (RF08)
    $('#est-total').textContent = est.total;
    $('#est-vermelho').textContent = est.vermelhos;
    $('#est-preto').textContent = est.pretos;
    $('#est-perc-vermelho').textContent = fmt(est.percVermelho);
    $('#est-perc-preto').textContent = fmt(est.percPreto);

    // Previsões
    if (est.previsoes) {
      $('#est-acertos').textContent = est.acertos + '/' + est.previsoes;
      $('#est-acertos-detalhe').textContent = fmt(est.percAcertos) + ' de acerto';
    } else {
      $('#est-acertos').textContent = '—';
      $('#est-acertos-detalhe').textContent = 'Nenhum giro realizado';
    }

    // Barra observada
    const barra = $('#barra-observada');
    const segV = $('#barra-obs-v');
    const segP = $('#barra-obs-p');
    if (est.total) {
      segV.style.width = est.percVermelho + '%';
      segP.style.width = est.percPreto + '%';
      segV.textContent = est.percVermelho >= 14 ? fmt(est.percVermelho) : '';
      segP.textContent = est.percPreto >= 14 ? fmt(est.percPreto) : '';
      $('#barra-obs-vazia').hidden = true;
      barra.setAttribute('aria-label', 'Frequência observada: ' + fmt(est.percVermelho) + ' vermelho e ' + fmt(est.percPreto) + ' preto');
    } else {
      segV.style.width = '0%';
      segP.style.width = '0%';
      segV.textContent = '';
      segP.textContent = '';
      $('#barra-obs-vazia').hidden = false;
      barra.setAttribute('aria-label', 'Nenhum giro realizado');
    }

    // Sequências (RF10)
    $('#est-maior-v').textContent = est.maiorVermelho;
    $('#est-maior-p').textContent = est.maiorPreto;
    $('#est-atual').innerHTML = est.sequenciaAtual.tamanho
      ? est.sequenciaAtual.tamanho + ' × <span class="txt-' + slug(est.sequenciaAtual.cor) + '">' + est.sequenciaAtual.cor + '</span>'
      : '—';

    // Últimos giros (na área da roleta)
    const ultimos = historico.slice(-12);
    $('#ultimos-giros').innerHTML = ultimos.map(chipHTML).join('');
    $('#ultimos-vazio').hidden = historico.length > 0;

    // Histórico completo em ordem (RF09)
    const lista = $('#historico-lista');
    lista.innerHTML = historico.map(function (g) {
      const s = slug(g.cor);
      return '<li class="hist hist--' + s + '">' +
        '<span class="hist__num">Giro ' + g.numero + '</span>' +
        '<span class="hist__cor"><span class="bolinha bolinha--' + s + '" aria-hidden="true"></span>' + g.cor + '</span>' +
        '<span class="hist__prev ' + (g.acertou ? 'is-acerto' : 'is-erro') + '">Previu ' + g.previsao +
        ' <span aria-hidden="true">' + (g.acertou ? '✓' : '✗') + '</span>' +
        '<span class="sr-only">' + (g.acertou ? '(acertou)' : '(errou)') + '</span></span>' +
        '</li>';
    }).join('');
    lista.scrollTop = lista.scrollHeight;
    $('#historico-vazio').hidden = historico.length > 0;

    atualizarConclusao(est);
  }

  function atualizarConclusao(est) {
    const el = $('#conclusao-dados');
    if (!est.total) {
      el.innerHTML = 'Ainda não há giros. Gire a roleta algumas vezes e volte aqui para ver a conclusão com os seus dados.';
      return;
    }

    let texto = 'Em <strong>' + est.total + ' ' + plural(est.total, 'giro', 'giros') + '</strong>, saiu ' +
      '<span class="txt-vermelho">Vermelho</span> em <strong>' + fmt(est.percVermelho) + '</strong> e ' +
      'Preto em <strong>' + fmt(est.percPreto) + '</strong> das vezes. ' +
      'A probabilidade teórica era — e continuou sendo — <strong>50% para cada cor em todos os giros</strong>. ';

    texto += est.total < 30
      ? 'Com poucos giros, é normal a frequência observada ficar longe de 50%: isso não quer dizer que a roleta vai “compensar” depois. '
      : 'Com mais giros, as frequências tendem a se aproximar de 50%, mas não precisam ser exatamente iguais. ';

    const maior = Math.max(est.maiorVermelho, est.maiorPreto);
    if (maior >= 3) {
      const corMaior = est.maiorVermelho >= est.maiorPreto ? 'Vermelho' : 'Preto';
      texto += 'Sua maior sequência foi de <strong>' + maior + ' × ' + corMaior + '</strong> — e mesmo depois dela o giro seguinte tinha 50% para cada cor. ';
    }

    if (est.previsoes) {
      texto += 'Você acertou <strong>' + est.acertos + ' de ' + est.previsoes + '</strong> previsões (' + fmt(est.percAcertos) + ').';
    }

    el.innerHTML = texto;
  }

  /* Reiniciar (RF12, CT08) */
  $('#botao-reiniciar').addEventListener('click', function () {
    if (rodaPrincipal.girando) return;
    if (!Roleta.obterHistorico().length) return;
    if (!window.confirm('Reiniciar a simulação? O histórico, os contadores e as sequências serão apagados.')) return;

    Roleta.limparHistorico();
    radiosPrevisao.forEach(function (r) { r.checked = false; });
    atualizarPrevisaoAtual();
    avisoPrevisao.hidden = true;
    perguntaEl.hidden = true;
    rodaPrincipal.limparDestaque();
    resultadoEl.className = 'resultado';
    resultadoEl.innerHTML = '<p class="resultado__vazio">O resultado do giro aparece aqui.</p>';
    atualizarTudo();
    anunciar('Simulação reiniciada. Histórico, contadores e sequências foram zerados.');
  });

  /* =========================================================
     DESAFIO DA TURMA
     ========================================================= */
  const etapas = [1, 2, 3, 4].map(function (n) { return $('#etapa-' + n); });
  const sequenciaEl = $('#sequencia-desafio');
  const botaoMostrar = $('#botao-mostrar-sequencia');
  const botaoRevelar = $('#botao-revelar');
  const botoesVoto = document.querySelectorAll('[data-voto]');
  const botaoIrGiro = $('#botao-ir-giro');
  const botaoGirarDesafio = $('#botao-girar-desafio');
  const resultadoDesafio = $('#resultado-desafio');
  const botaoRefazer = $('#botao-refazer-desafio');
  const votos = { Vermelho: 0, Preto: 0 };

  function sequenciaInicial() {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += '<li class="chip chip--oculto"><span aria-hidden="true">?</span><span class="sr-only">Giro ' + i + ': ainda oculto</span></li>';
    }
    sequenciaEl.innerHTML = html;
    $('#legenda-sequencia').hidden = true;
  }

  function abrirEtapa(n) {
    const etapa = etapas[n - 1];
    etapa.hidden = false;
    etapa.classList.remove('etapa--entrando');
    void etapa.offsetWidth; // reinicia a animação
    etapa.classList.add('etapa--entrando');
    rolarPara(etapa);
    etapa.querySelector('.etapa__titulo').focus({ preventScroll: true });
  }

  function maioria() {
    if (votos.Vermelho === votos.Preto) return null;
    return votos.Vermelho > votos.Preto ? 'Vermelho' : 'Preto';
  }

  botaoMostrar.addEventListener('click', function () {
    botaoMostrar.disabled = true;
    const chips = sequenciaEl.querySelectorAll('.chip');
    const intervalo = reduzirMovimento ? 0 : 380;

    chips.forEach(function (chip, i) {
      setTimeout(function () {
        chip.className = 'chip chip--vermelho chip--revelado';
        chip.innerHTML = '<span aria-hidden="true">V</span><span class="sr-only">Giro ' + (i + 1) + ': Vermelho</span>';
        if (i === chips.length - 1) {
          $('#legenda-sequencia').hidden = false;
          setTimeout(function () { abrirEtapa(2); }, reduzirMovimento ? 0 : 500);
        }
      }, intervalo * (i + 1));
    });
  });

  botoesVoto.forEach(function (botao) {
    botao.addEventListener('click', function () {
      const cor = botao.dataset.voto;
      votos[cor]++;
      $('#votos-vermelho').textContent = votos.Vermelho;
      $('#votos-preto').textContent = votos.Preto;

      botao.classList.remove('is-pulso');
      void botao.offsetWidth;
      botao.classList.add('is-pulso');

      const total = votos.Vermelho + votos.Preto;
      $('#resumo-votos').innerHTML = '<strong>' + total + ' ' + plural(total, 'voto', 'votos') + '</strong> · ' +
        'Vermelho ' + fmt((votos.Vermelho / total) * 100) + ' · Preto ' + fmt((votos.Preto / total) * 100);
      botaoRevelar.disabled = false;
    });
  });

  botaoRevelar.addEventListener('click', function () {
    botaoRevelar.disabled = true;
    botoesVoto.forEach(function (b) { b.disabled = true; });

    const m = maioria();
    let comentario;
    if (m === 'Preto') {
      comentario = 'A maioria votou em <strong>Preto</strong>, achando que ele estava “atrasado”. Essa é exatamente a <strong>Falácia do Apostador</strong>.';
    } else if (m === 'Vermelho') {
      comentario = 'A maioria votou em <strong>Vermelho</strong>, achando que a cor estava “quente”. Essa ideia também é falsa: a roleta não tem tendência a repetir.';
    } else {
      comentario = 'A votação empatou. Mas, afinal, alguma cor tinha mais chance?';
    }
    $('#comentario-votacao').innerHTML = comentario;
    abrirEtapa(3);
  });

  botaoIrGiro.addEventListener('click', function () {
    botaoIrGiro.disabled = true;
    const m = maioria();
    const total = votos.Vermelho + votos.Preto;
    $('#previsao-turma').innerHTML = m
      ? 'Previsão da turma: <strong>' + m + '</strong> (' + votos[m] + ' de ' + total + ' ' + plural(total, 'voto', 'votos') + ')'
      : 'Previsão da turma: <strong>empate</strong> (' + votos.Vermelho + ' × ' + votos.Preto + ')';
    abrirEtapa(4);
  });

  botaoGirarDesafio.addEventListener('click', function () {
    if (rodaDesafio.girando) return;
    const cor = Roleta.sortearCor();
    const giro = rodaDesafio.girar(cor);
    if (!giro) return;

    botaoGirarDesafio.setAttribute('aria-disabled', 'true');
    botaoGirarDesafio.textContent = 'Girando…';

    giro.then(function () {
      botaoGirarDesafio.hidden = true;
      const m = maioria();
      const s = slug(cor);
      let comparacao;
      if (!m) {
        comparacao = 'A votação empatou: metade da turma acertou e metade errou.';
      } else if (m === cor) {
        comparacao = 'A maioria (' + m + ') <strong>acertou</strong> desta vez.';
      } else {
        comparacao = 'A maioria (' + m + ') <strong>não acertou</strong> desta vez.';
      }

      resultadoDesafio.className = 'resultado resultado--escuro resultado--' + s;
      resultadoDesafio.innerHTML =
        '<p class="resultado__rotulo">Resultado do 6º giro</p>' +
        '<p class="resultado__cor"><span class="bolinha bolinha--' + s + '" aria-hidden="true"></span>' + cor + '</p>' +
        '<p class="resultado__comparacao">' + comparacao + '</p>' +
        '<p class="resultado__explicacao">Acertar ou errar não altera a regra matemática: antes deste giro a chance era 50% para cada cor — e no próximo continua sendo 50%.</p>';
      resultadoDesafio.hidden = false;
      botaoRefazer.hidden = false;
    });
  });

  botaoRefazer.addEventListener('click', function () {
    votos.Vermelho = 0;
    votos.Preto = 0;
    $('#votos-vermelho').textContent = '0';
    $('#votos-preto').textContent = '0';
    $('#resumo-votos').textContent = 'Nenhum voto ainda.';
    botoesVoto.forEach(function (b) { b.disabled = false; });
    botaoRevelar.disabled = true;
    botaoMostrar.disabled = false;
    botaoIrGiro.disabled = false;
    botaoGirarDesafio.hidden = false;
    botaoGirarDesafio.removeAttribute('aria-disabled');
    botaoGirarDesafio.textContent = 'Girar roleta';
    resultadoDesafio.hidden = true;
    botaoRefazer.hidden = true;
    rodaDesafio.limparDestaque();
    [2, 3, 4].forEach(function (n) { etapas[n - 1].hidden = true; });
    sequenciaInicial();
    rolarPara(etapas[0]);
    etapas[0].querySelector('.etapa__titulo').focus({ preventScroll: true });
  });

  /* =========================================================
     MENU: destaca a seção visível
     ========================================================= */
  const linksMenu = document.querySelectorAll('.menu a');
  if ('IntersectionObserver' in window) {
    const observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        const id = entrada.target.id === 'conclusao' ? 'resultados' : entrada.target.id;
        linksMenu.forEach(function (link) {
          const ativo = link.getAttribute('href') === '#' + id;
          link.classList.toggle('is-ativo', ativo);
          if (ativo) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section').forEach(function (s) { observador.observe(s); });
  }

  /* ---------- Estado inicial ---------- */
  sequenciaInicial();
  atualizarPrevisaoAtual();
  atualizarTudo();
})();
