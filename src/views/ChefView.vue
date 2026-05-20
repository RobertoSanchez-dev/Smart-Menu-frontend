<script setup lang="ts">
import { ref } from 'vue'
import { getAdminToken, setAdminToken, API_BASE } from '../config'
import LoginForm from '../components/admin/LoginForm.vue'
import AdminIngredientes from '../components/admin/AdminIngredientes.vue'
import AdminPlatos from '../components/admin/AdminPlatos.vue'

const logueado = ref(!!getAdminToken())

function onLogin() { logueado.value = true }

async function logout() {
  const token = getAdminToken()
  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    })
  } catch { /* silent */ }
  setAdminToken(null)
  logueado.value = false
}
</script>

<template>
  <div>
    <LoginForm v-if="!logueado" @login="onLogin" />

    <template v-else>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">Panel de cocina</h4>
        <button class="btn btn-outline-dark btn-sm" @click="logout">Cerrar sesión</button>
      </div>

      <div class="row g-4">
        <div class="col-12 col-lg-6">
          <div class="card p-3">
            <AdminIngredientes />
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="card p-3">
            <AdminPlatos />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
