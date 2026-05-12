"""1C:Бухгалтерия export generator."""
from typing import List, Dict, Any
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom


def generate_1c_xml(entries: List[Dict[str, Any]]) -> str:
    """Generate 1С-compatible XML for accounting entries (проводки)."""
    root = Element("AccountingEntries", {"Version": "1.0"})
    for entry in entries:
        e = SubElement(root, "Entry")
        SubElement(e, "AccountDr").text = entry.get("account_dr", "20.01")
        SubElement(e, "AccountCr").text = entry.get("account_cr", "10.01")
        SubElement(e, "Amount").text = str(entry.get("amount", 0))
        SubElement(e, "Comment").text = entry.get("comment", "")
        SubElement(e, "Date").text = entry.get("date", "")
    rough = tostring(root, encoding="unicode")
    reparsed = minidom.parseString(rough)
    return reparsed.toprettyxml(indent="  ", encoding="utf-8").decode("utf-8")


def generate_1c_txt(entries: List[Dict[str, Any]]) -> str:
    """Generate simple text format for 1С import."""
    lines = ["AccountDr|AccountCr|Amount|Comment|Date"]
    for entry in entries:
        lines.append(
            f"{entry.get('account_dr', '20.01')}|"
            f"{entry.get('account_cr', '10.01')}|"
            f"{entry.get('amount', 0)}|"
            f"{entry.get('comment', '')}|"
            f"{entry.get('date', '')}"
        )
    return "\n".join(lines)


def calculation_to_1c_entries(calculation: Any) -> List[Dict[str, Any]]:
    """Convert a Calculation model to 1С accounting entries."""
    entries = []
    expenses = calculation.expenses if isinstance(calculation.expenses, list) else []

    # Group enabled expenses by their group field
    by_group: Dict[str, float] = {}
    for exp in expenses:
        if not exp.get("enabled", True):
            continue
        group = exp.get("group", "Other")
        tariff = float(exp.get("tariff", 0))
        quantity = float(exp.get("quantity", 0))
        amount = tariff * quantity
        by_group[group] = by_group.get(group, 0) + amount

    for group, amount in by_group.items():
        account_cr = (
            "10.01"
            if group == "Расходники"
            else "60.01"
            if group == "МЖС"
            else "25.01"
        )
        entries.append(
            {
                "account_dr": "20.01",
                "account_cr": account_cr,
                "amount": amount,
                "comment": f"{group} — поезд {calculation.train_number}",
                "date": str(calculation.created_at.date()) if calculation.created_at else "",
            }
        )
    return entries
