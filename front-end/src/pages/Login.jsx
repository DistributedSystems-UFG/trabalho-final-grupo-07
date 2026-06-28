import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginUser } from '../api/auth';

const Login = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, sessionExpired } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await loginUser(name, password);
      login(data.jwt, data.user_id, name);
      navigate('/');
    } catch (err) {
      const apiError = err.response?.data;
      setError(apiError?.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>Entrar</h1>

      {sessionExpired && (
        <p className="form-warning">Sua sessão expirou. Faça login novamente.</p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nome de usuário"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p>
        Não tem uma conta? <Link to="/register">Cadastre-se</Link>
      </p>
    </div>
  );
};

export default Login;