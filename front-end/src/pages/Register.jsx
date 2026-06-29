import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/auth';
import { useAuth } from '../contexts/useAuth';
import { getApiErrorMessage } from '../utils/errors';

const Register = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedName = name.trim();
      const { data } = await registerUser(normalizedName, password);
      login(data.jwt, data.user_id, normalizedName);
      navigate('/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível concluir o cadastro.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Nova conta</p>
        <h1>Cadastrar</h1>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nome de usuário</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={28}
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
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <p className="auth-switch">
          Já tem uma conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
};

export default Register;
