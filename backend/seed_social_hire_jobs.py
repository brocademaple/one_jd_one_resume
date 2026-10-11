"""
Idempotent seed: insert social-hire JD batch from data/seed_jobs_social_hire.json.

Run from repo root or backend directory:
  cd backend && python seed_social_hire_jobs.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BACKEND_DIR = Path(__file__).resolve().parent
SEED_FILE = BACKEND_DIR / "data" / "seed_jobs_social_hire.json"

# SQLite URL is relative to cwd; keep DB path stable regardless of invocation cwd.
os.chdir(BACKEND_DIR)

from database import SessionLocal, engine, Base  # noqa: E402
import models  # noqa: E402

Base.metadata.create_all(bind=engine)

JOB_FIELDS = (
    "title",
    "company",
    "job_url",
    "salary",
    "competency_profile",
    "content",
    "status",
)


def _norm(s: Optional[str]) -> str:
    return (s or "").strip()


def _duplicate_key(title: str, company: Optional[str]) -> Tuple[str, str]:
    return (_norm(title), _norm(company))


def _load_seed_rows() -> List[Dict[str, Any]]:
    raw = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise SystemExit(f"Expected a JSON array in {SEED_FILE}")
    return raw


def _existing_index(db) -> Tuple[set[str], set[Tuple[str, str]]]:
    urls: set[str] = set()
    title_company: set[Tuple[str, str]] = set()
    for row in db.query(models.Job).all():
        url = _norm(row.job_url)
        if url:
            urls.add(url)
        title_company.add(_duplicate_key(row.title or "", row.company))
    return urls, title_company


def _is_duplicate(
    item: Dict[str, Any],
    urls: set[str],
    title_company: set[Tuple[str, str]],
) -> bool:
    url = _norm(item.get("job_url"))
    if url and url in urls:
        return True
    key = _duplicate_key(str(item.get("title") or ""), item.get("company"))
    if key[0] and key in title_company:
        return True
    return False


def seed(dry_run: bool = False) -> Dict[str, int]:
    rows = _load_seed_rows()
    db = SessionLocal()
    inserted = 0
    skipped = 0
    try:
        urls, title_company = _existing_index(db)
        for item in rows:
            if not isinstance(item, dict):
                skipped += 1
                continue
            if _is_duplicate(item, urls, title_company):
                skipped += 1
                continue
            payload = {k: item.get(k) for k in JOB_FIELDS}
            if not payload.get("title") or not payload.get("content"):
                skipped += 1
                continue
            if dry_run:
                inserted += 1
                continue
            job = models.Job(**payload)
            db.add(job)
            db.flush()
            url = _norm(payload.get("job_url"))
            if url:
                urls.add(url)
            title_company.add(_duplicate_key(payload["title"], payload.get("company")))
            inserted += 1
        if not dry_run:
            db.commit()
    finally:
        db.close()
    return {"inserted": inserted, "skipped": skipped, "total_in_file": len(rows)}


def main(argv: List[str]) -> None:
    dry_run = "--dry-run" in argv
    if not SEED_FILE.is_file():
        print(f"Seed file not found: {SEED_FILE}", file=sys.stderr)
        raise SystemExit(1)
    stats = seed(dry_run=dry_run)
    mode = " (dry-run)" if dry_run else ""
    print(
        f"Social-hire seed{mode}: inserted={stats['inserted']}, "
        f"skipped={stats['skipped']}, total_in_file={stats['total_in_file']}"
    )


if __name__ == "__main__":
    main(sys.argv[1:])
