import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRoom as createRoomRequest } from '../api/rooms';
import { THEMES } from '../constants/themes';
import { useAuth } from '../contexts/useAuth';
import { getApiErrorMessage } from '../utils/errors';

const CreateRoom = () => {
  const [guestName, setGuestName] = useState('');
  const [theme, setTheme] = useState('science');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [numQuestions, setNumQuestions] = useState(10);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user, joinAsAnonymous } = useAuth();
  const needsGuestName = !user || user.isAnonymous;

  const ensurePlayer = () => {
    if (needsGuestName) {
      return joinAsAnonymous(guestName || user?.name);
    }
    return user;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const player = ensurePlayer();
      const { data } = await createRoomRequest({
        creatorId: player.playerId,
        creatorName: player.name,
        isAnonymous: player.isAnonymous,
        maxPlayers: Number(maxPlayers),
        numQuestions: Number(numQuestions),
        theme,
      });

      navigate(`/room/${data.room_code}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível criar a sala.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell create-shell">
      <section className="page-header">
        <div>
          <p className="eyebrow">Nova sala</p>
          <h1>Configure a arena</h1>
        </div>
        <Link className="button ghost" to="/">
          Voltar
        </Link>
      </section>

      <section className="form-card wide">
        <form className="stack-form" onSubmit={handleSubmit}>
          {needsGuestName && (
            <label className="field">
              <span>Seu nome</span>
              <input
                type="text"
                placeholder="Visitante"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                maxLength={28}
              />
            </label>
          )}

          <label className="field">
            <span>Tema</span>
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              {THEMES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Jogadores</span>
              <input
                type="number"
                min="2"
                max="10"
                value={maxPlayers}
                onChange={(event) => setMaxPlayers(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Perguntas</span>
              <input
                type="number"
                min="5"
                max="20"
                value={numQuestions}
                onChange={(event) => setNumQuestions(event.target.value)}
              />
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="button primary full" type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar sala'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default CreateRoom;
