<script setup lang="ts">
import { ref } from 'vue'
import { API_BASE, setAdminToken } from '../../config'

const emit = defineEmits<{ login: [] }>()

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const cargando = ref(false)

async function submit() {
  errorMsg.value = ''
  cargando.value = true
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      errorMsg.value = data.message ?? 'Credenciales incorrectas.'
      return
    }
    setAdminToken(data.token)
    emit('login')
  } catch {
    errorMsg.value = 'Error de red. Comprueba que el backend está en marcha.'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div class="row justify-content-center">
    <div class="col-12 col-sm-8 col-md-5">
      <div class="card">
        <div class="card-header fw-semibold">Panel de cocina — Iniciar sesión</div>
        <div class="card-body">
          <form @submit.prevent="submit">
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input v-model="email" type="email" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Contraseña</label>
              <input v-model="password" type="password" class="form-control" required />
            </div>
            <div v-if="errorMsg" class="alert alert-danger py-2">{{ errorMsg }}</div>
            <button type="submit" class="btn btn-dark w-100" :disabled="cargando">
              <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
