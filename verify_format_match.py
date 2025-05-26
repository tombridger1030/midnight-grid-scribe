import csv
import json

def compare_formats(noctisium_file, converted_file):
    """Compare the structure of both files to ensure they match exactly"""
    
    # Read Noctisium file
    with open(noctisium_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        noctisium_rows = list(reader)
    
    # Read converted file
    with open(converted_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        converted_rows = list(reader)
    
    print(f"Noctisium file has {len(noctisium_rows)} rows")
    print(f"Converted file has {len(converted_rows)} rows")
    print()
    
    # Check headers
    if noctisium_rows and converted_rows:
        noctisium_headers = list(noctisium_rows[0].keys())
        converted_headers = list(converted_rows[0].keys())
        
        print("Headers match:", noctisium_headers == converted_headers)
        print("Headers:", noctisium_headers)
        print()
    
    # Check JSON structure of first few rows
    print("Comparing JSON structure of first row from each file:")
    print("-" * 50)
    
    if noctisium_rows:
        noctisium_data = json.loads(noctisium_rows[0]['data'])
        print("Noctisium fields:", list(noctisium_data.keys()))
        print("Sample Noctisium data:")
        for key, value in noctisium_data.items():
            print(f"  {key}: {value} (type: {type(value).__name__})")
    
    print()
    
    if converted_rows:
        converted_data = json.loads(converted_rows[0]['data'])
        print("Converted fields:", list(converted_data.keys()))
        print("Sample Converted data:")
        for key, value in converted_data.items():
            print(f"  {key}: {value} (type: {type(value).__name__})")
    
    print()
    print("-" * 50)
    
    # Check if field order matches
    if noctisium_rows and converted_rows:
        noctisium_fields = list(json.loads(noctisium_rows[0]['data']).keys())
        converted_fields = list(json.loads(converted_rows[0]['data']).keys())
        
        if noctisium_fields == converted_fields:
            print("✓ Field order matches exactly!")
        else:
            print("✗ Field order does not match")
            print("Expected order:", noctisium_fields)
            print("Got order:", converted_fields)
    
    # Check data types
    print("\nChecking data types consistency...")
    if noctisium_rows:
        # Check a row with null values
        for i, row in enumerate(noctisium_rows):
            data = json.loads(row['data'])
            if any(v is None for v in data.values()):
                print(f"\nNoctisium row {i} with null values:")
                for key, value in data.items():
                    if value is None:
                        print(f"  {key}: null")
                break

if __name__ == "__main__":
    noctisium_file = "csv/Noctisium Echo AI Metrics.csv"
    converted_file = "csv/Midnight_Log_Converted_to_Noctisium_Format.csv"
    
    compare_formats(noctisium_file, converted_file) 