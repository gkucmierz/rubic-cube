# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## Uruchamianie (Docker Compose)

Na serwerze, aby uruchomić aplikację w trybie produkcyjnym wraz z automatycznymi aktualizacjami (Watchtower):

```bash
docker compose up -d
```

Aplikacja będzie dostępna na porcie **8083**.
Wszelkie zmiany w repozytorium (branch `main`) spowodują automatyczne zbudowanie nowego obrazu przez Gitea Actions i zaktualizowanie kontenera przez Watchtower.
