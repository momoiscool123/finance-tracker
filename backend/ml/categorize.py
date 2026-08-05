"""
Serving-time transaction categorizer (Phase D).

Given a merchant name, guess one of the app's 6 categories. Two layers, checked
in order:

  1) Egyptian-merchant override — a hand-built lookup for well-known local
     brands the model gets wrong. The model was trained on English/global data
     and never saw these names, so it guesses them confidently-wrong (e.g.
     Talabat -> Transport, CityPharm -> Shopping). For these, a lookup is both
     faster and always correct. Extend this dict as you spot more local names.

  2) The fine-tuned DistilBERT model (backend/ml/categorizer_model) — handles
     everything else: global brands and any name not in the override list.

The model is heavy (PyTorch + ~250 MB), so it is imported and loaded lazily on
first use, then reused for every later request.
"""

import re
from pathlib import Path

MODEL_DIR = Path(__file__).parent / "categorizer_model"

# ---------------------------------------------------------------------------
# Layer 1 — Egyptian merchant overrides.
# key = a lowercase substring to look for in the merchant name -> category.
# Curated to distinctive, unambiguous local brands so we don't mis-fire on
# ordinary words.
# ---------------------------------------------------------------------------
EGYPTIAN_OVERRIDES = {
    # Food & Dining
    "talabat": "Food & Dining",
    "elmenus": "Food & Dining",
    "otlob": "Food & Dining",
    "koshary": "Food & Dining",
    "abou tarek": "Food & Dining",
    "zooba": "Food & Dining",
    "cilantro": "Food & Dining",
    "cook door": "Food & Dining",
    "mo'men": "Food & Dining",
    "buffalo burger": "Food & Dining",
    # Shopping
    "seoudi": "Shopping",
    "spinneys": "Shopping",
    "carrefour": "Shopping",
    "kazyon": "Shopping",
    "hyper one": "Shopping",
    "hyperone": "Shopping",
    "b.tech": "Shopping",
    "btech": "Shopping",
    "gomla": "Shopping",
    "mall of egypt": "Shopping",
    "city stars": "Shopping",
    # Health
    "citypharm": "Health",
    "city pharmacy": "Health",
    "el ezaby": "Health",
    "ezaby": "Health",
    "seif pharmacy": "Health",
    "roshdy pharmacy": "Health",
    # Transport
    "cairo metro": "Transport",
    "careem": "Transport",
    "swvl": "Transport",
    "mwasalat": "Transport",
    "uber": "Transport",
    # Utilities
    "vodafone": "Utilities",
    "orange egypt": "Utilities",
    "etisalat": "Utilities",
    "fawry": "Utilities",
    "we pay": "Utilities",
    # Entertainment
    "vox": "Entertainment",
    "imax": "Entertainment",
    "nile cinema": "Entertainment",
}

# Longest keys first so more specific names win (e.g. "city pharmacy" beats "city").
_OVERRIDE_KEYS = sorted(EGYPTIAN_OVERRIDES, key=len, reverse=True)

_COUNTRIES = {"USA", "UK", "INDIA", "CANADA", "AUSTRALIA"}


def _clean(text: str) -> str:
    """Strip the same synthetic noise we removed at training time, so the text
    we feed the model at serving time looks like the text it trained on."""
    t = str(text)
    t = re.sub(r"TXN\d+", " ", t)        # transaction codes
    t = re.sub(r"#\d+", " ", t)          # store numbers
    t = re.sub(r"\b\d{3,}\b", " ", t)    # other long stray numbers
    tokens = [w for w in re.split(r"[\s\-]+", t) if w and w.upper() not in _COUNTRIES]
    return " ".join(tokens).strip()


def _override_lookup(name: str):
    low = name.lower()
    for key in _OVERRIDE_KEYS:
        if key in low:
            return EGYPTIAN_OVERRIDES[key]
    return None


# --- lazy-loaded model singletons (loaded once, reused across requests) ---
_model = None
_tokenizer = None


def _load_model():
    global _model, _tokenizer
    if _model is None:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        _tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR))
        _model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_DIR))
        _model.eval()
    return _model, _tokenizer


def categorize(merchant: str) -> dict:
    """Guess a category for a merchant name.

    Returns {category, confidence, source}, where source is one of:
      "override"    — matched the Egyptian merchant list (confidence 1.0)
      "model"       — predicted by DistilBERT
      "none"        — empty merchant name
      "unavailable" — model isn't trained yet (run train_categorizer.py)
    """
    name = (merchant or "").strip()
    if not name:
        return {"category": None, "confidence": 0.0, "source": "none"}

    # Layer 1: known Egyptian merchant?
    hit = _override_lookup(name)
    if hit is not None:
        return {"category": hit, "confidence": 1.0, "source": "override"}

    # Layer 2: the model — but degrade gracefully if it hasn't been trained.
    if not MODEL_DIR.exists():
        return {"category": None, "confidence": 0.0, "source": "unavailable"}

    import torch

    model, tokenizer = _load_model()
    inputs = tokenizer(_clean(name), return_tensors="pt", truncation=True, max_length=32)
    with torch.no_grad():
        probs = torch.softmax(model(**inputs).logits, dim=-1)[0]
    idx = int(probs.argmax())
    return {
        "category": model.config.id2label[idx],
        "confidence": round(float(probs[idx]), 4),
        "source": "model",
    }
