import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ingrediente } from '../types'
import { API_BASE } from '../config'

export const useIngredientesStore = defineStore('ingredientes', () => {
  const todos = ref<Ingrediente[]>([])
  const seleccionados = ref(new Set<number>())

  const disponibles = computed(() =>
    todos.value.filter((i) => i.is_visible && i.stock_quantity > 0),
  )

  function toggleSeleccion(id: number) {
    if (seleccionados.value.has(id)) seleccionados.value.delete(id)
    else seleccionados.value.add(id)
  }

  async function fetchPublic() {
    const res = await fetch(`${API_BASE}/ingredients`)
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
    todos.value = (await res.json()) as Ingrediente[]
  }

  async function fetchAdmin(token: string) {
    const res = await fetch(`${API_BASE}/admin/ingredients`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    todos.value = (await res.json()) as Ingrediente[]
  }

  async function update(id: number, payload: Partial<Ingrediente>, token: string) {
    const res = await fetch(`${API_BASE}/admin/ingredients/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const updated = (await res.json()) as Ingrediente
    const idx = todos.value.findIndex((i) => i.id === updated.id)
    if (idx !== -1) todos.value[idx] = updated
  }

  async function create(payload: Partial<Ingrediente>, token: string) {
    const res = await fetch(`${API_BASE}/admin/ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await fetchAdmin(token)
  }

  return { todos, disponibles, seleccionados, toggleSeleccion, fetchPublic, fetchAdmin, update, create }
})
