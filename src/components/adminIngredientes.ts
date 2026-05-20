import { API_BASE, INGREDIENTS_PAGE_SIZE } from '../config'
import { state } from '../state'
import type { Ingrediente } from '../types'
import { getAdminToken, setAdminToken } from '../auth'
import { renderChefView } from './chefView'

let paginaIngredientesCocina = 1
let selectedIngredientId: number | null = null

export function renderAdminIngredients() {
  const container = document.querySelector<HTMLDivElement>('#admin-ingredients')
  if (!container) return

  if (!state.ingredientesTodos.length) {
    container.innerHTML = '<p class="muted">Todavía no hay ingredientes registrados.</p>'
    return
  }

  const total = state.ingredientesTodos.length
  const totalPages = Math.max(1, Math.ceil(total / INGREDIENTS_PAGE_SIZE))
  if (paginaIngredientesCocina > totalPages) paginaIngredientesCocina = totalPages
  const start = (paginaIngredientesCocina - 1) * INGREDIENTS_PAGE_SIZE
  const pageSlice = state.ingredientesTodos.slice(start, start + INGREDIENTS_PAGE_SIZE)
  const rangeFrom = start + 1
  const rangeTo = Math.min(start + pageSlice.length, total)

  container.innerHTML = `
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
                <td><input type="number" class="stock-input" value="${ingredient.stock_quantity}" min="0" /></td>
                <td><input type="checkbox" class="visible-input" ${ingredient.is_visible ? 'checked' : ''} /></td>
                <td><button type="button" class="secondary save-ingredient">Guardar</button></td>
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
    <div class="admin-ingredients-pager">
      <button type="button" class="secondary" id="ingredients-page-prev" ${paginaIngredientesCocina <= 1 ? 'disabled' : ''}>Anterior</button>
      <span class="muted">${rangeFrom}–${rangeTo} de ${total} · Página ${paginaIngredientesCocina} de ${totalPages}</span>
      <button type="button" class="secondary" id="ingredients-page-next" ${paginaIngredientesCocina >= totalPages ? 'disabled' : ''}>Siguiente</button>
    </div>
  `

  document.getElementById('ingredients-page-prev')?.addEventListener('click', () => {
    if (paginaIngredientesCocina > 1) {
      paginaIngredientesCocina -= 1
      renderAdminIngredients()
    }
  })
  document.getElementById('ingredients-page-next')?.addEventListener('click', () => {
    if (paginaIngredientesCocina < totalPages) {
      paginaIngredientesCocina += 1
      renderAdminIngredients()
    }
  })

  container.querySelectorAll<HTMLButtonElement>('.save-ingredient').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const row = (event.currentTarget as HTMLButtonElement).closest('tr')
      if (!row) return
      const id = Number(row.getAttribute('data-id'))
      const stockInput = row.querySelector<HTMLInputElement>('.stock-input')
      const visibleInput = row.querySelector<HTMLInputElement>('.visible-input')
      if (!stockInput || !visibleInput) return
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
          body: JSON.stringify({
            stock_quantity: Number(stockInput.value) || 0,
            is_visible: visibleInput.checked,
          }),
        })
        if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
        const updated = (await res.json()) as Ingrediente
        const idx = state.ingredientesTodos.findIndex((i) => i.id === updated.id)
        if (idx !== -1) state.ingredientesTodos[idx] = updated
        state.ingredientesDisponibles = state.ingredientesTodos.filter((i) => i.is_visible && i.stock_quantity > 0)
        renderAdminIngredients()
      } catch (error) {
        console.error(error)
        alert('No se ha podido actualizar el ingrediente. Revisa la consola.')
      }
    })
  })
}

export async function fetchAdminIngredients() {
  const token = getAdminToken()
  if (!token) return
  try {
    const res = await fetch(`${API_BASE}/admin/ingredients`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    if (res.status === 401) {
      setAdminToken(null)
      renderChefView()
      return
    }
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
    const data = (await res.json()) as Ingrediente[]
    state.ingredientesTodos = data
    state.ingredientesDisponibles = data.filter((i) => i.is_visible && i.stock_quantity > 0)
    const tp = Math.max(1, Math.ceil(data.length / INGREDIENTS_PAGE_SIZE))
    if (paginaIngredientesCocina > tp) paginaIngredientesCocina = tp
    renderAdminIngredients()
  } catch (error) {
    console.error(error)
    const container = document.querySelector<HTMLDivElement>('#admin-ingredients')
    if (container) container.innerHTML = '<p class="error">No se han podido cargar los ingredientes de cocina.</p>'
  }
}

export function setupIngredientSearch() {
  const searchInput = document.querySelector<HTMLInputElement>('#ingredient-search')
  const dropdown = document.querySelector<HTMLDivElement>('#ingredient-select-dropdown')
  if (!searchInput || !dropdown) return

  searchInput.addEventListener('focus', () => {
    renderIngredientDropdown(searchInput.value.trim())
    dropdown.style.display = 'block'
  })
  searchInput.addEventListener('input', () => {
    renderIngredientDropdown(searchInput.value.trim())
    dropdown.style.display = 'block'
  })
  searchInput.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none' }, 150)
  })
}

function renderIngredientDropdown(filter: string) {
  const dropdown = document.querySelector<HTMLDivElement>('#ingredient-select-dropdown')
  const searchInput = document.querySelector<HTMLInputElement>('#ingredient-search')
  if (!dropdown) return

  const q = filter.toLowerCase()
  const list = q
    ? state.ingredientesTodos.filter((i) => i.name.toLowerCase().includes(q))
    : state.ingredientesTodos.slice(0, 30)

  dropdown.innerHTML = list.length
    ? list
        .map(
          (i) =>
            `<button type="button" class="ingredient-option" data-id="${i.id}" data-name="${i.name}">${i.name} <span class="muted">(${i.stock_quantity} ${i.unit})</span></button>`,
        )
        .join('')
    : '<p class="muted">Sin resultados</p>'

  dropdown.querySelectorAll<HTMLButtonElement>('.ingredient-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-id'))
      const name = btn.getAttribute('data-name') ?? ''
      if (searchInput) searchInput.value = name
      dropdown.style.display = 'none'
      showSelectedIngredientForm(id, name)
    })
  })
}

function showSelectedIngredientForm(id: number, name: string) {
  const form = document.querySelector<HTMLDivElement>('#selected-ingredient-form')
  if (!form) return
  const ing = state.ingredientesTodos.find((i) => i.id === id)
  if (!ing) return
  selectedIngredientId = id
  form.style.display = 'block'
  form.querySelector<HTMLElement>('.selected-ingredient-name')!.textContent = `Editar: ${name}`
  form.querySelector<HTMLInputElement>('#sel-stock')!.value = String(ing.stock_quantity)
  form.querySelector<HTMLInputElement>('#sel-visible')!.checked = ing.is_visible
}

export function setupSelectedIngredientForm() {
  const saveBtn = document.getElementById('save-selected-ingredient')
  const form = document.querySelector<HTMLDivElement>('#selected-ingredient-form')
  if (!saveBtn || !form) return

  saveBtn.addEventListener('click', async () => {
    if (selectedIngredientId == null) return
    const token = getAdminToken()
    if (!token) return
    const stockInput = form.querySelector<HTMLInputElement>('#sel-stock')
    const visibleInput = form.querySelector<HTMLInputElement>('#sel-visible')
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
      const idx = state.ingredientesTodos.findIndex((i) => i.id === updated.id)
      if (idx !== -1) state.ingredientesTodos[idx] = updated
      state.ingredientesDisponibles = state.ingredientesTodos.filter((i) => i.is_visible && i.stock_quantity > 0)
      renderAdminIngredients()
    } catch (e) {
      console.error(e)
      alert('Error al guardar.')
    }
  })
}

export function setupIngredientCreateForm() {
  const form = document.querySelector<HTMLFormElement>('#ingredient-form')
  if (!form) return

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const token = getAdminToken()
    if (!token) return
    const formData = new FormData(form)
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
      form.reset()
      await fetchAdminIngredients()
    } catch (e) {
      console.error(e)
      alert('No se pudo crear el ingrediente.')
    }
  })
}
