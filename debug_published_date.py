import json

# Load parsed data
with open('data/parsed/inventory_parsed_20260307_010323.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total vehicles: {len(data)}")

# Check vehicles with days_listed but no published_date
nulls = [v for v in data if v.get('days_listed_numeric') and not v.get('published_date')]
print(f"Vehicles with days_listed but NO published_date: {len(nulls)}")

# Check vehicles with published_date
with_date = [v for v in data if v.get('published_date')]
print(f"Vehicles WITH published_date: {len(with_date)}")

# Show samples
if nulls:
    print("\n=== Sample vehicles WITHOUT published_date ===")
    for v in nulls[:3]:
        print(f"  Vehicle: {v.get('vehicle_code')}")
        print(f"    days_listed: {v.get('days_listed')}")
        print(f"    days_listed_numeric: {v.get('days_listed_numeric')}")
        print(f"    published_date: {v.get('published_date')}")
        print(f"    status: {v.get('status')}")
        print()

if with_date:
    print("\n=== Sample vehicles WITH published_date ===")
    for v in with_date[:3]:
        print(f"  Vehicle: {v.get('vehicle_code')}")
        print(f"    days_listed: {v.get('days_listed')}")
        print(f"    days_listed_numeric: {v.get('days_listed_numeric')}")
        print(f"    published_date: {v.get('published_date')}")
        print(f"    status: {v.get('status')}")
        print()
