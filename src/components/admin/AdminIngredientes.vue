<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useIngredientesStore } from '../../stores/ingredientes'
import { getAdminToken, INGREDIENTS_PAGE_SIZE } from '../../config'
import type { Ingrediente } from '../../types'

const store = useIngredientesStore()
const token = getAdminToken()!
const error = ref('')
const pagina = ref(1)
const busqueda = ref('')
const guardando = ref<number | null>(null)

const nombre = ref('')
const unidad = ref('g')
const stock = ref(0)
const visible = ref(true)
const creando = ref(false)
const errorCrear = ref('')

onMounted(async () => {
  try { await store.fetchAdmin(token) } catch { error.value = 'No se pudieron cargar los ingredientes.' }
})

const filtrados = computed(() => {
  const q = busqueda.value.toLowerCase().trim()
  return q ? store.todos.value.filter((i) => i.name.toLowerCase().includes(q)) : store.todos.value
})

const totalPaginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / INGREDIENTS_PAGE_SIZE)))
const paginaActual = computed(() => filtrados.value.slice((pagina.value - 1) * INGREDIENTS_PAGE_SIZE, pagina.value * INGREDIENTS_PAGE_SIZE))

function prev() { if (pagina.value > 1) pagina.value-- }
function next() { if (pagina.value < totalPaginas.value) pagina.value++ }

async function guardar(ing: Ingrediente) {
  guardando.value = ing.id
  try {
    await store.update(ing.id, { stock_quantity: ing.stock_quantity, is_visible: ing.is_visible }, token)
  } catch {
    alert('Error al guardar.')
  } finally {
    guardando.value = null
  }
}

async function crear() {
  errorCrear.value = ''
  if (!nombre.value.trim()) { errorCrear.value = 'El nombre es obligatorio.'; return }
  creando.value = true
  try {
    await store.create({ name: nombre.value.trim(), unit: unidad.value || 'g', stock_quantity: stock.value, is_visible: visible.value }, token)
    nombre.value = ''; unidad.value = 'g'; stock.value = 0; visible.value = true
  } catch {
    errorCrear.value = 'No se pudo crear el ingrediente.'
  } finally {
    creando.value = false
  }
}
</script>

<template>
  <div>
    <h5 class="section-title">Gestión de ingredientes</h5>
    <p v-if="error" class="text-danger">{{ error }}</p>

    <div class="mb-3">
      <input v-model="busqueda" type="text" class="form-control form-control-sm" placeholder="Buscar ingrediente..." @input="pagina = 1" />
    </div>

    <div class="table-responsive mb-3">
      <table class="table table-sm table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th>Nombre</th>
            <th>Unidad</th>
            <th>Stock</th>
            <th>Visible</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ing in paginaActual" :key="ing.id">
            <td>{{ ing.name }}</td>
            <td>{{ ing.unit }}</td>
            <td style="width:110px">
              <input v-model.number="ing.stock_quantity" type="number" min="0" class="form-control form-control-sm" />
            </td>
            <td>
              <div class="form-check">
                <input v-model="ing.is_visible" type="checkbox" class="form-check-input" />
              </div>
            </td>
            <td>
              <button class="btn btn-sm btn-outline-dark" :disabled="guardando === ing.id" @click="guardar(ing)">
                <span v-if="guardando === ing.id" class="spinner-border spinner-border-sm"></span>
                <span v-else>Guardar</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-4">
      <button class="btn btn-sm btn-outline-secondary" :disabled="pagina <= 1" @click="prev">Anterior</button>
      <small class="text-muted">Página {{ pagina }} de {{ totalPaginas }}</small>
      <button class="btn btn-sm btn-outline-secondary" :disabled="pagina >= totalPaginas" @click="next">Siguiente</button>
    </div>

    <details class="border rounded p-3">
      <summary class="fw-semibold" style="cursor:pointer">Crear ingrediente nuevo</summary>
      <div class="mt-3">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-sm-4">
            <label class="form-label small">Nombre</label>
            <input v-model="nombre" type="text" class="form-control form-control-sm" placeholder="Ej: Pollo" />
          </div>
          <div class="col-6 col-sm-2">
            <label class="form-label small">Unidad</label>
            <input v-model="unidad" type="text" class="form-control form-control-sm" placeholder="g, ml, ud" />
          </div>
          <div class="col-6 col-sm-2">
            <label class="form-label small">Stock</label>
            <input v-model.number="stock" type="number" min="0" class="form-control form-control-sm" />
          </div>
          <div class="col-6 col-sm-2 d-flex align-items-center gap-2 pt-3">
            <input v-model="visible" type="checkbox" class="form-check-input" id="new-visible" />
            <label for="new-visible" class="form-label small mb-0">Visible</label>
          </div>
          <div class="col-6 col-sm-2">
            <button class="btn btn-sm btn-dark w-100" :disabled="creando" @click="crear">
              <span v-if="creando" class="spinner-border spinner-border-sm"></span>
              <span v-else>Crear</span>
            </button>
          </div>
        </div>
        <p v-if="errorCrear" class="text-danger small mt-2">{{ errorCrear }}</p>
      </div>
    </details>
  </div>
</template>
