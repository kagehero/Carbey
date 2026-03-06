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

    batch_size = 100
    total = len(filtered)
    for i in range(0, total, batch_size):
        chunk = filtered[i : i + batch_size]
        resp = requests.post(url, params=params, headers=headers, json=chunk)
        if not resp.ok:
            raise RuntimeError(
                f"Supabase sync failed at batch {i // batch_size + 1}: {resp.status_code} {resp.text}"
            )


def cmd_sync():
    """Download, parse, and save latest inventory"""
    print("="*70)
    print("Syncing Inventory from C-MATCH")
    print("="*70)
    print()
    
    try:
        # Download CSV
        print("[1/2] Downloading CSV...")
        downloader = CMatchCSVDownloader()
        csv_file = downloader.download_csv()
        
        # Parse CSV
        print("\n[2/2] Parsing data...")
        parser = CMatchCSVParser()
        vehicles = parser.parse_csv(csv_file)
        json_file = parser.save_to_json(vehicles)

        # Save to Supabase
        print("\nSaving to Supabase (upsert)...")
        sync_to_supabase(vehicles)
        
        # Summary
        print("\n" + "="*70)
        print(f"✓ Success: {len(vehicles)} vehicles synced and saved to Supabase")
        print("="*70)
        
        return 0
    except Exception as e:
        print(f"\n✗ Error: {e}")
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
  sync              Download and parse latest inventory from C-MATCH
  view [keyword]    View inventory summary or search by keyword
  stats             Show detailed statistics
  export [format]   Export data (json/csv)
  debug <test>      Run diagnostics (login/csv/html/all)
  help              Show this help message

Examples:
  carbey sync                  # Sync inventory
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
            return cmd_sync()
        
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
