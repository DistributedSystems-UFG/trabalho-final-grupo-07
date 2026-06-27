import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();
  const { user, joinAsAnonymous } = useAuth();

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    if (!user) {
      joinAsAnonymous();
    }

    navigate(`/room/${roomCode}`);
  };

  return (
    <div className="home-container">
      <h1>Trivia Arena</h1>

      <form onSubmit={handleJoinRoom}>
        <input
          type="text"
          placeholder="Código da Sala"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />
        <button type="submit">Entrar na Sala</button>
      </form>

      <div className="actions">
        {!user || user.isAnonymous ? (
          <>
            <Link to="/login">Entrar</Link>
            <br />
            <Link to="/register">Registar</Link>
          </>
        ) : (
          <>
            <p>Bem-vindo, {user.name}!</p>
            <Link to="/profile">O Meu Perfil</Link>
            <br />
            <Link to="/room/create">Criar Nova Sala</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;