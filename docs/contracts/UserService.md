# Contrato de Integração — User Service

> **Versão:** 1.0
>
> **Responsável pelo serviço:** A definir
>
> **Linguagem:** Java 21 + Spring Boot 3.x

---

## Sumário

- [Contrato de Integração — User Service](#contrato-de-integração--user-service)
  - [Sumário](#sumário)
  - [1. Visão Geral e Responsabilidades](#1-visão-geral-e-responsabilidades)
  - [2. Interface gRPC — API Gateway → User Service](#2-interface-grpc--api-gateway--user-service)
    - [2.1 Arquivo `.proto`](#21-arquivo-proto)
    - [2.2 Validações e códigos de erro gRPC](#22-validações-e-códigos-de-erro-grpc)
    - [2.3 Responsabilidade do User Service nesta interface](#23-responsabilidade-do-user-service-nesta-interface)
  - [3. Interface Kafka — User Service ← Kafka (Consumidor)](#3-interface-kafka--user-service--kafka-consumidor)
    - [3.1 Schema da mensagem consumida](#31-schema-da-mensagem-consumida)
    - [3.2 Lógica de processamento](#32-lógica-de-processamento)
    - [3.3 Tratamento de falha](#33-tratamento-de-falha)
  - [4. Interface User Database — User Service ↔ PostgreSQL](#4-interface-user-database--user-service--postgresql)
    - [4.1 Schema](#41-schema)
    - [4.2 Operações por RPC / fluxo](#42-operações-por-rpc--fluxo)
  - [5. Regras de Negócio Internas](#5-regras-de-negócio-internas)
    - [5.1 Hashing de senha](#51-hashing-de-senha)
    - [5.2 Cálculo de média acumulada](#52-cálculo-de-média-acumulada)
    - [5.3 Unicidade de `name`](#53-unicidade-de-name)
  - [6. Stack Tecnológica](#6-stack-tecnológica)
  - [7. Variáveis de Configuração](#7-variáveis-de-configuração)
  - [8. Restrições](#8-restrições)

---

## 1. Visão Geral e Responsabilidades

O User Service é responsável por:

- Registrar novos usuários e validar credenciais nas chamadas de autenticação
- Atualizar nome e senha de usuários cadastrados
- Servir estatísticas históricas de partidas por usuário
- Consumir eventos de fim de partida do Kafka e atualizar as estatísticas dos jogadores cadastrados de forma assíncrona

O User Service **não emite JWT** — essa responsabilidade é do API Gateway (seção 2 do contrato do API Gateway). O User Service recebe credenciais, valida ou registra, e devolve `user_id` e `name` ao Gateway, que assina o token.

O User Service **não participa do fluxo de jogo em tempo real** — toda comunicação com o ciclo de vida das partidas ocorre exclusivamente via Kafka, de forma assíncrona.

---

## 2. Interface gRPC — API Gateway → User Service

O API Gateway chama o User Service via gRPC para todas as operações de identidade e estatísticas.

- **Porta:** `9091`
- **Protocolo:** gRPC / Protocol Buffers

### 2.1 Arquivo `.proto`

```protobuf
syntax = "proto3";

package trivia.user.v1;

option java_package = "com.trivia.user.grpc";
option java_outer_classname = "UserServiceProto";

service UserService {
  rpc RegisterUser  (RegisterUserRequest)  returns (AuthResponse);
  rpc LoginUser     (LoginUserRequest)     returns (AuthResponse);
  rpc UpdateUser    (UpdateUserRequest)    returns (UpdateUserResponse);
  rpc GetUserStats  (GetUserStatsRequest)  returns (GetUserStatsResponse);
}

// ── Mensagens ──────────────────────────────────────────────────────────────

message RegisterUserRequest {
  string name     = 1;
  string password = 2;
}

message LoginUserRequest {
  string name     = 1;
  string password = 2;
}

message AuthResponse {
  string user_id = 1;
  string name    = 2;
  // O JWT NÃO é emitido aqui — o API Gateway assina o token
  // usando user_id e name retornados por esta resposta (seção 2 do contrato do API Gateway)
}

message UpdateUserRequest {
  string          user_id  = 1;
  optional string name     = 2;
  optional string password = 3;
}

message UpdateUserResponse {
  bool success = 1;
}

message GetUserStatsRequest {
  string user_id = 1;
}

message GetUserStatsResponse {
  int32  games_played  = 1;
  double avg_position  = 2;
  double avg_points    = 3;
  int32  highest_score = 4;
  int32  games_won     = 5;
}
```

### 2.2 Validações e códigos de erro gRPC

| RPC | Validação obrigatória | Status gRPC em erro |
|---|---|---|
| `RegisterUser` | `name` e `password` não vazios; `name` único na base | `INVALID_ARGUMENT` / `ALREADY_EXISTS` |
| `LoginUser` | Credenciais devem corresponder a um usuário existente (hash da senha) | `UNAUTHENTICATED` |
| `UpdateUser` | Ao menos um campo (`name` ou `password`) deve ser enviado; novo `name`, se enviado, não pode estar em uso | `INVALID_ARGUMENT` / `ALREADY_EXISTS` |
| `GetUserStats` | `user_id` deve existir na base | `NOT_FOUND` |

### 2.3 Responsabilidade do User Service nesta interface

- **`RegisterUser`:** hash da senha com bcrypt, insere na tabela `users` (instância primária), retorna `user_id` gerado e `name`
- **`LoginUser`:** busca o usuário por `name` (réplica), compara o hash da senha recebida com o armazenado; se válido, retorna `user_id` e `name`
- **`UpdateUser`:** o `user_id` já foi extraído e validado pelo API Gateway a partir do JWT — o User Service confia integralmente nesse valor (seção 3.3 do contrato do API Gateway). Atualiza os campos enviados na instância primária
- **`GetUserStats`:** lê da réplica de leitura; se o usuário não tiver nenhuma partida registrada ainda, retorna zeros em todos os campos numéricos (não retorna `NOT_FOUND`)

---

## 3. Interface Kafka — User Service ← Kafka (Consumidor)

O User Service consome o tópico `game-finished` publicado pelo Game Service ao término de cada partida. Este é o único fluxo assíncrono do serviço e é completamente independente das chamadas gRPC.

| Atributo | Valor |
|---|---|
| **Tópico** | `game-finished` |
| **Grupo consumidor** | `user-service-group` |
| **Semântica de entrega** | at-least-once (commit manual de offset somente após confirmação de persistência) |
| **Deserialização** | JSON |

### 3.1 Schema da mensagem consumida

Publicado pelo Game Service. O User Service deve estar preparado para receber:

```json
{
  "room_code": "ABC123",
  "finished_at": "2026-06-18T14:32:00Z",
  "theme": "science",
  "results": [
    {
      "player_id": "uuid-cadastrado",
      "player_name": "João",
      "is_anonymous": false,
      "score": 47,
      "position": 1,
      "won": true
    },
    {
      "player_id": "anon:f3a2c1",
      "player_name": "Visitante",
      "is_anonymous": true,
      "score": 31,
      "position": 2,
      "won": false
    }
  ]
}
```

### 3.2 Lógica de processamento

Ao receber um evento `game-finished`, o User Service:

1. Itera sobre o array `results`
2. **Ignora** todos os jogadores com `is_anonymous: true` ou com `player_id` prefixado com `anon:` — jogadores anônimos não têm estatísticas persistidas
3. Para cada jogador cadastrado, atualiza as estatísticas na instância primária dentro de uma transação SQL:
   - Incrementa `games_played`
   - Recalcula `avg_position` (média acumulada)
   - Recalcula `avg_points` (média acumulada)
   - Atualiza `highest_score` se `score` for maior que o atual
   - Incrementa `games_won` se `won: true`
4. Faz commit do offset Kafka **somente após** confirmar a persistência no banco

### 3.3 Tratamento de falha

Se a persistência falhar (ex: banco indisponível), o offset **não** é commitado. O Consumer tentará reprocessar a mensagem na próxima iteração. A idempotência deve ser garantida: se a mesma partida (`room_id`) for processada mais de uma vez, o segundo processamento não deve duplicar as estatísticas.

> **Mecanismo sugerido para idempotência:** manter uma tabela `processed_games (room_id PK, processed_at)`. Antes de atualizar estatísticas, verificar se o `room_id` já foi processado. Se sim, ignorar e commitar o offset.

---

## 4. Interface User Database — User Service ↔ PostgreSQL

O User Service é o único componente que acessa o User Database. O banco opera com uma instância primária (escritas) e uma réplica de leitura (leituras), conectadas via PostgreSQL Streaming Replication.

- **Primário:** escritas — `RegisterUser`, `UpdateUser`, atualização de estatísticas via Kafka
- **Réplica:** leituras — `LoginUser`, `GetUserStats`

### 4.1 Schema

```sql
-- Usuários cadastrados
CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_name ON users (name);

-- Estatísticas históricas (uma linha por usuário)
CREATE TABLE user_stats (
    user_id       UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    games_played  INT         NOT NULL DEFAULT 0,
    games_won     INT         NOT NULL DEFAULT 0,
    avg_position  DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_points    DOUBLE PRECISION NOT NULL DEFAULT 0,
    highest_score INT         NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Controle de idempotência do consumer Kafka
CREATE TABLE processed_games (
    room_id       TEXT        PRIMARY KEY,
    processed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.2 Operações por RPC / fluxo

| Operação | Instância | Query |
|---|---|---|
| `RegisterUser` | Primária | `INSERT INTO users (name, password_hash)` + `INSERT INTO user_stats (user_id)` |
| `LoginUser` | Réplica | `SELECT id, name, password_hash FROM users WHERE name = ?` |
| `UpdateUser` (name) | Primária | `UPDATE users SET name = ? WHERE id = ?` |
| `UpdateUser` (password) | Primária | `UPDATE users SET password_hash = ? WHERE id = ?` |
| `GetUserStats` | Réplica | `SELECT * FROM user_stats WHERE user_id = ?` |
| Consumer Kafka | Primária | `INSERT INTO processed_games` + `UPDATE user_stats` (transação) |

---

## 5. Regras de Negócio Internas

### 5.1 Hashing de senha

- **Algoritmo:** bcrypt com fator de custo mínimo 10
- O hash é gerado no `RegisterUser` e na atualização de senha no `UpdateUser`
- A senha em texto plano **nunca** é armazenada, logada ou repassada a outro serviço

### 5.2 Cálculo de média acumulada

Para `avg_position` e `avg_points`, a média deve ser recalculada incrementalmente a cada novo evento Kafka, sem precisar reler o histórico completo de partidas:

```
nova_media = (media_atual × games_played + novo_valor) / (games_played + 1)
```

Esse cálculo deve ocorrer antes de incrementar `games_played`.

### 5.3 Unicidade de `name`

O campo `name` na tabela `users` tem constraint `UNIQUE`. Em `RegisterUser` e `UpdateUser`, uma violação dessa constraint deve ser capturada e retornada como `ALREADY_EXISTS` no gRPC.

---

## 6. Stack Tecnológica

| Componente | Tecnologia |
|---|---|
| Linguagem | Java 21 |
| Framework | Spring Boot 3.x |
| Servidor gRPC | `grpc-spring-boot-starter` (LogNet) + `grpc-java` |
| Kafka consumer | `spring-kafka` |
| Hashing de senha | `spring-security-crypto` (BCryptPasswordEncoder) |
| JDBC | `spring-boot-starter-jdbc` + driver PostgreSQL |
| Build | Maven ou Gradle |

---

## 7. Variáveis de Configuração

```yaml
grpc:
  server:
    port: 9090

spring:
  datasource:
    primary:
      url: jdbc:postgresql://${DB_USER_PRIMARY_HOST}:${DB_USER_PRIMARY_PORT}/${DB_USER_NAME}
      username: ${DB_USER_PRIMARY_USER}
      password: ${DB_USER_PRIMARY_PASS}

    replica:
      url: jdbc:postgresql://${DB_USER_REPLICA_HOST}:${DB_USER_REPLICA_PORT}/${DB_USER_NAME}
      username: ${DB_USER_REPLICA_USER}
      password: ${DB_USER_REPLICA_PASS}

  kafka:
    bootstrap-servers: ${KAFKA_BROKERS}
    consumer:
      group-id: user-service-group
      auto-offset-reset: earliest
      enable-auto-commit: false
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer

bcrypt:
  strength: ${BCRYPT_STRENGTH:10}
```

> A porta `9090` é interna ao contêiner. A exposição externa é gerenciada pela infraestrutura (Docker network), transparente para este contrato.

---

## 8. Restrições

O User Service **não deve**:

- Emitir ou validar JWT — essa responsabilidade é exclusiva do API Gateway
- Publicar eventos no Kafka — apenas consome
- Acessar Redis, o Question Database ou o Game Service diretamente
- Armazenar senhas em texto plano — apenas hashes bcrypt
- Processar estatísticas de jogadores anônimos (`is_anonymous: true` ou `player_id` prefixado com `anon:`)
- Fazer commit do offset Kafka antes de confirmar a persistência no banco