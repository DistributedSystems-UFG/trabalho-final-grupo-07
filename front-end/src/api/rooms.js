import apiClient from './client';

export const createRoom = ({ creatorId, creatorName, isAnonymous, maxPlayers, numQuestions, theme }) => {
  return apiClient.post('/rooms', {
    creator_id: creatorId,
    creator_name: creatorName,
    is_anonymous: isAnonymous,
    max_players: maxPlayers,
    num_questions: numQuestions,
    theme,
  });
};

export const joinRoom = (roomCode, { playerId, playerName, isAnonymous }) => {
  return apiClient.post(`/rooms/${roomCode}/join`, {
    player_id: playerId,
    player_name: playerName,
    is_anonymous: isAnonymous,
  });
};

export const getRoom = (roomCode) => {
  return apiClient.get(`/rooms/${roomCode}`);
};

export const startGame = (roomCode, requesterId) => {
  return apiClient.post(`/rooms/${roomCode}/start`, { requester_id: requesterId });
};

export const restartGame = (roomCode, requesterId, newTheme) => {
  return apiClient.post(`/rooms/${roomCode}/restart`, {
    requester_id: requesterId,
    new_theme: newTheme,
  });
};