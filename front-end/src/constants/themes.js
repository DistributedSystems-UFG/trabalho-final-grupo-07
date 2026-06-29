export const THEMES = [
  { value: 'music', label: 'Música' },
  { value: 'sport_and_leisure', label: 'Esporte e Lazer' },
  { value: 'film_and_tv', label: 'Cinema e TV' },
  { value: 'arts_and_literature', label: 'Artes e Literatura' },
  { value: 'history', label: 'História' },
  { value: 'society_and_culture', label: 'Sociedade e Cultura' },
  { value: 'science', label: 'Ciência' },
  { value: 'geography', label: 'Geografia' },
  { value: 'food_and_drink', label: 'Gastronomia' },
  { value: 'general_knowledge', label: 'Conhecimentos Gerais' },
];

export const THEME_LABELS = Object.fromEntries(
  THEMES.map((theme) => [theme.value, theme.label]),
);

export const getThemeLabel = (theme) => THEME_LABELS[theme] || theme || 'Tema';
