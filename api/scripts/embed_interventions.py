import json
import sys
from pathlib import Path

# Add api directory to path to allow importing app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.llm.embedding import embed_document
from app.models.intervention_embedding import InterventionEmbedding


def embed_interventions():
    db = SessionLocal()

    # Path to library
    library_path = Path(__file__).resolve().parent.parent / "app" / "data" / "intervention_library.json"

    with open(library_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        interventions = data.get("interventions", [])

    print(f"Loaded {len(interventions)} interventions from library.")

    # Clear existing embeddings to prevent duplicates on rerun
    db.query(InterventionEmbedding).delete()
    db.commit()
    print("Cleared existing embeddings.")

    success = 0
    errors = 0
    for item in interventions:
        intervention_id = item["id"]
        sectors = item.get("applicable_sectors", ["unknown"])
        processes = item.get("applicable_processes", ["unknown"])

        # Build a rich semantic text for embedding
        text_to_embed = (
            f"Title: {item['name']}\n"
            f"Description: {item['description']}\n"
            f"Sectors: {', '.join(sectors)}\n"
            f"Processes: {', '.join(processes)}\n"
            f"Circular Strategy: {item.get('circular_type', '')}"
        )

        print(f"  Embedding {intervention_id}...", end=" ", flush=True)
        try:
            embedding_vector = embed_document(text_to_embed, title=item["name"])

            emb_record = InterventionEmbedding(
                intervention_id=intervention_id,
                sector_id=sectors[0] if sectors else "unknown",
                applicable_process=processes[0] if processes else "unknown",
                vector=embedding_vector,
            )
            db.add(emb_record)
            success += 1
            print("OK")
        except Exception as e:
            errors += 1
            print(f"ERROR — {e}")

    db.commit()
    db.close()
    print(f"\nDone. {success} embedded successfully, {errors} failed.")


if __name__ == "__main__":
    embed_interventions()
