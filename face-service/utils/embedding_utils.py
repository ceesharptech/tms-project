"""Utilities for cosine similarity and embedding comparisons."""
import numpy as np


def cosine_similarity(a: list, b: list) -> float:
    """Compute cosine similarity between two embedding vectors."""
    a_arr = np.array(a, dtype=np.float32)
    b_arr = np.array(b, dtype=np.float32)
    dot = np.dot(a_arr, b_arr)
    norm = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
    if norm == 0:
        return 0.0
    return float(dot / norm)


def find_best_match(query_embedding: list, candidates: list, threshold: float = 0.4):
    """
    Find the best matching candidate from a list of {driver_id, embedding} dicts.
    Returns (driver_id, similarity_score) or (None, 0) if no match exceeds threshold.
    """
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
