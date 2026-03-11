#!/usr/bin/env python3
"""
Carbey - Unified CLI for C-MATCH inventory management
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict

import requests

from scraper.csv_downloader import CMatchCSVDownloader
from scraper.csv_parser import CMatchCSVParser
from scraper.image_scraper import CMatchImageScraper
from scraper.bulk_image_scraper import BulkImageScraper
from scraper.construct_image_urls import construct_all_image_urls
from config import Config


def sync_to_supabase(vehicles: List[Dict]):
    """Upsert vehicles into Supabase using the REST API."""
    if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
        raise ValueError("Supabase configuration missing. Set SUPABASE_URL and SUPABASE_KEY in .env")

    # Filter out rows without upsert key (e.g. CSV total row "計" that has no vehicle_code)
    key_field = Config.SUPABASE_CONFLICT_COLUMN or "vehicle_code"
    filtered = [v for v in vehicles if v.get(key_field)]
    skipped = len(vehicles) - len(filtered)
    if skipped > 0:
        print(f"[INFO] Skipping {skipped} row(s) with no '{key_field}' (likely totals/summary rows)")
    if not filtered:
        print("[INFO] No valid rows with upsert key found; nothing to send to Supabase.")
        return
    
    # Clean data for Supabase
    for vehicle in filtered:
        # Convert empty strings to None for date fields
        if vehicle.get('published_date') == '':
            vehicle['published_date'] = None
        
        # Convert string numbers to proper numeric types
        numeric_fields = [
            'year', 'year_month', 'price_body', 'price_total', 'mileage', 
            'days_listed', 'days_listed_numeric',
            'price_body_numeric', 'price_total_numeric', 'mileage_numeric',
            'plan_count', 'image_count', 'caption_count',
            'detail_views', 'email_inquiries', 'phone_inquiries', 
            'map_views', 'favorites', 'reused_days_remaining'
        ]
        
        for field in numeric_fields:
            if field in vehicle and vehicle[field] is not None:
                try:
                    val = vehicle[field]
                    if isinstance(val, str):
                        if val.strip() == '':
                            vehicle[field] = None
                        else:
                            # Remove any non-numeric characters except . and -
                            clean_val = val.strip()
                            float_val = float(clean_val)
                            # PostgreSQL numeric type accepts both int and float
                            vehicle[field] = float_val
                except (ValueError, AttributeError):
                    vehicle[field] = None
        
        # Convert date strings to proper format
        date_fields = ['registered_date', 'updated_date']
        for field in date_fields:
            if field in vehicle and vehicle[field]:
                try:
                    # Convert "2026/01/09 09:33" to "2026-01-09"
                    val = str(vehicle[field])
                    if '/' in val:
                        date_part = val.split()[0]  # Get date part only
                        vehicle[field] = date_part.replace('/', '-')
                except:
                    vehicle[field] = None
        
        # Clean inspection field (it's text, not a date in our schema)
        # Values like "2026年12月" or "車検整備付" should remain as text
        # No conversion needed, but ensure it's a string
        if 'inspection' in vehicle and vehicle['inspection'] is not None:
            vehicle['inspection'] = str(vehicle['inspection'])
        
        # Remove 'index' field (not in schema)
        if 'index' in vehicle:
            del vehicle['index']

    table = Config.SUPABASE_TABLE
    conflict_col = Config.SUPABASE_CONFLICT_COLUMN
    url = f"{Config.SUPABASE_URL.rstrip('/')}/rest/v1/{table}"

    headers = {
        "apikey": Config.SUPABASE_KEY,
        "Authorization": f"Bearer {Config.SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    params = {}
    if conflict_col:
        params["on_conflict"] = conflict_col

    batch_size = 10  # Smaller batch size for better error handling
    total = len(filtered)
    print(f"[INFO] Syncing {total} vehicles in batches of {batch_size}...")
    
    for i in range(0, total, batch_size):
        chunk = filtered[i : i + batch_size]
        batch_num = i // batch_size + 1
        
        print(f"  Batch {batch_num}/{(total + batch_size - 1) // batch_size}: vehicles {i+1}-{min(i+batch_size, total)}")
        
        resp = requests.post(url, params=params, headers=headers, json=chunk)
        if not resp.ok:
            # Save failed payload for debugging
            debug_dir = Path("debug")
            debug_dir.mkdir(exist_ok=True)
            with open(debug_dir / f"failed_batch_{batch_num}.json", 'w', encoding='utf-8') as f:
                json.dump(chunk, f, ensure_ascii=False, indent=2)
            
            print(f"\n[ERROR] Batch {batch_num} failed!")
            print(f"  Vehicle codes in this batch:")
            for v in chunk:
                print(f"    - {v.get('vehicle_code')}: {v.get('maker')} {v.get('car_name')}")
            
            raise RuntimeError(
                f"Supabase sync failed at batch {batch_num}: {resp.status_code} {resp.text}\n"
                f"Failed payload saved to debug/failed_batch_{batch_num}.json"
            )
    
    print(f"[SUCCESS] All {total} vehicles synced successfully!")


def cmd_sync(with_images: bool = False, max_images: int = None):
    """Download, parse, and save latest inventory"""
    print("="*70)
    print("Syncing Inventory from C-MATCH")
    print("="*70)
    print()
    
    try:
        # Download CSV
        print("[1/3] Downloading CSV...")
        downloader = CMatchCSVDownloader()
        csv_file = downloader.download_csv()
        
        # Parse CSV
        print("\n[2/3] Parsing data...")
        parser = CMatchCSVParser()
        vehicles = parser.parse_csv(csv_file)
        json_file = parser.save_to_json(vehicles)

        # Scrape images if requested
        if with_images:
            print("\n[3/3] Scraping vehicle images...")
            image_scraper = CMatchImageScraper()
            vehicles = image_scraper.scrape_images(vehicles, max_vehicles=max_images)
            # Save updated data with images
            json_file = parser.save_to_json(vehicles)
        else:
            print("\n[3/3] Skipping image scraping (use --images flag to enable)")

        # Save to Supabase
        print("\nSaving to Supabase (upsert)...")
        sync_to_supabase(vehicles)
        
        # Summary
        print("\n" + "="*70)
        vehicles_with_images = sum(1 for v in vehicles if v.get('main_image_url'))
        print(f"✓ Success: {len(vehicles)} vehicles synced and saved to Supabase")
        if with_images:
            print(f"  Images scraped: {vehicles_with_images}/{len(vehicles)}")
        print("="*70)
        
        return 0
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1


def cmd_scrape_images(max_vehicles: int = None, max_pages: int = None, use_construct: bool = False):
    """Scrape images for existing inventory"""
    print("="*70)
    print("Scraping Vehicle Images from C-MATCH")
    print("="*70)
    print()
    
    try:
        # Load latest inventory
        latest_json = Config.get_latest_file(Config.PARSED_DIR, "inventory_parsed_*.json")
        
        if not latest_json:
            print("[ERROR] No inventory data found. Run: carbey sync")
            return 1
        
        with open(latest_json, 'r', encoding='utf-8') as f:
            vehicles = json.load(f)
        
        print(f"[INFO] Loaded {len(vehicles)} vehicles from {latest_json.name}")
        
        if use_construct:
            # Method 2: Construct URLs for ALL vehicles (faster, no scraping)
            print(f"\n[INFO] Constructing image URLs for all vehicles (fast method)")
            print(f"[INFO] This will verify each URL exists (~1-2 seconds per vehicle)")
            print(f"[INFO] Estimated time: {len(vehicles) * 1.5 / 60:.1f} minutes")
            
            image_map = construct_all_image_urls(vehicles, verify=True)
        else:
            # Method 1: Scrape from registration list (only gets published vehicles)
            print(f"\n[INFO] Using bulk scraper with pagination")
            if max_pages:
                print(f"[INFO] Limiting to {max_pages} pages (~{max_pages * 50} vehicles)")
            else:
                print(f"[INFO] Scraping ALL pages")
            
            bulk_scraper = BulkImageScraper()
            image_map = bulk_scraper.scrape_all_images(max_pages=max_pages)
        
        # Match images to vehicles
        matched = 0
        for vehicle in vehicles:
            vehicle_code = vehicle.get('vehicle_code')
            if vehicle_code and vehicle_code in image_map:
                vehicle['main_image_url'] = image_map[vehicle_code]
                vehicle['image_urls'] = [image_map[vehicle_code]]
                vehicle['images_scraped_at'] = datetime.now().isoformat()
                matched += 1
        
        print(f"\n[INFO] Matched {matched}/{len(vehicles)} vehicles with images")
        
        # Save updated data
        parser = CMatchCSVParser()
        json_file = parser.save_to_json(vehicles)
        
        # Update Supabase
        print("\nUpdating Supabase with image URLs...")
        sync_to_supabase(vehicles)
        
        # Summary
        print("\n" + "="*70)
        print(f"✓ Success: {matched}/{len(vehicles)} vehicles now have images")
        print("="*70)
        
        return 0
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


def cmd_view(keyword: str = None):
    """View inventory summary or search"""
    latest_json = Config.get_latest_file(Config.PARSED_DIR, "inventory_parsed_*.json")
    
    if not latest_json:
        print("No inventory data found. Run: carbey sync")
        return 1
    
    with open(latest_json, 'r', encoding='utf-8') as f:
        vehicles = json.load(f)
    
    print(f"Loaded: {latest_json.name}")
    print(f"Total vehicles: {len(vehicles)}\n")
    
    if keyword:
        # Search mode
        keyword_lower = keyword.lower()
        results = [v for v in vehicles 
                  if keyword_lower in f"{v.get('maker', '')} {v.get('car_name', '')} {v.get('grade', '')}".lower()]
        
        print(f"Search results for '{keyword}': {len(results)} vehicles\n")
        
        for i, v in enumerate(results[:20], 1):
            print(f"{i}. {v.get('maker')} {v.get('car_name')} - {v.get('price_body_display')} - {v.get('days_listed')}日")
        
        if len(results) > 20:
            print(f"\n... and {len(results) - 20} more")
    else:
        # Summary mode
        print("="*70)
        print("INVENTORY SUMMARY")
        print("="*70)
        
        # By status
        status_counts = {}
        for v in vehicles:
            status = v.get("status", "不明")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print("\nBy status:")
        for status, count in sorted(status_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"  {status}: {count}")
        
        # Top makers
        maker_counts = {}
        for v in vehicles:
            maker = v.get("maker")
            if maker:
                maker_counts[maker] = maker_counts.get(maker, 0) + 1
        
        print("\nTop 5 makers:")
        for maker, count in sorted(maker_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"  {maker}: {count}")
        
        # Stagnation
        days = [v.get("days_listed_numeric") for v in vehicles if v.get("days_listed_numeric")]
        if days:
            print(f"\nStagnation:")
            print(f"  Average: {sum(days) / len(days):.1f} days")
            print(f"  60日以上: {len([d for d in days if d >= 60])} vehicles (値下げ検討対象)")
    
    return 0


def cmd_stats():
    """Show detailed statistics"""
    latest_json = Config.get_latest_file(Config.PARSED_DIR, "inventory_parsed_*.json")
    
    if not latest_json:
        print("No inventory data found. Run: carbey sync")
        return 1
    
    with open(latest_json, 'r', encoding='utf-8') as f:
        vehicles = json.load(f)
    
    print("="*70)
    print("DETAILED STATISTICS")
    print("="*70)
    
    # Price stats
    prices = [v.get("price_body_numeric") for v in vehicles if v.get("price_body_numeric")]
    if prices:
        print("\nPrice (本体価格):")
        print(f"  Average: {sum(prices) / len(prices):,.0f}円")
        print(f"  Median: {sorted(prices)[len(prices)//2]:,}円")
        print(f"  Min: {min(prices):,}円")
        print(f"  Max: {max(prices):,}円")
    
    # Stagnation bands
    days = [v.get("days_listed_numeric") for v in vehicles if v.get("days_listed_numeric")]
    if days:
        print("\nStagnation bands (滞留日数):")
        for threshold in Config.STAGNATION_BANDS:
            count = len([d for d in days if d > threshold])
            pct = count / len(days) * 100
            print(f"  {threshold}日超: {count} ({pct:.1f}%)")
    
    # 値下げ検討
    discount_candidates = [v for v in vehicles if (v.get("days_listed_numeric") or 0) >= Config.DISCOUNT_FLAG_DAYS]
    print(f"\n値下げ検討対象 ({Config.DISCOUNT_FLAG_DAYS}日以上): {len(discount_candidates)}")
    
    # CVR analysis (if inquiry data available)
    with_inquiries = [v for v in vehicles if v.get("email_inquiries") and v.get("detail_views")]
    if with_inquiries:
        cvrs = []
        for v in with_inquiries:
            try:
                views = int(float(v.get("detail_views") or 0))
                inquiries = int(float(v.get("email_inquiries") or 0))
                if views > 0:
                    cvr = (inquiries / views) * 100
                    cvrs.append(cvr)
            except (ValueError, TypeError):
                continue
        
        if cvrs:
            print(f"\nCVR (問い合わせ率):")
            print(f"  Average: {sum(cvrs) / len(cvrs):.2f}%")
            print(f"  Vehicles with CVR < {Config.DISCOUNT_FLAG_CVR}%: {len([c for c in cvrs if c < Config.DISCOUNT_FLAG_CVR])}")
    
    return 0


def cmd_export(format: str = "json"):
    """Export data in different formats"""
    latest_json = Config.get_latest_file(Config.PARSED_DIR, "inventory_parsed_*.json")
    
    if not latest_json:
        print("No inventory data found. Run: carbey sync")
        return 1
    
    with open(latest_json, 'r', encoding='utf-8') as f:
        vehicles = json.load(f)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if format == "csv":
        import pandas as pd
        df = pd.DataFrame(vehicles)
        output_file = Config.PARSED_DIR / f"export_{timestamp}.csv"
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        print(f"✓ Exported to: {output_file}")
    elif format == "json":
        output_file = Config.PARSED_DIR / f"export_{timestamp}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(vehicles, f, ensure_ascii=False, indent=2)
        print(f"✓ Exported to: {output_file}")
    else:
        print(f"Unknown format: {format}")
        return 1
    
    return 0


def show_help():
    """Show help message"""
    print("""
Carbey - C-MATCH Inventory Management CLI

Usage:
  carbey <command> [options]

Commands:
  sync [--images] [--max-images=N]
                    Download and parse latest inventory from C-MATCH
                    --images: Also scrape vehicle images
                    --max-images=N: Limit image scraping to N vehicles
  
  scrape-images [--construct] [--max-pages=N]
                    Scrape images for existing inventory
                    --construct: Construct URLs for ALL vehicles (recommended)
                    --max-pages=N: Limit to N pages (only without --construct)
                    No flags = scrape from registration list pages
  
  view [keyword]    View inventory summary or search by keyword
  stats             Show detailed statistics
  export [format]   Export data (json/csv)
  debug <test>      Run diagnostics (login/csv/html/all)
  help              Show this help message

Examples:
  carbey sync                  # Sync inventory (no images)
  carbey sync --images         # Sync with images (all vehicles)
  carbey sync --images --max-images=10  # Sync with images (first 10)
  carbey scrape-images --construct    # Construct URLs for ALL 306 vehicles (recommended)
  carbey scrape-images                # Scrape from registration list (150 vehicles)
  carbey scrape-images --max-pages=3  # Scrape first 3 pages only
  carbey view                  # Show summary
  carbey view トヨタ            # Search for Toyota vehicles
  carbey stats                 # Detailed statistics
  carbey export csv            # Export to CSV
  carbey debug csv             # Test CSV download

For more information, see docs/README.md
""")


def main():
    """Main CLI entry point"""
    if len(sys.argv) < 2:
        show_help()
        return 1
    
    command = sys.argv[1].lower()
    
    try:
        if command == "sync":
            # Check for --images flag
            with_images = "--images" in sys.argv
            max_images = None
            
            # Check for --max-images=N
            for arg in sys.argv:
                if arg.startswith("--max-images="):
                    try:
                        max_images = int(arg.split("=")[1])
                    except:
                        pass
            
            return cmd_sync(with_images=with_images, max_images=max_images)
        
        elif command == "scrape-images":
            max_pages = None
            use_construct = "--construct" in sys.argv
            
            # Check for --max-pages=N flag
            for arg in sys.argv:
                if arg.startswith("--max-pages="):
                    try:
                        max_pages = int(arg.split("=")[1])
                    except:
                        pass
            
            # Legacy: single number argument = max_pages
            if len(sys.argv) > 2 and not sys.argv[2].startswith("--"):
                try:
                    max_pages = int(sys.argv[2])
                except:
                    pass
            
            return cmd_scrape_images(max_pages=max_pages, use_construct=use_construct)
        
        elif command == "view":
            keyword = sys.argv[2] if len(sys.argv) > 2 else None
            return cmd_view(keyword)
        
        elif command == "stats":
            return cmd_stats()
        
        elif command == "export":
            format = sys.argv[2] if len(sys.argv) > 2 else "json"
            return cmd_export(format)
        
        elif command == "debug":
            # Delegate to debug.py
            import subprocess
            args = sys.argv[2:] if len(sys.argv) > 2 else []
            result = subprocess.run(["python", "debug.py"] + args)
            return result.returncode
        
        elif command in ["help", "-h", "--help"]:
            show_help()
            return 0
        
        else:
            print(f"Unknown command: {command}")
            print("Run 'carbey help' for usage information")
            return 1
    
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        return 130
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
