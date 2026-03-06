import json

# Load parsed data
with open('data/parsed/inventory_parsed_20260307_013524.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total vehicles: {len(data)}")

# Find vehicles WITHOUT published_date
without_date = [v for v in data if not v.get('published_date')]

print(f"\nVehicles WITHOUT published_date: {len(without_date)}")

if without_date:
    print("\n=== Vehicles WITHOUT published_date ===")
    for v in without_date:
        print(f"Vehicle: {v.get('vehicle_code')}")
        print(f"  Maker/Name: {v.get('maker')} {v.get('car_name')}")
        print(f"  Status: {v.get('status')}")
        print(f"  days_listed: {v.get('days_listed')}")
        print(f"  days_listed_numeric: {v.get('days_listed_numeric')}")
        print(f"  published_date: {v.get('published_date')}")
        print(f"  publication_status: {v.get('publication_status')}")
        print(f"  stock_status: {v.get('stock_status')}")
        print()
