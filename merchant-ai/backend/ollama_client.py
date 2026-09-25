import json
import re

import requests

OLLAMA_URL = "http://localhost:11434"
GENERATE_URL = f"{OLLAMA_URL}/api/generate"
MODEL = "qwen3:4b"


class OllamaUnavailable(Exception):
    pass


def check_ollama() -> dict:
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=1.5)
        r.raise_for_status()
        names = [m.get("name", "") for m in r.json().get("models", [])]
        return {"online": True, "model": MODEL, "model_available": any(n == MODEL or n.startswith(MODEL) for n in names)}
    except Exception:
        return {"online": False, "model": MODEL, "model_available": False}


def _clean(text: str) -> str:
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
    text = re.sub(r"<think>.*", "", text, flags=re.S)  # unterminated think block
    return text.strip()


def ask_qwen(prompt: str, json_mode: bool = False, timeout: int = 300, max_tokens: int = 1200) -> str:
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "think": False,  # newer Ollama; "/no_think" in prompts covers older versions
        "keep_alive": "15m",
        "options": {"temperature": 0.2, "num_predict": max_tokens, "num_ctx": 4096},
    }
    if json_mode:
        payload["format"] = "json"
    try:
        r = requests.post(GENERATE_URL, json=payload, timeout=timeout)
    except requests.exceptions.ConnectionError:
        raise OllamaUnavailable("Local AI (Ollama) is not running. Start Ollama, then try again.")
    except requests.exceptions.Timeout:
        raise OllamaUnavailable("Local AI (Ollama) took too long to respond. Try again.")
    if r.status_code == 404:
        raise OllamaUnavailable(f"Model {MODEL} is not installed. Run: ollama pull {MODEL}")
    if r.status_code >= 400:
        raise OllamaUnavailable(f"Ollama returned an error ({r.status_code}).")
    return _clean(r.json().get("response", ""))


def extract_json(text: str):
    text = (text or "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    s, e = text.find("{"), text.rfind("}")
    if s != -1 and e > s:
        try:
            return json.loads(text[s:e + 1])
        except json.JSONDecodeError:
            return None
    return None