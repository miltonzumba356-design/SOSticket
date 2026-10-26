import { useEffect, useState } from 'react';
import { resolverUrlFicheiro } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useFotoDeUtilizador } from '../utils/diretorioAvatares';

interface AvatarProps {
  nome?: string;
  url?: string | null;
  className?: string;
}

export function Avatar({ nome, url, className = 'w-10 h-10 text-sm' }: AvatarProps) {
  const [falhou, setFalhou] = useState(false);
  const src = resolverUrlFicheiro(url);

  useEffect(() => {
    setFalhou(false);
  }, [src]);

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black flex items-center justify-center overflow-hidden shrink-0 ${className}`}
    >
      {src && !falhou ? (
        <img
          src={src}
          alt={nome ? `Foto de ${nome}` : 'Foto de perfil'}
          onError={() => setFalhou(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        (nome || 'U').substring(0, 1).toUpperCase()
      )}
    </div>
  );
}

interface AvatarUtilizadorProps extends AvatarProps {
  id?: string | null;
  email?: string | null;
}

/** Avatar que procura sozinho a foto do utilizador (técnicos, clientes ou o próprio). */
export function AvatarUtilizador({ id, email, nome, url, className }: AvatarUtilizadorProps) {
  const { usuario } = useAuth();
  const encontrada = useFotoDeUtilizador({ id, email, nome });
  const eOProprio =
    !!usuario &&
    ((!!id && String(id) === String(usuario.id)) ||
      (!!email && email.toLowerCase() === usuario.email?.toLowerCase()));

  return (
    <Avatar
      nome={nome || undefined}
      url={(eOProprio ? usuario?.avatar_url : undefined) || url || encontrada}
      className={className}
    />
  );
}
