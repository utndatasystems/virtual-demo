import pandas as pd
import virtual
import duckdb
import json
import sys
import os

import re

pattern = r"pd\.DataFrame\s*\(\s*\{[^}]*\}\s*\)"

sys.stdout.reconfigure(line_buffering=True)

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
    if table.endswith('.csv'):
      df = pd.read_csv(table)
    elif table.endswith('.parquet'):
      # Only read the header. We need this one to differentiate between regular and virtual columns.
      df = duckdb.sql(f'''
        select * from read_parquet('{table}') limit 0
      ''')
  else:
    sys.exit(-1)
  assert df is not None

  # Write to vanilla parquet.
  if table.endswith('.csv'):
    import pyarrow as pa
    pa.parquet.write_table(pa.Table.from_pandas(df), 'file.parquet')
  elif table.endswith('.parquet'):
    pass
  else:
    assert 0

  # Extract the basename without the extension.
  csv_basename = os.path.basename(table)
  csv_basename_noext = os.path.splitext(csv_basename)[0]

  # Check if we already have the schema for this file.
  schema_filepath = f'schema_{csv_basename_noext}.json'
  if not os.path.isfile(schema_filepath):
    schema_filepath = None  

  print(f'Possible schema file: {schema_filepath}')

  # Apply `virtual`.
  print(f'Virtualizing the file..')
  virtual.to_format(table, 'file_virtual.parquet', model_types=['sparse-lr', 'custom'], schema=schema_filepath, prefix='./')

  print(df.columns)

  # This is too slow. We directly read from Parquet with `hyparquet`.
  # def to_csv(parquet_path, format_path):
  #   assert df is not None
  #   tmp = pd.read_parquet(parquet_path)
  #   ordered_columns = [col for col in df.columns if col in tmp.columns]
  #   extra_columns = [col for col in tmp.columns if col not in df.columns]
  #   tmp = tmp[ordered_columns + extra_columns]
  #   tmp.to_csv(format_path, index=False)
  #   return

  # to_csv('file_virtual.parquet', 'virtual.csv')
  
  # Report the sizes.
  if table.endswith('.csv'):
    sizes = {
      'csv' : os.path.getsize(table),
      'parquet' : os.path.getsize('file.parquet'),
      'virtual': os.path.getsize('file_virtual.parquet')
    }
  elif table.endswith('.parquet'):
    sizes = {
      'parquet' : os.path.getsize(table),
      'virtual': os.path.getsize('file_virtual.parquet')
    }
  else:
    assert 0

  # Rename the layout file.
  layout_filepath = f'layout_{csv_basename_noext}.json'
  assert os.path.isfile(layout_filepath)
  os.rename(layout_filepath, 'layout.json')

  with open('sizes.json', 'w') as f:
    json.dump(sizes, f)
  return
 
table = sys.argv[1]
type = sys.argv[2]

# Run.
virtualize(table, type)