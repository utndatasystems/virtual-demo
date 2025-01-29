import pandas as pd
import virtual
import json
import sys
import os

import re

pattern = r"pd\.DataFrame\s*\(\s*\{[^}]*\}\s*\)"

# Example text containing pd.DataFrame with data
text = """
df = pd.DataFrame({
  'A': [1, 2],
  'B': ['x', 'y']
})
"""

match = re.search(pattern, text)
if match:
    print(match.group(0))

import sys

def virtualize(table, type):
  print(f'[type] {table} {type}')
  df = None
  if type == 'code':
    match = re.search(pattern, table)
    if match:
      code = match.group(0)
      df = eval(code)
      df.to_csv('tmp.csv', index=False)
      table = 'tmp.csv'
  elif type == 'file':
    # Read the csv.
    df = pd.read_csv(table)
  else:
    sys.exit(-1)
  assert df is not None

  # Write to vanilla parquet.
  import pyarrow as pa
  pa.parquet.write_table(pa.Table.from_pandas(df), 'file.parquet')

  # Apply `virtual`.
  virtual.to_format(table, 'file_virtual.parquet', model_types=['sparse-lr'], prefix='./')

  def to_csv(parquet_path, format_path):
    tmp = pd.read_parquet(parquet_path)
    ordered_columns = [col for col in df.columns if col in tmp.columns]
    extra_columns = [col for col in tmp.columns if col not in df.columns]
    tmp = tmp[ordered_columns + extra_columns]
    tmp.to_csv(format_path, index=False)
    return

  to_csv('file_virtual.parquet', 'virtual.csv')
  
  # Report the sizes.
  sizes = {
    'csv' : os.path.getsize(table),
    'parquet' : os.path.getsize('file.parquet'),
    'virtual': os.path.getsize('file_virtual.parquet')
  }

  # Extract the basename without the extension.
  csv_basename = os.path.basename(table)
  csv_basename_noext = os.path.splitext(csv_basename)[0]

  # Rename the layout file.  
  os.rename(f'layout_{csv_basename_noext}.json', 'layout.json')

  with open('sizes.json', 'w') as f:
    json.dump(sizes, f)
  return
 
table = sys.argv[1]
type = sys.argv[2]

# Run.
virtualize(table, type)