import pandas as pd
import json
from pathlib import Path


def csv_to_jsonl(input_csv, output_jsonl):
    input_csv = Path(input_csv)
    output_jsonl = Path(output_jsonl)

    # Ensure output directory exists
    output_jsonl.parent.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(input_csv)

    with output_jsonl.open("w", encoding="utf-8") as f:
        for record in df.to_dict(orient="records"):
            # Convert NaN/NaT into JSON null
            record = {
                key: None if pd.isna(value) else value
                for key, value in record.items()
            }

            f.write(
                json.dumps(
                    record,
                    ensure_ascii=False
                ) + "\n"
            )

    print(f"Converted : {input_csv}")
    print(f"Output    : {output_jsonl}")
    print(f"Records   : {len(df)}")


inputs = [
    "data/input/suaralens_dummy_simulasi.csv",
    "data/input/suaralens_dummy_uji.csv"
]

outputs = [
    "data/output/suaralens_dummy_simulasi.jsonl",
    "data/output/suaralens_dummy_uji.jsonl"
]


if __name__ == "__main__":
    for input_csv, output_jsonl in zip(inputs, outputs):
        csv_to_jsonl(input_csv, output_jsonl)
