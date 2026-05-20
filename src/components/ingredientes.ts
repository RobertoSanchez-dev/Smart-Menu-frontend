import { API_BASE, MIN_INGREDIENTES_PARA_RECOMENDAR } from '../config'
import { state } from '../state'
import type { Ingrediente } from '../types'

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

export function renderIngredientes() {
  const ingredientsList = document.querySelector<HTMLDivElement>('#ingredients-list')
  const recommendButton = document.querySelector<HTMLButtonElement>('#recommend-button')
  if (!ingredientsList) return

  if (!state.ingredientesDisponibles.length) {
    ingredientsList.innerHTML = `<p class="muted">No hay ingredientes disponibles. Añádelos desde el panel de cocina.</p>`
    if (recommendButton) recommendButton.disabled = true
    return
  }

  const grouped = new Map<string, Ingrediente[]>()
  for (const ing of state.ingredientesDisponibles) {
    const cat = getCategoryForIngredient(ing.name)
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(ing)
  }

  const categoryOrder = [...INGREDIENT_CATEGORIES.map((c) => c.label), 'Otros']
  const sortedEntries = [...grouped.entries()].sort(
    (a, b) => categoryOrder.indexOf(a[0]) - categoryOrder.indexOf(b[0]),
  )

  ingredientsList.innerHTML = sortedEntries
    .map(
      ([cat, items]) => `
      <div class="ingredient-category-group">
        <p class="ingredient-category-label">${cat}</p>
        <div class="ingredient-chips">
          ${items
            .map(
              (ing) => `
            <button
              type="button"
              class="ingredient-chip${state.idsIngredientesSeleccionados.has(ing.id) ? ' is-selected' : ''}"
              data-id="${ing.id}"
            >${ing.name}</button>
          `,
            )
            .join('')}
        </div>
      </div>
    `,
    )
    .join('')

  ingredientsList.querySelectorAll<HTMLButtonElement>('.ingredient-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const id = Number(chip.dataset.id)
      if (state.idsIngredientesSeleccionados.has(id)) {
        state.idsIngredientesSeleccionados.delete(id)
        chip.classList.remove('is-selected')
      } else {
        state.idsIngredientesSeleccionados.add(id)
        chip.classList.add('is-selected')
      }
      const count = state.idsIngredientesSeleccionados.size
      if (recommendButton) recommendButton.disabled = count < MIN_INGREDIENTES_PARA_RECOMENDAR
      const counter = document.getElementById('ingredient-counter')
      if (counter) counter.textContent = count > 0 ? `${count} seleccionado${count > 1 ? 's' : ''}` : ''
    })
  })

  if (recommendButton) recommendButton.disabled = state.idsIngredientesSeleccionados.size < MIN_INGREDIENTES_PARA_RECOMENDAR
}

export async function fetchIngredients() {
  const ingredientsList = document.querySelector<HTMLDivElement>('#ingredients-list')
  try {
    const res = await fetch(`${API_BASE}/ingredients`)
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
    const data = (await res.json()) as Ingrediente[]
    state.ingredientesTodos = data
    state.ingredientesDisponibles = data
    renderIngredientes()
  } catch (error) {
    console.error(error)
    if (ingredientsList) {
      ingredientsList.innerHTML =
        '<p class="error">No se han podido cargar los ingredientes. Comprueba que el backend está en marcha.</p>'
    }
  }
}
