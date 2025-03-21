import sys
import duckdb
import virtual
import re
import math
import time
import json

# Force flushing.
sys.stdout.reconfigure(line_buffering=True)

def execute_query(query, file_path, format, should_run):
  # Regular expression to find "FROM <table_name>"
  if format == 'virtual':
    file_path = 'file_virtual.parquet' #file_path.replace('.csv', '.parquet')

  query = re.sub(r'\bfrom\s+(\w+)', f'from read_parquet("{file_path}")', query, flags=re.IGNORECASE)

  print(f'>>>>> queyr={query}')

  # TODO: Also support if there is not a virtual file.
  metal_query_time = None
  start_time = time.time_ns()
  if format == 'virtual':
    if should_run:
      ret, metal_query_time = virtual.query(query, engine='duckdb', return_execution_time=True)
    else:
      # Don't actually run.
      ret = virtual.query(query, engine='duckdb', run=False)
  else:
    if should_run:
      ret = duckdb.sql(query).to_df()
    else:
      # We just store the query.
      ret = query
  stop_time = time.time_ns()

  # Calculate the query time.
  query_time = stop_time - start_time

  return ret, query_time, metal_query_time

if len(sys.argv) != 5:
  print(f'Usage: python3 {sys.argv[0]} <query> <file-path> <format> <should-run>')
  sys.exit(-1)

query = sys.argv[1]
file_path = sys.argv[2]
format = sys.argv[3]
should_run = int(sys.argv[4])

# Run.
result, query_time, metal_query_time = execute_query(query, file_path, format, should_run)

def handle_nan(value):
  if isinstance(value, float) and math.isnan(value):
    return None  # Replace NaN with None (null in JSON)
  elif value is None:
    return None  # Replace Python None with JSON null
  return value

# Convert result values to JSON-serializable format.
if should_run:
  result_cleaned = [[handle_nan(cell) for cell in row] for row in result.values.tolist()]

  # Include the DataFrame header (column names).
  header = result.columns.tolist()

  result_cleaned = json.dumps(result_cleaned, default=str)

  print(result_cleaned)

  # And write the result, including headers, to a JSON file.
  with open('result.json', 'w', encoding='utf-8') as f:
    import json
    json.dump({'query_time': query_time, 'metal_query_time': metal_query_time, 'header': header, 'data': result_cleaned, 'query': None}, f, indent=2)
else:
  # Set the rewritten query.
  rewritten_query = result

  # Replace with `from table`.
  rewritten_query = re.sub(
    rf'from read_parquet\("file_virtual.parquet"\)', 
    'from table', 
    rewritten_query, 
    flags=re.IGNORECASE
  )

  # Write the query.
  with open('result.json', 'w', encoding='utf-8') as f:
    import json
    json.dump({'query_time': query_time, 'metal_query_time': metal_query_time, 'header': None, 'data': None, 'query' : rewritten_query}, f, indent=2)
