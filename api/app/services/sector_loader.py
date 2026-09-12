import json
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SECTOR_TEMPLATES_DIR = DATA_DIR / "sector_templates"


class SectorTemplateService:
    def __init__(self, templates_dir: Path = SECTOR_TEMPLATES_DIR):
        if not templates_dir.exists():
            raise FileNotFoundError(f"Sector templates directory not found at: {templates_dir}")

        self.templates: dict[str, dict[str, Any]] = {}
        for file_path in templates_dir.glob("*.json"):
            with open(file_path, "r", encoding="utf-8") as f:
                template = json.load(f)
                s_id = template.get("sector_id")
                if s_id:
                    self.templates[s_id] = template

    def list_sectors(self) -> list[dict[str, Any]]:
        """Return high-level summary of supported sectors for selection."""
        result = []
        for s_id, t in self.templates.items():
            result.append({
                "sector_id": s_id,
                "display_name": t.get("display_name", s_id),
                "description": t.get("description", ""),
                "typical_scale": t.get("typical_scale", {}),
                "unit_processes_count": len(t.get("unit_processes", [])),
                "activities_count": len(t.get("activities_expected", [])),
            })
        return result

    def get_sector_template(self, sector_id: str) -> dict[str, Any] | None:
        return self.templates.get(sector_id)

    def get_input_schema(self, sector_id: str) -> dict[str, Any]:
        template = self.get_sector_template(sector_id)
        if not template:
            raise KeyError(f"Sector '{sector_id}' not found.")

        return {
            "sector_id": sector_id,
            "display_name": template.get("display_name"),
            "description": template.get("description"),
            "unit_processes": [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "typical_thermal_share_pct": p.get("typical_thermal_share_pct", 0),
                    "typical_electric_share_pct": p.get("typical_electric_share_pct", 0),
                    "typical_water_share_pct": p.get("typical_water_share_pct", 0),
                    "notes": p.get("notes", ""),
                }
                for p in template.get("unit_processes", [])
            ],
            "activities_expected": [
                {
                    "activity_type": a["activity_type"],
                    "unit": a["unit"],
                    "period": a.get("period", "monthly"),
                    "description": a.get("description", ""),
                }
                for a in template.get("activities_expected", [])
            ],
            "typical_hotspots": template.get("typical_hotspots_by_frequency", []),
            "applicable_regulations": template.get("applicable_regulations", []),
            "sources": template.get("sources", []),
        }


@lru_cache
def get_sector_service() -> SectorTemplateService:
    return SectorTemplateService()
