# Konfiguracja Sieci i Bezpieczeństwa (Izolacja Aplikacji)

Aby zapewnić, że Nginx Proxy Manager (NPM) widzi wszystkie aplikacje, ale **aplikacje nie widzą się nawzajem**, należy zastosować następującą strategię sieciową.

## 1. Utworzenie głównej sieci dla Proxy

Na serwerze utwórz jedną, wspólną sieć typu `bridge`, do której będzie podłączony **tylko** Nginx Proxy Manager oraz frontendy aplikacji, które mają być przez niego obsługiwane.

```bash
docker network create npm_network
```

## 2. Konfiguracja Nginx Proxy Managera

W pliku `docker-compose.yml` dla Nginx Proxy Managera dodaj tę sieć jako zewnętrzną:

```yaml
version: '3'
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    # ... reszta konfiguracji ...
    networks:
      - npm_network
      - default # opcjonalnie, jeśli potrzebuje dostępu do swojej bazy w innym kontenerze

networks:
  npm_network:
    external: true
```

## 3. Konfiguracja Aplikacji (np. Rubic Cube)

Każda aplikacja powinna mieć **dwie** sieci:
1.  Swoją własną, wewnętrzną sieć (`default` / `rubic-net`), w której komunikuje się ze swoimi serwisami (np. baza danych, redis) - **izolowaną od innych aplikacji**.
2.  Sieć `npm_network`, aby Proxy mogło się do niej dostać.

W pliku `docker-compose.yml` aplikacji:

```yaml
services:
  rubic-cube:
    # ...
    expose:
      - "80"
    networks:
      - default      # Wewnętrzna sieć aplikacji (automatyczna)
      - npm_network  # Połączenie TYLKO z proxy

networks:
  npm_network:
    external: true
```

## Dlaczego to jest bezpieczne?

*   Kontener `rubic-cube` jest w sieci `npm_network`, więc NPM może go "widzieć" (proxy_pass).
*   Inna aplikacja (np. `nonograms`), jeśli też jest podłączona do `npm_network`, teoretycznie może "widzieć" `rubic-cube` po nazwie hosta.
*   **Pełna izolacja:** Aby uzyskać **pełną** izolację (żeby aplikacja A nie widziała aplikacji B), NPM musiałby być podłączony do wielu sieci naraz (np. `npm-rubic`, `npm-nonograms`), co jest trudne w zarządzaniu.
*   **Rozwiązanie kompromisowe (zalecane):** Powyższy model (`npm_network`) jest standardem. Aplikacje "widzą się" w tej sieci, ale nie mają dostępu do swoich wewnętrznych baz danych (które są w sieci `default` każdej aplikacji).

Jeśli chcesz **absolutnej** izolacji, musiałbyś dla każdej aplikacji tworzyć osobną sieć zewnętrzną (np. `proxy_rubic`, `proxy_nonograms`) i podłączać NPM do każdej z nich z osobna, co wymaga restartu NPM przy dodawaniu każdej nowej aplikacji.
