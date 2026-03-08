"""Utilities for cosine distance and embedding averaging."""
from typing import List

import numpy as np
from scipy.spatial.distance import cosine


def compute_cosine_distance(embedding1: List[float], embedding2: List[float]) -> float:
    """Cosine distance between two embeddings: 0.0 = identical, 2.0 = opposite."""
    a = np.array(embedding1, dtype=np.float64)
    b = np.array(embedding2, dtype=np.float64)
    return float(cosine(a, b))


def average_embeddings(embeddings: List[List[float]]) -> List[float]:
    """Element-wise mean across a list of embedding vectors."""
    arr = np.array(embeddings, dtype=np.float64)
    return np.mean(arr, axis=0).tolist()
    best_id = None
    best_score = 0.0

    for candidate in candidates:
        score = cosine_similarity(query_embedding, candidate["embedding"])
        if score > best_score:
            best_score = score
            best_id = candidate["driver_id"]

    if best_score >= threshold:
        return best_id, best_score
    return None, best_score
