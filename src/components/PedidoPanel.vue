<script setup lang="ts">
import { ref } from 'vue'
import { usePedidoStore } from '../stores/pedido'

const pedido = usePedidoStore()
const ordenEnviada = ref(false)

function enviar() {
  pedido.clear()
  ordenEnviada.value = true
  setTimeout(() => { ordenEnviada.value = false }, 3000)
}
</script>

<template>
  <div class="card h-100">
    <div class="card-header fw-semibold">Tu pedido</div>
    <div class="card-body p-0">
      <div v-if="ordenEnviada" class="alert alert-success m-3 mb-0">
        ✓ Comanda enviada a cocina
      </div>
      <ul v-if="!pedido.isEmpty" class="list-group list-group-flush">
        <li
          v-for="[, item] in pedido.items"
          :key="item.dishId"
          class="list-group-item d-flex justify-content-between align-items-start"
        >
          <div>
            <div class="fw-medium">{{ item.name }}</div>
            <small class="text-muted">
              {{ pedido.categoryLabel(item.category) }}
              {{ item.price != null ? `· ${Number(item.price).toFixed(2)} €` : '' }}
            </small>
          </div>
          <button class="btn btn-sm btn-outline-danger ms-2" @click="pedido.remove(item.dishId)">
            ✕
          </button>
        </li>
      </ul>
      <p v-else class="text-muted p-3 mb-0">Tu pedido está vacío.</p>
    </div>
    <div class="card-footer d-flex justify-content-between align-items-center">
      <span class="fw-semibold">Total: {{ pedido.total.toFixed(2) }} €</span>
      <button
        class="btn btn-dark btn-sm"
        :disabled="pedido.isEmpty"
        @click="enviar"
      >
        Enviar comanda
      </button>
    </div>
  </div>
</template>
