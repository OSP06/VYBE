export const FOOD_CUISINES = [
  { id: 'coffee',        label: 'COFFEE',      emoji: '☕' },
  { id: 'brunch',        label: 'BRUNCH',      emoji: '🍳' },
  { id: 'ramen',         label: 'RAMEN',       emoji: '🍜' },
  { id: 'sushi',         label: 'SUSHI',       emoji: '🍱' },
  { id: 'korean',        label: 'KOREAN',      emoji: '🥩' },
  { id: 'italian',       label: 'ITALIAN',     emoji: '🍝' },
  { id: 'mexican',       label: 'MEXICAN',     emoji: '🌮' },
  { id: 'indian',        label: 'INDIAN',      emoji: '🍛' },
  { id: 'thai',          label: 'THAI',        emoji: '🌶' },
  { id: 'american',      label: 'AMERICAN',    emoji: '🍔' },
  { id: 'pizza',         label: 'PIZZA',       emoji: '🍕' },
  { id: 'sandwiches',    label: 'SANDWICHES',  emoji: '🥪' },
  { id: 'dessert',       label: 'DESSERT',     emoji: '🍰' },
  { id: 'mediterranean', label: 'MEDI',        emoji: '🫒' },
  { id: 'seafood',       label: 'SEAFOOD',     emoji: '🦞' },
];

export const FOOD_DRINKS = [
  { id: 'cocktails',    label: 'COCKTAILS',  emoji: '🍸' },
  { id: 'wine',         label: 'WINE BAR',   emoji: '🍷' },
  { id: 'craft_beer',   label: 'CRAFT BEER', emoji: '🍺' },
];

export const FOOD_MEAL_TYPES = [
  { id: 'breakfast',  label: 'BREAKFAST',  emoji: '🌅' },
  { id: 'lunch',      label: 'LUNCH',      emoji: '🌤' },
  { id: 'dinner',     label: 'DINNER',     emoji: '🌙' },
  { id: 'late_night', label: 'LATE NIGHT', emoji: '🌃' },
];

export const ALL_FOODS = [...FOOD_CUISINES, ...FOOD_DRINKS, ...FOOD_MEAL_TYPES];

export const FOOD_EMOJI = Object.fromEntries(ALL_FOODS.map((f) => [f.id, f.emoji]));
