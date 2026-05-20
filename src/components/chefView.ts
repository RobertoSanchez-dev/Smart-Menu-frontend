import { API_BASE } from '../config'
import { getAdminToken, setAdminToken } from '../auth'
import { fetchAdminIngredients, setupIngredientSearch, setupSelectedIngredientForm, setupIngredientCreateForm } from './adminIngredientes'
import { fetchAdminDishes, setupDishesSection } from './adminPlatos'

export function renderChefView() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  const token = getAdminToken()

  if (!token) {
    app.innerHTML = `
      <main class="app">
        <header class="app-header">
          <h1>Panel de cocina</h1>
          <p>Acceso para chefs / personal de cocina.</p>
        </header>
        <section class="card">
          <h2>Iniciar sesión</h2>
          <p class="muted">Introduce el email y contraseña configurados en Laravel.</p>
          <form id="login-form" class="admin-form">
            <div class="field-group">
              <label>
                <span>Email</span>
                <input type="email" name="email" required />
              </label>
              <label>
                <span>Contraseña</span>
                <input type="password" name="password" required />
              </label>
            </div>
            <button type="submit" class="primary">Entrar</button>
            <p id="login-error" class="error" style="display:none;"></p>
          </form>
        </section>
      </main>
    `

    const loginForm = document.querySelector<HTMLFormElement>('#login-form')!
    const loginError = document.querySelector<HTMLParagraphElement>('#login-error')

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const formData = new FormData(loginForm)
      try {
        const res = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            email: formData.get('email'),
            password: formData.get('password'),
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          if (loginError) {
            loginError.textContent = data.message || 'No se ha podido iniciar sesión.'
            loginError.style.display = 'block'
          }
          return
        }
        setAdminToken(data.token)
        renderChefView()
      } catch (error) {
        console.error(error)
        if (loginError) {
          loginError.textContent = 'Error de red al iniciar sesión. Revisa la consola.'
          loginError.style.display = 'block'
        }
      }
    })
  } else {
    app.innerHTML = `
      <main class="app">
        <header class="app-header">
          <h1>Panel de cocina</h1>
          <p class="muted">Gestiona ingredientes y platos. Esta zona está protegida.</p>
          <button id="logout-button" class="secondary">Cerrar sesión</button>
        </header>

        <section class="card admin-card">
          <h2>Gestión de ingredientes</h2>
          <p class="muted">Busca un ingrediente y edita su stock y visibilidad en carta.</p>
          <div class="ingredient-select-row">
            <input type="text" id="ingredient-search" class="ingredient-search" placeholder="Buscar ingrediente..." autocomplete="off" />
            <div id="ingredient-select-dropdown" class="ingredient-select-dropdown" style="display:none;"></div>
          </div>
          <div id="selected-ingredient-form" class="selected-ingredient-form" style="display:none;">
            <p class="selected-ingredient-name"></p>
            <div class="field-group inline">
              <label><span>Stock</span><input type="number" id="sel-stock" min="0" /></label>
              <label class="checkbox-inline"><input type="checkbox" id="sel-visible" /><span>Visible en carta</span></label>
              <button type="button" id="save-selected-ingredient" class="primary">Guardar</button>
            </div>
          </div>
          <details class="create-ingredient-details">
            <summary>Crear ingrediente nuevo</summary>
            <form id="ingredient-form" class="admin-form">
              <div class="field-group">
                <label><span>Nombre</span><input type="text" name="name" required placeholder="Ej: Pollo" /></label>
                <label><span>Unidad</span><input type="text" name="unit" placeholder="g, ml, ud" /></label>
                <label><span>Stock inicial</span><input type="number" name="stock_quantity" min="0" value="0" /></label>
                <label class="checkbox-inline"><input type="checkbox" name="is_visible" checked /><span>Visible</span></label>
              </div>
              <button type="submit" class="primary">Crear ingrediente</button>
            </form>
          </details>
          <div id="admin-ingredients" class="admin-ingredients"></div>
        </section>

        <section class="card admin-card">
          <h2>Gestión de platos</h2>
          <p class="muted">Crea y edita platos de la carta (nombre, categoría, precio, ingredientes).</p>
          <button type="button" id="add-dish-btn" class="primary">Añadir plato</button>
          <div id="dish-form-container" class="dish-form-container" style="display:none;"></div>
          <div id="admin-dishes" class="admin-dishes"></div>
        </section>
      </main>
    `

    document.querySelector<HTMLButtonElement>('#logout-button')?.addEventListener('click', async () => {
      const t = getAdminToken()
      try {
        await fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: { Accept: 'application/json', Authorization: t ? `Bearer ${t}` : '' },
        })
      } catch (e) {
        console.error(e)
      } finally {
        setAdminToken(null)
        renderChefView()
      }
    })

    setupIngredientSearch()
    setupSelectedIngredientForm()
    setupIngredientCreateForm()
    setupDishesSection()

    void fetchAdminIngredients()
    void fetchAdminDishes()
  }
}
