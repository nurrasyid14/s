"""K-Means helpers for clustering precomputed text embeddings."""

from __future__ import annotations

from collections.abc import Iterable

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def _as_embeddings(embeddings: object) -> np.ndarray:
	"""Validate a dense embedding matrix before passing it to scikit-learn."""
	values = np.asarray(embeddings)
	if values.ndim != 2 or values.shape[0] < 2 or values.shape[1] < 1:
		raise ValueError("embeddings must be a 2D array with at least two rows and one feature")
	if not np.isfinite(values).all():
		raise ValueError("embeddings must contain only finite values")
	return values


def evaluate_kmeans(
	embeddings: object,
	k_values: Iterable[int] = range(4, 16),
	*,
	sample_size: int = 500,
	random_state: int = 42,
	n_init: int = 10,
	max_iter: int = 200,
) -> dict[str, object]:
	"""Compare candidate cluster counts using inertia and silhouette score.

	Returns one result per K and the K with the highest silhouette score.
	"""
	values = _as_embeddings(embeddings)
	candidates = list(k_values)
	if not candidates:
		raise ValueError("k_values must contain at least one cluster count")
	if any(not isinstance(k, (int, np.integer)) or k < 2 or k >= len(values) for k in candidates):
		raise ValueError("every cluster count must be an integer between 2 and n_samples - 1")
	if sample_size < 2:
		raise ValueError("sample_size must be at least 2")

	results = []
	for k in candidates:
		model = KMeans(
			n_clusters=int(k),
			random_state=random_state,
			n_init=n_init,
			max_iter=max_iter,
		)
		labels = model.fit_predict(values)
		score = silhouette_score(
			values,
			labels,
			sample_size=min(sample_size, len(values)),
			random_state=random_state,
		)
		results.append(
			{
				"n_clusters": int(k),
				"inertia": float(model.inertia_),
				"silhouette": float(score),
			}
		)

	best = max(results, key=lambda result: result["silhouette"])
	return {"results": results, "best_k": best["n_clusters"]}


def fit_kmeans(
	embeddings: object,
	n_clusters: int,
	*,
	random_state: int = 42,
	n_init: int = 10,
	max_iter: int = 300,
) -> tuple[KMeans, np.ndarray]:
	"""Fit K-Means to embeddings and return the model and assigned labels."""
	values = _as_embeddings(embeddings)
	if not isinstance(n_clusters, (int, np.integer)) or not 2 <= n_clusters < len(values):
		raise ValueError("n_clusters must be an integer between 2 and n_samples - 1")

	model = KMeans(
		n_clusters=int(n_clusters),
		random_state=random_state,
		n_init=n_init,
		max_iter=max_iter,
	)
	labels = model.fit_predict(values)
	return model, labels
