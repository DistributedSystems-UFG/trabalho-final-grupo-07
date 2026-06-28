import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { registerUser } from '../api/auth';

const Register = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await registerUser(name, password);
      login(data.jwt, data.user_id, name);
      navigate('/');
    } catch (err) {
      const apiError = err.response?.data;
      setError(apiError?.message || 'Não foi possível concluir o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h1>Criar Conta</h1>

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
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </form>

      <p>
        Já tem uma conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
};

export default Register;