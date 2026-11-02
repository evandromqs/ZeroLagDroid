/**
 * Minimal Standalone QR Code Generator for ZeroLagDroid
 * Baseado no padrão QR Code ISO/IEC 18004. Gera Canvas nativo sem dependências externas.
 */
(function (global) {
  'use strict';

  // Tabela de Reed-Solomon e Galoisfield
  const GF256_EXP = new Uint8Array(512);
  const GF256_LOG = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF256_EXP[i] = x;
      GF256_LOG[x] = i;
      x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
    }
    for (let i = 255; i < 512; i++) {
      GF256_EXP[i] = GF256_EXP[i - 255];
    }
  })();

  function gfMul(x, y) {
    if (x === 0 || y === 0) return 0;
    return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
  }

  // Polinômio gerador para Error Correction
  function rsGenPoly(n) {
    let p = [1];
    for (let i = 0; i < n; i++) {
      const next = [];
      const root = GF256_EXP[i];
      for (let j = 0; j <= p.length; j++) {
        const a = j < p.length ? gfMul(p[j], root) : 0;
        const b = j > 0 ? p[j - 1] : 0;
        next.push(a ^ b);
      }
      p = next;
    }
    return p;
  }

  function rsCalculateECC(data, nECC) {
    const gen = rsGenPoly(nECC);
    const res = new Uint8Array(nECC);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ res[0];
      for (let j = 0; j < nECC - 1; j++) {
        res[j] = res[j + 1] ^ gfMul(gen[j + 1], factor);
      }
      res[nECC - 1] = gfMul(gen[nECC], factor);
    }
    return res;
  }

  // Tabela simplificada de Versões QR (Versões 1 a 10 - Nível M)
  const QR_SPECS = {
    1: { size: 21, totalBytes: 26, dataBytes: 16, ecBytes: 10, align: [] },
    2: { size: 25, totalBytes: 44, dataBytes: 28, ecBytes: 16, align: [6, 18] },
    3: { size: 29, totalBytes: 70, dataBytes: 44, ecBytes: 26, align: [6, 22] },
    4: { size: 33, totalBytes: 100, dataBytes: 64, ecBytes: 36, align: [6, 26] },
    5: { size: 37, totalBytes: 134, dataBytes: 86, ecBytes: 48, align: [6, 30] },
    6: { size: 41, totalBytes: 172, dataBytes: 108, ecBytes: 64, align: [6, 34] },
    7: { size: 45, totalBytes: 196, dataBytes: 124, ecBytes: 72, align: [6, 22, 38] },
    8: { size: 49, totalBytes: 242, dataBytes: 154, ecBytes: 88, align: [6, 24, 42] },
    9: { size: 53, totalBytes: 292, dataBytes: 182, ecBytes: 110, align: [6, 26, 46] },
    10: { size: 57, totalBytes: 346, dataBytes: 216, ecBytes: 130, align: [6, 28, 50] }
  };

  function selectVersion(dataLen) {
    // 4 bits de modo (byte) + 8/16 bits de count
    for (let v = 1; v <= 10; v++) {
      const cap = QR_SPECS[v].dataBytes;
      const overhead = v <= 9 ? 2 : 3;
      if (dataLen + overhead <= cap) return v;
    }
    return 10;
  }

  function encodeData(text, version) {
    const spec = QR_SPECS[version];
    const utf8 = new TextEncoder().encode(text);
    const bits = [];

    function pushBits(val, len) {
      for (let i = len - 1; i >= 0; i--) {
        bits.push((val >> i) & 1);
      }
    }

    // Modo Byte: 0100
    pushBits(0b0100, 4);
    // Contador de caracteres (8 bits para v1-9, 16 bits para v10+)
    pushBits(utf8.length, version <= 9 ? 8 : 16);

    for (let i = 0; i < utf8.length; i++) {
      pushBits(utf8[i], 8);
    }

    // Terminador
    const maxBits = spec.dataBytes * 8;
    const termLen = Math.min(4, maxBits - bits.length);
    pushBits(0, termLen);

    // Padding para byte
    while (bits.length % 8 !== 0) {
      bits.push(0);
    }

    // Bytes de padding padrão QR (0xEC, 0x11)
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (bits.length < maxBits) {
      pushBits(padBytes[padIdx % 2], 8);
      padIdx++;
    }

    const dataBytes = new Uint8Array(spec.dataBytes);
    for (let i = 0; i < spec.dataBytes; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) {
        b = (b << 1) | bits[i * 8 + j];
      }
      dataBytes[i] = b;
    }

    // Cálculo do Reed-Solomon ECC
    const eccBytes = rsCalculateECC(dataBytes, spec.ecBytes);

    // Intercalação
    const finalBytes = new Uint8Array(spec.totalBytes);
    finalBytes.set(dataBytes, 0);
    finalBytes.set(eccBytes, dataBytes.length);
    return finalBytes;
  }

  function createMatrix(version, dataBytes) {
    const spec = QR_SPECS[version];
    const size = spec.size;
    const matrix = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
    const isReserved = Array.from({ length: size }, () => new Uint8Array(size));

    function setModule(r, c, val) {
      matrix[r][c] = val ? 1 : 0;
      isReserved[r][c] = 1;
    }

    // Padrões de Localização (Finder Patterns)
    function drawFinder(row, col) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const pr = row + r;
          const pc = col + c;
          if (pr < 0 || pr >= size || pc < 0 || pc >= size) continue;
          if ((r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
              (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
              (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            setModule(pr, pc, 1);
          } else {
            setModule(pr, pc, 0);
          }
        }
      }
    }

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Linhas de Sincronização (Timing Patterns)
    for (let i = 8; i < size - 8; i++) {
      if (!isReserved[6][i]) setModule(6, i, i % 2 === 0 ? 1 : 0);
      if (!isReserved[i][6]) setModule(i, 6, i % 2 === 0 ? 1 : 0);
    }

    // Padrões de Alinhamento (Alignment Patterns)
    const align = spec.align;
    for (let r of align) {
      for (let c of align) {
        if (isReserved[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setModule(r + dr, c + dc, isBorder || isCenter ? 1 : 0);
          }
        }
      }
    }

    // Ponto Escuro Fixo
    setModule(size - 8, 8, 1);

    // Reservar áreas de informação de formato
    for (let i = 0; i < 9; i++) {
      if (i < size) { isReserved[8][i] = 1; isReserved[i][8] = 1; }
    }
    for (let i = 0; i < 8; i++) {
      isReserved[8][size - 1 - i] = 1;
      isReserved[size - 1 - i][8] = 1;
    }

    // Inserção dos Bits de Dados (em zigue-zague)
    const bitList = [];
    for (let b of dataBytes) {
      for (let i = 7; i >= 0; i--) {
        bitList.push((b >> i) & 1);
      }
    }

    let bitIdx = 0;
    let up = true;
    for (let right = size - 1; right > 0; right -= 2) {
      if (right === 6) right--; // Pular coluna de sincronização
      for (let vert = 0; vert < size; vert++) {
        const r = up ? size - 1 - vert : vert;
        for (let colOffset = 0; colOffset < 2; colOffset++) {
          const c = right - colOffset;
          if (!isReserved[r][c]) {
            const val = bitIdx < bitList.length ? bitList[bitIdx++] : 0;
            // Máscara 0 padrão: (row + col) % 2 === 0
            const maskedVal = val ^ (((r + c) % 2 === 0) ? 1 : 0);
            matrix[r][c] = maskedVal;
          }
        }
      }
      up = !up;
    }

    // Informação de Formato para Nível M + Máscara 0 (BCH 15 bits = 101010000010010)
    const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
    const formatCoords = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
    ];
    for (let i = 0; i < 15; i++) {
      const [r, c] = formatCoords[i];
      matrix[r][c] = formatBits[i];
    }
    const formatCoords2 = [
      [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
      [size - 5, 8], [size - 6, 8], [size - 7, 8],
      [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5],
      [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
    ];
    for (let i = 0; i < 15; i++) {
      const [r, c] = formatCoords2[i];
      matrix[r][c] = formatBits[i];
    }

    return matrix;
  }

  // Renderizar em Canvas
  function drawQRCodeToCanvas(text, options = {}) {
    const version = selectVersion(new TextEncoder().encode(text).length);
    const dataBytes = encodeData(text, version);
    const matrix = createMatrix(version, dataBytes);

    const size = matrix.length;
    const moduleSize = options.moduleSize || 6;
    const quietZone = options.quietZone !== undefined ? options.quietZone : 3;
    const canvasSize = (size + quietZone * 2) * moduleSize;

    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');

    // Fundo branco
    ctx.fillStyle = options.bgColor || '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Módulos pretos
    ctx.fillStyle = options.fgColor || '#000000';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c] === 1) {
          ctx.fillRect(
            (c + quietZone) * moduleSize,
            (r + quietZone) * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }

    return canvas;
  }

  // Exportar globalmente
  global.ZeroLagQR = {
    drawQRCodeToCanvas,
    generatePixCardCanvas: function ({ payload, valor, nome, chavePix }) {
      // Cria card profissional bonito com o QR Code
      const qrCanvas = drawQRCodeToCanvas(payload, { moduleSize: 5, quietZone: 2 });
      const card = document.createElement('canvas');
      card.width = 380;
      card.height = 490;
      const ctx = card.getContext('2d');

      // Fundo escuro estilo WhatsApp/Banco
      ctx.fillStyle = '#111b21';
      ctx.fillRect(0, 0, card.width, card.height);

      // Moldura interna
      ctx.strokeStyle = '#202c33';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, card.width - 20, card.height - 20);

      // Header do Card
      ctx.fillStyle = '#00a884';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAGAMENTO PIX', card.width / 2, 42);

      ctx.fillStyle = '#8696a0';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillText('ZeroLagDroid • Atendimento Especializado', card.width / 2, 62);

      // Caixa branca do QR Code
      const qrX = (card.width - qrCanvas.width) / 2;
      const qrY = 80;
      ctx.fillStyle = '#ffffff';
      ctx.roundRect ? ctx.roundRect(qrX - 8, qrY - 8, qrCanvas.width + 16, qrCanvas.height + 16, 8) : ctx.fillRect(qrX - 8, qrY - 8, qrCanvas.width + 16, qrCanvas.height + 16);
      ctx.fill();

      // Desenhar o QR
      ctx.drawImage(qrCanvas, qrX, qrY);

      // Valor Destacado
      ctx.fillStyle = '#00a884';
      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      ctx.fillText(`R$ ${valor}`, card.width / 2, qrY + qrCanvas.height + 42);

      // Nome do Titular
      ctx.fillStyle = '#e9edef';
      ctx.font = '13px "Segoe UI", sans-serif';
      ctx.fillText(nome, card.width / 2, qrY + qrCanvas.height + 66);

      // Chave Pix
      ctx.fillStyle = '#8696a0';
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillText(`Chave: ${chavePix}`, card.width / 2, qrY + qrCanvas.height + 84);

      return card;
    }
  };
})(window);
