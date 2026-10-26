import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, X, ZoomIn } from 'lucide-react';

interface RecortarFotoModalProps {
  ficheiro: File | null;
  onCancelar: () => void;
  onConfirmar: (recortada: File) => void;
}

const TAMANHO_AREA = 288;
const TAMANHO_SAIDA = 512;

export function RecortarFotoModal({ ficheiro, onCancelar, onConfirmar }: RecortarFotoModalProps) {
  const [src, setSrc] = useState('');
  const [imagem, setImagem] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [deslocamento, setDeslocamento] = useState({ x: 0, y: 0 });
  const [processando, setProcessando] = useState(false);
  const arrasto = useRef<{ x: number; y: number; origem: { x: number; y: number } } | null>(null);

  useEffect(() => {
    if (!ficheiro) {
      setSrc('');
      setImagem(null);
      return;
    }

    const url = URL.createObjectURL(ficheiro);
    const img = new Image();
    img.onload = () => {
      setImagem(img);
      setSrc(url);
      setZoom(1);
      setDeslocamento({ x: 0, y: 0 });
    };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [ficheiro]);

  if (!ficheiro) return null;

  // A imagem cobre sempre a área quadrada; o zoom parte desse tamanho mínimo.
  const escalaBase = imagem ? TAMANHO_AREA / Math.min(imagem.naturalWidth, imagem.naturalHeight) : 1;
  const escala = escalaBase * zoom;
  const largura = imagem ? imagem.naturalWidth * escala : TAMANHO_AREA;
  const altura = imagem ? imagem.naturalHeight * escala : TAMANHO_AREA;

  const limitar = (x: number, y: number, novaLargura = largura, novaAltura = altura) => {
    const maxX = Math.max(0, (novaLargura - TAMANHO_AREA) / 2);
    const maxY = Math.max(0, (novaAltura - TAMANHO_AREA) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  };

  const alterarZoom = (novoZoom: number) => {
    if (!imagem) return;
    const novaEscala = escalaBase * novoZoom;
    setZoom(novoZoom);
    setDeslocamento((atual) =>
      limitar(atual.x, atual.y, imagem.naturalWidth * novaEscala, imagem.naturalHeight * novaEscala)
    );
  };

  const iniciarArrasto = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    arrasto.current = { x: event.clientX, y: event.clientY, origem: deslocamento };
  };

  const arrastar = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!arrasto.current) return;
    const { x, y, origem } = arrasto.current;
    setDeslocamento(limitar(origem.x + event.clientX - x, origem.y + event.clientY - y));
  };

  const terminarArrasto = () => {
    arrasto.current = null;
  };

  const confirmar = () => {
    if (!imagem) return;
    setProcessando(true);

    const canvas = document.createElement('canvas');
    canvas.width = TAMANHO_SAIDA;
    canvas.height = TAMANHO_SAIDA;
    const contexto = canvas.getContext('2d');
    if (!contexto) {
      setProcessando(false);
      return;
    }

    const esquerda = (TAMANHO_AREA - largura) / 2 + deslocamento.x;
    const topo = (TAMANHO_AREA - altura) / 2 + deslocamento.y;
    const origemX = -esquerda / escala;
    const origemY = -topo / escala;
    const lado = TAMANHO_AREA / escala;

    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, TAMANHO_SAIDA, TAMANHO_SAIDA);
    contexto.drawImage(imagem, origemX, origemY, lado, lado, 0, 0, TAMANHO_SAIDA, TAMANHO_SAIDA);

    canvas.toBlob(
      (blob) => {
        setProcessando(false);
        if (blob) onConfirmar(new File([blob], 'foto-perfil.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900">Enquadrar foto</h3>
            <p className="text-xs text-gray-500">Arraste a imagem e use o zoom para ajustar.</p>
          </div>
          <button onClick={onCancelar} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Cancelar">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div
            className="relative mx-auto bg-gray-900 overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing touch-none select-none"
            style={{ width: TAMANHO_AREA, height: TAMANHO_AREA }}
            onPointerDown={iniciarArrasto}
            onPointerMove={arrastar}
            onPointerUp={terminarArrasto}
            onPointerCancel={terminarArrasto}
          >
            {src && imagem ? (
              <img
                src={src}
                alt="Pré-visualização"
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: largura,
                  height: altura,
                  left: (TAMANHO_AREA - largura) / 2 + deslocamento.x,
                  top: (TAMANHO_AREA - altura) / 2 + deslocamento.y,
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
            {/* Círculo-guia: o que fica dentro é o que aparece como foto de perfil */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at center, transparent ${TAMANHO_AREA / 2 - 1}px, rgba(0,0,0,0.55) ${TAMANHO_AREA / 2}px)`,
              }}
            />
            <div className="absolute inset-0 rounded-full border-2 border-white pointer-events-none" />
          </div>

          <div className="flex items-center gap-3">
            <ZoomIn className="w-5 h-5 text-gray-500 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => alterarZoom(Number(e.target.value))}
              className="w-full accent-indigo-600"
              aria-label="Zoom"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancelar}
              className="flex-1 py-3 text-sm font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 rounded-2xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={!imagem || processando}
              className="flex-[2] py-3 rounded-2xl text-sm font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Usar foto
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
