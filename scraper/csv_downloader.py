"""
C-MATCH CSV Downloader
Downloads inventory data as CSV directly from C-MATCH
"""

import time
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import Config


class CMatchCSVDownloader:
    """Download inventory CSV from C-MATCH"""
    
    def __init__(self, login_id: str = None, password: str = None):
        self.login_id = login_id or Config.CMATCH_LOGIN_ID
        self.password = password or Config.CMATCH_PASSWORD
        
        if not self.login_id or not self.password:
            raise ValueError("Login credentials not provided")
    
    def download_csv(self, output_dir: Path = None) -> str:
        """
        Download inventory CSV file
        
        Args:
            output_dir: Directory to save CSV file
            
        Returns:
            Path to downloaded CSV file
        """
        output_path = output_dir or Config.CSV_DIR
        output_path.mkdir(parents=True, exist_ok=True)
        
        with sync_playwright() as p:
            print("="*70)
            print("C-MATCH CSV Downloader")
            print("="*70)
            
            # Launch browser with download handling
            browser = p.chromium.launch(
                headless=Config.BROWSER_HEADLESS,
                slow_mo=Config.BROWSER_SLOW_MO
            )
            context = browser.new_context(
                accept_downloads=True,
                viewport={"width": 1920, "height": 1080}
            )
            page = context.new_page()
            
            try:
                # Login
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Logging in...")
                page.goto(Config.CMATCH_LOGIN_URL, wait_until="networkidle", timeout=Config.REQUEST_TIMEOUT)
                
                # Fill login form
                page.locator('input[name="loginId"]').fill(self.login_id)
                page.locator('input[name="passwordCd"]').fill(self.password)
                page.locator('input[type="submit"][name="doLogin"]').click()
                
                page.wait_for_load_state("networkidle", timeout=Config.REQUEST_TIMEOUT)
                time.sleep(Config.SCRAPING_DELAY)
                
                # Verify login
                if f"ID：{self.login_id}" not in page.content():
                    raise Exception("Login failed")
                
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Login successful!")
                
                # Navigate to inventory list
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Navigating to inventory list...")
                page.goto(Config.CMATCH_LOGIN_URL, wait_until="networkidle", timeout=Config.REQUEST_TIMEOUT)
                time.sleep(Config.SCRAPING_DELAY)
                
                # Click download CSV button
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Initiating CSV download...")
                
                # Handle the confirmation dialog
                page.on("dialog", lambda dialog: dialog.accept())
                
                # Start waiting for download before clicking
                with page.expect_download(timeout=Config.REQUEST_TIMEOUT) as download_info:
                    # Click the download link
                    download_link = page.locator('a#downloadCsv')
                    download_link.click()
                
                download = download_info.value
                
                # Save the file
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"inventory_{timestamp}.csv"
                filepath = output_path / filename
                
                download.save_as(filepath)
                
                print(f"[{datetime.now().strftime('%H:%M:%S')}] CSV downloaded successfully!")
                print(f"[SUCCESS] Saved to: {filepath}")
                
                # Convert to UTF-8 for easier processing
                utf8_filepath = output_path / f"inventory_{timestamp}_utf8.csv"
                with open(filepath, 'r', encoding='cp932') as f_in:
                    content = f_in.read()
                with open(utf8_filepath, 'w', encoding='utf-8-sig', newline='') as f_out:
                    f_out.write(content)
                
                print(f"[SUCCESS] UTF-8 version saved to: {utf8_filepath}")
                print("="*70)
                
                return str(filepath)
                
            except Exception as e:
                print(f"[ERROR] Download failed: {e}")
                raise
            finally:
                browser.close()


def main():
    """Main execution"""
    downloader = CMatchCSVDownloader()
    
    try:
        csv_file = downloader.download_csv()
        print(f"\n✓ CSV file ready: {csv_file}")
        
        # Show file info
        filepath = Path(csv_file)
        if filepath.exists():
            size_kb = filepath.stat().st_size / 1024
            print(f"  File size: {size_kb:.1f} KB")
            
            # Show first few lines (try multiple encodings)
            print("\n  First 5 lines:")
            encodings = ['shift_jis', 'utf-8-sig', 'cp932', 'utf-8']
            content = None
            
            for encoding in encodings:
                try:
                    with open(filepath, 'r', encoding=encoding) as f:
                        content = f.read()
                    print(f"  Encoding detected: {encoding}")
                    break
                except UnicodeDecodeError:
                    continue
            
            if content:
                lines = content.split('\n')
                for i, line in enumerate(lines[:5], 1):
                    print(f"    {line[:100]}")
            else:
                print("  [WARNING] Could not decode CSV with common encodings")
        
        return 0
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
