import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import heroImage from '../assets/hero.png';
import { useAuth } from '../contexts/useAuth';

const normalizeRoomCode = (value) => value.trim().toUpperCase();

const Home = () => {
  const [roomCode, setRoomCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, joinAsAnonymous, logout } = useAuth();

  const needsGuestName = !user || user.isAnonymous;

  const ensurePlayer = () => {
    if (needsGuestName) {
      return joinAsAnonymous(guestName || user?.name);
    }
    return user;
  };

  const handleJoinRoom = (event) => {
    event.preventDefault();
    const code = normalizeRoomCode(roomCode);

    if (!code) {
      setError('Informe o código da sala.');
      return;
    }

    ensurePlayer();
    navigate(`/room/${code}`);
  };

  const handleCreateRoom = () => {
    ensurePlayer();
    navigate('/room/create');
  };

  return (
    <main className="app-shell home-shell">
      <section className="home-panel">
        <div className="brand-row">
          <img src={heroImage} alt="" className="brand-mark" />
          <div>
            <p className="eyebrow">Trivia Arena</p>
            <h1>Entre na disputa em tempo real.</h1>
          </div>
        </div>

        <form className="join-panel" onSubmit={handleJoinRoom}>
          <label className="field">
            <span>Código da sala</span>
            <input
              type="text"
              placeholder="ABC123"
              value={roomCode}
              onChange={(event) => {
                setRoomCode(event.target.value.toUpperCase());
                setError('');
              }}
              maxLength={12}
            />
          </label>

          {needsGuestName && (
            <label className="field">
              <span>Seu nome na arena</span>
              <input
                type="text"
                placeholder="Visitante"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                maxLength={28}
              />
            </label>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="button-row">
            <button className="button primary" type="submit">
              Entrar na sala
            </button>
            <button className="button secondary" type="button" onClick={handleCreateRoom}>
              Criar sala
            </button>
          </div>
        </form>
      </section>

      <aside className="session-panel">
        {user ? (
          <>
            <p className="eyebrow">Sessão atual</p>
            <h2>{user.name}</h2>
            <p className="muted">
              {user.isAnonymous ? 'Jogando como visitante' : 'Conta conectada'}
            </p>
            <div className="button-row compact">
              {!user.isAnonymous && (
                <Link className="button secondary" to="/profile">
                  Perfil
                </Link>
              )}
              <button className="button ghost" type="button" onClick={logout}>
                Sair
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">Conta</p>
            <h2>Salve seu histórico</h2>
            <p className="muted">
              Cadastre-se para registrar vitórias, média de pontos e melhor pontuação.
            </p>
            <div className="button-row compact">
              <Link className="button secondary" to="/login">
                Entrar
              </Link>
              <Link className="button ghost" to="/register">
                Cadastrar
              </Link>
            </div>
          </>
        )}
      </aside>
    </main>
  );
};

export default Home;
