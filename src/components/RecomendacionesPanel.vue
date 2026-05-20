<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIngredientesStore } from '../stores/ingredientes'
import { usePedidoStore } from '../stores/pedido'
import { API_BASE, MIN_INGREDIENTES } from '../config'
import type { AIRecomendacion } from '../types'

const store = useIngredientesStore()
const pedido = usePedidoStore()

const recs = ref<AIRecomendacion[]>([])
const cargando = ref(false)
const mensaje = ref('')
const error = ref('')

const AI_ID_BASE = -100
function aiId(i: number) { return AI_ID_BASE - i }

const enoughSelected = computed(() => store.seleccionados.value.size >= MIN_INGREDIENTES)

async function buscar() {
  if (!enoughSelected.value) return
  cargando.value = true
  mensaje.value = ''
  error.value = ''
  recs.value = []

  const params = new URLSearchParams()
  store.seleccionados.value.forEach((id) => params.append('ingredient_ids[]', String(id)))

  try {
    const res = await fetch(`${API_BASE}/recommendations?${params}`)
    const payload = await res.json() as { recommendations?: AIRecomendacion[]; message?: string }
    if (!res.ok) {
      error.value = payload.message ?? 'Error al obtener recomendaciones.'
      return
    }
    if (!payload.recommendations?.length) {
      mensaje.value = payload.message ?? 'La IA no ha podido generar sugerencias.'
      return
    }
    recs.value = payload.recommendations
  } catch {
    error.value = 'No se ha podido conectar con el servidor.'
  } finally {
    cargando.value = false
  }
}

function toggleRec(i: number, rec: AIRecomendacion) {
  pedido.toggle({
    dishId: aiId(i),
    name: rec.name,
    price: rec.price != null ? String(rec.price) : null,
    category: 'ia',
    ai_why: rec.why,
  })
}
</script>

<template>
  <div>
    <button
      class="btn btn-dark w-100 mb-3"
      :disabled="!enoughSelected || cargando"
      @click="buscar"
    >
      <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
      {{ cargando ? 'Buscando...' : 'Pedir recomendaciones' }}
    </button>

    <p v-if="!enoughSelected" class="text-muted small">
      Selecciona al menos {{ MIN_INGREDIENTES }} ingredientes.
    </p>
    <p v-if="mensaje" class="text-muted small">{{ mensaje }}</p>
    <p v-if="error" class="text-danger small">{{ error }}</p>

    <div v-for="(rec, i) in recs" :key="i"
      class="dish-card card mb-2 p-2"
      :class="{ selected: pedido.has(aiId(i)) }"
      role="button"
      tabindex="0"
      @click="toggleRec(i, rec)"
      @keydown.enter="toggleRec(i, rec)"
      @keydown.space.prevent="toggleRec(i, rec)"
    >
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-medium">{{ rec.name }}</div>
          <small v-if="rec.description" class="text-muted d-block">{{ rec.description }}</small>
          <small v-if="rec.why" class="ai-why d-block mt-1">IA: {{ rec.why }}</small>
        </div>
        <div class="text-end ms-2 flex-shrink-0">
          <div v-if="rec.price != null" class="fw-semibold">{{ Number(rec.price).toFixed(2) }} €</div>
          <span class="badge badge-order" :class="pedido.has(aiId(i)) ? 'bg-dark' : 'bg-secondary'">
            {{ pedido.has(aiId(i)) ? 'En pedido' : 'Añadir' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
