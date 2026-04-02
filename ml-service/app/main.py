from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
import os
from urllib.parse import urlparse
from collections import Counter, defaultdict

import re
from datetime import datetime, timedelta

import numpy as np
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LinearRegression
from pymongo import MongoClient
from bson import ObjectId
import pandas as pd
from mlxtend.frequent_patterns import apriori as mlxtend_apriori, association_rules
import requests

app = FastAPI(title="ShopSmart ML Service (Demo)")


class RecommendRequest(BaseModel):
    userId: Optional[str] = None
    productId: str


class RecommendResponse(BaseModel):
    productIds: List[str]
    customersAlsoBought: Optional[List[str]] = None
    similarToThis: Optional[List[str]] = None


def _load_env_file() -> None:
    """
    Lightweight .env loader (avoids extra dependencies).
    Expects a root .env at repo top-level.
    """

    # This file lives at ml-service/app/main.py
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    env_path = os.path.join(repo_root, ".env")
    if not os.path.exists(env_path):
        return

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for raw_line in f.readlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip()
                if not key:
                    continue
                # Don't override already-set environment variables.
                os.environ.setdefault(key, val)
    except Exception:
        # If env can't be read, keep running (env vars may already be set externally).
        return


_load_env_file()

MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_LOCAL_URI = os.getenv("MONGODB_LOCAL_URI", "mongodb://localhost:27017/shopsmart")
MODEL_READY = False

_model: Optional[MultinomialNB] = None
_product_id_to_idx: Dict[str, int] = {}
_idx_to_product_id: List[str] = []
_co_counts: Dict[str, Counter] = {}

# Cached Apriori output (recomputed on demand)
_apriori_combos: List[Dict[str, Any]] = []

# Fake-review detection helpers
_SENTIMENT_PIPE = None
_SENTIMENT_MODEL = "distilbert-base-uncased-finetuned-sst-2-english"

_GENERIC_PHRASES = {
    "amazing quality, totally satisfied",
    "best product ever. would definitely buy again",
    "good one",
    "loved it",
    "five stars for sure",
    "perfect",
    "great purchase",
    "superb",
}

_LOW_DETAIL_HINTS = [
    "good one",
    "loved it",
    "five stars",
    "perfect",
    "great purchase",
    "superb",
]


def _tokenize_words(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


def _jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    if union == 0:
        return 0.0
    return inter / union


def _get_sentiment_score(text: str) -> Optional[float]:
    """
    Returns signed sentiment score in [0,1] where 1=very positive, 0=very negative.
    """
    global _SENTIMENT_PIPE
    if _SENTIMENT_PIPE is None:
        try:
            from transformers import pipeline as hf_pipeline  # lazy import

            _SENTIMENT_PIPE = hf_pipeline("sentiment-analysis", model=_SENTIMENT_MODEL)
        except Exception:
            _SENTIMENT_PIPE = None

    if _SENTIMENT_PIPE is None:
        return None

    try:
        out = _SENTIMENT_PIPE(text[:800], truncation=True)
        if not out:
            return None
        item = out[0]
        label = str(item.get("label") or "")
        score = float(item.get("score") or 0.0)
        # distilbert model outputs POSITIVE/NEGATIVE
        if label.upper().startswith("NEG"):
            # invert for signed score
            return float(round(1.0 - score, 4))
        return score
    except Exception:
        return None


def _detect_fake_review(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Heuristic + (optional) transformer sentiment for a demo-grade detector.
    Returns:
      { isFlagged: bool, confidence: float, reasons: [str] }
    """
    user_id = payload.get("userId")
    product_id = payload.get("productId")
    text = str(payload.get("text") or "")
    rating = payload.get("rating")

    if not user_id or not product_id or not text:
        return {"isFlagged": False, "confidence": 0.15, "reasons": ["Missing input fields"]}

    rating_num = None
    try:
        rating_num = int(rating)
    except Exception:
        rating_num = None

    words = _tokenize_words(text)
    token_count = len(words)
    unique_word_ratio = len(set(words)) / token_count if token_count else 0.0
    joined = text.strip().lower()

    generic_hits = 0
    for phrase in _GENERIC_PHRASES:
        if phrase in joined:
            generic_hits += 1

    # Repetition: repeated-word ratio.
    repeated_fraction = 0.0
    if token_count:
        repeated_fraction = (token_count - len(set(words))) / float(token_count)

    too_generic = token_count <= 10 or unique_word_ratio < 0.35 or generic_hits >= 1
    repetitive = repeated_fraction > 0.22 and unique_word_ratio < 0.5
    low_detail = token_count < 18 or unique_word_ratio < 0.42 or any(h in joined for h in _LOW_DETAIL_HINTS)

    # Sentiment (optional)
    sentiment_score = _get_sentiment_score(text)
    extreme_sentiment_low_detail = False
    if sentiment_score is not None:
        # sentiment_score close to 0 or 1 means extreme
        if (sentiment_score >= 0.95 or sentiment_score <= 0.05) and low_detail:
            extreme_sentiment_low_detail = True

    # Bulk/repetitive posting checks via Mongo.
    bulk_suspicion = False
    jaccard_similarity_max = 0.0
    try:
        mongo_uri = MONGODB_URI if MONGODB_URI else MONGODB_LOCAL_URI
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10_000, maxPoolSize=10)
        db_name = _extract_db_name(mongo_uri if mongo_uri else MONGODB_LOCAL_URI)
        db = client[db_name]
        reviews_col = db["reviews"]

        try:
            user_oid = ObjectId(str(user_id))
        except Exception:
            user_oid = None

        if user_oid is not None:
            now = datetime.utcnow()
            recent_window = now - timedelta(hours=24)
            recent_reviews = list(
                reviews_col.find(
                    {"userId": user_oid},
                    {"text": 1, "createdAt": 1},
                )
                .sort("createdAt", -1)
                .limit(12)
            )

            recent_same_text = [r for r in recent_reviews if "text" in r]
            # If multiple reviews were posted within 24 hours -> bulk suspicion.
            recent_count_24h = sum(1 for r in recent_same_text if r.get("createdAt") and r["createdAt"] >= recent_window)
            if recent_count_24h >= 4:
                bulk_suspicion = True

            # Similarity to previous reviews by the user
            new_set = set(words)
            sims = []
            for r in recent_same_text[:8]:
                prev_text = str(r.get("text") or "")
                prev_words = _tokenize_words(prev_text)
                prev_set = set(prev_words)
                if not prev_set:
                    continue
                sims.append(_jaccard(new_set, prev_set))
            if sims:
                jaccard_similarity_max = max(sims)
                # Consider as suspicious if very similar.
                if jaccard_similarity_max >= 0.7:
                    repetitive = True

        client.close()
    except Exception:
        # If DB checks fail, keep heuristic-only.
        bulk_suspicion = False

    reasons: List[str] = []
    confidence = 0.12

    if too_generic:
        confidence += 0.35
        reasons.append("Too generic phrasing / low detail")
    if repetitive:
        confidence += 0.25
        reasons.append("Repetitive wording or similar prior review")
    if bulk_suspicion:
        confidence += 0.25
        reasons.append("Possible bulk posting pattern")
    if extreme_sentiment_low_detail:
        confidence += 0.25
        reasons.append("Extreme sentiment with little detail")

    # Small adjustment by rating/text mismatch (optional).
    if rating_num is not None and sentiment_score is not None:
        # Map rating 1-5 to positivity 0-1
        rating_pos = (rating_num - 1) / 4.0
        if abs(rating_pos - sentiment_score) >= 0.75:
            confidence += 0.08
            reasons.append("Sentiment rating mismatch")

    confidence = float(min(0.98, max(0.02, confidence)))
    is_flagged = confidence >= 0.55

    if not reasons:
        reasons = ["No strong signals detected"]

    # Keep output compact
    if jaccard_similarity_max > 0:
        reasons.append(f"Text similarity score: {round(jaccard_similarity_max, 2)}")

    return {
        "isFlagged": bool(is_flagged),
        "confidence": float(round(confidence, 2)),
        "reasons": reasons[:4],
    }


def _extract_db_name(mongo_uri: str) -> str:
    parsed = urlparse(mongo_uri)
    # mongodb URI path is usually "/dbname"
    path = parsed.path.lstrip("/")
    return path or "shopsmart"


def _get_collections(client: MongoClient) -> Tuple[Any, Any, Any]:
    db_name = _extract_db_name(MONGODB_URI if MONGODB_URI else MONGODB_LOCAL_URI)
    db = client[db_name]
    return db["transactions"], db["products"], db["users"]


def _top_from_counter(counter: Counter, exclude: set, k: int = 5) -> List[str]:
    items = [(pid, cnt) for pid, cnt in counter.items() if pid not in exclude]
    items.sort(key=lambda x: x[1], reverse=True)
    return [pid for pid, _ in items[:k]]


def _train_naive_bayes(transactions_docs: List[Dict[str, Any]]) -> None:
    global MODEL_READY, _model, _product_id_to_idx, _idx_to_product_id, _co_counts

    # Gather product universe from transactions.
    universe = set()
    _co_counts = defaultdict(Counter)
    transactions_products: List[List[str]] = []

    for doc in transactions_docs:
        pids = doc.get("productIds") or []
        pids_str = [str(pid) for pid in pids]
        if len(pids_str) < 2:
            continue
        transactions_products.append(pids_str)
        for pid in pids_str:
            universe.add(pid)
        # Co-occurrence for "Customers also bought".
        for pivot in pids_str:
            for other in pids_str:
                if pivot != other:
                    _co_counts[pivot][other] += 1

    _idx_to_product_id = sorted(list(universe))
    _product_id_to_idx = {pid: i for i, pid in enumerate(_idx_to_product_id)}

    if not _idx_to_product_id:
        MODEL_READY = False
        _model = None
        return

    # Create NB training instances:
    # For each transaction, for each pivot in transaction, and each other in transaction (excluding pivot),
    # treat X as one-hot(pivot) and y as other product.
    X_rows = []
    y_labels = []
    for pids_str in transactions_products:
        pivot_idxs = [(_product_id_to_idx[pid]) for pid in pids_str if pid in _product_id_to_idx]
        # Map back to string to keep consistent
        pid_strs = [pid for pid in pids_str if pid in _product_id_to_idx]

        for pivot_pid in pid_strs:
            pivot_idx = _product_id_to_idx[pivot_pid]
            for other_pid in pid_strs:
                if other_pid == pivot_pid:
                    continue
                other_idx = _product_id_to_idx[other_pid]
                X_rows.append(pivot_idx)
                y_labels.append(other_idx)

    if not X_rows:
        MODEL_READY = False
        _model = None
        return

    num_samples = len(X_rows)
    num_features = len(_idx_to_product_id)
    X = np.zeros((num_samples, num_features), dtype=np.float32)
    for i, pivot_idx in enumerate(X_rows):
        X[i, pivot_idx] = 1.0
    y = np.array(y_labels, dtype=np.int32)

    nb = MultinomialNB(alpha=1.0)
    nb.fit(X, y)

    _model = nb
    MODEL_READY = True


def _ensure_model_ready() -> None:
    global MODEL_READY
    if MODEL_READY:
        return

    # Connect to Mongo and train from transactions.
    mongo_uri = MONGODB_URI if MONGODB_URI else MONGODB_LOCAL_URI
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10_000, maxPoolSize=10)
    transactions_col, _, _ = _get_collections(client)

    transactions_docs = list(transactions_col.find({}, {"productIds": 1}))
    _train_naive_bayes(transactions_docs)
    try:
        client.close()
    except Exception:
        pass


def _compute_apriori(min_support: float = 0.03, min_lift: float = 1.1) -> List[Dict[str, Any]]:
    """
    Run Apriori on transactions to generate combo suggestions.
    Returns a list of dicts of the form:
      { "productIds": [..], "discount": 15, "support": 0.12, "confidence": 0.8, "lift": 1.3 }
    """
    mongo_uri = MONGODB_URI if MONGODB_URI else MONGODB_LOCAL_URI
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10_000, maxPoolSize=10)
    transactions_col, products_col, _ = _get_collections(client)

    docs = list(transactions_col.find({}, {"productIds": 1}))
    if not docs:
        client.close()
        return []

    baskets: List[List[str]] = []
    for d in docs:
        pids = d.get("productIds") or []
        pids_str = sorted({str(pid) for pid in pids})
        if len(pids_str) >= 2:
            baskets.append(pids_str)

    if not baskets:
        client.close()
        return []

    # Build one-hot encoded DataFrame for mlxtend.
    all_items = sorted({pid for basket in baskets for pid in basket})
    data = []
    for basket in baskets:
        row = {pid: False for pid in all_items}
        for pid in basket:
            row[pid] = True
        data.append(row)

    df = pd.DataFrame(data)
    freq_itemsets = mlxtend_apriori(df, min_support=min_support, use_colnames=True)
    if freq_itemsets.empty:
        client.close()
        return []

    rules = association_rules(freq_itemsets, metric="lift", min_threshold=min_lift)
    if rules.empty:
        client.close()
        return []

    # Build simple combo objects from rules (antecedent + consequent).
    combos: List[Dict[str, Any]] = []
    for _, row in rules.iterrows():
        antecedent = list(row["antecedents"])
        consequent = list(row["consequents"])
        all_items_combo = sorted(set(antecedent + consequent))
        if len(all_items_combo) < 2:
            continue

        support = float(row["support"])
        confidence = float(row["confidence"])
        lift = float(row["lift"])

        # Simple discount heuristic: 10–25% based on lift.
        base_discount = 10.0 + (lift - 1.0) * 5.0
        discount = max(10.0, min(25.0, base_discount))

        combos.append(
            {
                "productIds": all_items_combo,
                "discount": round(discount),
                "support": support,
                "confidence": confidence,
                "lift": lift,
            }
        )

    client.close()

    # Sort by lift * support (strong + popular)
    combos.sort(key=lambda c: c["lift"] * c["support"], reverse=True)
    return combos


def _recommend_for_pivots(pivots: List[str], exclude: set) -> Tuple[List[str], List[str]]:
    """
    Returns:
      - nb_recs: top 5 productIds from Naive Bayes
      - co_recs: top 5 productIds from co-occurrence counts
    """

    # Co-occurrence recommendations (simple, fast).
    co_scores = Counter()
    for pivot in pivots:
        co_scores.update(_co_counts.get(pivot, Counter()))
    co_recs = [pid for pid, _ in co_scores.most_common(20) if pid not in exclude][:5]

    if not MODEL_READY or _model is None:
        return co_recs, co_recs

    num_features = len(_idx_to_product_id)
    scores = np.zeros((len(_idx_to_product_id),), dtype=np.float64)

    for pivot in pivots:
        pivot_idx = _product_id_to_idx.get(pivot)
        if pivot_idx is None:
            continue
        x = np.zeros((1, num_features), dtype=np.float32)
        x[0, pivot_idx] = 1.0
        proba = _model.predict_proba(x)[0]  # distribution over products
        scores += proba

    ranked = np.argsort(-scores)
    nb_recs = []
    for idx in ranked:
        pid = _idx_to_product_id[int(idx)]
        if pid in exclude:
            continue
        nb_recs.append(pid)
        if len(nb_recs) >= 5:
            break

    if not nb_recs:
        nb_recs = co_recs

    return nb_recs, co_recs



@app.get("/health")
def health():
    return {"ok": True, "service": "ml-service"}


@app.post("/retrain")
def retrain(payload: dict):
    """
    Best-effort cache reset so Naive Bayes/Apriori can reflect new transactions.
    """
    global MODEL_READY, _model, _product_id_to_idx, _idx_to_product_id, _co_counts
    MODEL_READY = False
    _model = None
    _product_id_to_idx = {}
    _idx_to_product_id = []
    _co_counts = {}
    return {"ok": True}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    _ensure_model_ready()

    pivot_product = str(req.productId)
    pivots: List[str] = [pivot_product]
    exclude = {pivot_product}

    # Optional personalization: use user's past transactions as additional pivots.
    if req.userId:
        try:
            mongo_uri = MONGODB_URI if MONGODB_URI else MONGODB_LOCAL_URI
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10_000, maxPoolSize=10)
            transactions_col, _, users_col = _get_collections(client)

            # Collect productIds from the user's transactions.
            user_id = req.userId
            # Mongoose stores ObjectId; incoming JWT subject should be an ObjectId string.
            try:
                user_oid = ObjectId(user_id)
            except Exception:
                user_oid = None

            if user_oid is None:
                user_transactions = []
            else:
                user_transactions = transactions_col.find({"userId": user_oid}, {"productIds": 1})
            purchased = set()
            for doc in user_transactions:
                for pid in doc.get("productIds") or []:
                    purchased.add(str(pid))
            client.close()

            purchased.discard(pivot_product)
            if purchased:
                pivots = [pivot_product] + list(purchased)[:10]
                exclude = {pivot_product}
        except Exception:
            # If personalization fails, fall back to pivot-only.
            pivots = [pivot_product]
            exclude = {pivot_product}

    nb_recs, co_recs = _recommend_for_pivots(pivots=pivots, exclude=exclude)
    return {
        "productIds": nb_recs,
        "customersAlsoBought": co_recs,
        "similarToThis": nb_recs,
    }


@app.post("/apriori")
def apriori(payload: dict):
    """
    Compute Market Basket Analysis combos.
    Optional payload:
      { "minSupport": 0.03, "minLift": 1.1, "limit": 20 }
    """
    min_support = float(payload.get("minSupport", 0.03))
    min_lift = float(payload.get("minLift", 1.1))
    limit = int(payload.get("limit", 20))

    combos = _compute_apriori(min_support=min_support, min_lift=min_lift)
    top = combos[:limit]

    return {"combos": top}


@app.post("/predict-sales")
def predict_sales(payload: dict):
    """
    Monthly sales prediction (demo-grade).
    Uses Linear Regression on mock transaction history:
      - monthly totals for all sellers (trend)
      - monthly totals per seller (top predicted sellers)
      - monthly totals per product (product predictions)

    Payload (optional):
      { "months": 6, "topSellersLimit": 5 }
    """
    months = int(payload.get("months", 6))
    top_sellers_limit = int(payload.get("topSellersLimit", 5))

    mongo_uri = MONGODB_URI if MONGODB_URI else MONGODB_LOCAL_URI
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10_000, maxPoolSize=10)
    transactions_col, products_col, users_col = _get_collections(client)

    # Load products for seller mapping + inventory.
    products = list(products_col.find({}, {"sellerId": 1, "inventory": 1}))
    product_seller: Dict[str, str] = {}
    product_inventory: Dict[str, float] = {}
    for p in products:
        product_seller[str(p["_id"])] = str(p.get("sellerId"))
        product_inventory[str(p["_id"])] = float(p.get("inventory") or 0.0)

    # Fetch transactions with timestamps + productIds.
    tx_docs = list(transactions_col.find({}, {"productIds": 1, "timestamp": 1}))
    if not tx_docs:
        client.close()
        return {
            "forecastMonth": None,
            "trend": {"labels": [], "historic": [], "predictedNext": 0},
            "topPredictedSellers": [],
            "productPredictions": [],
        }

    def month_key(dt: datetime) -> str:
        return f"{dt.year:04d}-{dt.month:02d}"

    def month_start(dt: datetime) -> datetime:
        return datetime(dt.year, dt.month, 1)

    # Group counts by month.
    month_set = set()
    month_to_product_counts: Dict[str, Counter] = defaultdict(Counter)
    month_to_seller_counts: Dict[str, Counter] = defaultdict(Counter)

    for d in tx_docs:
        ts = d.get("timestamp") or d.get("createdAt") or None
        if ts is None:
            continue
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts)
            except Exception:
                continue
        if not isinstance(ts, datetime):
            # Mongo may return datetime already; ignore other types.
            try:
                ts = datetime.fromtimestamp(ts)
            except Exception:
                continue

        m_key = month_key(ts)
        month_set.add(m_key)
        pids = d.get("productIds") or []

        # One sale per productId occurrence in a transaction basket.
        for pid in pids:
            pid_str = str(pid)
            if pid_str not in product_seller:
                # Product might have been deleted; skip.
                continue
            month_to_product_counts[m_key][pid_str] += 1
            seller_id = product_seller[pid_str]
            month_to_seller_counts[m_key][seller_id] += 1

    months_sorted = sorted(list(month_set))
    # Keep last N months.
    if months_sorted:
        months_sorted = months_sorted[-months:] if len(months_sorted) > months else months_sorted

    if len(months_sorted) < 2:
        # Not enough history for regression.
        last_month = months_sorted[-1] if months_sorted else None
        forecast_month = None
        if last_month:
            y, m = [int(x) for x in last_month.split("-")]
            next_m = m + 1
            next_y = y
            if next_m == 13:
                next_m = 1
                next_y += 1
            forecast_month = f"{next_y:04d}-{next_m:02d}"

        # Total historic sales in last month.
        total_last = sum(month_to_seller_counts[last_month].values()) if last_month else 0
        client.close()
        return {
            "forecastMonth": forecast_month,
            "trend": {"labels": months_sorted, "historic": [total_last] if last_month else [], "predictedNext": float(total_last)},
            "topPredictedSellers": [],
            "productPredictions": [],
        }

    def linear_predict(series: List[float]) -> float:
        # Predict next value at index len(series).
        X = np.arange(len(series)).reshape(-1, 1)
        y = np.array(series, dtype=np.float64)
        if len(series) < 2:
            return float(series[-1])
        model = LinearRegression()
        model.fit(X, y)
        x_next = np.array([[len(series)]], dtype=np.float64)
        pred = float(model.predict(x_next)[0])
        if pred < 0:
            pred = 0.0
        return pred

    # Trend (all sellers)
    trend_historic = []
    for m in months_sorted:
        trend_historic.append(float(sum(month_to_seller_counts[m].values())))

    trend_pred = linear_predict(trend_historic)

    # Forecast month label
    last_month = months_sorted[-1]
    y, m = [int(x) for x in last_month.split("-")]
    next_m = m + 1
    next_y = y
    if next_m == 13:
        next_m = 1
        next_y += 1
    forecast_month = f"{next_y:04d}-{next_m:02d}"

    # Top predicted sellers
    seller_ids = list({sid for m in months_sorted for sid in month_to_seller_counts[m].keys()})
    seller_predictions = []
    for sid in seller_ids:
        series = [float(month_to_seller_counts[m].get(sid, 0)) for m in months_sorted]
        pred = linear_predict(series)
        seller_predictions.append({"sellerId": sid, "predictedSales": pred})

    seller_predictions.sort(key=lambda x: x["predictedSales"], reverse=True)
    top_sellers = seller_predictions[:top_sellers_limit]

    # Product predictions (next month)
    product_ids = list({pid for m in months_sorted for pid in month_to_product_counts[m].keys()})
    product_predictions = []
    for pid in product_ids:
        series = [float(month_to_product_counts[m].get(pid, 0)) for m in months_sorted]
        pred = linear_predict(series)
        inv = float(product_inventory.get(pid, 0.0))
        low_stock = pred > inv
        product_predictions.append(
            {
                "productId": pid,
                "predictedSales": pred,
                "currentInventory": inv,
                "lowStock": bool(low_stock),
            }
        )

    client.close()
    return {
        "forecastMonth": forecast_month,
        "trend": {"labels": months_sorted, "historic": trend_historic, "predictedNext": trend_pred},
        "topPredictedSellers": top_sellers,
        "productPredictions": product_predictions,
    }


@app.post("/detect-fake-review")
def detect_fake_review(payload: dict):
    """
    Fake review detection.
    Payload:
      { userId: string, productId: string, text: string, rating: number }
    Returns:
      { isFlagged: bool, confidence: float, reasons: [string] }
    """
    try:
        return _detect_fake_review(payload or {})
    except Exception:
        # Safety: never crash the service because a detector failed.
        return {"isFlagged": False, "confidence": 0.2, "reasons": ["Detector error"]}


@app.post("/skin-tone")
def skin_tone(payload: dict):
    """
    Estimate skin tone bucket from an average RGB sample.
    Expected payload: { "rgb": [r, g, b] }
    In a full build, MediaPipe FaceMesh would provide a masked face region;
    for this demo we assume the frontend sends an already-averaged RGB tuple.
    """
    rgb = payload.get("rgb") or []
    if not isinstance(rgb, (list, tuple)) or len(rgb) != 3:
        # Default neutral tone.
        return {"skinTone": "Medium Brown", "confidence": 0.4}

    r, g, b = [float(x) for x in rgb]
    # Convert to simple lightness measure.
    lightness = (max(r, g, b) + min(r, g, b)) / 2.0 / 255.0

    if lightness >= 0.75:
        tone = "Fair"
    elif lightness >= 0.55:
        tone = "Wheatish"
    elif lightness >= 0.35:
        tone = "Medium Brown"
    else:
        tone = "Dark Brown"

    confidence = 0.6 + abs(lightness - 0.5) * 0.4
    return {"skinTone": tone, "confidence": float(round(confidence, 2))}


@app.post("/outfit-suggest")
def outfit_suggest(payload: dict):
    """
    Occasion-based outfit suggestion.
    Payload:
      { "occasion": "Casual" | "Formal" | "Wedding" | "Party" | "Sports" | "Festive", "notes"?: string }

    Returns:
      { "occasion": str, "categories": ["shirts","pants","shoes","caps","bracelets"], "message": str }

    The backend will map categories to actual products in MongoDB.
    """
    occasion = str(payload.get("occasion") or "Casual")
    notes = str(payload.get("notes") or "").strip()

    system_prompt = (
        "You are ShopSmart's stylist assistant. Suggest a complete outfit from these store categories only: "
        "shirts, pants, shoes, caps, bracelets. Return ONLY JSON with keys: categories (array of categories), "
        "message (short 1-2 sentence suggestion). Do not mention anything outside shopping."
    )

    # Deterministic fallback (works without external API).
    fallback = {
        "Casual": (["shirts", "pants", "shoes", "caps"], "Casual fit: a relaxed shirt with comfy pants and clean sneakers, finished with a cap."),
        "Formal": (["shirts", "pants", "shoes", "bracelets"], "Formal look: a crisp shirt with tailored pants and polished shoes; add a subtle bracelet."),
        "Wedding": (["shirts", "pants", "shoes", "bracelets"], "Wedding-ready: a premium shirt with dress pants and statement shoes; elevate with a bracelet."),
        "Party": (["shirts", "pants", "shoes", "bracelets"], "Party look: a bold shirt with sleek pants and standout shoes; add a metallic bracelet."),
        "Sports": (["shirts", "pants", "shoes", "caps"], "Sporty vibe: breathable top, flexible pants, running shoes, and a cap for the finish."),
        "Festive": (["shirts", "pants", "shoes", "bracelets"], "Festive style: a rich-toned shirt with sharp pants and clean shoes; accent with a bracelet."),
    }
    categories, msg = fallback.get(occasion, fallback["Casual"])

    claude_key = os.getenv("CLAUDE_API_KEY", "")
    if not claude_key:
        return {"occasion": occasion, "categories": categories, "message": msg}

    # Claude (Anthropic Messages API) - best-effort; fallback on any error.
    try:
        user_prompt = f"Occasion: {occasion}. Notes: {notes}" if notes else f"Occasion: {occasion}."
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": claude_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 256,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            },
            timeout=20,
        )
        if resp.status_code >= 400:
            return {"occasion": occasion, "categories": categories, "message": msg}

        data = resp.json()
        # Anthropic returns content blocks; we expect a single JSON-ish text.
        content_blocks = data.get("content") or []
        text = ""
        for b in content_blocks:
            if b.get("type") == "text":
                text += b.get("text", "")

        # Parse JSON safely-ish: if parsing fails, fallback.
        import json as _json

        parsed = _json.loads(text)
        out_categories = parsed.get("categories") or categories
        out_message = parsed.get("message") or msg

        # Validate categories are within allowed set.
        allowed = {"shirts", "pants", "shoes", "caps", "bracelets"}
        out_categories = [c for c in out_categories if c in allowed]
        if not out_categories:
            out_categories = categories

        return {"occasion": occasion, "categories": out_categories, "message": out_message}
    except Exception:
        return {"occasion": occasion, "categories": categories, "message": msg}

