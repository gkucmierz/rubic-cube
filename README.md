# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## Uruchamianie (Automatyczne - CI/CD)

Projekt wykorzystuje **Gitea Actions** z runnerem **self-hosted** na serwerze produkcyjnym.
Każdy push do gałęzi `main` automatycznie:
1. Pobiera kod na serwerze.
2. Zatrzymuje i usuwa stare kontenery.
3. Buduje i uruchamia nową wersję aplikacji przy użyciu `docker compose up -d --build`.

### Konfiguracja Sieci i Bezpieczeństwa (Izolacja)

Aplikacja wykorzystuje dwie sieci dockerowe dla zapewnienia izolacji:
1.  `npm_public` (zewnętrzna): Sieć, w której znajduje się Nginx Proxy Manager. Tylko kontener `rubic-cube` jest do niej podłączony, aby NPM mógł przekierować ruch.
2.  `rubic-net` (wewnętrzna): Prywatna sieć aplikacji. Wszelkie inne serwisy (np. baza danych, redis - jeśli dodasz w przyszłości) powinny być tylko w tej sieci, niewidoczne dla NPM ani innych aplikacji.

**Wymagania:**
Przed uruchomieniem upewnij się, że na serwerze istnieje sieć publiczna dla proxy:
```bash
docker network create npm_public
```
(Jeśli Twój Nginx Proxy Manager używa innej sieci, zaktualizuj nazwę w `docker-compose.yml`).

W panelu Nginx Proxy Manager skonfiguruj:
*   **Network:** `npm_public` (lub odpowiednia sieć proxy).
*   **Forward Hostname:** `rubic-cube`
*   **Forward Port:** `80`
