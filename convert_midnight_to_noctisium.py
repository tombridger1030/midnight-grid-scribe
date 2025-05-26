import csv
import json
from datetime import datetime
import re

def parse_date(date_str):
    """Convert date string like 'Mon, Apr 21' to YYYY-MM-DD format"""
    if not date_str or date_str.strip() == '':
        return None
    
    # Remove day of week and clean up
    date_str = date_str.strip()
    if ',' in date_str:
        date_str = date_str.split(',')[1].strip()
    
    # Parse month and day
    try:
        # Add year 2025 as default
        date_obj = datetime.strptime(f"{date_str} 2025", "%b %d %Y")
        return date_obj.strftime("%Y-%m-%d")
    except:
        return None

def parse_time(time_str):
    """Convert time string to HH:MM format"""
    if not time_str or time_str.strip() == '':
        return None
    
    time_str = time_str.strip()
    # Handle times like "6:48 " or "23:45"
    time_str = time_str.replace(' ', '')
    
    # If time is in format like "0:41", pad with zero
    if ':' in time_str:
        parts = time_str.split(':')
        if len(parts[0]) == 1:
            time_str = f"0{time_str}"
    
    return time_str

def convert_to_noctisium_format(input_file, output_file):
    """Convert Midnight Log CSV to Noctisium Echo AI Metrics format"""
    
    # Default user_id (you may want to change this)
    user_id = "0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b"
    
    output_rows = []
    output_rows.append(['user_id', 'date', 'data'])
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)
    
    # Find the header row (row with "Date", "Wake Time", etc.)
    header_row_idx = None
    for i, row in enumerate(rows):
        if len(row) > 2 and "Date" in row and "Wake Time" in row:
            header_row_idx = i
            break
    
    if header_row_idx is None:
        print("Could not find header row")
        return
    
    headers = rows[header_row_idx]
    
    # Map column indices
    col_map = {}
    for i, header in enumerate(headers):
        if header:
            col_map[header] = i
    
    # Process data rows
    for row in rows[header_row_idx + 1:]:
        # Skip empty rows, BREAK rows, and NIGHTMARE rows
        if len(row) < 2 or not row[1] or row[0] in ['BREAK', 'NIGHTMARE'] or row[1] == 'AVG OR SUM':
            continue
        
        # Parse date
        date = parse_date(row[col_map.get('Date', 1)])
        if not date:
            continue
        
        # Check if row has any actual data (not just empty cells)
        has_data = False
        for i in range(2, len(row)):
            if i < len(row) and row[i] and row[i].strip():
                has_data = True
                break
        
        if not has_data:
            continue
        
        # Build data dictionary matching Noctisium format exactly
        # IMPORTANT: Maintain exact field order as in Noctisium
        data = {}
        
        # HRV
        if 'HRV' in col_map and len(row) > col_map['HRV'] and row[col_map['HRV']]:
            data['hrv'] = str(row[col_map['HRV']])
        else:
            data['hrv'] = None
        
        # Calories
        if 'Calories' in col_map and len(row) > col_map['Calories'] and row[col_map['Calories']]:
            data['calories'] = str(row[col_map['Calories']])
        else:
            data['calories'] = None
        
        # Deep Work
        if 'Deep Work (hrs)' in col_map and len(row) > col_map['Deep Work (hrs)'] and row[col_map['Deep Work (hrs)']]:
            data['deepWork'] = str(row[col_map['Deep Work (hrs)']])
        else:
            data['deepWork'] = None
        
        # Recovery
        if 'Recovery' in col_map and len(row) > col_map['Recovery'] and row[col_map['Recovery']]:
            data['recovery'] = str(row[col_map['Recovery']])
        else:
            data['recovery'] = None
        
        # Sleep Time
        if 'Sleep Time' in col_map and len(row) > col_map['Sleep Time'] and row[col_map['Sleep Time']]:
            sleep_time = parse_time(row[col_map['Sleep Time']])
            if sleep_time:
                data['sleepTime'] = sleep_time
            else:
                data['sleepTime'] = None
        else:
            data['sleepTime'] = None
        
        # Cold Shower (convert 1/0 to true/false)
        if 'Cold Shower' in col_map and len(row) > col_map['Cold Shower'] and row[col_map['Cold Shower']]:
            data['coldShower'] = row[col_map['Cold Shower']] == '1'
        else:
            data['coldShower'] = None
        
        # No Dopamine (convert 1/0 to true/false)
        if 'No Dopamine' in col_map and len(row) > col_map['No Dopamine'] and row[col_map['No Dopamine']]:
            data['noDopamine'] = row[col_map['No Dopamine']] == '1'
        else:
            data['noDopamine'] = None
        
        # Sleep Hours
        if 'Sleep (hrs)' in col_map and len(row) > col_map['Sleep (hrs)'] and row[col_map['Sleep (hrs)']]:
            data['sleepHours'] = str(row[col_map['Sleep (hrs)']])
        else:
            data['sleepHours'] = None
        
        # Waking Time
        if 'Wake Time' in col_map and len(row) > col_map['Wake Time'] and row[col_map['Wake Time']]:
            wake_time = parse_time(row[col_map['Wake Time']])
            if wake_time:
                data['wakingTime'] = wake_time
            else:
                data['wakingTime'] = None
        else:
            data['wakingTime'] = None
        
        # Daily Weight
        if 'Weight' in col_map and len(row) > col_map['Weight'] and row[col_map['Weight']]:
            data['dailyWeight'] = str(row[col_map['Weight']])
        else:
            data['dailyWeight'] = None
        
        # Water Intake
        if 'Water' in col_map and len(row) > col_map['Water'] and row[col_map['Water']]:
            data['waterIntake'] = str(row[col_map['Water']])
        else:
            data['waterIntake'] = None
        
        # Reading Hours - can be empty string or null
        if 'Reading' in col_map and len(row) > col_map['Reading']:
            if row[col_map['Reading']] == '':
                data['readingHours'] = ""
            elif row[col_map['Reading']]:
                data['readingHours'] = str(row[col_map['Reading']])
            else:
                data['readingHours'] = None
        else:
            data['readingHours'] = None
        
        # Protein Intake
        if 'Protein' in col_map and len(row) > col_map['Protein'] and row[col_map['Protein']]:
            data['proteinIntake'] = str(row[col_map['Protein']])
        else:
            data['proteinIntake'] = None
        
        # Training sessions (jiuJitsuSessions and weightliftingSessions)
        # jiuJitsuSessions can be empty string or a value
        if 'Training' in col_map and len(row) > col_map['Training']:
            training_value = row[col_map['Training']]
            if training_value == '':
                data['jiuJitsuSessions'] = ""
            elif training_value:
                # If training value is 1, assume it's jiu jitsu
                # If it's less than 1, it might be partial session
                data['jiuJitsuSessions'] = str(training_value)
            else:
                data['jiuJitsuSessions'] = None
        else:
            data['jiuJitsuSessions'] = None
        
        # weightliftingSessions - always set to empty string or "0" or "1"
        # Since we don't have this data in the source, default to empty string
        data['weightliftingSessions'] = ""
        
        # Convert data dictionary to JSON string
        data_json = json.dumps(data, separators=(',', ':'))
        
        # Add row to output
        output_rows.append([user_id, date, data_json])
    
    # Write output CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(output_rows)
    
    print(f"Conversion complete! Output saved to {output_file}")
    print(f"Total data rows converted: {len(output_rows) - 1}")

if __name__ == "__main__":
    input_file = "csv/Midnight Log Daily 2025 (2).csv"
    output_file = "csv/Midnight_Log_Converted_to_Noctisium_Format.csv"
    
    convert_to_noctisium_format(input_file, output_file) 