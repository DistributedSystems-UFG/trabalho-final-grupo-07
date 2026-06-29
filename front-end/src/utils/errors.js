const STATUS_MESSAGES = {
  400: 'Revise os dados informados.',
  401: 'Sua sessão expirou. Faça login novamente.',
  403: 'Você não tem permissão para esta ação.',
  404: 'Sala não encontrada.',
  409: 'A ação não pode ser concluída neste momento.',
  503: 'Tema temporariamente indisponível, tente outro.',
};

export const getApiErrorMessage = (error, fallback = 'Não foi possível concluir a ação.') => {
  const status = error?.response?.status;
  return error?.response?.data?.message || STATUS_MESSAGES[status] || fallback;
};
