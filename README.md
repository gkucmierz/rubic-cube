# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## Uruchamianie (Automatyczne - CI/CD)

Projekt wykorzystuje **Gitea Actions** z runnerem **self-hosted** na serwerze produkcyjnym.
Każdy push do gałęzi `main` automatycznie:
1. Pobiera kod na serwerze.
2. Zatrzymuje i usuwa stare kontenery.
3. Buduje i uruchamia nową wersję aplikacji przy użyciu `docker compose up -d --build`.

### Konfiguracja Nginx Proxy Manager

Aplikacja nie wystawia publicznie żadnych portów. Komunikacja odbywa się wewnątrz sieci Dockerowej `npm_default`.

W panelu Nginx Proxy Manager skonfiguruj Proxy Host:
*   **Scheme:** `http`
*   **Forward Hostname / IP:** `rubic-cube` (nazwa serwisu z docker-compose)
*   **Forward Port:** `80`
*   **Network:** Upewnij się, że Nginx Proxy Manager jest w sieci `npm_default`.

**Uwaga:** Przed pierwszym uruchomieniem upewnij się, że sieć `npm_default` istnieje na serwerze:
```bash
docker network create npm_default
```
(lub użyj nazwy sieci, w której znajduje się Twój kontener Nginx Proxy Managera).
