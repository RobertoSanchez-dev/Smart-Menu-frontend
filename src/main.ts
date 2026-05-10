import './style.css'

type Ingrediente = {
  id: number
  name: string
  unit: string
  stock_quantity: number
  is_visible: boolean
}

type IngredienteDePlato = {
  id: number
  ingredient_id: number
  dish_id: number
  quantity: string
  ingredient?: Ingrediente
}

type Plato = {
  id: number
  name: string
  description: string | null
  price: string | null
  category?: string
  ingredients?: IngredienteDePlato[]
  ai_why?: string
}

type SeccionCarta = {
  label: string
  dishes: Plato[]
}

type CartaData = {
  entrante: SeccionCarta
  comida: SeccionCarta
  postre: SeccionCarta
  bebida: SeccionCarta
}

const API_BASE = 'http://127.0.0.1:8000/api/v1'
const ADMIN_TOKEN_KEY = 'chef_token'

const app = document.querySelector<HTMLDivElement>('#app')!

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'

let ingredientesTodos: Ingrediente[] = []
let ingredientesDisponibles: Ingrediente[] = []
const INGREDIENTS_PAGE_SIZE = 10
let paginaIngredientesCocina = 1
const idsIngredientesSeleccionados = new Set<number>()
/** Mínimo de ingredientes distintos para pedir recomendaciones (coincide con la API). */
const MIN_INGREDIENTES_PARA_RECOMENDAR = 4

function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

function setAdminToken(token: string | null) {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  }
}

// ===== VISTA CLIENTE PÚBLICA (/) =====

let ingredientsList: HTMLDivElement
let recommendButton: HTMLButtonElement
let recommendationsContainer: HTMLDivElement
let cartaContainer: HTMLDivElement
let cartaData: CartaData | null = null
let orderItemsList: HTMLUListElement
let sendOrderButton: HTMLButtonElement
let ultimosPlatosRecomendados: Plato[] = []

type OrderItem = {
  dishId: number
  name: string
  price: string | null
  category?: string
  ai_why?: string
}

const orderItemsById = new Map<number, OrderItem>()

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
            <div class="dish-badge">${orderItemsById.has(d.id) ? 'En pedido' : 'Añadir'}</div>
          </li>
        `,
          )
          .join('')}
      </ul>
    </section>
  `
}

function renderCarta() {
  if (!cartaContainer || !cartaData) return
  const entrantes = renderCartaSection('entrante', cartaData.entrante)
  const comidas = renderCartaSection('comida', cartaData.comida)
  const postres = renderCartaSection('postre', cartaData.postre)
  const bebidas = renderCartaSection('bebida', cartaData.bebida)

  const html = `
    <div class="carta-row carta-row--two">
      <div class="carta-col">${entrantes}</div>
      <div class="carta-col">${comidas}</div>
    </div>
    <div class="carta-row carta-row--one">
      ${postres}
    </div>
    ${bebidas ? `<div class="carta-row carta-row--one carta-row--bebidas">${bebidas}</div>` : ''}
  `
  cartaContainer.innerHTML =
    entrantes || comidas || postres || bebidas
      ? html
      : '<p class="carta-empty muted">No hay platos disponibles en la carta en este momento.</p>'

  syncDishSelectableBadges()
  bindDishSelection()
}

async function fetchCarta() {
  if (!cartaContainer) return
  try {
    const res = await fetch(`${API_BASE}/carta`)
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
    const data = (await res.json()) as { carta: CartaData }
    cartaData = data.carta
    renderCarta()
  } catch (error) {
    console.error(error)
    cartaContainer.innerHTML = '<p class="error">No se ha podido cargar la carta.</p>'
  }
}

function renderIngredientes() {
  if (!ingredientesDisponibles.length) {
    ingredientsList.innerHTML = `<p class="muted">No hay ingredientes disponibles. Añádelos desde el panel de cocina.</p>`
    recommendButton.disabled = true
    return
  }

  ingredientsList.innerHTML = ingredientesDisponibles
    .map(
      (ingredient) => `
      <label class="ingredient-item">
        <input
          type="checkbox"
          value="${ingredient.id}"
          ${idsIngredientesSeleccionados.has(ingredient.id) ? 'checked' : ''}
        />
        <span>
          <strong>${ingredient.name}</strong>
          <span class="muted"> · Stock: ${ingredient.stock_quantity} ${ingredient.unit}</span>
        </span>
      </label>
    `,
    )
    .join('')

  ingredientsList
    .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement
        const id = Number(target.value)
        if (target.checked) {
          idsIngredientesSeleccionados.add(id)
        } else {
          idsIngredientesSeleccionados.delete(id)
        }
        recommendButton.disabled =
          idsIngredientesSeleccionados.size < MIN_INGREDIENTES_PARA_RECOMENDAR
      })
    })

  recommendButton.disabled =
    idsIngredientesSeleccionados.size < MIN_INGREDIENTES_PARA_RECOMENDAR
}

function renderRecomendaciones(dishes: Plato[]) {
  if (!dishes.length) {
    recommendationsContainer.innerHTML =
      '<p class="muted">No hay platos en carta que lleven todos esos ingredientes a la vez. Prueba con otra combinación.</p>'
    return
  }

  ultimosPlatosRecomendados = dishes
  recommendationsContainer.innerHTML = dishes
    .map((dish) => {
      const ingredientsText = dish.ingredients
        ?.map((di) => di.ingredient?.name)
        .filter(Boolean)
        .join(', ')

      return `
        <article
          class="dish dish-selectable"
          role="button"
          tabindex="0"
          data-dish-id="${dish.id}"
          data-dish-name="${dish.name}"
          data-dish-price="${dish.price ?? ''}"
          data-dish-category="${dish.category ?? ''}"
        >
          <header class="dish-header">
            <h3>${dish.name}</h3>
            ${
              dish.price
                ? `<span class="price">${Number(dish.price).toFixed(2)} €</span>`
                : ''
            }
          </header>
          ${
            dish.description
              ? `<p class="dish-description">${dish.description}</p>`
              : ''
          }
          ${
            dish.ai_why
              ? `<p class="dish-ai-why"><span class="label">IA:</span> ${dish.ai_why}</p>`
              : ''
          }
          ${
            ingredientsText
              ? `<p class="dish-ingredients"><span class="label">Ingredientes:</span> ${ingredientsText}</p>`
              : ''
          }
          <div class="dish-badge">${orderItemsById.has(dish.id) ? 'En pedido' : 'Añadir'}</div>
        </article>
      `
    })
    .join('')

  syncDishSelectableBadges()
  bindDishSelection()
}

function getDishFromLists(dishId: number): Plato | null {
  const fromRecommendations = ultimosPlatosRecomendados.find((d) => d.id === dishId)
  if (fromRecommendations) return fromRecommendations

  if (!cartaData) return null

  const sections: Array<SeccionCarta> = [
    cartaData.entrante,
    cartaData.comida,
    cartaData.postre,
    cartaData.bebida,
  ]

  for (const section of sections) {
    const found = section.dishes.find((d) => d.id === dishId)
    if (found) return found
  }

  return null
}

function upsertOrderItemFromDish(dish: Plato, categoryOverride?: string) {
  const dishId = dish.id
  const category = categoryOverride ?? dish.category

  if (orderItemsById.has(dishId)) {
    orderItemsById.delete(dishId)
  } else {
    orderItemsById.set(dishId, {
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

function toggleOrderItemFromDataset(el: HTMLElement) {
  const dishId = Number(el.dataset.dishId ?? 0)
  if (!dishId) return

  const dish = getDishFromLists(dishId)
  if (dish) {
    upsertOrderItemFromDish(dish)
    return
  }

  // Fallback: si no está en nuestras listas, usamos el dataset.
  const name = String(el.dataset.dishName ?? '')
  const priceRaw = el.dataset.dishPrice ?? ''
  const category = String(el.dataset.dishCategory ?? '')
  const price = priceRaw ? priceRaw : null

  const item: OrderItem = {
    dishId,
    name,
    price,
    category: category || undefined,
  }

  if (orderItemsById.has(dishId)) {
    orderItemsById.delete(dishId)
  } else {
    orderItemsById.set(dishId, item)
  }

  syncOrderUI()
  syncDishSelectableBadges()
}

function renderOrderSummary() {
  if (!orderItemsList || !sendOrderButton) return

  if (!orderItemsById.size) {
    orderItemsList.innerHTML = '<li class="muted">Tu pedido está vacío.</li>'
    sendOrderButton.disabled = true
    return
  }

  const items = Array.from(orderItemsById.values())
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
  const existingTotal = document.getElementById('order-total')
  if (existingTotal) existingTotal.textContent = `Total: ${total.toFixed(2)} €`

  orderItemsList.querySelectorAll<HTMLButtonElement>('.order-remove[data-dish-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const dishId = Number(btn.dataset.dishId ?? 0)
      if (!dishId) return
      orderItemsById.delete(dishId)
      syncOrderUI()
      syncDishSelectableBadges()
    })
  })
}

function syncOrderUI() {
  renderOrderSummary()
}

function syncDishSelectableBadges() {
  document.querySelectorAll<HTMLElement>('.dish-selectable[data-dish-id]').forEach((el) => {
    const dishId = Number(el.dataset.dishId ?? 0)
    const selected = orderItemsById.has(dishId)
    el.classList.toggle('is-selected', selected)
    const badge = el.querySelector<HTMLElement>('.dish-badge')
    if (badge) badge.textContent = selected ? 'En pedido' : 'Añadir'
  })
}

function bindDishSelection() {
  document.querySelectorAll<HTMLElement>('.dish-selectable[data-dish-id]').forEach((el) => {
    // Evitamos duplicar listeners.
    if (el.dataset.bound === '1') return
    el.dataset.bound = '1'
    el.addEventListener('click', () => toggleOrderItemFromDataset(el))
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') toggleOrderItemFromDataset(el)
    })
  })
}

function showToast(message: string) {
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.remove()
  }, 2500)
}

async function sendOrder() {
  if (!sendOrderButton || sendOrderButton.disabled) return

  showToast('Comanda enviada a cocina (simulado).')
  orderItemsById.clear()
  syncOrderUI()
  syncDishSelectableBadges()
}

function renderAdminIngredients() {
  if (!ingredientesTodos.length) {
    adminIngredientsContainer.innerHTML =
      '<p class="muted">Todavía no hay ingredientes registrados.</p>'
    return
  }

  const total = ingredientesTodos.length
  const totalPages = Math.max(1, Math.ceil(total / INGREDIENTS_PAGE_SIZE))
  if (paginaIngredientesCocina > totalPages) {
    paginaIngredientesCocina = totalPages
  }
  const start = (paginaIngredientesCocina - 1) * INGREDIENTS_PAGE_SIZE
  const pageSlice = ingredientesTodos.slice(start, start + INGREDIENTS_PAGE_SIZE)
  const rangeFrom = start + 1
  const rangeTo = Math.min(start + pageSlice.length, total)

  adminIngredientsContainer.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Unidad</th>
          <th>Stock</th>
          <th>Visible</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${pageSlice
          .map(
            (ingredient) => `
              <tr data-id="${ingredient.id}">
                <td>${ingredient.name}</td>
                <td>${ingredient.unit}</td>
                <td>
                  <input
                    type="number"
                    class="stock-input"
                    value="${ingredient.stock_quantity}"
                    min="0"
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    class="visible-input"
                    ${ingredient.is_visible ? 'checked' : ''}
                  />
                </td>
                <td>
                  <button type="button" class="secondary save-ingredient">
                    Guardar
                  </button>
                </td>
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
    <div class="admin-ingredients-pager">
      <button type="button" class="secondary" id="ingredients-page-prev" ${
        paginaIngredientesCocina <= 1 ? 'disabled' : ''
      }>
        Anterior
      </button>
      <span class="muted">
        ${rangeFrom}–${rangeTo} de ${total} · Página ${paginaIngredientesCocina} de ${totalPages}
      </span>
      <button type="button" class="secondary" id="ingredients-page-next" ${
        paginaIngredientesCocina >= totalPages ? 'disabled' : ''
      }>
        Siguiente
      </button>
    </div>
  `

  document
    .getElementById('ingredients-page-prev')
    ?.addEventListener('click', () => {
      if (paginaIngredientesCocina > 1) {
        paginaIngredientesCocina -= 1
        renderAdminIngredients()
      }
    })
  document
    .getElementById('ingredients-page-next')
    ?.addEventListener('click', () => {
      if (paginaIngredientesCocina < totalPages) {
        paginaIngredientesCocina += 1
        renderAdminIngredients()
      }
    })

  adminIngredientsContainer
    .querySelectorAll<HTMLButtonElement>('.save-ingredient')
    .forEach((button) => {
      button.addEventListener('click', async (event) => {
        const row = (event.currentTarget as HTMLButtonElement).closest('tr')
        if (!row) return

        const id = Number(row.getAttribute('data-id'))
        const stockInput = row.querySelector<HTMLInputElement>('.stock-input')
        const visibleInput = row.querySelector<HTMLInputElement>('.visible-input')
        if (!stockInput || !visibleInput) return

        const payload = {
          stock_quantity: Number(stockInput.value) || 0,
          is_visible: visibleInput.checked,
        }

        const token = getAdminToken()
        if (!token) return

        try {
          const res = await fetch(`${API_BASE}/admin/ingredients/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          })

          if (!res.ok) {
            throw new Error(`Error HTTP ${res.status}`)
          }

          const updated = (await res.json()) as Ingrediente
          const idx = ingredientesTodos.findIndex((i) => i.id === updated.id)
          if (idx !== -1) {
            ingredientesTodos[idx] = updated
          }
          ingredientesDisponibles = ingredientesTodos.filter(
            (i) => i.is_visible && i.stock_quantity > 0,
          )
          renderAdminIngredients()
        } catch (error) {
          console.error(error)
          alert('No se ha podido actualizar el ingrediente. Revisa la consola.')
        }
      })
    })
}

async function fetchIngredients() {
  try {
    const res = await fetch(`${API_BASE}/ingredients`)
    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}`)
    }
    const data = (await res.json()) as Ingrediente[]
    ingredientesTodos = data
    ingredientesDisponibles = ingredientesTodos
    renderIngredientes()
  } catch (error) {
    console.error(error)
    ingredientsList.innerHTML =
      '<p class="error">No se han podido cargar los ingredientes. Comprueba que el backend está en marcha.</p>'
  }
}

async function fetchRecommendations() {
  if (idsIngredientesSeleccionados.size < MIN_INGREDIENTES_PARA_RECOMENDAR) {
    recommendationsContainer.innerHTML = `<p class="muted">Selecciona al menos ${MIN_INGREDIENTES_PARA_RECOMENDAR} ingredientes para buscar platos.</p>`
    return
  }

  recommendationsContainer.innerHTML = '<p class="muted">Buscando recomendaciones...</p>'

  const params = new URLSearchParams()
  Array.from(idsIngredientesSeleccionados).forEach((id) =>
    params.append('ingredient_ids[]', String(id)),
  )

  try {
    const res = await fetch(`${API_BASE}/recommendations?${params.toString()}`)
    const payload = (await res.json()) as {
      recommendations?: Plato[]
      message?: string
    }
    if (res.status === 422) {
      recommendationsContainer.innerHTML = `<p class="error">${payload.message ?? 'No se puede realizar la búsqueda con esa selección.'}</p>`
      return
    }
    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}`)
    }
    renderRecomendaciones(payload.recommendations ?? [])
  } catch (error) {
    console.error(error)
    recommendationsContainer.innerHTML =
      '<p class="error">No se han podido obtener recomendaciones. Comprueba que el backend está en marcha.</p>'
  }
}

// ===== VISTA COCINA PROTEGIDA (/cocina) =====

function renderPublicView() {
  app.innerHTML = `
    <main class="app carta-page">
      <header class="carta-header">
        <h1 class="carta-title">La Carta</h1>
        <p class="carta-subtitle">Nuestros platos del día según disponibilidad</p>
      </header>

      <div id="carta-container" class="carta-container">
        <p class="muted">Cargando carta...</p>
      </div>

      <section class="recomendador-section">
        <h2 class="recomendador-title">¿Qué te apetece?</h2>
        <p class="recomendador-desc">Selecciona al menos 4 ingredientes que tengamos disponibles. Solo se muestran platos que llevan <strong>todos</strong> ellos en la receta (hasta 3 sugerencias con ayuda de IA).</p>
        <div class="app-layout">
          <section class="card card-light">
            <h3 class="card-title">Ingredientes disponibles</h3>
            <div id="ingredients-list" class="ingredients-list">
              <p class="muted">Cargando...</p>
            </div>
          </section>
          <section class="card card-light">
            <h3 class="card-title">Recomendaciones</h3>
            <button id="recommend-button" class="primary" disabled title="Necesitas al menos 4 ingredientes">
              Pedir recomendaciones
            </button>
            <div id="recommendations" class="recommendations"></div>
          </section>
        </div>
      </section>

      <section class="card card-light order-panel">
        <h2 class="card-title">Tu pedido</h2>
        <p class="muted">Selecciona platos y bebidas haciendo clic en la carta o en las recomendaciones.</p>
        <ul id="order-items" class="order-items">
          <li class="muted">Tu pedido está vacío.</li>
        </ul>
        <div class="order-total-row">
          <span id="order-total">Total: 0.00 €</span>
          <button id="send-order-button" class="primary" disabled type="button">
            Enviar comanda
          </button>
        </div>
      </section>
    </main>
  `

  cartaContainer = document.querySelector<HTMLDivElement>('#carta-container')!
  ingredientsList = document.querySelector<HTMLDivElement>('#ingredients-list')!
  recommendButton =
    document.querySelector<HTMLButtonElement>('#recommend-button')!
  recommendationsContainer =
    document.querySelector<HTMLDivElement>('#recommendations')!
  orderItemsList = document.querySelector<HTMLUListElement>('#order-items')!
  sendOrderButton = document.querySelector<HTMLButtonElement>('#send-order-button')!

  sendOrderButton.addEventListener('click', () => {
    void sendOrder()
  })

  syncOrderUI()

  recommendButton.addEventListener('click', () => {
    void fetchRecommendations()
  })

  void fetchCarta()
  void fetchIngredients()
}

// Admin view types and variables
let adminIngredientsContainer: HTMLDivElement
let ingredientForm: HTMLFormElement
let loginForm: HTMLFormElement
let loginError: HTMLParagraphElement | null
let ingredientSearchInput: HTMLInputElement
let ingredientSelectDropdown: HTMLDivElement
let selectedIngredientForm: HTMLDivElement
let adminDishesContainer: HTMLDivElement
let listaPlatos: Plato[] = []
const CATEGORY_LABELS: Record<string, string> = {
  entrante: 'Entrante',
  comida: 'Comida',
  postre: 'Postre',
  bebida: 'Bebida',
}

async function fetchAdminIngredients() {
  const token = getAdminToken()
  if (!token) return

  try {
    const res = await fetch(`${API_BASE}/admin/ingredients`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status === 401) {
      setAdminToken(null)
      renderChefView()
      return
    }

    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}`)
    }

    const data = (await res.json()) as Ingrediente[]
    ingredientesTodos = data
    ingredientesDisponibles = ingredientesTodos.filter(
      (i) => i.is_visible && i.stock_quantity > 0,
    )
    const tp = Math.max(
      1,
      Math.ceil(ingredientesTodos.length / INGREDIENTS_PAGE_SIZE),
    )
    if (paginaIngredientesCocina > tp) {
      paginaIngredientesCocina = tp
    }
    renderAdminIngredients()
  } catch (error) {
    console.error(error)
    if (adminIngredientsContainer) {
      adminIngredientsContainer.innerHTML =
        '<p class="error">No se han podido cargar los ingredientes de cocina.</p>'
    }
  }
}

function renderChefView() {
  const token = getAdminToken()

  if (!token) {
    // Login
    app.innerHTML = `
      <main class="app">
        <header class="app-header">
          <h1>Panel de cocina</h1>
          <p>Acceso para chefs / personal de cocina.</p>
        </header>

        <section class="card">
          <h2>Iniciar sesión</h2>
          <p class="muted">Introduce el email y contraseña configurados en Laravel.</p>
          <form id="login-form" class="admin-form">
            <div class="field-group">
              <label>
                <span>Email</span>
                <input type="email" name="email" required />
              </label>
              <label>
                <span>Contraseña</span>
                <input type="password" name="password" required />
              </label>
            </div>
            <button type="submit" class="primary">Entrar</button>
            <p id="login-error" class="error" style="display:none;"></p>
          </form>
        </section>
      </main>
    `

    loginForm = document.querySelector<HTMLFormElement>('#login-form')!
    loginError = document.querySelector<HTMLParagraphElement>('#login-error')

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const formData = new FormData(loginForm)

      try {
        const res = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            email: formData.get('email'),
            password: formData.get('password'),
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          if (loginError) {
            loginError.textContent =
              data.message || 'No se ha podido iniciar sesión.'
            loginError.style.display = 'block'
          }
          return
        }

        setAdminToken(data.token)
        renderChefView()
      } catch (error) {
        console.error(error)
        if (loginError) {
          loginError.textContent =
            'Error de red al iniciar sesión. Revisa la consola.'
          loginError.style.display = 'block'
        }
      }
    })
  } else {
    // Panel de cocina
    app.innerHTML = `
      <main class="app">
        <header class="app-header">
          <h1>Panel de cocina</h1>
          <p class="muted">Gestiona ingredientes y platos. Esta zona está protegida.</p>
          <button id="logout-button" class="secondary">Cerrar sesión</button>
        </header>

        <section class="card admin-card">
          <h2>Gestión de ingredientes</h2>
          <p class="muted">Busca un ingrediente y edita su stock y visibilidad en carta.</p>
          <div class="ingredient-select-row">
            <input type="text" id="ingredient-search" class="ingredient-search" placeholder="Buscar ingrediente..." autocomplete="off" />
            <div id="ingredient-select-dropdown" class="ingredient-select-dropdown" style="display:none;"></div>
          </div>
          <div id="selected-ingredient-form" class="selected-ingredient-form" style="display:none;">
            <p class="selected-ingredient-name"></p>
            <div class="field-group inline">
              <label><span>Stock</span><input type="number" id="sel-stock" min="0" /></label>
              <label class="checkbox-inline"><input type="checkbox" id="sel-visible" /><span>Visible en carta</span></label>
              <button type="button" id="save-selected-ingredient" class="primary">Guardar</button>
            </div>
          </div>
          <details class="create-ingredient-details">
            <summary>Crear ingrediente nuevo</summary>
            <form id="ingredient-form" class="admin-form">
              <div class="field-group">
                <label><span>Nombre</span><input type="text" name="name" required placeholder="Ej: Pollo" /></label>
                <label><span>Unidad</span><input type="text" name="unit" placeholder="g, ml, ud" /></label>
                <label><span>Stock inicial</span><input type="number" name="stock_quantity" min="0" value="0" /></label>
                <label class="checkbox-inline"><input type="checkbox" name="is_visible" checked /><span>Visible</span></label>
              </div>
              <button type="submit" class="primary">Crear ingrediente</button>
            </form>
          </details>
          <div id="admin-ingredients" class="admin-ingredients"></div>
        </section>

        <section class="card admin-card">
          <h2>Gestión de platos</h2>
          <p class="muted">Crea y edita platos de la carta (nombre, categoría, precio, ingredientes).</p>
          <button type="button" id="add-dish-btn" class="primary">Añadir plato</button>
          <div id="dish-form-container" class="dish-form-container" style="display:none;"></div>
          <div id="admin-dishes" class="admin-dishes"></div>
        </section>
      </main>
    `

    const logoutButton =
      document.querySelector<HTMLButtonElement>('#logout-button')
    if (logoutButton) {
      logoutButton.addEventListener('click', async () => {
        const token = getAdminToken()
        try {
          await fetch(`${API_BASE}/logout`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              Authorization: token ? `Bearer ${token}` : '',
            },
          })
        } catch (e) {
          console.error(e)
        } finally {
          setAdminToken(null)
          renderChefView()
        }
      })
    }

    adminIngredientsContainer =
      document.querySelector<HTMLDivElement>('#admin-ingredients')!
    ingredientForm =
      document.querySelector<HTMLFormElement>('#ingredient-form')!
    ingredientSearchInput =
      document.querySelector<HTMLInputElement>('#ingredient-search')!
    ingredientSelectDropdown =
      document.querySelector<HTMLDivElement>('#ingredient-select-dropdown')!
    selectedIngredientForm =
      document.querySelector<HTMLDivElement>('#selected-ingredient-form')!
    adminDishesContainer = document.querySelector<HTMLDivElement>('#admin-dishes')!

    setupIngredientSearch()
    setupSelectedIngredientForm()
    setupIngredientCreateForm()
    setupDishesSection()

    void fetchAdminIngredients()
    void fetchAdminDishes()
  }
}

function setupIngredientSearch() {
  if (!ingredientSearchInput || !ingredientSelectDropdown) return

  ingredientSearchInput.addEventListener('focus', () => {
    renderIngredientDropdown(ingredientSearchInput.value.trim())
    ingredientSelectDropdown.style.display = 'block'
  })
  ingredientSearchInput.addEventListener('input', () => {
    renderIngredientDropdown(ingredientSearchInput.value.trim())
    ingredientSelectDropdown.style.display = 'block'
  })
  ingredientSearchInput.addEventListener('blur', () => {
    setTimeout(() => {
      ingredientSelectDropdown.style.display = 'none'
    }, 150)
  })
}

function renderIngredientDropdown(filter: string) {
  if (!ingredientSelectDropdown) return
  const q = filter.toLowerCase()
  const list = q
    ? ingredientesTodos.filter((i) => i.name.toLowerCase().includes(q))
    : ingredientesTodos.slice(0, 30)
  ingredientSelectDropdown.innerHTML = list.length
    ? list
        .map(
          (i) =>
            `<button type="button" class="ingredient-option" data-id="${i.id}" data-name="${i.name}">${i.name} <span class="muted">(${i.stock_quantity} ${i.unit})</span></button>`,
        )
        .join('')
    : '<p class="muted">Sin resultados</p>'
  ingredientSelectDropdown
    .querySelectorAll<HTMLButtonElement>('.ingredient-option')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'))
        const name = btn.getAttribute('data-name') ?? ''
        ingredientSearchInput.value = name
        ingredientSelectDropdown.style.display = 'none'
        showSelectedIngredientForm(id, name)
      })
    })
}

let selectedIngredientId: number | null = null

function showSelectedIngredientForm(id: number, name: string) {
  const ing = ingredientesTodos.find((i) => i.id === id)
  if (!ing || !selectedIngredientForm) return
  selectedIngredientId = id
  selectedIngredientForm.style.display = 'block'
  selectedIngredientForm.querySelector<HTMLElement>('.selected-ingredient-name')!.textContent = `Editar: ${name}`
  const stockInput = selectedIngredientForm.querySelector<HTMLInputElement>('#sel-stock')!
  const visibleInput = selectedIngredientForm.querySelector<HTMLInputElement>('#sel-visible')!
  stockInput.value = String(ing.stock_quantity)
  visibleInput.checked = ing.is_visible
}

function setupSelectedIngredientForm() {
  const saveBtn = document.getElementById('save-selected-ingredient')
  if (!saveBtn || !selectedIngredientForm) return
  saveBtn.addEventListener('click', async () => {
    if (selectedIngredientId == null) return
    const token = getAdminToken()
    if (!token) return
    const stockInput = selectedIngredientForm.querySelector<HTMLInputElement>('#sel-stock')
    const visibleInput = selectedIngredientForm.querySelector<HTMLInputElement>('#sel-visible')
    if (!stockInput || !visibleInput) return
    try {
      const res = await fetch(`${API_BASE}/admin/ingredients/${selectedIngredientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stock_quantity: Number(stockInput.value) || 0,
          is_visible: visibleInput.checked,
        }),
      })
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
      const updated = (await res.json()) as Ingrediente
      const idx = ingredientesTodos.findIndex((i) => i.id === updated.id)
      if (idx !== -1) ingredientesTodos[idx] = updated
      ingredientesDisponibles = ingredientesTodos.filter(
        (i) => i.is_visible && i.stock_quantity > 0,
      )
      renderAdminIngredients()
    } catch (e) {
      console.error(e)
      alert('Error al guardar.')
    }
  })
}

function setupIngredientCreateForm() {
  if (!ingredientForm) return
  ingredientForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const token = getAdminToken()
    if (!token) return
    const formData = new FormData(ingredientForm)
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      unit: String(formData.get('unit') ?? '').trim() || 'unit',
      stock_quantity: Number(formData.get('stock_quantity') ?? 0) || 0,
      is_visible: formData.get('is_visible') === 'on',
    }
    if (!payload.name) {
      alert('El nombre es obligatorio.')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/admin/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
      ingredientForm.reset()
      await fetchAdminIngredients()
    } catch (e) {
      console.error(e)
      alert('No se pudo crear el ingrediente.')
    }
  })
}

async function fetchAdminDishes() {
  const token = getAdminToken()
  if (!token || !adminDishesContainer) return
  try {
    const res = await fetch(`${API_BASE}/admin/dishes`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    if (res.status === 401) {
      setAdminToken(null)
      renderChefView()
      return
    }
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
    listaPlatos = (await res.json()) as Plato[]
    renderAdminDishes()
  } catch (e) {
    console.error(e)
    adminDishesContainer.innerHTML = '<p class="error">No se pudieron cargar los platos.</p>'
  }
}

function renderAdminDishes() {
  if (!adminDishesContainer) return
  if (!listaPlatos.length) {
    adminDishesContainer.innerHTML = '<p class="muted">No hay platos. Añade uno.</p>'
    return
  }
  adminDishesContainer.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Categoría</th>
          <th>Precio</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${listaPlatos
          .map(
            (d) => `
          <tr data-id="${d.id}">
            <td>${d.name}</td>
            <td>${CATEGORY_LABELS[d.category ?? 'comida'] ?? d.category}</td>
            <td>${d.price != null ? Number(d.price).toFixed(2) + ' €' : '-'}</td>
            <td>
              <button type="button" class="secondary edit-dish-btn">Editar</button>
              <button type="button" class="secondary delete-dish-btn">Eliminar</button>
            </td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `
  adminDishesContainer.querySelectorAll('.edit-dish-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = (btn as HTMLElement).closest('tr')
      const id = Number(row?.getAttribute('data-id'))
      const dish = listaPlatos.find((d) => d.id === id)
      if (dish) openDishForm(dish)
    })
  })
  adminDishesContainer.querySelectorAll('.delete-dish-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = (btn as HTMLElement).closest('tr')
      const id = Number(row?.getAttribute('data-id'))
      if (id && confirm('¿Eliminar este plato?')) void deleteDish(id)
    })
  })
}

let idPlatoEditando: number | null = null

function openDishForm(dish?: Plato) {
  const container = document.getElementById('dish-form-container')
  if (!container) return
  idPlatoEditando = dish?.id ?? null
  const selectedIds = new Set(
    (dish?.ingredients ?? []).map((di) => di.ingredient_id ?? (di as { ingredient?: { id: number } }).ingredient?.id).filter(Boolean),
  )
  const ingredientOptions = ingredientesTodos
    .map(
      (i) =>
        `<label class="checkbox-inline ingredient-opt" data-name="${i.name.toLowerCase()}"><input type="checkbox" name="ingredient_ids" value="${i.id}" ${selectedIds.has(i.id) ? 'checked' : ''} /> ${i.name}</label>`,
    )
    .join('')
  container.innerHTML = `
    <form id="dish-form" class="admin-form dish-form">
      <input type="hidden" name="id" value="${dish?.id ?? ''}" />
      <label><span>Nombre</span><input type="text" name="name" value="${dish?.name ?? ''}" required /></label>
      <label><span>Descripción</span><textarea name="description" rows="2">${dish?.description ?? ''}</textarea></label>
      <label><span>Precio (€)</span><input type="number" name="price" step="0.01" min="0" value="${dish?.price ?? ''}" /></label>
      <label><span>Categoría</span>
        <select name="category">
          ${['entrante', 'comida', 'postre', 'bebida'].map((c) => `<option value="${c}" ${(dish?.category ?? 'comida') === c ? 'selected' : ''}>${CATEGORY_LABELS[c]}</option>`).join('')}
        </select>
      </label>
      <div class="ingredients-multi">
        <span>Ingredientes del plato</span>
        <input type="text" id="dish-ingredient-filter" class="ingredient-filter-input" placeholder="Filtrar ingredientes..." />
        <div class="ingredient-checkboxes">${ingredientOptions}</div>
      </div>
      <div class="dish-form-actions">
        <button type="submit" class="primary">${idPlatoEditando ? 'Guardar' : 'Crear plato'}</button>
        <button type="button" id="cancel-dish-form" class="secondary">Cancelar</button>
      </div>
    </form>
  `
  container.style.display = 'block'
  const form = container.querySelector<HTMLFormElement>('#dish-form')
  const cancelBtn = document.getElementById('cancel-dish-form')
  const filterInput = container.querySelector<HTMLInputElement>('#dish-ingredient-filter')
  filterInput?.addEventListener('input', () => {
    const q = (filterInput.value ?? '').toLowerCase().trim()
    container.querySelectorAll<HTMLLabelElement>('.ingredient-opt').forEach((label) => {
      const name = label.getAttribute('data-name') ?? ''
      label.style.display = q && !name.includes(q) ? 'none' : ''
    })
  })
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    void saveDishForm(form)
  })
  cancelBtn?.addEventListener('click', () => {
    container.style.display = 'none'
    container.innerHTML = ''
    idPlatoEditando = null
  })
}

async function saveDishForm(form: HTMLFormElement) {
  const token = getAdminToken()
  if (!token) return
  const formData = new FormData(form)
  const ingredientIds = formData.getAll('ingredient_ids').map(Number).filter(Boolean)
  const payload = {
    name: String(formData.get('name')).trim(),
    description: String(formData.get('description')).trim() || null,
    price: formData.get('price') ? Number(formData.get('price')) : null,
    category: String(formData.get('category')),
    ingredient_ids: ingredientIds,
  }
  try {
    const url = idPlatoEditando
      ? `${API_BASE}/admin/dishes/${idPlatoEditando}`
      : `${API_BASE}/admin/dishes`
    const res = await fetch(url, {
      method: idPlatoEditando ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
    document.getElementById('dish-form-container')!.style.display = 'none'
    document.getElementById('dish-form-container')!.innerHTML = ''
    idPlatoEditando = null
    await fetchAdminDishes()
  } catch (e) {
    console.error(e)
    alert('Error al guardar el plato.')
  }
}

async function deleteDish(id: number) {
  const token = getAdminToken()
  if (!token) return
  try {
    const res = await fetch(`${API_BASE}/admin/dishes/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
    await fetchAdminDishes()
  } catch (e) {
    console.error(e)
    alert('Error al eliminar.')
  }
}

function setupDishesSection() {
  const addBtn = document.getElementById('add-dish-btn')
  addBtn?.addEventListener('click', () => openDishForm())
}

// Arranque según ruta
if (currentPath === '/cocina') {
  renderChefView()
} else {
  renderPublicView()
}
