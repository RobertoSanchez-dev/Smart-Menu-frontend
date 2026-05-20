import { API_BASE } from '../config'
import { state } from '../state'
import type { CartaData, SeccionCarta } from '../types'
import { syncDishSelectableBadges, bindDishSelection } from './pedido'

function renderCartaSection(key: keyof CartaData, section: SeccionCarta): string {
  if (!section.dishes.length) return ''
  return `
    <section class="carta-section" data-category="${key}">
      <h2 class="carta-section-title">${section.label}</h2>
      <ul class="carta-dish-list">
        ${section.dishes
          .map(
            (d) => `
          <li
            class="carta-dish dish-selectable"
            role="button"
            tabindex="0"
            data-dish-id="${d.id}"
            data-dish-name="${d.name}"
            data-dish-price="${d.price ?? ''}"
            data-dish-category="${key}"
          >
            <div class="carta-dish-main">
              <span class="carta-dish-name">${d.name}</span>
              ${d.price != null ? `<span class="carta-dish-price">${Number(d.price).toFixed(2)} €</span>` : ''}
            </div>
            ${d.description ? `<p class="carta-dish-desc">${d.description}</p>` : ''}
            <div class="dish-badge">${state.orderItemsById.has(d.id) ? 'En pedido' : 'Añadir'}</div>
          </li>
        `,
          )
          .join('')}
      </ul>
    </section>
  `
}

export function renderCarta() {
  const cartaContainer = document.querySelector<HTMLDivElement>('#carta-container')
  if (!cartaContainer || !state.cartaData) return

  const entrantes = renderCartaSection('entrante', state.cartaData.entrante)
  const comidas = renderCartaSection('comida', state.cartaData.comida)
  const postres = renderCartaSection('postre', state.cartaData.postre)
  const bebidas = renderCartaSection('bebida', state.cartaData.bebida)

  cartaContainer.innerHTML =
    entrantes || comidas || postres || bebidas
      ? `
        <div class="carta-row carta-row--two">
          <div class="carta-col">${entrantes}</div>
          <div class="carta-col">${comidas}</div>
        </div>
        <div class="carta-row carta-row--one">
          ${postres}
          ${bebidas}
        </div>
      `
      : '<p class="carta-empty muted">No hay platos disponibles en la carta en este momento.</p>'

  syncDishSelectableBadges()
  bindDishSelection()
}

export async function fetchCarta() {
  const cartaContainer = document.querySelector<HTMLDivElement>('#carta-container')
  if (!cartaContainer) return
  try {
    const res = await fetch(`${API_BASE}/carta`)
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
    const data = (await res.json()) as { carta: CartaData }
    state.cartaData = data.carta
    renderCarta()
  } catch (error) {
    console.error(error)
    cartaContainer.innerHTML = '<p class="error">No se ha podido cargar la carta.</p>'
  }
}
