export const API_BASE = 'http://127.0.0.1:8000/api/v1'
export const ADMIN_TOKEN_KEY = 'chef_token'
export const MIN_INGREDIENTES = 4
export const INGREDIENTS_PAGE_SIZE = 10

export const CATEGORY_LABELS: Record<string, string> = {
  entrante: 'Entrante',
  comida: 'Comida',
  postre: 'Postre',
  bebida: 'Bebida',
  ia: 'Sugerencia IA',
}

export const INGREDIENT_CATEGORIES: { label: string; keywords: string[] }[] = [
  { label: 'Carnes', keywords: ['pollo', 'pechuga', 'muslos', 'pavo', 'pato', 'ternera', 'solomillo', 'carne picada', 'costillas', 'cerdo', 'lomo', 'panceta', 'bacon', 'cordero', 'pierna', 'chuletillas', 'conejo', 'buey', 'jamón', 'chorizo', 'salchich', 'butifarra', 'salami', 'morcilla', 'fuet'] },
  { label: 'Pescados', keywords: ['merluza', 'salmón', 'bacalao', 'dorada', 'lubina', 'rodaballo', 'rape', 'trucha', 'atún', 'boquerones', 'sardinas', 'mero', 'lenguado'] },
  { label: 'Mariscos', keywords: ['gambas', 'langostinos', 'cigalas', 'almejas', 'mejillones', 'pulpo', 'calamar', 'sepia', 'navajas', 'berberechos'] },
  { label: 'Pastas', keywords: ['espaguetis', 'macarrones', 'penne', 'tagliatelle', 'linguine', 'fusilli', 'rigatoni', 'lasaña', 'fettuccine'] },
  { label: 'Arroces y cereales', keywords: ['arroz', 'cuscús', 'quinoa'] },
  { label: 'Legumbres', keywords: ['lentejas', 'garbanzos', 'alubias', 'habas', 'guisantes'] },
  { label: 'Verduras', keywords: ['patata', 'tomate', 'lechuga', 'pimiento', 'pepino', 'espinacas', 'brócoli', 'coliflor', 'berenjena', 'calabacín', 'champiñones', 'espárragos', 'aguacate', 'rúcula', 'maíz', 'alcachofas'] },
  { label: 'Setas', keywords: ['setas', 'boletus', 'shiitake', 'trompetas', 'rebozuelos'] },
  { label: 'Quesos', keywords: ['queso', 'mozzarella', 'ricotta'] },
  { label: 'Frutas', keywords: ['limón', 'naranja', 'fresa', 'frambuesa', 'mango', 'piña', 'melocotón'] },
  { label: 'Frutos secos', keywords: ['nueces', 'almendras', 'piñones', 'avellanas'] },
  { label: 'Huevos y lácteos', keywords: ['huevo', 'yogur', 'chocolate'] },
  { label: 'Bebidas', keywords: ['agua', 'vino', 'cerveza', 'zumo'] },
]

export function getCategoryForIngredient(name: string): string {
  const lower = name.toLowerCase()
  for (const cat of INGREDIENT_CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.label
  }
  return 'Otros'
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token)
  else localStorage.removeItem(ADMIN_TOKEN_KEY)
}
