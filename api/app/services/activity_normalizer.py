import json
import logging
from typing import Dict, List, Set

from app.schemas.ai import ExtractedActivity, ExtractedDocument

logger = logging.getLogger(__name__)

# Allowed canonical activity types based on backend emission factors
CANONICAL_ACTIVITIES: Set[str] = {
    "electricity_grid",
    "coal_indian_bituminous",
    "coal_indian_lignite",
    "diesel_hsd",
    "lpg_commercial",
    "natural_gas_indian_grid",
    "hfo_furnace_oil",
    "biomass_bagasse",
    "biomass_rice_husk",
    "road_freight_medium_truck",
    "road_freight_heavy_truck",
    "rail_freight_in",
    "sea_freight_container",
    "refrigerant_r22_gwp100",
    "refrigerant_r134a_gwp100",
    "refrigerant_r410a_gwp100",
    "water_treatment_electric_pump",
    "process_cement_clinker",
    "purchased_steel_scrap",
    "purchased_aluminium_india_avg",
    "purchased_cotton_yarn",
}

# Fuzzy mapping for common terms the LLM might output if not perfectly adhering to schema
TERM_MAPPING: Dict[str, str] = {
    "electricity": "electricity_grid",
    "power": "electricity_grid",
    "grid": "electricity_grid",
    "diesel": "diesel_hsd",
    "hsd": "diesel_hsd",
    "petrol": "diesel_hsd",  # approximate mapping for SME transport if needed
    "coal": "coal_indian_bituminous",
    "lpg": "lpg_commercial",
    "gas": "natural_gas_indian_grid",
    "natural gas": "natural_gas_indian_grid",
    "png": "natural_gas_indian_grid",
    "hfo": "hfo_furnace_oil",
    "furnace oil": "hfo_furnace_oil",
    "bagasse": "biomass_bagasse",
    "rice husk": "biomass_rice_husk",
    "water": "water_treatment_electric_pump",
    "water treatment": "water_treatment_electric_pump",
}

def normalize_activity_type(raw_type: str) -> str:
    """Attempt to normalize a raw activity type string to a canonical one."""
    normalized = raw_type.lower().strip()
    if normalized in CANONICAL_ACTIVITIES:
        return normalized
    
    # Try fuzzy mapping
    if normalized in TERM_MAPPING:
        return TERM_MAPPING[normalized]
    
    # Fallback: find best partial match
    for canonical in CANONICAL_ACTIVITIES:
        if normalized in canonical.replace("_", " "):
            return canonical
            
    return raw_type


def normalize_and_validate_document(doc: ExtractedDocument) -> ExtractedDocument:
    """
    Validates and normalizes the extracted document.
    Drops any activities that cannot be mapped to a canonical field.
    """
    valid_activities: List[ExtractedActivity] = []
    
    for activity in doc.activities:
        normalized_field = normalize_activity_type(activity.canonical_field)
        
        if normalized_field not in CANONICAL_ACTIVITIES:
            logger.warning(f"Dropping unknown extracted activity: {activity.canonical_field} (normalized to {normalized_field})")
            continue
            
        activity.canonical_field = normalized_field
        valid_activities.append(activity)
        
    doc.activities = valid_activities
    return doc
