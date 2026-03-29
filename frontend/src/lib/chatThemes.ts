export interface ChatTheme {
  id: string
  name: string
  emoji: string
  description: string
  // layout colors
  bg: string
  sidebar: string
  header: string
  headerText: string
  border: string
  input: string
  inputBorder: string
  inputText: string
  text: string
  textMuted: string
  card: string
  // bubbles
  myBubble: string
  myText: string
  theirBubble: string
  theirText: string
  // typography
  font: string
  // optional extras
  bubbleRadius?: string
  borderStyle?: string   // e.g. '2px solid'
  scanlines?: boolean    // CSS scanline overlay
  inputRadius?: string
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'default',
    name: 'Modern',
    emoji: '✨',
    description: 'The default clean look',
    bg: '', sidebar: '', header: '', headerText: '',
    border: '', input: '', inputBorder: '', inputText: '',
    text: '', textMuted: '', card: '',
    myBubble: '#6366f1', myText: '#ffffff',
    theirBubble: '', theirText: '',
    font: 'Inter, sans-serif',
    bubbleRadius: '16px',
  },

  {
    id: 'windows95',
    name: 'Windows 95',
    emoji: '🖥️',
    description: '99 years of the internet — ye olde dial-up era',
    bg: '#008080',
    sidebar: '#c0c0c0',
    header: '#000080',
    headerText: '#ffffff',
    border: '#000000',
    input: '#ffffff',
    inputBorder: '#808080',
    inputText: '#000000',
    text: '#000000',
    textMuted: '#444444',
    card: '#c0c0c0',
    myBubble: '#000080', myText: '#ffffff',
    theirBubble: '#ffffff', theirText: '#000000',
    font: '"Courier New", monospace',
    bubbleRadius: '0px',
    borderStyle: '2px solid',
    inputRadius: '0px',
  },

  {
    id: 'matrix',
    name: 'The Matrix',
    emoji: '🟩',
    description: 'You take the green pill…',
    bg: '#0a0a0a',
    sidebar: '#0d0d0d',
    header: '#0a0a0a',
    headerText: '#00ff41',
    border: '#00ff4122',
    input: '#0d1a0d',
    inputBorder: '#00ff41',
    inputText: '#00ff41',
    text: '#00ff41',
    textMuted: '#00cc3399',
    card: '#0d1a0d',
    myBubble: '#003300', myText: '#00ff41',
    theirBubble: '#001a00', theirText: '#00cc33',
    font: '"Courier New", "Lucida Console", monospace',
    bubbleRadius: '4px',
    scanlines: true,
    inputRadius: '4px',
  },

  {
    id: 'aol',
    name: 'AIM Messenger',
    emoji: '💬',
    description: 'ASL? Running Man goes brrr',
    bg: '#d4d0c8',
    sidebar: '#ece9d8',
    header: '#0055e5',
    headerText: '#ffffff',
    border: '#808080',
    input: '#ffffff',
    inputBorder: '#7b9ebd',
    inputText: '#000000',
    text: '#000000',
    textMuted: '#444444',
    card: '#ece9d8',
    myBubble: '#0055e5', myText: '#ffffff',
    theirBubble: '#ffffff', theirText: '#000000',
    font: 'Arial, sans-serif',
    bubbleRadius: '6px',
    borderStyle: '2px solid',
    inputRadius: '2px',
  },

  {
    id: 'vaporwave',
    name: 'Vaporwave',
    emoji: '🌸',
    description: 'A E S T H E T I C',
    bg: '#1a0533',
    sidebar: '#240840',
    header: 'linear-gradient(135deg, #ff6ec7, #7b2fff)',
    headerText: '#ffffff',
    border: '#ff6ec744',
    input: '#2d0f4a',
    inputBorder: '#ff6ec7',
    inputText: '#ff6ec7',
    text: '#ffffff',
    textMuted: '#c084fc',
    card: '#2d0f4a',
    myBubble: 'linear-gradient(135deg, #ff6ec7, #7b2fff)', myText: '#ffffff',
    theirBubble: '#3d1060', theirText: '#ff6ec7',
    font: 'Arial, sans-serif',
    bubbleRadius: '20px 20px 4px 20px',
    inputRadius: '999px',
  },

  {
    id: 'terminal',
    name: 'Hacker Terminal',
    emoji: '⌨️',
    description: "I'm in. sudo send --love",
    bg: '#0c0c0c',
    sidebar: '#111111',
    header: '#0c0c0c',
    headerText: '#ffb300',
    border: '#ffb30022',
    input: '#1a1a1a',
    inputBorder: '#ffb300',
    inputText: '#ffb300',
    text: '#ffb300',
    textMuted: '#cc8800',
    card: '#111111',
    myBubble: '#1a1a00', myText: '#ffb300',
    theirBubble: '#0a0a0a', theirText: '#cc8800',
    font: '"Courier New", monospace',
    bubbleRadius: '2px',
    scanlines: true,
    inputRadius: '2px',
  },

  {
    id: 'bubblegum',
    name: 'Bubblegum',
    emoji: '🩷',
    description: 'Sweet, sticky, and extremely pink',
    bg: '#fff0f6',
    sidebar: '#ffe4f0',
    header: '#ff80b5',
    headerText: '#ffffff',
    border: '#ffb3d1',
    input: '#ffffff',
    inputBorder: '#ff80b5',
    inputText: '#7c2d53',
    text: '#4a1030',
    textMuted: '#c06080',
    card: '#ffe4f0',
    myBubble: '#ff4d9e', myText: '#ffffff',
    theirBubble: '#ffffff', theirText: '#4a1030',
    font: '"Comic Sans MS", "Chalkboard SE", cursive',
    bubbleRadius: '20px',
    inputRadius: '999px',
  },

  {
    id: 'newspaper',
    name: 'Broadsheet',
    emoji: '📰',
    description: 'Extra! Extra! Read all about it!',
    bg: '#f5f0e8',
    sidebar: '#ede8de',
    header: '#1a1a1a',
    headerText: '#f5f0e8',
    border: '#1a1a1a',
    input: '#ffffff',
    inputBorder: '#1a1a1a',
    inputText: '#1a1a1a',
    text: '#1a1a1a',
    textMuted: '#555555',
    card: '#ede8de',
    myBubble: '#1a1a1a', myText: '#f5f0e8',
    theirBubble: '#ffffff', theirText: '#1a1a1a',
    font: '"Georgia", "Times New Roman", serif',
    bubbleRadius: '2px',
    borderStyle: '1px solid',
    inputRadius: '0px',
  },
]

export const DEFAULT_THEME_ID = 'default'
