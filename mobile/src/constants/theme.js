export const lightColors = {
  bg: '#F2EDE6', bg2: '#EDE6DC', bg3: '#E6DDD2',
  glass: 'rgba(255,255,255,0.52)', glass2: 'rgba(255,255,255,0.74)',
  border: 'rgba(255,255,255,0.82)', border2: 'rgba(0,0,0,0.06)',
  ink: 'rgba(26,24,20,0.06)',
  sage: '#6B8F5E', sage2: '#A3B18A', gold: '#C9A66B', brown: '#A67C52',
  txt: '#1A1814', txt2: '#7A7060', txt3: '#AEA090',
};

export const darkColors = {
  bg: '#0C0B09', bg2: '#111009', bg3: '#171510',
  glass: 'rgba(255,255,255,0.055)', glass2: 'rgba(255,255,255,0.085)',
  border: 'rgba(255,255,255,0.11)', border2: 'rgba(255,255,255,0.07)',
  ink: 'rgba(240,232,210,0.035)',
  sage: '#7EC87A', sage2: '#A0C88A', gold: '#D4A855', brown: '#C08850',
  txt: '#EDE8DF', txt2: '#7A7468', txt3: '#4A4840',
};

// Light is the default — keeps all existing static `colors` imports working
export const colors = lightColors;

export const fonts = {
  display: 'BebasNeue_400Regular',
  body: 'DMSans_400Regular',
  bodyMed: 'DMSans_500Medium',
  mood: 'PlayfairDisplay_400Regular_Italic',
};

// Sharp 3-4px radius is intentional — luxury minimal design language
export const radius = {
  card: 4,
  chip: 20,
  button: 4,
  small: 3,
};

export const shadows = {
  card: {
    shadowColor: '#A67C52',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  chip: {
    shadowColor: '#1A1814',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
};
