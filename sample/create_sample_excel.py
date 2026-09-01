import csv
import random

departments = [
    "Department of Computer Technology",
    "Department of Electronics Engineering",
    "Department of Instrumentation Engineering",
    "Department of Mechanical Engineering",
    "Department of Information Technology"
]

experiments = [
    "Virtualization of Digital Storage Oscilloscope & Signal Generator",
    "Virtualization of HPLC & Mass Spectrometry Rig",
    "Virtualization of Industrial PLC & SCADA Automation Unit",
    "Virtualization of Wind Tunnel Aerodynamics Chamber",
    "Virtualization of Semiconductor Fabrication Cleanroom Kit",
    "Virtualization of Smart Power Grid Simulator",
    "Virtualization of Robotics Kinematics & Arm Rig",
    "Virtualization of Chemical Reactor Dynamics Module",
    "Virtualization of Microcontroller Embedded System Bench",
    "Virtualization of Fiber Optic Telecommunication Trainer",
    "Virtualization of Heat Exchanger Thermal Dynamics Rig",
    "Virtualization of Hydraulics & Pneumatics Control Board",
    "Virtualization of Structural Finite Element Analyzer",
    "Virtualization of Biomedical ECG & EEG Diagnostic Rig",
    "Virtualization of Quantum Circuit Simulator",
    "Virtualization of CNC Precision Machining Center"
]

first_names = [
    "Aarav", "Ananya", "Aditya", "Bhavya", "Chetan", "Devika", "Eashan", "Farhan",
    "Gautam", "Harini", "Ishaan", "Jaya", "Karthik", "Kavya", "Lakshman", "Meera",
    "Nikhil", "Nivedita", "Ojas", "Pooja", "Pranav", "Rhea", "Rahul", "Siddharth",
    "Shreya", "Tarun", "Trisha", "Utkarsh", "Varun", "Vidya", "Yash", "Zoya"
]

last_names = [
    "Sharma", "Ramanathan", "Verma", "Subramanian", "Gupta", "Nair", "Patel", "Iyer",
    "Joshi", "Kulkarni", "Deshmukh", "Chowdhury", "Reddy", "Rao", "Srinivasan", "Menon",
    "Pillai", "Sundaram", "Venkatesh", "Balaji", "Krishnan", "Narayanan", "Shetty", "Hegde"
]

records = []
total_teams = 16
students_per_team = 4

record_counter = 1
for team_idx in range(1, total_teams + 1):
    team_id = f"TEAM-{team_idx:02d}"
    experiment = experiments[team_idx - 1]
    dept = departments[(team_idx - 1) % len(departments)]
    
    for member_idx in range(1, students_per_team + 1):
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        full_name = f"{fn} {ln}"
        roll_num = f"2026{1000 + record_counter}"
        cert_id = f"VLAB-2026-{record_counter:03d}"
        
        records.append({
            "Name": full_name,
            "Roll_Number": roll_num,
            "Department": dept,
            "Experiment_Name": experiment,
            "Team_ID": team_id,
            "Issue_Date": "August 31, 2026",
            "Certificate_ID": cert_id
        })
        record_counter += 1

# Write to CSV
csv_filename = "lab_virtualization_teams.csv"
fieldnames = ["Name", "Roll_Number", "Department", "Experiment_Name", "Team_ID", "Issue_Date", "Certificate_ID"]

with open(csv_filename, mode="w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(records)

print(f"Successfully generated {len(records)} student records across {total_teams} teams in '{csv_filename}'.")

# Also attempt creating XLSX if openpyxl is installed
try:
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Lab Virtualization Teams"
    
    ws.append(fieldnames)
    for r in records:
        ws.append([r[col] for col in fieldnames])
        
    xlsx_filename = "lab_virtualization_teams.xlsx"
    wb.save(xlsx_filename)
    print(f"Successfully generated Excel file '{xlsx_filename}'.")
except ImportError:
    print("openpyxl not installed, CSV file generated successfully.")
