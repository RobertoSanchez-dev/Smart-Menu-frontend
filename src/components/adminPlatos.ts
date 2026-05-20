import { API_BASE, CATEGORY_LABELS } from '../config'
import { state } from '../state'
import type { Plato } from '../types'
import { getAdminToken, setAdminToken } from '../auth'
import { renderChefView } from './chefView'

let listaPlatos: Plato[] = []
let idPlatoEditando: number | null = null

export async function fetchAdminDishes() {
  const container = document.querySelector<HTMLDivElement>('#admin-dishes')
  const token = getAdminToken()
  if (!token || !container) return
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
    container.innerHTML = '<p class="error">No se pudieron cargar los platos.</p>'
  }
}

export function renderAdminDishes() {
  const container = document.querySelector<HTMLDivElement>('#admin-dishes')
  if (!container) return

  if (!listaPlatos.length) {
    container.innerHTML = '<p class="muted">No hay platos. Añade uno.</p>'
    return
  }

  container.innerHTML = `
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

  container.querySelectorAll('.edit-dish-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = (btn as HTMLElement).closest('tr')
      const id = Number(row?.getAttribute('data-id'))
      const dish = listaPlatos.find((d) => d.id === id)
      if (dish) openDishForm(dish)
    })
  })
  container.querySelectorAll('.delete-dish-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = (btn as HTMLElement).closest('tr')
      const id = Number(row?.getAttribute('data-id'))
      if (id && confirm('¿Eliminar este plato?')) void deleteDish(id)
    })
  })
}

export function openDishForm(dish?: Plato) {
  const container = document.getElementById('dish-form-container')
  if (!container) return
  idPlatoEditando = dish?.id ?? null
  const selectedIds = new Set(
    (dish?.ingredients ?? [])
      .map((di) => di.ingredient_id ?? (di as { ingredient?: { id: number } }).ingredient?.id)
      .filter(Boolean),
  )
  const ingredientOptions = state.ingredientesTodos
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
          ${['entrante', 'comida', 'postre', 'bebida']
            .map((c) => `<option value="${c}" ${(dish?.category ?? 'comida') === c ? 'selected' : ''}>${CATEGORY_LABELS[c]}</option>`)
            .join('')}
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
  document.getElementById('cancel-dish-form')?.addEventListener('click', () => {
    container.style.display = 'none'
    container.innerHTML = ''
    idPlatoEditando = null
  })
}

async function saveDishForm(form: HTMLFormElement) {
  const token = getAdminToken()
  if (!token) return
  const formData = new FormData(form)
  const payload = {
    name: String(formData.get('name')).trim(),
    description: String(formData.get('description')).trim() || null,
    price: formData.get('price') ? Number(formData.get('price')) : null,
    category: String(formData.get('category')),
    ingredient_ids: formData.getAll('ingredient_ids').map(Number).filter(Boolean),
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
    const dishFormContainer = document.getElementById('dish-form-container')!
    dishFormContainer.style.display = 'none'
    dishFormContainer.innerHTML = ''
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

export function setupDishesSection() {
  document.getElementById('add-dish-btn')?.addEventListener('click', () => openDishForm())
}
