import io
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import BaselineResult, Hotspot, Recommendation, Report, Run
from app.services.ef_loader import get_ef_db
from app.services.macc import calculate_macc_for_run

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "data" / "report_templates"
_jinja_env: Environment | None = None


def get_jinja_env() -> Environment:
    global _jinja_env
    if _jinja_env is None:
        _jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=True,
        )
    return _jinja_env


def _render_with_weasyprint(html_content: str) -> bytes | None:
    """Attempt to render HTML to PDF using WeasyPrint (requires native pango/cairo).

    Any exception here (including NameError from broken native bindings on
    Windows) triggers the ReportLab fallback rather than 500-ing the request.
    """
    try:
        import weasyprint

        return weasyprint.HTML(string=html_content).write_pdf()
    except (ImportError, OSError, RuntimeError, NameError, AttributeError, ValueError) as exc:
        logger.info(
            f"WeasyPrint unavailable ({type(exc).__name__}: {exc}); using ReportLab fallback."
        )
        return None


def _render_with_reportlab(context: dict[str, Any]) -> bytes:
    """Fallback pure-Python PDF generator for environments without GTK/Pango libraries."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.platypus import (
        HRFlowable,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1F3A5F"),
    )
    h2_style = ParagraphStyle(
        "ReportH2",
        parent=styles["Heading2"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1F3A5F"),
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1F2937"),
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=body_style,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#6B7280"),
    )

    elements = []

    # Title & Header
    org_name = context["org"]["name"]
    elements.append(Paragraph(f"BRSR Core Supplier Disclosure — {org_name}", title_style))
    elements.append(
        Paragraph(
            "Prepared under SEBI BRSR Core framework for value-chain reporting. "
            "Covering Principle 6 (environment) KPIs aligned with GHG Protocol Corporate Standard.",
            subtitle_style,
        )
    )
    elements.append(Spacer(1, 10))

    # 1. Reporting Entity
    elements.append(Paragraph("1. Reporting Entity", h2_style))
    org_data = [
        [Paragraph("<b>Legal Name</b>", body_style), Paragraph(context["org"]["name"], body_style)],
        [Paragraph("<b>Sector</b>", body_style), Paragraph(context["org"]["sector_display_name"], body_style)],
        [Paragraph("<b>Turnover (INR Cr)</b>", body_style), Paragraph(str(context["org"]["turnover_cr"]), body_style)],
        [Paragraph("<b>Reporting Period</b>", body_style), Paragraph(f"{context['run']['period_start']} to {context['run']['period_end']}", body_style)],
        [Paragraph("<b>Generated At</b>", body_style), Paragraph(context["generated_at"], body_style)],
        [Paragraph("<b>EF Version</b>", body_style), Paragraph(context["run"]["ef_version"], body_style)],
    ]
    t_org = Table(org_data, colWidths=[150, 370])
    t_org.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    elements.append(t_org)
    elements.append(Spacer(1, 10))

    # 2. GHG Summary
    elements.append(Paragraph("2. Greenhouse Gas Emissions Summary", h2_style))
    totals = context["totals"]
    total_all = totals["scope1"] + totals["scope2"] + totals["scope3_partial"]
    summary_data = [
        [
            Paragraph("<b>Scope 1 (Direct)</b>", body_style),
            Paragraph(f"{totals['scope1']:.2f} tCO2e", body_style),
        ],
        [
            Paragraph("<b>Scope 2 (Grid Electricity)</b>", body_style),
            Paragraph(f"{totals['scope2']:.2f} tCO2e", body_style),
        ],
        [
            Paragraph("<b>Scope 3 (Partial)</b>", body_style),
            Paragraph(f"{totals['scope3_partial']:.2f} tCO2e", body_style),
        ],
        [
            Paragraph("<b>Total Emissions</b>", body_style),
            Paragraph(f"<b>{total_all:.2f} tCO2e</b>", body_style),
        ],
    ]
    t_sum = Table(summary_data, colWidths=[200, 320])
    t_sum.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3F4F6")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    elements.append(t_sum)
    elements.append(Spacer(1, 10))

    # 3. Hotspots
    elements.append(Paragraph("3. Top Emission Hotspots (Pareto Ranked)", h2_style))
    hotspots = context["hotspots"]
    hotspot_rows = [
        [
            Paragraph("<b>Rank</b>", body_style),
            Paragraph("<b>Unit Process</b>", body_style),
            Paragraph("<b>tCO2e</b>", body_style),
            Paragraph("<b>Share</b>", body_style),
        ]
    ]
    for h in hotspots:
        hotspot_rows.append([
            Paragraph(f"#{h['rank']}", body_style),
            Paragraph(h["unit_process_name"], body_style),
            Paragraph(f"{h['tCO2e']:.2f}", body_style),
            Paragraph(f"{h['share_pct']:.1f}%", body_style),
        ])
    t_hot = Table(hotspot_rows, colWidths=[50, 250, 110, 110])
    t_hot.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F3A5F")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    elements.append(t_hot)
    elements.append(Spacer(1, 10))

    # 4. Circular Recommendations & MACC
    elements.append(Paragraph("4. Recommended Circular Interventions (MACC Abatement)", h2_style))
    recs = context["recommendations"]
    rec_rows = [
        [
            Paragraph("<b>Rank</b>", body_style),
            Paragraph("<b>Intervention</b>", body_style),
            Paragraph("<b>CapEx (₹ Lakh)</b>", body_style),
            Paragraph("<b>Annual Saving (tCO2e)</b>", body_style),
            Paragraph("<b>Cost/tCO2e (₹)</b>", body_style),
            Paragraph("<b>Payback (yr)</b>", body_style),
        ]
    ]
    for idx, r in enumerate(recs, start=1):
        rec_rows.append([
            Paragraph(f"#{idx}", body_style),
            Paragraph(f"<b>{r['name']}</b><br/><font color='#6B7280'>{r.get('rationale','')[:70]}...</font>", body_style),
            Paragraph(f"{r['cost_capex_lakh']:.1f}", body_style),
            Paragraph(f"{r['tCO2e_reduced_annual']:.2f}", body_style),
            Paragraph(f"{r['cost_per_tco2e']:.0f}", body_style),
            Paragraph(f"{r['payback_years']:.1f}", body_style),
        ])
    t_rec = Table(rec_rows, colWidths=[40, 180, 75, 75, 75, 75])
    t_rec.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F3A5F")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    elements.append(t_rec)
    elements.append(Spacer(1, 10))

    # 5. Appendix A: Audit Trail
    elements.append(Paragraph("Appendix A. Emission Audit Trail", h2_style))
    audit_rows = [
        [
            Paragraph("<b>Process</b>", body_style),
            Paragraph("<b>Activity</b>", body_style),
            Paragraph("<b>Quantity</b>", body_style),
            Paragraph("<b>Factor Value</b>", body_style),
            Paragraph("<b>tCO2e</b>", body_style),
            Paragraph("<b>Source</b>", body_style),
        ]
    ]
    for a in context["audit_trail"][:8]:  # Top lines in table
        audit_rows.append([
            Paragraph(a["unit_process"], body_style),
            Paragraph(a["activity_type"], body_style),
            Paragraph(f"{a['quantity']} {a['unit']}", body_style),
            Paragraph(f"{a['ef_value']} {a['ef_unit']}", body_style),
            Paragraph(f"{a['tCO2e']:.3f}", body_style),
            Paragraph(a["ef_source"][:35], body_style),
        ])
    t_audit = Table(audit_rows, colWidths=[80, 80, 80, 100, 60, 120])
    t_audit.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2E5C8A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ])
    )
    elements.append(t_audit)
    elements.append(Spacer(1, 10))

    # Footer note
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#D1D5DB")))
    elements.append(
        Paragraph(
            f"Generated by CarbonIQ for {context['org']['name']} on {context['generated_at']}. "
            "Framework: SEBI BRSR Core / GHG Protocol Corporate Standard. Deterministic reference data audit trail.",
            subtitle_style,
        )
    )

    doc.build(elements)
    return buf.getvalue()


def generate_brsr_report_pdf(run: Run, db: Session, template_type: str = "brsr_core") -> Report:
    """
    Assemble the complete run metrics into the BRSR Core template, convert to PDF,
    and persist in the database.
    """
    ef_db = get_ef_db()

    # 1. Ensure MACC results exist for this run
    stmt_macc = (
        select(Recommendation)
        .where(Recommendation.run_id == run.id)
        .options(selectinload(Recommendation.macc_results))
    )
    existing_recs = list(db.scalars(stmt_macc).all())
    if not existing_recs or not any(r.macc_results for r in existing_recs):
        calculate_macc_for_run(run=run, db=db)

    # 2. Gather Organization & Run metadata
    org = run.organization
    org_name = org.name if org else "SME Facility"
    sector_display_name = (
        org.sector_id.replace("_", " ").title() if org and org.sector_id else "General Manufacturing"
    )
    turnover_cr = round(float(org.turnover_inr or 0) / 10000000.0, 2) if org else 0.0

    # 3. Gather Baseline Results and process breakdowns
    stmt_base = (
        select(BaselineResult)
        .where(BaselineResult.run_id == run.id)
        .options(selectinload(BaselineResult.activity_data))
    )
    baseline_lines = list(db.scalars(stmt_base).all())

    scope1_total = 0.0
    scope2_total = 0.0
    scope3_total = 0.0
    process_totals: dict[str, dict[str, Any]] = {}
    audit_trail: list[dict[str, Any]] = []

    grid_kwh = 0.0
    fossil_gj = 0.0
    biomass_gj = 0.0

    for line in baseline_lines:
        tco2e_val = float(line.tCO2e)
        scope_str = str(line.scope)
        if "1" in scope_str:
            scope1_total += tco2e_val
        elif "2" in scope_str:
            scope2_total += tco2e_val
        elif "3" in scope_str:
            scope3_total += tco2e_val

        p_name = line.unit_process.replace("_", " ").title()
        if p_name not in process_totals:
            process_totals[p_name] = {
                "unit_process_name": p_name,
                "scope": line.scope,
                "tCO2e": 0.0,
            }
        process_totals[p_name]["tCO2e"] += tco2e_val

        # Audit trail line
        act = line.activity_data
        act_type = act.activity_type if act else "direct_emission"
        qty = float(act.quantity) if act else 1.0
        unit_str = act.unit if act else "unit"

        # Lookup EF details
        _, ef_info = ef_db.resolve_factor(act_type)
        ef_val = ef_info.get("value", 0.0)
        ef_unit = ef_info.get("unit", "")
        ef_source = ef_info.get("source", "CEA Baseline Database v20.0")

        audit_trail.append({
            "unit_process": p_name,
            "activity_type": act_type.replace("_", " ").title(),
            "quantity": qty,
            "unit": unit_str,
            "ef_id": line.emission_factor_ref,
            "ef_value": ef_val,
            "ef_unit": ef_unit,
            "tCO2e": tco2e_val,
            "ef_source": ef_source,
        })

        # Energy estimation
        if act_type in ("grid_electricity", "electricity"):
            grid_kwh += qty
        elif "coal" in act_type or "diesel" in act_type or "natural_gas" in act_type or "lpg" in act_type:
            # Standard energy conversion: 1 kg coal ~ 0.018 GJ, 1 L diesel ~ 0.038 GJ
            factor_gj = 0.038 if "diesel" in act_type else 0.018
            fossil_gj += qty * factor_gj
        elif "biomass" in act_type or "bagasse" in act_type or "briquette" in act_type:
            biomass_gj += qty * 0.014

    total_emissions = scope1_total + scope2_total + scope3_total
    total_emissions_safe = max(total_emissions, 0.0001)

    baseline_by_process = []
    for p_info in process_totals.values():
        p_info["share_pct"] = round((p_info["tCO2e"] / total_emissions_safe) * 100.0, 1)
        p_info["tCO2e"] = round(p_info["tCO2e"], 2)
        baseline_by_process.append(p_info)
    baseline_by_process.sort(key=lambda x: x["tCO2e"], reverse=True)

    # 4. Gather Hotspots
    stmt_hot = select(Hotspot).where(Hotspot.run_id == run.id).order_by(Hotspot.rank.asc())
    hotspot_rows = list(db.scalars(stmt_hot).all())
    hotspots_data = [
        {
            "rank": h.rank,
            "unit_process_name": h.unit_process.replace("_", " ").title(),
            "tCO2e": float(h.tCO2e),
            "share_pct": float(h.share_pct),
        }
        for h in hotspot_rows
    ]

    # 5. Gather Recommendations and MACC metrics
    stmt_rec = (
        select(Recommendation)
        .where(Recommendation.run_id == run.id)
        .options(selectinload(Recommendation.macc_results))
        .order_by(Recommendation.rank.asc())
    )
    rec_models = list(db.scalars(stmt_rec).all())
    recommendations_data = []

    for r in rec_models:
        macc_entry = r.macc_results[0] if r.macc_results else None
        capex_lakh = (
            float(macc_entry.cost_capex_inr) / 100000.0 if macc_entry else 10.0
        )
        saving_tco2e = (
            float(macc_entry.tCO2e_reduced_annual) if macc_entry else 5.0
        )
        cost_per_tco2e = (
            float(macc_entry.cost_per_tco2e) if macc_entry else -500.0
        )
        payback_years = (
            float(macc_entry.payback_years) if macc_entry else 2.5
        )

        recommendations_data.append({
            "name": r.intervention_id.replace("_", " ").title(),
            "rationale": r.rationale,
            "description": r.rationale,
            "cost_capex_lakh": capex_lakh,
            "tCO2e_reduced_annual": saving_tco2e,
            "cost_per_tco2e": cost_per_tco2e,
            "payback_years": payback_years,
        })

    # 6. Energy Summary
    grid_gj = grid_kwh * 0.0036
    total_gj = grid_gj + fossil_gj + biomass_gj
    renewable_share_pct = (
        round((biomass_gj / max(total_gj, 0.001)) * 100.0, 1) if total_gj > 0 else 0.0
    )

    energy_data = {
        "total_gj": round(total_gj, 1),
        "renewable_share_pct": renewable_share_pct,
        "grid_kwh": round(grid_kwh, 0),
        "fossil_gj": round(fossil_gj, 1),
        "biomass_gj": round(biomass_gj, 1),
    }

    # 7. Complete Template Context
    now_utc = datetime.now(UTC)
    now_str = now_utc.strftime("%d %b %Y, %H:%M UTC")

    context = {
        "org": {
            "name": org_name,
            "sector_display_name": sector_display_name,
            "location": "India (Industrial Cluster)",
            "turnover_cr": turnover_cr,
            "export_markets": ["EU", "USA"] if org and org.sector_id == "textile_dyeing" else [],
        },
        "run": {
            "period_start": run.period_start or "2025-04-01",
            "period_end": run.period_end or "2026-03-31",
            "ef_version": run.ef_version or "cea_v20.0_ipcc_ar6_defra_2024",
        },
        "generated_at": now_str,
        "totals": {
            "scope1": round(scope1_total, 2),
            "scope2": round(scope2_total, 2),
            "scope3_partial": round(scope3_total, 2),
        },
        "baseline_by_process": baseline_by_process,
        "hotspots": hotspots_data,
        "recommendations": recommendations_data,
        "energy": energy_data,
        "audit_trail": audit_trail,
        "grid_factor": "0.7117 tCO2/MWh (CEA v20.0, FY24-25)",
    }

    # 8. Render HTML
    jinja_env = get_jinja_env()
    template = jinja_env.get_template("brsr_core.html")
    rendered_html = template.render(**context)

    # 9. Convert to PDF: WeasyPrint with ReportLab fallback
    pdf_bytes = _render_with_weasyprint(rendered_html)
    if not pdf_bytes:
        pdf_bytes = _render_with_reportlab(context)

    # 10. Persist Report row
    report = Report(
        run_id=run.id,
        template_type=template_type,
        file=pdf_bytes,
        generated_at=now_utc,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return report
