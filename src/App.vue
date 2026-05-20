<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <nav class="navbar navbar-dark bg-dark mb-4">
    <div class="container-fluid">
      <RouterLink class="navbar-brand" to="/">Smart Menu</RouterLink>
      <RouterLink class="btn btn-outline-light btn-sm" to="/cocina">Panel cocina</RouterLink>
    </div>
  </nav>
  <div class="container-fluid px-4">
    <RouterView />
  </div>
</template>
