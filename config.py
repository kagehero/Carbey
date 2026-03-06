"""
Configuration management for Carbey scraper
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Application configuration"""
    
    # C-MATCH Credentials
    CMATCH_LOGIN_ID = os.getenv("CMATCH_LOGIN_ID")
    CMATCH_PASSWORD = os.getenv("CMATCH_PASSWORD")
    
    # C-MATCH URLs
    CMATCH_BASE_URL = "https://c-match.carsensor.net"
    CMATCH_LOGIN_URL = f"{CMATCH_BASE_URL}/vehicles/registrationList/"
    CMATCH_CSV_DOWNLOAD_URL = f"{CMATCH_BASE_URL}/vehicles/registrationList/doDownloadCsv"
    
    # Scraping settings
    SCRAPING_DELAY = int(os.getenv("SCRAPING_DELAY", "2"))
    MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "60000"))
    
    # Browser settings
    BROWSER_HEADLESS = os.getenv("BROWSER_HEADLESS", "true").lower() == "true"
    BROWSER_SLOW_MO = int(os.getenv("BROWSER_SLOW_MO", "0"))
    
    # Paths
    PROJECT_ROOT = Path(__file__).parent
    DATA_DIR = PROJECT_ROOT / "data"
    CSV_DIR = DATA_DIR / "csv"
    PARSED_DIR = DATA_DIR / "parsed"
    DEBUG_DIR = DATA_DIR / "debug"
    SCREENSHOTS_DIR = PROJECT_ROOT / "screenshots"
    LOGS_DIR = PROJECT_ROOT / "logs"
    
    # CSV settings
    CSV_ENCODING = "cp932"  # Shift-JIS for Japanese
    CSV_OUTPUT_ENCODING = "utf-8-sig"
    
    # Output settings
    SAVE_RAW_CSV = True
    SAVE_UTF8_CSV = True
    SAVE_JSON = True
    
    # Analytics thresholds (from requirements)
    STAGNATION_BANDS = [30, 45, 60, 180]  # Days
    DISCOUNT_FLAG_DAYS = 60  # 値下げ検討フラグ threshold
    DISCOUNT_FLAG_CVR = 2.0  # CVR threshold (%)
    
    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = "%(asctime)s - %(levelname)s - %(message)s"

    # Supabase settings (for saving inventory to DB)
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    SUPABASE_TABLE = os.getenv("SUPABASE_TABLE", "inventories")
    SUPABASE_CONFLICT_COLUMN = os.getenv("SUPABASE_CONFLICT_COLUMN", "vehicle_code")
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        errors = []
        
        if not cls.CMATCH_LOGIN_ID:
            errors.append("CMATCH_LOGIN_ID not set in .env")
        
        if not cls.CMATCH_PASSWORD:
            errors.append("CMATCH_PASSWORD not set in .env")

        if not cls.SUPABASE_URL:
            errors.append("SUPABASE_URL not set in .env")

        if not cls.SUPABASE_KEY:
            errors.append("SUPABASE_KEY not set in .env")
        
        if errors:
            raise ValueError("Configuration errors:\n" + "\n".join(f"  - {e}" for e in errors))
        
        return True
    
    @classmethod
    def create_directories(cls):
        """Create required directories"""
        cls.CSV_DIR.mkdir(parents=True, exist_ok=True)
        cls.PARSED_DIR.mkdir(parents=True, exist_ok=True)
        cls.DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        cls.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
        cls.LOGS_DIR.mkdir(parents=True, exist_ok=True)
    
    @classmethod
    def get_latest_file(cls, directory: Path, pattern: str):
        """Get most recent file matching pattern"""
        files = sorted(directory.glob(pattern), 
                      key=lambda p: p.stat().st_mtime, reverse=True)
        return files[0] if files else None


# Validate on import
try:
    Config.validate()
    Config.create_directories()
except ValueError as e:
    print(f"[ERROR] {e}")
    print("\nPlease create .env file with your C-MATCH credentials.")
    print("See .env.example for template.")
