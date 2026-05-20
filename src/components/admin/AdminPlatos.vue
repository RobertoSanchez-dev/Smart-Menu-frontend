<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useIngredientesStore } from '../../stores/ingredientes'
import { API_BASE, CATEGORY_LABELS, getAdminToken } from '../../config'
import type { Plato } from '../../types'

const token = getAdminToken()!
const ingStore = useIngredientesStore()
const platos = ref<Plato[]>([])
const error = ref('')
const editando = ref<Plato | null>(null)
const mostrarForm = ref(false)

const form = ref({ name: '', description: '', price: '', category: 'comida', ingredient_ids: [] as number[] })
const guardando = ref(false)
const errorForm = ref('')
const filtroIng = ref('')

onMounted(fetchPlatos)

async function fetchPlatos() {
  try {
    const res = await fetch(`${API_BASE}/admin/dishes`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error()
    platos.value = (await res.json()) as Plato[]
  } catch {
    error.value = 'No se pudieron cargar los platos.'
  }
}

function abrirCrear() {
  editando.value = null
  form.value = { name: '', description: '', price: '', category: 'comida', ingredient_ids: [] }
  errorForm.value = ''
  mostrarForm.value = true
}

function abrirEditar(plato: Plato) {
  editando.value = plato
  form.value = {
    name: plato.name,
    description: plato.description ?? '',
    price: plato.price ?? '',
    category: plato.category ?? 'comida',
    ingredient_ids: (plato.ingredients ?? []).map((di) => di.ingredient_id).filter(Boolean),
  }
  errorForm.value = ''
  mostrarForm.value = true
}

function cancelar() {
  mostrarForm.value = false
  editando.value = null
}

async function guardar() {
  if (!form.value.name.trim()) { errorForm.value = 'El nombre es obligatorio.'; return }
  guardando.value = true
  errorForm.value = ''
  const payload = {
    name: form.value.name.trim(),
    description: form.value.description.trim() || null,
    price: form.value.price ? Number(form.value.price) : null,
    category: form.value.category,
    ingredient_ids: form.value.ingredient_ids,
  }
  try {
    const url = editando.value ? `${API_BASE}/admin/dishes/${editando.value.id}` : `${API_BASE}/admin/dishes`
    const res = await fetch(url, {
      method: editando.value ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error()
    mostrarForm.value = false
    editando.value = null
    await fetchPlatos()
  } catch {
    errorForm.value = 'Error al guardar el plato.'
  } finally {
    guardando.value = false
  }
}

async function eliminar(id: number) {
  if (!confirm('¿Eliminar este plato?')) return
  try {
    const res = await fetch(`${API_BASE}/admin/dishes/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error()
    await fetchPlatos()
  } catch {
    alert('Error al eliminar.')
  }
}

const categorias = ['entrante', 'comida', 'postre', 'bebida'] as const

function ingFiltrados() {
  const q = filtroIng.value.toLowerCase().trim()
  return q ? ingStore.todos.value.filter((i) => i.name.toLowerCase().includes(q)) : ingStore.todos.value
}
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="section-title mb-0 w-100">Gestión de platos</h5>
    </div>
    <button class="btn btn-dark btn-sm mb-3" @click="abrirCrear">+ Añadir plato</button>

    <p v-if="error" class="text-danger">{{ error }}</p>

    <div v-if="mostrarForm" class="card mb-4 p-3">
      <h6 class="fw-semibold mb-3">{{ editando ? 'Editar plato' : 'Nuevo plato' }}</h6>
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <label class="form-label small">Nombre</label>
          <input v-model="form.name" type="text" class="form-control form-control-sm" required />
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small">Precio (€)</label>
          <input v-model="form.price" type="number" step="0.01" min="0" class="form-control form-control-sm" />
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small">Categoría</label>
          <select v-model="form.category" class="form-select form-select-sm">
            <option v-for="c in categorias" :key="c" :value="c">{{ CATEGORY_LABELS[c] }}</option>
          </select>
        </div>
        <div class="col-12">
          <label class="form-label small">Descripción</label>
          <textarea v-model="form.description" class="form-control form-control-sm" rows="2"></textarea>
        </div>
        <div class="col-12">
          <label class="form-label small">Ingredientes</label>
          <input v-model="filtroIng" type="text" class="form-control form-control-sm mb-2" placeholder="Filtrar ingredientes..." />
          <div class="border rounded p-2" style="max-height:180px;overflow-y:auto">
            <div v-for="ing in ingFiltrados()" :key="ing.id" class="form-check">
              <input
                :id="`ing-${ing.id}`"
                v-model="form.ingredient_ids"
                type="checkbox"
                :value="ing.id"
                class="form-check-input"
              />
              <label :for="`ing-${ing.id}`" class="form-check-label small">{{ ing.name }}</label>
            </div>
          </div>
        </div>
      </div>
      <p v-if="errorForm" class="text-danger small mt-2">{{ errorForm }}</p>
      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-dark btn-sm" :disabled="guardando" @click="guardar">
          <span v-if="guardando" class="spinner-border spinner-border-sm me-1"></span>
          {{ editando ? 'Guardar' : 'Crear plato' }}
        </button>
        <button class="btn btn-outline-secondary btn-sm" @click="cancelar">Cancelar</button>
      </div>
    </div>

    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="plato in platos" :key="plato.id">
            <td>{{ plato.name }}</td>
            <td>{{ CATEGORY_LABELS[plato.category ?? ''] ?? plato.category }}</td>
            <td>{{ plato.price != null ? Number(plato.price).toFixed(2) + ' €' : '-' }}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary me-1" @click="abrirEditar(plato)">Editar</button>
              <button class="btn btn-sm btn-outline-danger" @click="eliminar(plato.id)">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
