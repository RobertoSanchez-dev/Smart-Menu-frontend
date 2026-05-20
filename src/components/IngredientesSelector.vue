<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useIngredientesStore } from '../stores/ingredientes'
import { INGREDIENT_CATEGORIES, getCategoryForIngredient, MIN_INGREDIENTES } from '../config'

const store = useIngredientesStore()
const error = ref(false)

onMounted(async () => {
  try {
    await store.fetchPublic()
  } catch {
    error.value = true
  }
})

const grouped = computed(() => {
  const map = new Map<string, typeof store.disponibles.value>()
  for (const ing of store.disponibles.value) {
    const cat = getCategoryForIngredient(ing.name)
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(ing)
  }
  const order = [...INGREDIENT_CATEGORIES.map((c) => c.label), 'Otros']
  return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
})

const count = computed(() => store.seleccionados.value.size)
const enoughSelected = computed(() => count.value >= MIN_INGREDIENTES)

defineExpose({ enoughSelected })
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">Ingredientes disponibles</h6>
      <span v-if="count > 0" class="badge bg-dark">
        {{ count }} seleccionado{{ count > 1 ? 's' : '' }}
      </span>
    </div>
    <p v-if="error" class="text-danger small">No se han podido cargar los ingredientes.</p>
    <p v-else-if="!store.disponibles.value.length" class="text-muted small">No hay ingredientes disponibles.</p>
    <template v-else>
      <div v-for="[cat, items] in grouped" :key="cat" class="mb-3">
        <p class="text-muted small fw-semibold mb-1 text-uppercase" style="font-size:0.72rem;letter-spacing:.05em">{{ cat }}</p>
        <div class="d-flex flex-wrap gap-1">
          <button
            v-for="ing in items"
            :key="ing.id"
            type="button"
            class="btn btn-sm btn-outline-secondary ingredient-chip"
            :class="{ active: store.seleccionados.value.has(ing.id) }"
            @click="store.toggleSeleccion(ing.id)"
          >
            {{ ing.name }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
