import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { joinRoom, restartGame, startGame } from '../api/rooms';
import { getThemeLabel, THEMES } from '../constants/themes';
import { useAuth } from '../contexts/useAuth';
import { useGame } from '../contexts/useGame';
import { getApiErrorMessage } from '../utils/errors';

const normalizeRoomCode = (value) => value?.trim().toUpperCase() || '';

const Room = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const normalizedRoomCode = useMemo(() => normalizeRoomCode(roomCode), [roomCode]);

  const { user, joinAsAnonymous } = useAuth();
  const {
    room,
    players,
    connectionStatus,
    connectionMessage,
    currentQuestion,
    selectedOption,
    roundResult,
    gameOverData,
    error,
    setRoomSnapshot,
    resetRoomState,
    connectToRoom,
    disconnect,
    reconnect,
    sendAnswer,
    clearError,
    refreshRoomSnapshot,
  } = useGame();

  const joinedRef = useRef('');
  const [guestName, setGuestName] = useState('');
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [startLoading, setStartLoading] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);
  const [restartTheme, setRestartTheme] = useState('');
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (roomCode && roomCode !== normalizedRoomCode) {
      navigate(`/room/${normalizedRoomCode}`, { replace: true });
    }
  }, [navigate, normalizedRoomCode, roomCode]);

  useEffect(() => {
    if (!currentQuestion) return undefined;

    const deadline = currentQuestion.receivedAt + currentQuestion.effectiveTimeMs;
    const tick = () => {
      setRemainingMs(Math.max(0, deadline - Date.now()));
    };

    const initialTickId = window.setTimeout(tick, 0);
    const timerId = window.setInterval(tick, 250);
    return () => {
      window.clearTimeout(initialTickId);
      window.clearInterval(timerId);
    };
  }, [currentQuestion]);

  useEffect(() => {
    if (!user || !normalizedRoomCode) return undefined;

    const joinKey = `${normalizedRoomCode}:${user.playerId}`;
    if (joinedRef.current === joinKey) return undefined;

    let cancelled = false;
    joinedRef.current = joinKey;
    resetRoomState(normalizedRoomCode);
    setEntryLoading(true);
    setEntryError(null);
    setActionError(null);
    clearError();

    const enterRoom = async () => {
      try {
        const { data } = await joinRoom(normalizedRoomCode, {
          playerId: user.playerId,
          playerName: user.name,
          isAnonymous: user.isAnonymous,
        });

        if (cancelled) return;

        setRoomSnapshot(normalizedRoomCode, {
          ...data,
          room_code: normalizedRoomCode,
        });
        connectToRoom(normalizedRoomCode, user, user.jwt);
      } catch (err) {
        if (!cancelled) {
          joinedRef.current = '';
          setEntryError(getApiErrorMessage(err, 'Não foi possível entrar na sala.'));
        }
      } finally {
        if (!cancelled) {
          setEntryLoading(false);
        }
      }
    };

    enterRoom();

    return () => {
      cancelled = true;
      joinedRef.current = '';
      disconnect();
    };
  }, [
    clearError,
    connectToRoom,
    disconnect,
    normalizedRoomCode,
    resetRoomState,
    setRoomSnapshot,
    user,
  ]);

  useEffect(() => {
    if (!user || !normalizedRoomCode || room.status !== 'WAITING') return undefined;

    const intervalId = window.setInterval(() => {
      refreshRoomSnapshot(normalizedRoomCode);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [normalizedRoomCode, refreshRoomSnapshot, room.status, user]);

  const sortedPlayers = useMemo(() => (
    [...players].sort((first, second) => (
      second.score - first.score || first.player_name.localeCompare(second.player_name)
    ))
  ), [players]);

  const isCreator = Boolean(user && room.creatorId === user.playerId);
  const canStart = isCreator && room.status === 'WAITING' && players.length >= 2;
  const totalQuestions = room.totalQuestions || room.numQuestions || currentQuestion?.idx || 0;
  const questionProgress = currentQuestion && totalQuestions
    ? `${currentQuestion.idx}/${totalQuestions}`
    : 'Aguardando';
  const hasRoundResult = Boolean(
    currentQuestion
    && roundResult
    && roundResult.question_id === currentQuestion.question_id,
  );
  const timerPercent = currentQuestion
    ? Math.max(0, Math.min(100, (remainingMs / currentQuestion.effectiveTimeMs) * 100))
    : 0;
  const playerCredit = roundResult?.credits?.find((credit) => credit.player_id === user?.playerId);
  const visibleError = entryError || actionError || error?.message;

  const handleIdentitySubmit = (event) => {
    event.preventDefault();
    joinAsAnonymous(guestName);
  };

  const handleStartGame = async () => {
    setActionError(null);
    setStartLoading(true);

    try {
      await startGame(normalizedRoomCode, user.playerId);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível iniciar a partida.'));
    } finally {
      setStartLoading(false);
    }
  };

  const handleRestartGame = async () => {
    setActionError(null);
    setRestartLoading(true);

    try {
      await restartGame(normalizedRoomCode, user.playerId, restartTheme || room.theme || 'science');
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível reiniciar a partida.'));
    } finally {
      setRestartLoading(false);
    }
  };

  const handleAnswer = (option) => {
    setActionError(null);
    clearError();
    sendAnswer(normalizedRoomCode, option);
  };

  const renderConnection = () => {
    if (connectionStatus === 'connected') {
      return <span className="connection-dot connected">Tempo real ativo</span>;
    }

    if (connectionStatus === 'failed') {
      return (
        <div className="status-banner danger inline">
          <span>{connectionMessage}</span>
          <button className="button small secondary" type="button" onClick={reconnect}>
            Reconectar
          </button>
        </div>
      );
    }

    if (connectionStatus === 'connecting' || connectionStatus === 'reconnecting') {
      return <span className="connection-dot pending">{connectionMessage}</span>;
    }

    return <span className="connection-dot pending">Conexão inativa</span>;
  };

  const renderScoreboard = () => (
    <aside className="scoreboard">
      <div className="scoreboard-header">
        <p className="eyebrow">Placar</p>
        <strong>{players.length}/{room.maxPlayers || '-'}</strong>
      </div>
      <ol className="player-list">
        {sortedPlayers.map((player, index) => (
          <li
            className={player.player_id === user?.playerId ? 'current-player' : ''}
            key={player.player_id}
          >
            <span className="rank">{index + 1}</span>
            <span className="player-name">{player.player_name}</span>
            <strong>{player.score}</strong>
          </li>
        ))}
      </ol>
    </aside>
  );

  const renderIdentityGate = () => (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Sala {normalizedRoomCode}</p>
        <h1>Como você quer aparecer?</h1>
        <form className="stack-form" onSubmit={handleIdentitySubmit}>
          <label className="field">
            <span>Nome de jogador</span>
            <input
              type="text"
              placeholder="Visitante"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              maxLength={28}
            />
          </label>
          <button className="button primary full" type="submit">
            Entrar como visitante
          </button>
        </form>
        <p className="auth-switch">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );

  const renderLobby = () => (
    <section className="room-layout">
      <div className="lobby-panel">
        <p className="eyebrow">Lobby</p>
        <h1>Sala {normalizedRoomCode}</h1>
        <div className="room-meta">
          <span>{getThemeLabel(room.theme)}</span>
          <span>{room.numQuestions || '-'} perguntas</span>
          <span>{room.maxPlayers || '-'} jogadores</span>
        </div>

        {room.status === 'IN_PROGRESS' ? (
          <p className="status-banner">Partida iniciando...</p>
        ) : (
          <p className="muted">
            {isCreator
              ? 'A partida pode começar quando houver pelo menos dois jogadores.'
              : 'Aguardando o criador iniciar a partida.'}
          </p>
        )}

        <div className="button-row">
          {isCreator && (
            <button
              className="button primary"
              type="button"
              onClick={handleStartGame}
              disabled={!canStart || startLoading}
            >
              {startLoading ? 'Iniciando...' : 'Iniciar partida'}
            </button>
          )}
          <Link className="button secondary" to="/">
            Sair da sala
          </Link>
        </div>
      </div>

      {renderScoreboard()}
    </section>
  );

  const renderQuestion = () => {
    const options = Object.entries(currentQuestion.options || {});
    const answerLocked = Boolean(selectedOption || hasRoundResult || remainingMs <= 0);

    return (
      <section className="room-layout game-layout">
        <div className="question-panel">
          <div className="question-topline">
            <span>{questionProgress}</span>
            <span>{Math.ceil(remainingMs / 1000)}s</span>
          </div>
          <div className="timer-track">
            <span style={{ width: `${timerPercent}%` }} />
          </div>

          <h1>{currentQuestion.text}</h1>

          <div className="answer-grid">
            {options.map(([option, label]) => {
              const isCorrect = hasRoundResult && option === roundResult.correct_option;
              const isWrongSelection = hasRoundResult && selectedOption === option && !isCorrect;
              const classes = [
                'answer-option',
                selectedOption === option ? 'selected' : '',
                isCorrect ? 'correct' : '',
                isWrongSelection ? 'wrong' : '',
              ].filter(Boolean).join(' ');

              return (
                <button
                  className={classes}
                  type="button"
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={answerLocked}
                >
                  <span>{option.toUpperCase()}</span>
                  <strong>{label}</strong>
                </button>
              );
            })}
          </div>

          {selectedOption && !hasRoundResult && (
            <p className="status-banner">Resposta enviada. Aguardando o resultado da rodada.</p>
          )}

          {hasRoundResult && (
            <div className="round-result">
              <p>
                Resposta correta: <strong>{roundResult.correct_option.toUpperCase()}</strong>
              </p>
              <p>
                {playerCredit
                  ? `Você ganhou ${playerCredit.earned} crédito(s) nesta rodada.`
                  : 'Você não pontuou nesta rodada.'}
              </p>
            </div>
          )}
        </div>

        {renderScoreboard()}
      </section>
    );
  };

  const renderFinal = () => {
    const ranking = gameOverData?.ranking?.length
      ? gameOverData.ranking
      : sortedPlayers.map((player, index) => ({
        player_id: player.player_id,
        player_name: player.player_name,
        total_score: player.score,
        position: index + 1,
      }));

    return (
      <section className="room-layout final-layout">
        <div className="final-panel">
          <p className="eyebrow">Fim de jogo</p>
          <h1>Ranking final</h1>

          <ol className="ranking-list">
            {ranking.map((player) => (
              <li key={player.player_id}>
                <span className="rank">{player.position}</span>
                <span>{player.player_name}</span>
                <strong>{player.total_score}</strong>
              </li>
            ))}
          </ol>

          <div className="button-row">
            <Link className="button secondary" to="/">
              Voltar para a arena
            </Link>
          </div>
        </div>

        {isCreator && (
          <aside className="restart-panel">
            <p className="eyebrow">Criador</p>
            <h2>Nova partida</h2>
            <label className="field">
              <span>Tema</span>
              <select
                value={restartTheme || room.theme || 'science'}
                onChange={(event) => setRestartTheme(event.target.value)}
              >
                {THEMES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button primary full"
              type="button"
              onClick={handleRestartGame}
              disabled={restartLoading}
            >
              {restartLoading ? 'Reiniciando...' : 'Reiniciar'}
            </button>
          </aside>
        )}
      </section>
    );
  };

  if (!user) {
    return renderIdentityGate();
  }

  return (
    <main className="app-shell room-shell">
      <section className="room-header">
        <div>
          <p className="eyebrow">Sala</p>
          <h1>{normalizedRoomCode}</h1>
        </div>
        <div className="room-header-actions">
          {renderConnection()}
          <Link className="button ghost" to="/">
            Arena
          </Link>
        </div>
      </section>

      {visibleError && (
        <div className="status-banner danger">
          <span>{visibleError}</span>
          {error?.code === 'ROOM_NOT_FOUND' && (
            <Link className="button small secondary" to="/">
              Voltar
            </Link>
          )}
        </div>
      )}

      {entryLoading || (!entryError && room.roomCode !== normalizedRoomCode) ? (
        <p className="status-banner">Entrando na sala...</p>
      ) : room.status === 'FINISHED' ? (
        renderFinal()
      ) : currentQuestion ? (
        renderQuestion()
      ) : (
        renderLobby()
      )}
    </main>
  );
};

export default Room;
