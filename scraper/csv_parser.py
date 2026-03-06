"""
Parse C-MATCH CSV into structured data
"""

import re
import json
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Dict, List


class CMatchCSVParser:
    """Parse C-MATCH inventory CSV"""
    
    # Field mapping: CSV column name -> Our field name
    FIELD_MAPPING = {
        "メーカー": "maker",
        "車種": "car_name",
        "グレード": "grade",
        "グレード補記": "grade_notes",
        "年式表示用": "year_display",
        "年式検索用（年）": "year",
        "年式検索用（月）": "year_month",
        "走行距離表示用": "mileage_display",
        "走行距離検索用": "mileage",
        "色": "color",
        "車検": "inspection",
        "本体価格表示用": "price_body_display",
        "本体価格検索用": "price_body",
        "支払総額表示用": "price_total_display",
        "支払総額検索用": "price_total",
        "車台番号": "vin",
        "貴社管理番号": "management_number",
        "物件コード": "vehicle_code",
        "コメント1": "comment1",
        "コメント2": "comment2",
        "掲載状況": "publication_status",
        "非掲載理由": "unpublished_reason",
        "在庫状況": "stock_status",
        "拡大コマ": "expanded_frame",
        "総掲載日数": "days_listed",
        "他掲載指示状況(発売日・商品名)": "other_media_status",
        "プラン掲出数": "plan_count",
        "Aプラン": "plan_a",
        "Bプラン": "plan_b",
        "複画数": "image_count",
        "キャプション数": "caption_count",
        "詳細閲覧数": "detail_views",
        "メール問合せ数（全て）": "email_inquiries",
        "電話問合せ数": "phone_inquiries",
        "MAP閲覧数": "map_views",
        "お気に入り": "favorites",
        "価格見直し登録": "price_review",
        "検査依頼": "inspection_request",
        "流用物件（有/無）": "reused_vehicle",
        "流用物件（残日数）": "reused_days_remaining",
        "認定ステータス": "certification_status",
        "評価情報（総合）": "rating_overall",
        "評価情報（内装）": "rating_interior",
        "評価情報（外装）": "rating_exterior",
        "評価書有効期限": "evaluation_expiry",
        "評価書掲出": "evaluation_published",
        "登録日": "registered_date",
        "更新日": "updated_date"
    }
    
    def parse_csv(self, csv_path: str) -> List[Dict]:
        """
        Parse C-MATCH CSV file
        
        Args:
            csv_path: Path to CSV file
            
        Returns:
            List of vehicle dictionaries
        """
        print(f"[INFO] Parsing CSV: {csv_path}")
        
        # Read CSV with cp932 encoding (Japanese Shift-JIS)
        # Skip metadata rows and start from the header row
        header_row = self._find_header_row(csv_path)
        df = pd.read_csv(csv_path, encoding='cp932', skiprows=header_row, on_bad_lines='skip')
        
        print(f"[INFO] Found {len(df)} vehicles in CSV")
        print(f"[INFO] Columns: {len(df.columns)}")
        
        # Convert to list of dictionaries with mapped field names
        vehicles = []
        
        for idx, row in df.iterrows():
            vehicle = {
                "index": idx + 1,
                "scraped_at": datetime.now().isoformat()
            }
            
            # Map fields
            for csv_col, our_field in self.FIELD_MAPPING.items():
                if csv_col in df.columns:
                    value = row[csv_col]
                    # Convert NaN to None
                    if pd.isna(value):
                        vehicle[our_field] = None
                    else:
                        vehicle[our_field] = str(value).strip() if value else None
            
            # Add derived fields
            vehicle["status"] = self._determine_status(vehicle)
            vehicle["price_body_numeric"] = self._extract_numeric_price(vehicle.get("price_body"))
            vehicle["price_total_numeric"] = self._extract_numeric_price(vehicle.get("price_total"))
            vehicle["mileage_numeric"] = self._extract_numeric_mileage(vehicle.get("mileage"))
            vehicle["days_listed_numeric"] = self._extract_numeric(vehicle.get("days_listed"))
            
            vehicles.append(vehicle)
        
        return vehicles
    
    def _find_header_row(self, csv_path: str) -> int:
        """Find the row number where the actual data header starts"""
        with open(csv_path, 'r', encoding='cp932', errors='ignore') as f:
            for i, line in enumerate(f):
                # Header row starts with メーカー,車種,グレード (with commas, not colon)
                if line.startswith('メーカー,車種'):
                    print(f"[INFO] Found header at line {i + 1}")
                    return i
        print("[WARNING] Header row not found, using row 0")
        return 0
    
    def _determine_status(self, vehicle: Dict) -> str:
        """Determine vehicle status from publication and stock status"""
        pub_status = vehicle.get("publication_status") or ""
        stock_status = vehicle.get("stock_status") or ""
        
        if "成約" in pub_status or "成約" in stock_status:
            return "売約済"
        elif "掲載" in pub_status:
            return "販売中"
        elif "非掲載" in pub_status:
            return "非公開"
        else:
            return "不明"
    
    def _extract_numeric_price(self, price_str: str) -> int:
        """Extract numeric price from string like '34.0万円' or '340000'"""
        if not price_str:
            return None
        
        try:
            # If already numeric
            if price_str.isdigit():
                return int(price_str)
            
            # Extract number from format like "34.0万円"
            match = re.search(r'([\d.]+)万円', price_str)
            if match:
                return int(float(match.group(1)) * 10000)
            
            # Try direct number extraction
            match = re.search(r'(\d+)', price_str)
            if match:
                return int(match.group(1))
        except:
            pass
        
        return None
    
    def _extract_numeric_mileage(self, mileage_str: str) -> int:
        """Extract numeric mileage from string like '5.4万km' or '54000'"""
        if not mileage_str:
            return None
        
        try:
            if mileage_str.isdigit():
                return int(mileage_str)
            
            # Extract from format like "5.4万km"
            match = re.search(r'([\d.]+)万km', mileage_str)
            if match:
                return int(float(match.group(1)) * 10000)
            
            match = re.search(r'(\d+)', mileage_str)
            if match:
                return int(match.group(1))
        except:
            pass
        
        return None
    
    def _extract_numeric(self, value: str) -> int:
        """Extract numeric value from string"""
        if not value:
            return None
        
        try:
            if isinstance(value, (int, float)):
                return int(value)
            
            match = re.search(r'(\d+)', str(value))
            if match:
                return int(match.group(1))
        except:
            pass
        
        return None
    
    def save_to_json(self, vehicles: List[Dict], output_path: str = None):
        """Save parsed vehicles to JSON"""
        if not output_path:
            output_dir = Path("data/parsed")
            output_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = output_dir / f"inventory_parsed_{timestamp}.json"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(vehicles, f, ensure_ascii=False, indent=2)
        
        print(f"[SUCCESS] Parsed data saved to: {output_path}")
        return output_path


def main():
    """Parse the most recent CSV file"""
    csv_dir = Path("data/csv")
    
    if not csv_dir.exists():
        print("[ERROR] No CSV files found. Run csv_downloader first.")
        return 1
    
    # Find most recent CSV
    csv_files = sorted(csv_dir.glob("inventory_*.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    
    if not csv_files:
        print("[ERROR] No inventory CSV files found")
        return 1
    
    latest_csv = csv_files[0]
    print(f"[INFO] Parsing: {latest_csv.name}\n")
    
    parser = CMatchCSVParser()
    vehicles = parser.parse_csv(str(latest_csv))
    
    # Save parsed data
    json_path = parser.save_to_json(vehicles)
    
    # Show summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"Total vehicles: {len(vehicles)}")
    
    # Count by status
    status_counts = {}
    for v in vehicles:
        status = v.get("status", "不明")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print("\nBy status:")
    for status, count in status_counts.items():
        print(f"  {status}: {count}")
    
    # Show first vehicle
    if vehicles:
        print("\nFirst vehicle (example):")
        print(json.dumps(vehicles[0], ensure_ascii=False, indent=2))
    
    return 0


if __name__ == "__main__":
    exit(main())
