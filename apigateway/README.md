# API Gateway — TriviaArena

Componente de entrada do sistema TriviaArena. Responsável por:

- Autenticação e geração de JWT
- Roteamento de chamadas REST para os serviços internos via gRPC
- Proxy de conexões WebSocket/STOMP para o Game Service

## Tecnologia

Python 3.12 + FastAPI + Uvicorn

## Configuração

```bash
cp .env.example .env
# preencher as variáveis no .env
pip install .
uvicorn main:app --port 8000
```

## Autor

Kelvin de Oliveira