import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../hooks/useAuth';
import { fetchApiMeta } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

type AuthMode = 'login' | 'register';

type LoginProps = {
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
};

function passwordPolicyMessage(password: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password)) return 'La contraseña debe incluir al menos una letra.';
  if (!/\d/.test(password)) return 'La contraseña debe incluir al menos un número.';
  return null;
}

export default function Login({ addToast }: LoginProps) {
  const { user, loginWithGoogle, loginWithPassword, registerWithPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ok' | 'offline'>('checking');

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const meta = await fetchApiMeta();
      if (!mounted) return;
      setBackendStatus(meta ? 'ok' : 'offline');
      if (!meta) addToast('No hay respuesta válida del backend', 'error');
    })();
    return () => { mounted = false; };
  }, [addToast]);

  useEffect(() => {
    const scriptId = 'google-identity';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      script.onload = () => renderGoogleButton();
    } else {
      renderGoogleButton();
    }

    function renderGoogleButton() {
      // @ts-ignore Google Identity Services is loaded globally.
      if (!window.google?.accounts?.id) return;

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
      const container = document.getElementById('gsi-btn');
      if (!clientId || !container) return;

      // @ts-ignore Google Identity Services is loaded globally.
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp: { credential?: string }) => {
          if (!resp?.credential) {
            addToast('Google no devolvió una credencial válida', 'error');
            return;
          }

          try {
            const decodedToken: { email?: string } = jwtDecode(resp.credential);
            const userEmail = decodedToken.email || '';
            if (userEmail && !userEmail.endsWith('@virtual.upt.pe')) {
              addToast('Acceso denegado: usa tu correo institucional @virtual.upt.pe', 'error');
              return;
            }
          } catch {
            addToast('No se pudo validar el correo de Google', 'error');
            return;
          }

          loginWithGoogle(resp.credential)
            .then(() => {
              addToast('Sesión iniciada con Google', 'success');
              navigate('/');
            })
            .catch((err: Error) => addToast(err.message || 'No se pudo iniciar sesión con Google', 'error'));
        },
      });

      container.innerHTML = '';
      // @ts-ignore Google Identity Services is loaded globally.
      window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: 280 });
    }
  }, [addToast, loginWithGoogle, navigate]);

  const passwordHelp = useMemo(() => passwordPolicyMessage(password), [password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      addToast('Completa el correo y la contraseña', 'error');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        addToast('Ingresa tu nombre para crear la cuenta', 'error');
        return;
      }
      if (passwordHelp) {
        addToast(passwordHelp, 'error');
        return;
      }
      if (password !== confirmPassword) {
        addToast('Las contraseñas no coinciden', 'error');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (mode === 'login') {
        await loginWithPassword(normalizedEmail, password);
        addToast('Sesión iniciada correctamente', 'success');
      } else {
        await registerWithPassword(normalizedEmail, password, name.trim());
        addToast('Cuenta creada e inicio de sesión completado', 'success');
      }
      navigate('/');
    } catch (err) {
      addToast((err as Error).message || 'No se pudo completar la autenticación', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-theme-row">
        <ThemeToggle />
      </div>
      <section className="login-hero">
        <div className="login-brand-row">
          <div className="logo-icon">🎭</div>
          <div>
            <span className="login-kicker">Enmask SDM</span>
            <h1>Protección de datos con enmascaramiento y cifrado</h1>
          </div>
        </div>
        <p>
          Crea conexiones a motores relacionales, NoSQL y grafos; define reglas de protección;
          ejecuta jobs en modo prueba o aplicación real; y controla el acceso por usuario.
        </p>
        <div className="login-feature-grid">
          <div><strong>Nivel 1</strong><span>Vistas, columnas/campos derivados y consultas virtuales.</span></div>
          <div><strong>Nivel 2</strong><span>Encriptación simétrica y restauración controlada.</span></div>
          <div><strong>Auditoría</strong><span>Jobs, consultas y reversión con trazabilidad.</span></div>
        </div>
      </section>

      <section className="login-card card">
        <div className="auth-status-row">
          <span className={`badge ${backendStatus === 'ok' ? 'badge-success' : backendStatus === 'offline' ? 'badge-danger' : 'badge-pending'}`}>
            {backendStatus === 'ok' ? 'Backend conectado' : backendStatus === 'offline' ? 'Backend sin respuesta' : 'Verificando API'}
          </span>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Modo de autenticación">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            Iniciar sesión
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
            Crear cuenta
          </button>
        </div>

        <div className="card-header" style={{ display: 'block' }}>
          <h2>{mode === 'login' ? 'Acceso local' : 'Registro local'}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6 }}>
            {mode === 'login'
              ? 'Ingresa con tu correo y contraseña. Google sigue disponible como alternativa.'
              : 'Crea una cuenta para usar el sistema sin depender de Google.'}
          </p>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label>Nombre completo</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Milton Flores" autoComplete="name" />
            </div>
          )}
          <div className="form-group">
            <label>Correo electrónico</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@correo.com" type="email" autoComplete="email" />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {mode === 'register' && <small className={passwordHelp ? 'field-hint warning' : 'field-hint success'}>{passwordHelp || 'Contraseña válida.'}</small>}
          </div>
          {mode === 'register' && (
            <div className="form-group">
              <label>Confirmar contraseña</label>
              <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" type="password" autoComplete="new-password" />
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Procesando...' : mode === 'login' ? 'Entrar al sistema' : 'Crear cuenta'}
          </button>
        </form>

        <div className="auth-divider"><span>o continuar con Google institucional</span></div>
        <div className="google-button-wrap">
          <div id="gsi-btn" />
          {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <small className="field-hint">Google se activará cuando configures VITE_GOOGLE_CLIENT_ID.</small>
          )}
        </div>
      </section>
    </div>
  );
}
