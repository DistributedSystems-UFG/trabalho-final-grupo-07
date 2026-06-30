"""
insert_questions.py
Lê os arquivos JSON de perguntas, traduz para português via Google Translate
e insere nos shards do banco de dados.

Uso:
    pip install psycopg2-binary deep-translator
    python insert_questions.py

Os arquivos JSON devem estar na pasta 'questions/' no mesmo diretório do script.

Flags opcionais (editar no topo do script):
    TRANSLATE = True   → traduz para pt-BR antes de inserir (padrão)
    TRANSLATE = False  → insere em inglês sem traduzir
"""

import json
import random
import time
import html
from pathlib import Path

import psycopg2
from deep_translator import GoogleTranslator

# ── Configuração ──────────────────────────────────────────────────────────────

TRANSLATE = False        # tradução estava porca, suspendi por enquanto by:kelvin
DELAY_BETWEEN_CALLS = 0.3 # segundos entre chamadas ao Google (evita rate limit)

SHARD_A = {
    "host": "localhost", "port": 5432,
    "dbname": "questions_shard_a", "user": "trivia", "password": "trivia",
    "options": "-c client_encoding=UTF8"
}

SHARD_B = {
    "host": "localhost", "port": 5433,
    "dbname": "questions_shard_b", "user": "trivia", "password": "trivia",
    "options": "-c client_encoding=UTF8"
}

SHARD_MAP = {
    "history":             SHARD_A,
    "science":             SHARD_A,
    "geography":           SHARD_A,
    "arts_and_literature": SHARD_A,
    "society_and_culture": SHARD_A,
    "music":               SHARD_B,
    "sport_and_leisure":   SHARD_B,
    "film_and_tv":         SHARD_B,
    "food_and_drink":      SHARD_B,
    "general_knowledge":   SHARD_B,
}

QUESTIONS_DIR = Path("questions")
OPTION_LABELS = ["a", "b", "c", "d"]

# ── Tradução ──────────────────────────────────────────────────────────────────

translator = GoogleTranslator(source="en", target="pt")


def translate(text: str) -> str:
    """Traduz um texto para português. Retorna o original em caso de erro."""
    if not TRANSLATE:
        return text
    try:
        result = translator.translate(text)
        time.sleep(DELAY_BETWEEN_CALLS)
        if result:
            return result.encode('utf-8').decode('utf-8')
        return text
    except Exception:
        return text


def translate_question(q: dict) -> dict:
    """Traduz todos os campos de texto de uma questão."""
    if not TRANSLATE:
        return q
    return {
        **q,
        "language":  "pt-BR",
        "text":      translate(q["text"]),
        "option_a":  translate(q["option_a"]),
        "option_b":  translate(q["option_b"]),
        "option_c":  translate(q["option_c"]),
        "option_d":  translate(q["option_d"]),
    }


# ── Mapeamento do formato da API para o schema do banco ───────────────────────

def map_question(item: dict) -> dict | None:
    """Converte uma questão no formato da API para o schema do banco."""
    if item.get("type") != "text_choice":
        return None

    correct = item.get("correctAnswer")
    incorrect = item.get("incorrectAnswers", [])
    question_text = item.get("question", {}).get("text")

    if not correct or len(incorrect) != 3 or not question_text:
        return None

    options = incorrect + [correct]
    random.shuffle(options)
    correct_option = OPTION_LABELS[options.index(correct)]

    return {
        "theme":          item["category"],
        "language":       "en",
        "text":           question_text,
        "option_a":       options[0],
        "option_b":       options[1],
        "option_c":       options[2],
        "option_d":       options[3],
        "correct_option": correct_option,
    }


# ── Inserção no banco ─────────────────────────────────────────────────────────

INSERT_SQL = """
    INSERT INTO questions
        (theme, language, text, option_a, option_b, option_c, option_d, correct_option)
    VALUES
        (%s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT DO NOTHING
"""


def insert_questions(questions: list[dict], config: dict) -> tuple[int, int]:
    """Insere as perguntas no banco e retorna (inseridos, ignorados)."""
    conn = psycopg2.connect(**config)
    cur = conn.cursor()

    inserted = 0
    skipped = 0

    for q in questions:
        cur.execute(
            "SELECT COUNT(*) FROM questions WHERE text = %s AND theme = %s",
            (q["text"], q["theme"])
        )
        exists = cur.fetchone()[0] > 0

        if exists:
            skipped += 1
            continue

        cur.execute(INSERT_SQL, (
            q["theme"], q["language"], q["text"],
            q["option_a"], q["option_b"], q["option_c"],
            q["option_d"], q["correct_option"]
        ))
        inserted += 1

    conn.commit()
    cur.close()
    conn.close()

    return inserted, skipped


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    mode = "pt-BR (com tradução)" if TRANSLATE else "en (sem tradução)"
    print(f"\n── Inserção de perguntas — TriviaArena [{mode}] ──")

    total_inserted = 0
    total_skipped = 0
    total_invalid = 0

    for category, config in SHARD_MAP.items():
        json_file = QUESTIONS_DIR / f"{category}.json"

        if not json_file.exists():
            print(f"  ⚠ Arquivo não encontrado: {json_file}")
            continue

        raw = json.loads(json_file.read_text(encoding="utf-8"))
        mapped = [map_question(q) for q in raw]
        valid = [q for q in mapped if q is not None]
        invalid = len(mapped) - len(valid)

        shard = "Shard A" if config == SHARD_A else "Shard B"
        print(f"\n  {category} [{shard}] — traduzindo e inserindo {len(valid)} perguntas...")

        if TRANSLATE:
            translated = []
            for i, q in enumerate(valid, 1):
                translated.append(translate_question(q))
                if i % 10 == 0:
                    print(f"    {i}/{len(valid)} traduzidas...")
            valid = translated

        try:
            inserted, skipped = insert_questions(valid, config)
            total_inserted += inserted
            total_skipped += skipped
            total_invalid += invalid
            print(f"  ✓ {inserted} inseridas, {skipped} já existiam, {invalid} inválidas")
        except Exception as e:
            print(f"  ✗ ERRO: {e}")

    print(f"\n── Resumo ───────────────────────────────────────────────────────")
    print(f"  Inseridas:         {total_inserted}")
    print(f"  Já existiam:       {total_skipped}")
    print(f"  Inválidas:         {total_invalid}")
    print(f"  Total processadas: {total_inserted + total_skipped + total_invalid}")
    print()


if __name__ == "__main__":
    main()