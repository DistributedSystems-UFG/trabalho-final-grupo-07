"""
Script de teste de integração — TriviaArena
Valida todos os endpoints REST do API Gateway com User Service e Game Service.
"""

import json
import os
import uuid

import requests

BASE_URL = "http://localhost:8000"
OUTPUT_DIR = "response_test"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Nome único por execução para evitar conflitos no banco
username = f"alice_{uuid.uuid4().hex[:6]}"
print(f"Usuário de teste: {username}\n")


def save(filename, data):
    with open(os.path.join(OUTPUT_DIR, filename), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def check(label, resp, expected_status):
    ok = resp.status_code == expected_status
    status = "✅" if ok else "❌"
    try:
        body = resp.json()
    except Exception:
        body = {"raw": resp.text}
    print(f"{status} {label} [{resp.status_code}]: {body}")
    return body


# ── 1. Register ───────────────────────────────────────────────────────────────
resp = requests.post(f"{BASE_URL}/auth/register", json={
    "name": username,
    "password": "senha123"
})
data = check("REGISTER", resp, 201)
save("register.json", data)
user_id = data.get("user_id")
jwt_token = data.get("jwt")

# ── 2. Register duplicado — deve retornar 409 ─────────────────────────────────
resp = requests.post(f"{BASE_URL}/auth/register", json={
    "name": username,
    "password": "senha123"
})
check("REGISTER DUPLICADO (esperado 409)", resp, 409)

# ── 3. Login ──────────────────────────────────────────────────────────────────
resp = requests.post(f"{BASE_URL}/auth/login", json={
    "name": username,
    "password": "senha123"
})
data = check("LOGIN", resp, 200)
save("login.json", data)
jwt_token = data.get("jwt", jwt_token)

# ── 4. Login com senha errada — deve retornar 401 ─────────────────────────────
resp = requests.post(f"{BASE_URL}/auth/login", json={
    "name": username,
    "password": "senha_errada"
})
check("LOGIN SENHA ERRADA (esperado 401)", resp, 401)

headers = {"Authorization": f"Bearer {jwt_token}"}

# ── 5. Stats ──────────────────────────────────────────────────────────────────
resp = requests.get(f"{BASE_URL}/users/me/stats", headers=headers)
data = check("STATS", resp, 200)
save("stats.json", data)

# ── 6. Update user ────────────────────────────────────────────────────────────
new_name = f"alice_{uuid.uuid4().hex[:6]}"
resp = requests.put(f"{BASE_URL}/users/me", json={"name": new_name}, headers=headers)
data = check("UPDATE USER", resp, 204)
save("update_user.json", data)

# ── 7. Criar sala ─────────────────────────────────────────────────────────────
resp = requests.post(f"{BASE_URL}/rooms", json={
    "creator_id": user_id,
    "creator_name": new_name,
    "is_anonymous": False,
    "max_players": 2,
    "num_questions": 5,
    "theme": "science"
}, headers=headers)
data = check("CREATE ROOM", resp, 201)
save("room.json", data)
room_code = data.get("room_code")

# ── 8. Consultar estado da sala ───────────────────────────────────────────────
if room_code:
    resp = requests.get(f"{BASE_URL}/rooms/{room_code}", headers=headers)
    data = check("GET ROOM", resp, 200)
    save("room_state.json", data)

# ── 9. Entrar na sala com segundo jogador (anônimo) ───────────────────────────
if room_code:
    anon_id = f"anon:{uuid.uuid4()}"
    resp = requests.post(f"{BASE_URL}/rooms/{room_code}/join", json={
        "player_id": anon_id,
        "player_name": "bruno",
        "is_anonymous": True
    })
    data = check("JOIN ROOM", resp, 200)
    save("join.json", data)

# ── 10. Iniciar partida ───────────────────────────────────────────────────────
#if room_code:
    #resp = requests.post(f"{BASE_URL}/rooms/{room_code}/start", json={
     #   "requester_id": user_id
    #}, headers=headers)
    #data = check("START GAME", resp, 200)
    #save("start.json", data)

# ── 11. Tentar iniciar de novo — deve retornar 409 ────────────────────────────
#if room_code:
 #   resp = requests.post(f"{BASE_URL}/rooms/{room_code}/start", json={
  #      "requester_id": user_id
   # }, headers=headers)
    #check("START GAME DUPLICADO (esperado 409)", resp, 409)

# ── 12. Reiniciar com novo tema (só após partida finalizada) ──────────────────
# Comentado pois exige que a partida tenha terminado via WebSocket
# if room_code:
#     resp = requests.post(f"{BASE_URL}/rooms/{room_code}/restart", json={
#         "requester_id": user_id,
#         "new_theme": "history"
#     }, headers=headers)
#     check("RESTART GAME", resp, 200)

# ── Resumo ────────────────────────────────────────────────────────────────────
print(f"\nRespostas salvas em ./{OUTPUT_DIR}/")