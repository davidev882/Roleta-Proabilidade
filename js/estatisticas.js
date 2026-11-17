/**
 * estatisticas.js
 * Contadores, percentuais e sequências consecutivas.
 * Tudo é recalculado a partir do histórico, garantindo que
 * vermelhos + pretos === total (CT04).
 */
const Estatisticas = (function () {
  'use strict';

  const PROBABILIDADE_TEORICA = 50; // % para cada cor (6.1)

  /**
   * @param {Array<{numero:number, cor:string, previsao:string|null, acertou:boolean|null}>} historico
   */
  function calcular(historico) {
    let vermelhos = 0;
    let pretos = 0;
    let maiorVermelho = 0;
    let maiorPreto = 0;
    let corAtual = null;
    let tamanhoAtual = 0;
    let previsoes = 0;
    let acertos = 0;

    historico.forEach(function (giro) {
      if (giro.cor === 'Vermelho') vermelhos++;
      else pretos++;

      // Sequência consecutiva (RF10)
      if (giro.cor === corAtual) {
        tamanhoAtual++;
      } else {
        corAtual = giro.cor;
        tamanhoAtual = 1;
      }
      if (corAtual === 'Vermelho') maiorVermelho = Math.max(maiorVermelho, tamanhoAtual);
      else maiorPreto = Math.max(maiorPreto, tamanhoAtual);

      if (giro.previsao) {
        previsoes++;
        if (giro.acertou) acertos++;
      }
    });

    const total = historico.length;

    return {
      total: total,
      vermelhos: vermelhos,
      pretos: pretos,
      // 6.2 — evita divisão por zero: null quando não há giros
      percVermelho: total ? (vermelhos / total) * 100 : null,
      percPreto: total ? (pretos / total) * 100 : null,
      maiorVermelho: maiorVermelho,
      maiorPreto: maiorPreto,
      sequenciaAtual: { cor: corAtual, tamanho: tamanhoAtual },
      previsoes: previsoes,
      acertos: acertos,
      percAcertos: previsoes ? (acertos / previsoes) * 100 : null
    };
  }

  /** Formata um percentual no padrão brasileiro (ex.: 33,3%). */
  function formatarPercentual(valor) {
    if (valor === null || valor === undefined) return 'Nenhum giro realizado';
    return valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
  }

  return {
    PROBABILIDADE_TEORICA: PROBABILIDADE_TEORICA,
    calcular: calcular,
    formatarPercentual: formatarPercentual
  };
})();
