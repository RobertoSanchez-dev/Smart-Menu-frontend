import { fetchCarta } from './carta'
import { fetchIngredients } from './ingredientes'
import { fetchRecommendations } from './recomendaciones'
import { sendOrder, syncOrderUI } from './pedido'

export function renderPublicView() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <main class="app carta-page">
      <header class="carta-header">
        <h1 class="carta-title">La Carta</h1>
        <p class="carta-subtitle">Nuestros platos del día según disponibilidad</p>
      </header>

      <div id="carta-container" class="carta-container">
        <p class="muted">Cargando carta...</p>
      </div>

      <section class="recomendador-section">
        <h2 class="recomendador-title">¿Qué te apetece?</h2>
        <p class="recomendador-desc">Selecciona al menos 4 ingredientes que quieras en tu plato. La IA te recomendará los platos de la carta que los incluyan todos (hasta 3 sugerencias).</p>
        <div class="app-layout">
          <section class="card card-light">
            <div class="ingredients-header">
              <h3 class="card-title">Ingredientes disponibles</h3>
              <span id="ingredient-counter" class="ingredient-counter"></span>
            </div>
            <div id="ingredients-list" class="ingredients-list">
              <p class="muted">Cargando...</p>
            </div>
          </section>
          <section class="card card-light">
            <h3 class="card-title">Recomendaciones</h3>
            <button id="recommend-button" class="primary" disabled title="Necesitas al menos 4 ingredientes">
              Pedir recomendaciones
            </button>
            <div id="recommendations" class="recommendations"></div>
          </section>
        </div>
      </section>

      <section class="card card-light order-panel">
        <h2 class="card-title">Tu pedido</h2>
        <p class="muted">Selecciona platos y bebidas haciendo clic en la carta o en las recomendaciones.</p>
        <ul id="order-items" class="order-items">
          <li class="muted">Tu pedido está vacío.</li>
        </ul>
        <div class="order-total-row">
          <span id="order-total">Total: 0.00 €</span>
          <button id="send-order-button" class="primary" disabled type="button">
            Enviar comanda
          </button>
        </div>
      </section>
    </main>
  `

  document.querySelector<HTMLButtonElement>('#send-order-button')!
    .addEventListener('click', () => void sendOrder())

  document.querySelector<HTMLButtonElement>('#recommend-button')!
    .addEventListener('click', () => void fetchRecommendations())

  syncOrderUI()
  void fetchCarta()
  void fetchIngredients()
}
