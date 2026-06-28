import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth';
import { useAuth } from '../contexts/useAuth';
import { getApiErrorMessage } from '../utils/errors';

const Login = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, sessionExpired } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await loginUser(name.trim(), password);
      login(data.jwt, data.user_id, name);
      navigate('/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível entrar.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Conta</p>
        <h1>Entrar</h1>

        {sessionExpired && (
          <p className="form-warning">Sua sessão expirou. Faça login novamente.</p>
        )}

        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nome de usuário</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="button primary full" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="auth-switch">
          Não tem uma conta? <Link to="/register">Cadastre-se</Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
