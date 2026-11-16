<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";
import type { BoardFriend } from "../api/friends";
import FriendForm from "../components/FriendForm.vue";

const router = useRouter();

async function open_saved_friend_profile(friend: BoardFriend): Promise<void> {
  await router.push({ name: "friend-detail", params: { id: friend.id } });
}
</script>

<template>
  <RouterLink to="/amigos" class="cancel-link">Cancelar</RouterLink>
  <h1 class="view-title">Novo amigo</h1>
  <p class="new-friend-help">Só o nome já basta. O resto pode vir depois.</p>
  <RouterLink to="/amigos/importar" class="import-link"
    >Importar da agenda do celular</RouterLink
  >
  <FriendForm @saved="open_saved_friend_profile" />
</template>

<style scoped>
.cancel-link {
  display: flex;
  width: fit-content;
  min-width: 2.75rem;
  align-items: flex-end;
  height: 2.75rem;
  margin-top: -0.75rem;
  font: 500 0.875rem/var (--notebook-line) var(--font-ui);
  color: var(--neutral-700);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.new-friend-help {
  margin: 0;
  color: var(--neutral-600);
}
.import-link {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  color: var(--neutral-700);
  font: 500 0.875rem/var (--notebook-line) var(--font-ui);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
