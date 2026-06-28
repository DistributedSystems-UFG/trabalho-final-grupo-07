import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUserStats, updateUser } from '../api/users';
import { useAuth } from '../contexts/useAuth';
import { getApiErrorMessage } from '../utils/errors';

const formatDecimal = (value) => Number(value ?? 0).toFixed(1);

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
          setStatsError(getApiErrorMessage(err, 'Não foi possível carregar as estatísticas.'));
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

  const handleSubmit = async (event) => {
    event.preventDefault();
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
      setFormError(getApiErrorMessage(err, 'Não foi possível atualizar o perfil.'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <main className="app-shell profile-shell">
      <section className="page-header">
        <div>
          <p className="eyebrow">Perfil</p>
          <h1>{user.name}</h1>
        </div>
        <div className="button-row compact">
          <Link className="button secondary" to="/">
            Arena
          </Link>
          <button className="button ghost" type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </section>

      <section className="stats-grid">
        {statsLoading && <p className="status-banner">Carregando estatísticas...</p>}
        {statsError && <p className="form-error">{statsError}</p>}

        {stats && (
          <>
            <article className="metric-card">
              <span>Partidas</span>
              <strong>{stats.games_played}</strong>
            </article>
            <article className="metric-card">
              <span>Vitórias</span>
              <strong>{stats.games_won}</strong>
            </article>
            <article className="metric-card">
              <span>Posição média</span>
              <strong>{formatDecimal(stats.avg_position)}</strong>
            </article>
            <article className="metric-card">
              <span>Pontos médios</span>
              <strong>{formatDecimal(stats.avg_points)}</strong>
            </article>
            <article className="metric-card">
              <span>Maior pontuação</span>
              <strong>{stats.highest_score}</strong>
            </article>
          </>
        )}
      </section>

      <section className="form-card">
        <div>
          <p className="eyebrow">Dados</p>
          <h2>Atualizar perfil</h2>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Novo nome</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={28}
            />
          </label>

          <label className="field">
            <span>Nova senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {formError && <p className="form-error">{formError}</p>}
          {formSuccess && <p className="form-success">Perfil atualizado com sucesso.</p>}

          <button className="button primary" type="submit" disabled={formLoading}>
            {formLoading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default Profile;
