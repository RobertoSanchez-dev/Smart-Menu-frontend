<script setup lang="ts">
import Carta from '../components/Carta.vue'
import IngredientesSelector from '../components/IngredientesSelector.vue'
import RecomendacionesPanel from '../components/RecomendacionesPanel.vue'
import PedidoPanel from '../components/PedidoPanel.vue'
</script>

<template>
  <div class="row g-4">
    <div class="col-12 col-xl-8">
      <h4 class="section-title">La Carta</h4>
      <Carta />

      <h4 class="section-title mt-4">¿Qué te apetece?</h4>
      <p class="text-muted small mb-3">
        Selecciona al menos 4 ingredientes y la IA te sugerirá platos que los incluyan todos.
      </p>
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <div class="card p-3 h-100">
            <IngredientesSelector />
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card p-3 h-100">
            <h6 class="mb-3">Recomendaciones IA</h6>
            <RecomendacionesPanel />
          </div>
        </div>
      </div>
    </div>

    <div class="col-12 col-xl-4">
      <div class="sticky-top" style="top: 1rem">
        <PedidoPanel />
      </div>
    </div>
  </div>
</template>
