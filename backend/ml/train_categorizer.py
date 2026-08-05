"""
Phase C — fine-tune a DistilBERT transformer to categorize a merchant name
into one of the app's 6 spending categories.

WHY a transformer: unlike a keyword lookup, DistilBERT already "understands"
English from its pretraining, so it can make sensible guesses for merchant
names it has never seen. We *fine-tune* it: start from the pretrained weights
and keep training on our merchant -> category examples so it specialises.

Run:
    backend/.venv/bin/python backend/ml/train_categorizer.py

Output:
    backend/ml/categorizer_model/   (the fine-tuned model + tokenizer)
"""

import re

import numpy as np
import pandas as pd
import torch
from datasets import Dataset
from huggingface_hub import hf_hub_download
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)

# ----------------------------- config ------------------------------------
BASE_MODEL = "distilbert-base-uncased"
PER_CATEGORY = 2000       # balanced sample size per category (keeps training fast)
MAX_LEN = 32              # merchant names are short, so a small window is plenty
EPOCHS = 3
OUT_DIR = "backend/ml/categorizer_model"

# The dataset's own labels -> your app's EXACT category strings
# (must match CATEGORY_OPTIONS in src/components/TransactionModal/TransactionModal.jsx)
LABEL_MAP = {
    "Food & Dining": "Food & Dining",
    "Transportation": "Transport",
    "Shopping & Retail": "Shopping",
    "Entertainment & Recreation": "Entertainment",
    "Healthcare & Medical": "Health",
    "Utilities & Services": "Utilities",
}
APP_CATEGORIES = [
    "Shopping", "Food & Dining", "Transport",
    "Utilities", "Entertainment", "Health",
]

# --------------------------- 1. load data --------------------------------
print("Downloading / locating dataset parquet (cached after first run)...")
path = hf_hub_download(
    repo_id="mitulshah/transaction-categorization",
    filename="default/train/0000.parquet",
    repo_type="dataset",
)
df = pd.read_parquet(path, columns=["transaction_description", "category"])
print(f"  loaded {len(df):,} total rows")

# ------------------ 2. filter to our 6 categories + map ------------------
df = df[df["category"].isin(LABEL_MAP)].copy()
df["label_name"] = df["category"].map(LABEL_MAP)

# ------------- 3. clean synthetic noise out of the text ------------------
# e.g. "Culver's #2534 - INDIA TXN176162" -> "Culver's"
COUNTRIES = {"USA", "UK", "INDIA", "CANADA", "AUSTRALIA"}


def clean(text: str) -> str:
    t = str(text)
    t = re.sub(r"TXN\d+", " ", t)        # transaction codes
    t = re.sub(r"#\d+", " ", t)          # store numbers
    t = re.sub(r"\b\d{3,}\b", " ", t)    # other long stray numbers
    tokens = [w for w in re.split(r"[\s\-]+", t) if w and w.upper() not in COUNTRIES]
    return " ".join(tokens).strip()


df["text"] = df["transaction_description"].map(clean)
df = df[df["text"].str.len() > 0]

# --------------------- 4. balanced sample --------------------------------
df = df.groupby("label_name", group_keys=False).sample(n=PER_CATEGORY, random_state=42)

label2id = {name: i for i, name in enumerate(APP_CATEGORIES)}
id2label = {i: name for name, i in label2id.items()}
df["label"] = df["label_name"].map(label2id)

# --------------------- 5. train / test split -----------------------------
train_df, test_df = train_test_split(
    df, test_size=0.2, stratify=df["label"], random_state=42
)
print(f"  train={len(train_df):,}  test={len(test_df):,}")
print("  MPS (Apple GPU) available:", torch.backends.mps.is_available())

# --------------------------- 6. tokenize ---------------------------------
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)


def to_dataset(frame: pd.DataFrame) -> Dataset:
    ds = Dataset.from_pandas(frame[["text", "label"]], preserve_index=False)
    return ds.map(
        lambda batch: tokenizer(batch["text"], truncation=True, max_length=MAX_LEN),
        batched=True,
    )


train_ds = to_dataset(train_df)
test_ds = to_dataset(test_df)

# ---------------------------- 7. model -----------------------------------
model = AutoModelForSequenceClassification.from_pretrained(
    BASE_MODEL,
    num_labels=len(APP_CATEGORIES),
    label2id=label2id,
    id2label=id2label,
)


# ---------------------------- 8. train -----------------------------------
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {"accuracy": accuracy_score(labels, preds)}


args = TrainingArguments(
    output_dir="backend/ml/_trainer_out",
    per_device_train_batch_size=32,
    per_device_eval_batch_size=64,
    num_train_epochs=EPOCHS,
    eval_strategy="epoch",
    save_strategy="no",
    logging_steps=50,
    report_to="none",
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=train_ds,
    eval_dataset=test_ds,
    processing_class=tokenizer,  # transformers v5 renamed this from `tokenizer`
    data_collator=DataCollatorWithPadding(tokenizer),
    compute_metrics=compute_metrics,
)

trainer.train()

# --------------------- 9. final evaluation report ------------------------
pred = trainer.predict(test_ds)
y_pred = np.argmax(pred.predictions, axis=-1)
y_true = pred.label_ids
print("\n================ RESULTS ================")
print("FINAL ACCURACY:", round(accuracy_score(y_true, y_pred), 4))
print(classification_report(y_true, y_pred, target_names=APP_CATEGORIES))

# ---------------------------- 10. save -----------------------------------
trainer.save_model(OUT_DIR)
tokenizer.save_pretrained(OUT_DIR)
print("Saved fine-tuned model to", OUT_DIR)
