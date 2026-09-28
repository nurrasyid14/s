"""Persistence helpers for trusted local scikit-learn artifacts."""

from pathlib import Path
from typing import Any

import joblib


def save_artifact(artifact: Any, path: str | Path, *, compress: int = 3) -> Path:
	"""Save an artifact with joblib, creating its parent directory if needed."""
	artifact_path = Path(path)
	artifact_path.parent.mkdir(parents=True, exist_ok=True)
	joblib.dump(artifact, artifact_path, compress=compress)
	return artifact_path


def load_artifact(path: str | Path) -> Any:
	"""Load a joblib artifact. Only load files from trusted sources."""
	return joblib.load(Path(path))
