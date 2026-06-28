import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserStats, updateUser } from '../api/users';

const Profile = () => {
  const { user, updateName, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const { data } = await getUserStats();
        if (isMounted) {
          setStats(data);
        }
      } catch (err) {
        if (isMounted) {
          setStatsError(err.response?.data?.message || 'Não foi possível carregar as estatísticas.');
        }
      } finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    const trimmedName = name.trim();
    if (!trimmedName && !password) {
      setFormError('Informe um novo nome ou uma nova senha.');
      return;
    }

    setFormLoading(true);
    try {
      await updateUser({
        name: trimmedName || undefined,
        password: password || undefined,
      });

      if (trimmedName) {
        updateName(trimmedName);
      }

      setFormSuccess(true);
      setName('');
      setPassword('');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Não foi possível atualizar o perfil.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="profile-container">
      <h1>Meu Perfil</h1>
      <p>Olá, {user.name}!</p>
      <button type="button" onClick={handleLogout}>
        Sair
      </button>

      <section className="profile-stats">
        <h2>Estatísticas</h2>

        {statsLoading && <p>Carregando estatísticas...</p>}
        {statsError && <p className="form-error">{statsError}</p>}

        {stats && (
          <ul>
            <li>Partidas disputadas: {stats.games_played}</li>
            <li>Posição média: {stats.avg_position.toFixed(1)}</li>
            <li>Pontos médios por partida: {stats.avg_points.toFixed(1)}</li>
            <li>Maior pontuação: {stats.highest_score}</li>
            <li>Vitórias: {stats.games_won}</li>
          </ul>
        )}
      </section>

      <section className="profile-edit">
        <h2>Atualizar dados</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Novo nome de usuário"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {formError && <p className="form-error">{formError}</p>}
          {formSuccess && <p className="form-success">Perfil atualizado com sucesso.</p>}

          <button type="submit" disabled={formLoading}>
            {formLoading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default Profile;