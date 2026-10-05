import json
import re
from pathlib import Path


def to_pg_type(values):
    non_null = [v for v in values if v is not None]
    if not non_null:
        return "TEXT"

    if all(isinstance(v, bool) for v in non_null):
        return "BOOLEAN"

    if all(isinstance(v, int) and not isinstance(v, bool) for v in non_null):
        return "BIGINT"

    if all((isinstance(v, (int, float)) and not isinstance(v, bool)) for v in non_null):
        return "NUMERIC"

    if all(isinstance(v, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", v) for v in non_null):
        return "DATE"

    if all(
        isinstance(v, str)
        and re.fullmatch(r"\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?", v)
        for v in non_null
    ):
        return "TIMESTAMP"

    return "TEXT"


def normalize_name(name):
    clean = re.sub(r"[^a-zA-Z0-9_]+", "_", name.strip())
    clean = re.sub(r"_+", "_", clean).strip("_")
    return clean.lower() or "column"


def escape_sql(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    return "'" + str(value).replace("'", "''") + "'"


def build_sql(input_path: str, output_path: str, table_name: str = "suaralens_dummy_simulasi"):
    input_file = Path(input_path)
    output_file = Path(output_path)
    records = []

    with input_file.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            records.append(json.loads(line))

    if not records:
        raise ValueError(f"No records found in {input_path}")

    key_map = {}
    for record in records:
        for key in record.keys():
            if key not in key_map:
                key_map[key] = normalize_name(key)

    ordered_columns = []
    seen = set()
    for record in records:
        for key in record.keys():
            name = key_map[key]
            if name in seen:
                continue
            seen.add(name)
            ordered_columns.append((name, to_pg_type([r.get(key) for r in records if key in r])))

    lines = []
    lines.append(f"CREATE TABLE IF NOT EXISTS public.{table_name} (")
    col_defs = []
    for col_name, col_type in ordered_columns:
        col_defs.append(f"    \"{col_name}\" {col_type}")
    lines.append(",\n".join(col_defs))
    lines.append(");")
    lines.append("")

    for record in records:
        mapped = {key_map[k]: record.get(k) for k in record.keys()}
        insert_cols = [f'"{name}"' for name in mapped.keys()]
        insert_values = [escape_sql(v) for v in mapped.values()]
        lines.append(
            f"INSERT INTO public.{table_name} ({', '.join(insert_cols)}) VALUES ({', '.join(insert_values)});"
        )

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} rows to {output_file}")


if __name__ == "__main__":
    build_sql(
        input_path="data/output/suaralens_dummy_simulasi.jsonl",
        output_path="data/output/suaralens_dummy_simulasi_postgres.sql",
        table_name="suaralens_dummy_simulasi",
    )
