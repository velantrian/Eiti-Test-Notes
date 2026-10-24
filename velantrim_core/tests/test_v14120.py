"""v14.12.0: voice assistant providers (OpenAI Realtime, Qwen Omni, Alice/Yandex, Mistral Voxtral) + Mistral AI chat provider."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.12.0"' in HTML
    assert "var CACHE = 'eiti-v14.12.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.12.0'" in SW
    assert "version: '14.12.0'" in SW
    assert "v14.12.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.12.0" in readme and "Что нового в v14.12.0" in readme
    assert "v14.12.0" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_voice_select_has_all_providers():
    sel = re.search(r'<select id="ai-voice-provider".*?</select>', HTML, re.S).group(0)
    for v in ("grok", "gemini", "openai", "qwen", "yandex", "mistral"):
        assert f'value="{v}"' in sel
    assert "Алиса (Яндекс)" in sel
    for b in ("openai", "qwen", "yandex", "mistral"):
        assert f'id="ai-voice-{b}-box"' in HTML


def test_voice_registry_and_normalize():
    assert "['gemini', 'openai', 'qwen', 'yandex', 'mistral'].indexOf(v) >= 0 ? v : 'grok'" in HTML
    for r in ("reg.openai", "reg.qwen", "reg.yandex", "reg.mistral"):
        assert r in HTML
    assert "/v1/realtime/client_secrets" in HTML and "/v1/realtime/calls" in HTML
    assert "/v1/audio/transcriptions" in HTML and "/v1/audio/speech" in HTML


def test_proxy_only_for_qwen_yandex():
    # browser WebSocket can't send auth headers → no key is stored or sent for qwen/yandex
    assert "eiti_qwen_voice_proxy" in HTML and "eiti_yandex_voice_proxy" in HTML
    assert "dashscope.aliyuncs.com/api-ws" not in HTML


def test_mistral_chat_provider():
    assert 'id="eiti-provider-card-mistral"' in HTML and 'id="mistral-key"' in HTML and 'id="mistral-model"' in HTML
    assert "https://api.mistral.ai/v1/chat/completions" in HTML
    assert "mistral:    { icon: '🌀', name: 'Mistral'" in HTML
    assert "['deepseek', 'gemini', 'openrouter', 'qwen', 'mistral']" in HTML
    for m in ("mistral-medium-3-5", "mistral-large-4", "mistral-small-2603"):
        assert m in HTML


def test_i18n_new_strings():
    for k in ("Алиса (Яндекс)", "Голос браузера", "нужен прокси", "Ключ Mistral AI"):
        assert HTML.count(json.dumps(k, ensure_ascii=False) + ":") >= 2, k
