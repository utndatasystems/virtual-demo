import sys
import duckdb
import virtual
import re
import math
import time

def execute_query(query, file_path, format):
  # Regular expression to find "FROM <table_name>"
  if format == 'virtual':
    file_path = 'file_virtual.parquet' #file_path.replace('.csv', '.parquet')
  else:
    file_path = 'file.parquet'

  query = re.sub(r'\bFROM\s+(\w+)', f'FROM read_parquet("{file_path}")', query, flags=re.IGNORECASE)

  print(f'>>>>> queyr={query}')

  # TODO: Also support if there is not a virtual file.
  metal_query_time = None
  start_time = time.time_ns()
  if format == 'virtual':
    ret, metal_query_time = virtual.query(query, engine='duckdb', return_execution_time=True)
  else:
    ret = duckdb.sql(query).to_df()
  stop_time = time.time_ns()

  # Calculate the query time.
  query_time = stop_time - start_time

  return ret, query_time, metal_query_time

query = sys.argv[1]
file_path = sys.argv[2]
format = sys.argv[3]

# Run.
result, query_time, metal_query_time = execute_query(query, file_path, format)

def handle_nan(value):
  if isinstance(value, float) and math.isnan(value):
    return None  # Replace NaN with None (null in JSON)
  elif value is None:
    return None  # Replace Python None with JSON null
  return value

# Convert result values to JSON-serializable format.
result_cleaned = [[handle_nan(cell) for cell in row] for row in result.values.tolist()]

# Include the DataFrame header (column names).
header = result.columns.tolist()

# And write the result, including headers, to a JSON file.
with open('result.json', 'w', encoding='utf-8') as f:
  import json
  json.dump({'query_time': query_time, 'metal_query_time': metal_query_time, 'header': header, 'data': result_cleaned}, f, indent=2)