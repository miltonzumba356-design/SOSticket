import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Camera, CheckCircle2, Loader2, Lock, LogOut, Mail, Phone, Save, Trash2, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCronometro } from '../contexts/CronometroContext';
import { perfilService } from '../services/api';
import { Avatar } from './Avatar';
import { CampoPassword } from './CampoPassword';
import { invalidarDiretorioAvatares } from '../utils/diretorioAvatares';
import { RecortarFotoModal } from './RecortarFotoModal';
import { Usuario } from '../types/api';

export function Perfil() {
  const { usuario, logout, atualizarUsuario } = useAuth();
  const { cronometros } = useCronometro();
  const [abaAtiva, setAbaAtiva] = useState<'info' | 'senha' | 'notificacoes'>('info');
  const [perfil, setPerfil] = useState<Usuario | null>(usuario);
  const [formData, setFormData] = useState({
    nome: usuario?.nome || '',
    telefone: usuario?.telefone || '',
    avatar_url: usuario?.avatar_url || '',
  });
  const [senha, setSenha] = useState({
    password_atual: '',
    password_nova: '',
    confirmar: '',
  });
  const [preferencias, setPreferencias] = useState<Record<string, boolean>>({
    novos_clientes: true,
    relatorio_semanal: true,
    alertas_sla: true,
    acesso_conta: false,
  });
  const [carregando, setCarregando] = useState(true);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [fotoParaRecortar, setFotoParaRecortar] = useState<File | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const carregarPerfil = async () => {
    setCarregando(true);
    setErro('');
    try {
      const response = await perfilService.listar();
      const dados = Array.isArray(response) ? response[0] : (response as any)?.results?.[0] || response;
      setPerfil(dados as Usuario);
      setFormData({
        nome: dados?.nome || '',
        telefone: dados?.telefone || '',
        avatar_url: dados?.avatar_url || '',
      });
      if (dados?.preferencias && typeof dados.preferencias === 'object') {
        setPreferencias((prev) => ({ ...prev, ...(dados.preferencias as Record<string, boolean>) }));
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
      setErro(error?.message || 'Não foi possível carregar o perfil.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPerfil();
  }, []);

  const handleSalvarPerfil = async (event: React.FormEvent) => {
    event.preventDefault();
    setSalvando(true);
    setErro('');
    setSucesso('');

    try {
      const atualizado = await perfilService.atualizar({
        nome: formData.nome,
        telefone: formData.telefone,
        preferencias,
      });
      const dados = { ...(perfil || usuario), ...(atualizado || {}), ...formData, preferencias } as Usuario;
      setPerfil(dados);
      localStorage.setItem('auth_user', JSON.stringify(dados));
      setSucesso('Perfil atualizado com sucesso.');
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      setErro(error?.message || 'Falha ao atualizar perfil.');
    } finally {
      setSalvando(false);
    }
  };

  const handleEscolherFoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const ficheiro = event.target.files?.[0];
    event.target.value = '';
    if (!ficheiro) return;

    if (!ficheiro.type.startsWith('image/')) {
      setErro('Escolha um ficheiro de imagem (JPG, PNG, WEBP...).');
      return;
    }
    if (ficheiro.size > 5 * 1024 * 1024) {
      setErro('A imagem é demasiado grande. O máximo é 5 MB.');
      return;
    }

    setErro('');
    setSucesso('');
    setFotoParaRecortar(ficheiro);
  };

  const enviarFotoRecortada = async (ficheiro: File) => {
    setFotoParaRecortar(null);
    setEnviandoFoto(true);
    setErro('');
    setSucesso('');
    try {
      const atualizado: any = await perfilService.atualizarAvatar({
        nome: formData.nome || perfil?.nome || usuario?.nome || '',
        avatar: ficheiro,
      });

      let avatarUrl: string | undefined = atualizado?.avatar_url;
      if (!avatarUrl) {
        const recarregado: any = await perfilService.listar();
        const dados = Array.isArray(recarregado) ? recarregado[0] : recarregado?.results?.[0] || recarregado;
        avatarUrl = dados?.avatar_url;
      }

      if (avatarUrl) {
        setFormData((prev) => ({ ...prev, avatar_url: avatarUrl as string }));
        setPerfil((prev) => ({ ...(prev || (usuario as Usuario)), avatar_url: avatarUrl } as Usuario));
        atualizarUsuario({ avatar_url: avatarUrl });
        invalidarDiretorioAvatares();
      }
      setSucesso('Foto de perfil atualizada.');
    } catch (error: any) {
      console.error('Erro ao atualizar foto de perfil:', error);
      setErro(error?.message || 'Falha ao atualizar a foto de perfil.');
    } finally {
      setEnviandoFoto(false);
    }
  };

  const removerFoto = async () => {
    if (!window.confirm('Eliminar a foto de perfil?')) return;

    setEnviandoFoto(true);
    setErro('');
    setSucesso('');
    try {
      await perfilService.removerAvatar(formData.nome || perfil?.nome || usuario?.nome || '');

      // Confirma no servidor: se a foto continuar lá, a remoção não foi aceite.
      const recarregado: any = await perfilService.listar();
      const dados = Array.isArray(recarregado) ? recarregado[0] : recarregado?.results?.[0] || recarregado;
      if (dados?.avatar_url) {
        setErro('O servidor não aceitou eliminar a foto de perfil.');
        return;
      }

      setFormData((prev) => ({ ...prev, avatar_url: '' }));
      setPerfil((prev) => ({ ...(prev || (usuario as Usuario)), avatar_url: '' } as Usuario));
      atualizarUsuario({ avatar_url: '' });
      invalidarDiretorioAvatares();
      setSucesso('Foto de perfil eliminada.');
    } catch (error: any) {
      console.error('Erro ao eliminar foto de perfil:', error);
      setErro(error?.message || 'Falha ao eliminar a foto de perfil.');
    } finally {
      setEnviandoFoto(false);
    }
  };

  const handleAlterarSenha = async (event: React.FormEvent) => {
    event.preventDefault();
    if (senha.password_nova !== senha.confirmar) {
      setErro('A nova password e a confirmação não coincidem.');
      return;
    }

    setSalvando(true);
    setErro('');
    setSucesso('');
    try {
      await perfilService.alterarSenha({
        password_atual: senha.password_atual,
        password_nova: senha.password_nova,
      });
      setSenha({ password_atual: '', password_nova: '', confirmar: '' });
      setSucesso('Password alterada com sucesso.');
    } catch (error: any) {
      console.error('Erro ao alterar password:', error);
      setErro(error?.message || 'Falha ao alterar password.');
    } finally {
      setSalvando(false);
    }
  };

  const tentarLogout = () => {
    const temCronometroPendente = cronometros.some((cronometro) =>
      ['ativo', 'pausado'].includes(cronometro.status)
    );

    if (temCronometroPendente) {
      window.alert('Existe um cronómetro ativo. Salve ou pare o cronómetro antes de terminar a sessão.');
      return;
    }

    logout();
  };

  const nomePerfil = perfil?.nome || usuario?.nome || 'Utilizador';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Meu Perfil</h2>
          <p className="text-gray-500 mt-1">Gerencie dados pessoais, preferências e segurança.</p>
        </div>
        <button onClick={tentarLogout} className="flex items-center gap-2 px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all">
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>

      <RecortarFotoModal
        ficheiro={fotoParaRecortar}
        onCancelar={() => setFotoParaRecortar(null)}
        onConfirmar={enviarFotoRecortada}
      />

      {erro && <Message type="error" text={erro} />}
      {sucesso && <Message type="success" text={sucesso} />}

      {carregando ? (
        <div className="py-24 flex justify-center bg-white rounded-3xl border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-center p-8">
              <div className="relative inline-block mb-6">
                <input
                  ref={inputFotoRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEscolherFoto}
                  className="hidden"
                />
                {/* Tocar na foto abre o seletor para a alterar */}
                <motion.button
                  type="button"
                  onClick={() => inputFotoRef.current?.click()}
                  disabled={enviandoFoto}
                  title="Alterar foto de perfil"
                  aria-label="Alterar foto de perfil"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="block rounded-full cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  <Avatar
                    nome={nomePerfil}
                    url={perfil?.avatar_url || usuario?.avatar_url}
                    className="w-32 h-32 text-4xl shadow-xl shadow-indigo-100 border-4 border-white"
                  />
                </motion.button>
                {(perfil?.avatar_url || usuario?.avatar_url) ? (
                  <button
                    type="button"
                    onClick={removerFoto}
                    disabled={enviandoFoto}
                    title="Eliminar foto de perfil"
                    aria-label="Eliminar foto de perfil"
                    className="absolute bottom-1 right-1 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    {enviandoFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputFotoRef.current?.click()}
                    disabled={enviandoFoto}
                    title="Adicionar foto de perfil"
                    aria-label="Adicionar foto de perfil"
                    className="absolute bottom-1 right-1 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-60"
                  >
                    {enviandoFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{nomePerfil}</h3>
              <p className="text-sm font-medium text-indigo-600 bg-indigo-50 inline-block px-3 py-1 rounded-full mt-2 uppercase tracking-wider">
                {perfil?.perfil || usuario?.perfil}
              </p>
              <div className="mt-8 space-y-4 text-left">
                <Info icon={Mail} text={perfil?.email || usuario?.email || '-'} />
                <Info icon={Phone} text={perfil?.telefone || 'Sem telefone'} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-8 px-8 border-b border-gray-100">
                <TabLink active={abaAtiva === 'info'} onClick={() => setAbaAtiva('info')} label="Dados Pessoais" />
                <TabLink active={abaAtiva === 'senha'} onClick={() => setAbaAtiva('senha')} label="Segurança" />
                <TabLink active={abaAtiva === 'notificacoes'} onClick={() => setAbaAtiva('notificacoes')} label="Notificações" />
              </div>

              <div className="p-8">
                {abaAtiva === 'info' && (
                  <form onSubmit={handleSalvarPerfil} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputField label="Nome" value={formData.nome} onChange={(value) => setFormData((prev) => ({ ...prev, nome: value }))} required />
                      <InputField label="Email" value={perfil?.email || usuario?.email || ''} disabled />
                      <InputField label="Telefone" value={formData.telefone} onChange={(value) => setFormData((prev) => ({ ...prev, telefone: value }))} />
                    </div>
                    <SubmitButton saving={salvando} label="Atualizar Perfil" />
                  </form>
                )}

                {abaAtiva === 'senha' && (
                  <form onSubmit={handleAlterarSenha} className="space-y-6 max-w-md">
                    <InputField label="Password Atual" type="password" value={senha.password_atual} onChange={(value) => setSenha((prev) => ({ ...prev, password_atual: value }))} required />
                    <InputField label="Nova Password" type="password" value={senha.password_nova} onChange={(value) => setSenha((prev) => ({ ...prev, password_nova: value }))} required />
                    <InputField label="Confirmar Nova Password" type="password" value={senha.confirmar} onChange={(value) => setSenha((prev) => ({ ...prev, confirmar: value }))} required />
                    <SubmitButton saving={salvando} label="Alterar Password" />
                  </form>
                )}

                {abaAtiva === 'notificacoes' && (
                  <form onSubmit={handleSalvarPerfil} className="space-y-6">
                    <NotificationToggle label="Alertas de Novos Clientes" checked={!!preferencias.novos_clientes} onChange={(checked) => setPreferencias((prev) => ({ ...prev, novos_clientes: checked }))} />
                    <NotificationToggle label="Relatório Semanal" checked={!!preferencias.relatorio_semanal} onChange={(checked) => setPreferencias((prev) => ({ ...prev, relatorio_semanal: checked }))} />
                    <NotificationToggle label="Alertas de SLA" checked={!!preferencias.alertas_sla} onChange={(checked) => setPreferencias((prev) => ({ ...prev, alertas_sla: checked }))} />
                    <NotificationToggle label="Acesso à Conta" checked={!!preferencias.acesso_conta} onChange={(checked) => setPreferencias((prev) => ({ ...prev, acesso_conta: checked }))} />
                    <SubmitButton saving={salvando} label="Salvar Preferências" />
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Message({ type, text }: { type: 'error' | 'success'; text: string }) {
  const isError = type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div className={`flex items-center gap-2 p-4 rounded-xl border text-sm font-bold ${isError ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
      <Icon className="w-5 h-5" />
      {text}
    </div>
  );
}

function Info({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600">
      <Icon className="w-4 h-4 text-gray-400" />
      <span>{text}</span>
    </div>
  );
}

function TabLink({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`py-6 text-sm font-bold transition-all border-b-2 ${active ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
      {label}
    </button>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
  required = false,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      {type === 'password' ? (
        <CampoPassword
          value={value || ''}
          onChange={(event) => onChange?.(event.target.value)}
          disabled={disabled}
          required={required}
          className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(event) => onChange?.(event.target.value)}
          disabled={disabled}
          required={required}
          className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      )}
    </div>
  );
}

function NotificationToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-50 hover:border-gray-100 transition-all">
      <span className="text-sm font-bold text-gray-900">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="w-5 h-5 accent-emerald-500" />
    </label>
  );
}

function SubmitButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50">
      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
      {label}
    </button>
  );
}
