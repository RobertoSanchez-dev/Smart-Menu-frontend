import type { Ingrediente, CartaData, OrderItem } from './types'

export const state = {
  ingredientesTodos: [] as Ingrediente[],
  ingredientesDisponibles: [] as Ingrediente[],
  idsIngredientesSeleccionados: new Set<number>(),
  orderItemsById: new Map<number, OrderItem>(),
  cartaData: null as CartaData | null,
}
