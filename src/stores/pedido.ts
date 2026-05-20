import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OrderItem } from '../types'
import { CATEGORY_LABELS } from '../config'

export const usePedidoStore = defineStore('pedido', () => {
  const items = ref(new Map<number, OrderItem>())

  const total = computed(() =>
    Array.from(items.value.values()).reduce(
      (acc, it) => acc + (it.price != null ? Number(it.price) : 0),
      0,
    ),
  )

  const isEmpty = computed(() => items.value.size === 0)

  function categoryLabel(category?: string): string {
    return category ? (CATEGORY_LABELS[category] ?? category) : 'Plato'
  }

  function toggle(item: OrderItem) {
    if (items.value.has(item.dishId)) {
      items.value.delete(item.dishId)
    } else {
      items.value.set(item.dishId, item)
    }
  }

  function remove(dishId: number) {
    items.value.delete(dishId)
  }

  function has(dishId: number): boolean {
    return items.value.has(dishId)
  }

  function clear() {
    items.value.clear()
  }

  return { items, total, isEmpty, toggle, remove, has, categoryLabel }
})
