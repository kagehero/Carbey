"""
Bulk Image Scraper for C-MATCH vehicles
Scrapes all vehicle images from the registration list page at once
"""

import time
import json
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

from playwright.sync_api import sync_playwright, Page

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import Config


class BulkImageScraper:
    """Scrape all vehicle images from registration list page"""
    
    def __init__(self, login_id: str = None, password: str = None):
        self.login_id = login_id or Config.CMATCH_LOGIN_ID
        self.password = password or Config.CMATCH_PASSWORD
        
        if not self.login_id or not self.password:
            raise ValueError("Login credentials not provided")
    
    def scrape_all_images(self, max_pages: int = None) -> Dict[str, str]:
        """
        Scrape all vehicle images from the registration list page with pagination
        
        Args:
            max_pages: Maximum number of pages to scrape (None = all pages)
        
        Returns:
            Dictionary mapping vehicle_code -> main_image_url
        """
        print("="*70)
        print("Bulk Image Scraper - Extracting all images from registration list")
        print("="*70)
        
        image_map = {}
        
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=Config.BROWSER_HEADLESS,
                slow_mo=Config.BROWSER_SLOW_MO
            )
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080}
            )
            page = context.new_page()
            
            try:
                # Login
                self._login(page)
                
                # Navigate to registration list
                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Loading registration list...")
                list_url = "https://c-match.carsensor.net/vehicles/registrationList/"
                page.goto(list_url, wait_until="domcontentloaded", timeout=Config.REQUEST_TIMEOUT)
                time.sleep(2)
                
                # Detect total pages
                total_pages = self._get_total_pages(page)
                print(f"  📄 Total pages: {total_pages}")
                
                if max_pages:
                    total_pages = min(total_pages, max_pages)
                    print(f"  🔢 Limiting to {total_pages} pages")
                
                # Scrape each page
                for page_num in range(1, total_pages + 1):
                    print(f"\n[Page {page_num}/{total_pages}]")
                    
                    # Navigate to page if not the first one
                    if page_num > 1:
                        page_url = f"{list_url}?searchParamsRegistList.page={page_num}"
                        page.goto(page_url, wait_until="domcontentloaded", timeout=Config.REQUEST_TIMEOUT)
                        time.sleep(2)
                    
                    # Extract images from this page
                    page_images = self._extract_images_from_page(page)
                    
                    print(f"  ✓ Found {len(page_images)} images on this page")
                    
                    # Add to image map
                    for code, url in page_images.items():
                        if code not in image_map:
                            image_map[code] = url
                
                print(f"\n  ✅ Total vehicles with images: {len(image_map)}")
                
                # Save debug info for last page
                debug_dir = Path("debug/images")
                debug_dir.mkdir(parents=True, exist_ok=True)
                
                html_path = debug_dir / "registration_list_last_page.html"
                with open(html_path, 'w', encoding='utf-8') as f:
                    f.write(page.content())
                print(f"  📄 Last page HTML saved: {html_path}")
                
                return image_map
                
            finally:
                browser.close()
    
    def _get_total_pages(self, page: Page) -> int:
        """Detect total number of pages from pagination"""
        try:
            content = page.content()
            
            # Method 1: Look for "X / Y" pattern in pagination
            match = re.search(r'(\d+)\s*/\s*(\d+)', content)
            if match:
                total = int(match.group(2))
                print(f"  Detected {total} pages from pagination text")
                return total
            
            # Method 2: Find all page links and get max page number
            page_links = page.locator('a[href*="page="]').all()
            if page_links:
                max_page = 1
                for link in page_links:
                    href = link.get_attribute('href') or ''
                    page_match = re.search(r'page=(\d+)', href)
                    if page_match:
                        page_num = int(page_match.group(1))
                        max_page = max(max_page, page_num)
                
                if max_page > 1:
                    print(f"  Detected {max_page} pages from page links")
                    return max_page
            
            # Method 3: Calculate from total count
            # Look for text like "305台" or "total: 305"
            count_match = re.search(r'(\d+)\s*台', content)
            if count_match:
                total_vehicles = int(count_match.group(1))
                total_pages = (total_vehicles + 49) // 50  # 50 vehicles per page
                print(f"  Detected {total_vehicles} vehicles = {total_pages} pages")
                return total_pages
            
            # Method 4: Try to navigate to a high page number and see if it exists
            print(f"  Could not detect pagination, trying to probe...")
            for test_page in [10, 7, 5, 3]:
                try:
                    test_url = f"https://c-match.carsensor.net/vehicles/registrationList/?searchParamsRegistList.page={test_page}"
                    response = page.goto(test_url, wait_until="domcontentloaded", timeout=10000)
                    time.sleep(1)
                    
                    # Check if page has content
                    if 'img[src*="/images/wnm/"]' in page.content():
                        images = page.locator('img[src*="/images/wnm/"]').count()
                        if images > 0:
                            print(f"  Page {test_page} exists with {images} images")
                            # Go back to page 1
                            page.goto("https://c-match.carsensor.net/vehicles/registrationList/", 
                                    wait_until="domcontentloaded", timeout=Config.REQUEST_TIMEOUT)
                            return test_page
                except:
                    continue
            
            # Default to 1 page if can't detect
            print(f"  Defaulting to 1 page")
            return 1
            
        except Exception as e:
            print(f"  Error detecting pages: {e}")
            return 1
    
    def _extract_images_from_page(self, page: Page) -> Dict[str, str]:
        """Extract all vehicle images from current page"""
        image_map = {}
        
        # Get HTML content
        html_content = page.content()
        
        # Use regex to find all image URLs
        pattern = r'https://c-match\.carsensor\.net/images/wnm/\d+/\d+/([A-Z0-9]+)/\1_\d+S\.JPG'
        matches = re.findall(pattern, html_content, re.IGNORECASE)
        
        # Build image map
        for vehicle_code in set(matches):
            img_pattern = f'https://c-match\\.carsensor\\.net/images/wnm/\\d+/\\d+/{vehicle_code}/{vehicle_code}_\\d+S\\.JPG'
            img_match = re.search(img_pattern, html_content, re.IGNORECASE)
            
            if img_match:
                full_url = img_match.group(0)
                image_map[vehicle_code] = full_url
        
        return image_map
    
    def _login(self, page: Page):
        """Login to C-MATCH"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Logging in...")
        page.goto(Config.CMATCH_LOGIN_URL, wait_until="networkidle", timeout=Config.REQUEST_TIMEOUT)
        
        page.locator('input[name="loginId"]').fill(self.login_id)
        page.locator('input[name="passwordCd"]').fill(self.password)
        page.locator('input[type="submit"][name="doLogin"]').click()
        
        page.wait_for_load_state("networkidle", timeout=Config.REQUEST_TIMEOUT)
        time.sleep(Config.SCRAPING_DELAY)
        
        if f"ID：{self.login_id}" not in page.content():
            raise Exception("Login failed")
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Login successful!")


def main():
    """Test bulk image scraper"""
    scraper = BulkImageScraper()
    image_map = scraper.scrape_all_images()
    
    print("\n" + "="*70)
    print(f"RESULTS: {len(image_map)} vehicles with images")
    print("="*70)
    
    # Show first 10
    for idx, (code, url) in enumerate(list(image_map.items())[:10], 1):
        print(f"{idx}. {code}: {url}")
    
    if len(image_map) > 10:
        print(f"\n... and {len(image_map) - 10} more")
    
    # Save to JSON
    output_dir = Path("data/images")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"image_map_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(image_map, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Image map saved to: {output_file}")
    
    return 0


if __name__ == "__main__":
    exit(main())
