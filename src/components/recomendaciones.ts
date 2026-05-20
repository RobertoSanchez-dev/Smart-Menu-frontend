import { API_BASE, MIN_INGREDIENTES_PARA_RECOMENDAR } from '../config'
import { state } from '../state'
import { syncOrderUI, syncDishSelectableBadges } from './pedido'

type AIRecomendacion = {
  name: string
  description?: string
  why?: string
  price?: number
}

const AI_REC_ID_BASE = -100

function toggleAIRec(id: number, rec: AIRecomendacion) {
  if (state.orderItemsById.has(id)) {
    state.orderItemsById.delete(id)
  } else {
    state.orderItemsById.set(id, {
      dishId: id,
      name: rec.name,
      price: rec.price != null ? String(rec.price) : null,
      category: 'ia',
      ai_why: rec.why,
    })
  }
  syncOrderUI()
  syncDishSelectableBadges()
}

export function renderRecomendaciones(recs: AIRecomendacion[]) {
  const container = document.querySelector<HTMLDivElement>('#recommendations')
  if (!container) return

  container.innerHTML = recs
    .map((r, i) => {
      const id = AI_REC_ID_BASE - i
      const inOrder = state.orderItemsById.has(id)
      return `
        <article class="dish dish-selectable" role="button" tabindex="0" data-dish-id="${id}">
          <header class="dish-header">
            <h3>${r.name}</h3>
            ${r.price != null ? `<span class="price">${Number(r.price).toFixed(2)} €</span>` : ''}
          </header>
          ${r.description ? `<p class="dish-description">${r.description}</p>` : ''}
          ${r.why ? `<p class="dish-ai-why"><span class="label">IA:</span> ${r.why}</p>` : ''}
          <div class="dish-badge">${inOrder ? 'En pedido' : 'Añadir'}</div>
        </article>
      `
    })
    .join('')

  recs.forEach((r, i) => {
    const id = AI_REC_ID_BASE - i
    const card = container.querySelector<HTMLElement>(`.dish-selectable[data-dish-id="${id}"]`)
    card?.addEventListener('click', () => toggleAIRec(id, r))
    card?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') toggleAIRec(id, r)
    })
  })
}

export async function fetchRecommendations() {
  const container = document.querySelector<HTMLDivElement>('#recommendations')
  if (!container) return

  if (state.idsIngredientesSeleccionados.size < MIN_INGREDIENTES_PARA_RECOMENDAR) {
    container.innerHTML = `<p class="muted">Selecciona al menos ${MIN_INGREDIENTES_PARA_RECOMENDAR} ingredientes para buscar platos.</p>`
    return
  }

  container.innerHTML = '<p class="muted">Buscando recomendaciones...</p>'

  const params = new URLSearchParams()
  Array.from(state.idsIngredientesSeleccionados).forEach((id) =>
    params.append('ingredient_ids[]', String(id)),
  )

  try {
    const res = await fetch(`${API_BASE}/recommendations?${params.toString()}`)
    const payload = (await res.json()) as { recommendations?: AIRecomendacion[]; message?: string }

    if (res.status === 422) {
      container.innerHTML = `<p class="error">${payload.message ?? 'No se puede realizar la búsqueda con esa selección.'}</p>`
      return
    }
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`)

    const recs = payload.recommendations ?? []
    if (!recs.length) {
      container.innerHTML = `<p class="muted">${payload.message ?? 'La IA no ha podido generar sugerencias. Prueba con otros ingredientes.'}</p>`
      return
    }

    renderRecomendaciones(recs)
  } catch (error) {
    console.error(error)
    container.innerHTML =
      '<p class="error">No se han podido obtener recomendaciones. Comprueba que el backend está en marcha.</p>'
  }
}
