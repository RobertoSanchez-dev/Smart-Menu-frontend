import { CATEGORY_LABELS } from '../config'
import { state } from '../state'
import type { Plato, OrderItem } from '../types'

export function showToast(message: string) {
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2500)
}

export function syncDishSelectableBadges() {
  document.querySelectorAll<HTMLElement>('.dish-selectable[data-dish-id]').forEach((el) => {
    const dishId = Number(el.dataset.dishId ?? 0)
    const selected = state.orderItemsById.has(dishId)
    el.classList.toggle('is-selected', selected)
    const badge = el.querySelector<HTMLElement>('.dish-badge')
    if (badge) badge.textContent = selected ? 'En pedido' : 'Añadir'
  })
}

export function bindDishSelection() {
  document.querySelectorAll<HTMLElement>('.dish-selectable[data-dish-id]').forEach((el) => {
    if (el.dataset.bound === '1') return
    el.dataset.bound = '1'
    el.addEventListener('click', () => toggleOrderItemFromDataset(el))
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') toggleOrderItemFromDataset(el)
    })
  })
}

function getDishFromLists(dishId: number): Plato | null {
  if (!state.cartaData) return null
  for (const section of [state.cartaData.entrante, state.cartaData.comida, state.cartaData.postre, state.cartaData.bebida]) {
    const found = section.dishes.find((d) => d.id === dishId)
    if (found) return found
  }
  return null
}

export function upsertOrderItemFromDish(dish: Plato, categoryOverride?: string) {
  const dishId = dish.id
  const category = categoryOverride ?? dish.category

  if (state.orderItemsById.has(dishId)) {
    state.orderItemsById.delete(dishId)
  } else {
    state.orderItemsById.set(dishId, {
      dishId,
      name: dish.name,
      price: dish.price ?? null,
      category,
      ai_why: dish.ai_why,
    })
  }

  syncOrderUI()
  syncDishSelectableBadges()
}

export function toggleOrderItemFromDataset(el: HTMLElement) {
  const dishId = Number(el.dataset.dishId ?? 0)
  if (!dishId) return

  const dish = getDishFromLists(dishId)
  if (dish) {
    upsertOrderItemFromDish(dish)
    return
  }

  const name = String(el.dataset.dishName ?? '')
  const priceRaw = el.dataset.dishPrice ?? ''
  const category = String(el.dataset.dishCategory ?? '')

  const item: OrderItem = {
    dishId,
    name,
    price: priceRaw || null,
    category: category || undefined,
  }

  if (state.orderItemsById.has(dishId)) {
    state.orderItemsById.delete(dishId)
  } else {
    state.orderItemsById.set(dishId, item)
  }

  syncOrderUI()
  syncDishSelectableBadges()
}

export function renderOrderSummary() {
  const orderItemsList = document.querySelector<HTMLUListElement>('#order-items')
  const sendOrderButton = document.querySelector<HTMLButtonElement>('#send-order-button')
  if (!orderItemsList || !sendOrderButton) return

  if (!state.orderItemsById.size) {
    orderItemsList.innerHTML = '<li class="muted">Tu pedido está vacío.</li>'
    sendOrderButton.disabled = true
    return
  }

  const items = Array.from(state.orderItemsById.values())
  const total = items.reduce((acc, it) => acc + (it.price != null ? Number(it.price) : 0), 0)

  orderItemsList.innerHTML = items
    .map((it) => {
      const label = it.category ? CATEGORY_LABELS[it.category] ?? it.category : 'Plato'
      const priceText = it.price != null ? `${Number(it.price).toFixed(2)} €` : ''
      return `
        <li class="order-item" data-dish-id="${it.dishId}">
          <div class="order-item-main">
            <div class="order-item-title">${it.name}</div>
            <div class="order-item-meta">${label}${priceText ? ` · ${priceText}` : ''}</div>
          </div>
          <button type="button" class="order-remove secondary" data-dish-id="${it.dishId}">Quitar</button>
        </li>
      `
    })
    .join('')

  sendOrderButton.disabled = false
  const totalEl = document.getElementById('order-total')
  if (totalEl) totalEl.textContent = `Total: ${total.toFixed(2)} €`

  orderItemsList.querySelectorAll<HTMLButtonElement>('.order-remove[data-dish-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const id = Number(btn.dataset.dishId ?? 0)
      if (!id) return
      state.orderItemsById.delete(id)
      syncOrderUI()
      syncDishSelectableBadges()
    })
  })
}

export function syncOrderUI() {
  renderOrderSummary()
}

export async function sendOrder() {
  const sendOrderButton = document.querySelector<HTMLButtonElement>('#send-order-button')
  if (!sendOrderButton || sendOrderButton.disabled) return
  showToast('Comanda enviada a cocina.')
  state.orderItemsById.clear()
  syncOrderUI()
  syncDishSelectableBadges()
}
