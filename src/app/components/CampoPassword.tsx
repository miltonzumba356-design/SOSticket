import { InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type CampoPasswordProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Campo de palavra-passe com o botão do olho para mostrar ou esconder o texto. */
export function CampoPassword({ className = '', ...props }: CampoPasswordProps) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visivel ? 'text' : 'password'} className={`${className} pr-12`} />
      <button
        type="button"
        onClick={() => setVisivel((atual) => !atual)}
        tabIndex={-1}
        title={visivel ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
        aria-label={visivel ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
        aria-pressed={visivel}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
      >
        {visivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
