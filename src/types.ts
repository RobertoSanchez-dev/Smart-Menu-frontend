export type Ingrediente = {
  id: number
  name: string
  unit: string
  stock_quantity: number
  is_visible: boolean
}

export type IngredienteDePlato = {
  id: number
  ingredient_id: number
  dish_id: number
  quantity: string
  ingredient?: Ingrediente
}

export type Plato = {
  id: number
  name: string
  description: string | null
  price: string | null
  category?: string
  ingredients?: IngredienteDePlato[]
  is_active?: boolean
}

export type SeccionCarta = {
  label: string
  dishes: Plato[]
}

export type CartaData = {
  entrante: SeccionCarta
  comida: SeccionCarta
  postre: SeccionCarta
  bebida: SeccionCarta
}

export type OrderItem = {
  dishId: number
  name: string
  price: string | null
  category?: string
  ai_why?: string
}

export type AIRecomendacion = {
  name: string
  description?: string
  why?: string
  price?: number
}
