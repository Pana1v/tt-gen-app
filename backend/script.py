import csv
import os
from ics import Calendar, Event
from datetime import datetime, timedelta

# Branch-year prefixes
BRANCHES = {
    "CS4": "CS_fourth_year",
    "CS3": "CS_third_year",
    "EE3": "EE_third_year"
}

# Directories for output files
CSV_DIR = './tt-csv'
ICAL_DIR = './tt-ical'
VENUE_FILE = './venue.csv'
TT_FILE = './tt.csv'

# Ensure directories exist
os.makedirs(CSV_DIR, exist_ok=True)
os.makedirs(ICAL_DIR, exist_ok=True)

# Load venue capacities from venue.csv
def load_venue_capacity(file_path):
    venues = {}
    with open(file_path, mode='r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            venue = row['Venue Name']
            capacity = int(row['Max Capacity'])
            venues[venue] = capacity
    return venues

venue_capacity = load_venue_capacity(VENUE_FILE)

# Helper function to check capacity
def check_capacity(location, students):
    if location in venue_capacity and students > venue_capacity[location]:
        print(f"Warning: Venue {location} exceeded capacity ({students} > {venue_capacity[location]})")

# Read the timetable CSV and categorize by branch/year
def process_timetable(file_path):
    timetables = {branch: [] for branch in BRANCHES.values()}
    
    with open(file_path, mode='r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            course = row['Course Name']
            students = int(row['Students'])
            location = row['Location']
            
            # Check if venue capacity is exceeded
            check_capacity(location, students)

            # Determine branch-year from course code
            prefix = course[:3] + course[3]  # e.g., "CS4", "EE3"
            if prefix in BRANCHES:
                branch_year = BRANCHES[prefix]
                timetables[branch_year].append(row)

    return timetables

timetables = process_timetable(TT_FILE)

# Save timetables as CSV and generate .ical
def save_timetables_csv(timetables):
    for branch, data in timetables.items():
        file_path = os.path.join(CSV_DIR, f'{branch}.csv')
        with open(file_path, mode='w', newline='') as file:
            # Write all columns from the original CSV
            writer = csv.DictWriter(file, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        print(f"Saved CSV for {branch} at {file_path}")

def save_timetables_ical(timetables):
    for branch, data in timetables.items():
        cal = Calendar()

        for row in data:
            event = Event()
            event.name = f"{row['Course Name']} - {row['Instructor Name']}"
            event.location = row['Location']
            event.description = f"{row['Type']} with {row['Instructor Name']}, {row['Students']} students"
            
            # Start date and time
            start_time_str = row['Start Time']
            day_str = row['Day']
            duration_hours = int(row['Duration'])

            # Convert to datetime format (you can customize this)
            event_start_time = datetime.strptime(f"{day_str} {start_time_str}", "%A %H:%M")
            event_start = event_start_time
            event_end = event_start + timedelta(hours=duration_hours)

            event.begin = event_start
            event.end = event_end
            cal.events.add(event)

        file_path = os.path.join(ICAL_DIR, f'{branch}.ics')
        with open(file_path, mode='w') as file:
            file.writelines(cal)
        print(f"Saved iCal for {branch} at {file_path}")

# Save timetables in both formats
save_timetables_csv(timetables)
save_timetables_ical(timetables)
