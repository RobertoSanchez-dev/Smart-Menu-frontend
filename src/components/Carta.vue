<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePedidoStore } from '../stores/pedido'
import { API_BASE, CATEGORY_LABELS } from '../config'
import type { CartaData, Plato } from '../types'

const pedido = usePedidoStore()
const carta = ref<CartaData | null>(null)
const error = ref(false)

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE}/carta`)
    if (!res.ok) throw new Error()
    const data = await res.json() as { carta: CartaData }
    carta.value = data.carta
  } catch {
    error.value = true
  }
})

function toggleDish(dish: Plato, category: string) {
  pedido.toggle({
    dishId: dish.id,
    name: dish.name,
    price: dish.price,
    category,
  })
}

const secciones = ['entrante', 'comida', 'postre', 'bebida'] as const
</script>

<template>
  <div>
    <p v-if="error" class="text-danger">No se ha podido cargar la carta.</p>
    <p v-else-if="!carta" class="text-muted">Cargando carta...</p>
    <template v-else>
      <div class="row g-4">
        <div
          v-for="key in secciones"
          :key="key"
          class="col-12 col-md-6"
        >
          <h5 class="section-title">{{ CATEGORY_LABELS[key] ?? key }}</h5>
          <p v-if="!carta[key].dishes.length" class="text-muted small">Sin platos disponibles.</p>
          <div
            v-for="dish in carta[key].dishes"
            :key="dish.id"
            class="dish-card card mb-2 p-2"
            :class="{ selected: pedido.has(dish.id) }"
            role="button"
            tabindex="0"
            @click="toggleDish(dish, key)"
            @keydown.enter="toggleDish(dish, key)"
            @keydown.space.prevent="toggleDish(dish, key)"
          >
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-medium">{{ dish.name }}</div>
                <small v-if="dish.description" class="text-muted">{{ dish.description }}</small>
              </div>
              <div class="text-end ms-2 flex-shrink-0">
                <div v-if="dish.price" class="fw-semibold text-dark">{{ Number(dish.price).toFixed(2) }} €</div>
                <span class="badge badge-order" :class="pedido.has(dish.id) ? 'bg-dark' : 'bg-secondary'">
                  {{ pedido.has(dish.id) ? 'En pedido' : 'Añadir' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
