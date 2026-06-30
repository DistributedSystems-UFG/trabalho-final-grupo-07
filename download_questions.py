"""
Script para baixar perguntas da The Trivia API (https://the-trivia-api.com/v2)
e salvar um arquivo JSON por categoria dentro da pasta "questions".

Uso:
    python download_trivia.py

Requer a biblioteca "requests":
    pip install requests
"""

import json
import os
import requests

BASE_URL = "https://the-trivia-api.com/v2/questions"
LIMIT = 50

CATEGORIES = [
    "music",
    "sport_and_leisure",
    "film_and_tv",
    "arts_and_literature",
    "history",
    "society_and_culture",
    "science",
    "geography",
    "food_and_drink",
    "general_knowledge",
]

OUTPUT_DIR = "questions"


def fetch_questions(category, limit=LIMIT):
    """Faz a requisição GET na API para uma categoria específica."""
    params = {"categories": category, "limit": limit}
    response = requests.get(BASE_URL, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for category in CATEGORIES:
        print(f"Baixando perguntas da categoria: {category}...")
        try:
            questions = fetch_questions(category)
        except requests.RequestException as e:
            print(f"  Erro ao baixar '{category}': {e}")
            continue

        file_path = os.path.join(OUTPUT_DIR, f"{category}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)

        print(f"  Salvo em: {file_path} ({len(questions)} perguntas)")

    print("\nConcluído!")


if __name__ == "__main__":
    main()