"""
Construct image URLs for all vehicles based on the pattern
Pattern: https://c-match.carsensor.net/images/wnm/{xxx}/{xxx}/{vehicle_code}/{vehicle_code}_002S.JPG
"""

import requests
from typing import Dict, List
import json
from pathlib import Path


def extract_path_parts(vehicle_code: str) -> tuple:
    """
    Extract path parts from vehicle code
    Example: UZ0049120114 -> (120, 114)
    Pattern: Last 6 digits split into two 3-digit groups
    """
    if len(vehicle_code) < 6:
        return None, None
    
    # Get last 6 digits
    last_6 = vehicle_code[-6:]
    
    # Split into two 3-digit groups
    part1 = last_6[:3]
    part2 = last_6[3:]
    
    return part1, part2


def construct_image_url(vehicle_code: str, image_num: str = "002") -> str:
    """
    Construct image URL from vehicle code
    
    Args:
        vehicle_code: Vehicle code (e.g., UZ0049120114)
        image_num: Image number (default: 002)
    
    Returns:
        Full image URL
    """
    part1, part2 = extract_path_parts(vehicle_code)
    
    if not part1 or not part2:
        return None
    
    return f"https://c-match.carsensor.net/images/wnm/{part1}/{part2}/{vehicle_code}/{vehicle_code}_{image_num}S.JPG"


def verify_image_exists(url: str, timeout: int = 5) -> bool:
    """Check if image URL is accessible"""
    try:
        response = requests.head(url, timeout=timeout, allow_redirects=True)
        return response.status_code == 200
    except:
        return False


def construct_all_image_urls(vehicles: List[Dict], verify: bool = False) -> Dict[str, str]:
    """
    Construct image URLs for all vehicles
    
    Args:
        vehicles: List of vehicle dictionaries
        verify: If True, verify each URL exists (slower)
    
    Returns:
        Dictionary mapping vehicle_code -> main_image_url
    """
    print("="*70)
    print("Constructing Image URLs for All Vehicles")
    print("="*70)
    
    image_map = {}
    
    for idx, vehicle in enumerate(vehicles, 1):
        vehicle_code = vehicle.get('vehicle_code')
        
        if not vehicle_code:
            continue
        
        # Try common image numbers
        for img_num in ['002', '001', '003']:
            url = construct_image_url(vehicle_code, img_num)
            
            if url:
                if verify:
                    if verify_image_exists(url):
                        image_map[vehicle_code] = url
                        print(f"  [{idx}/{len(vehicles)}] ✓ {vehicle_code}: {url}")
                        break
                    else:
                        continue
                else:
                    # Don't verify, just add
                    image_map[vehicle_code] = url
                    if idx % 50 == 0:
                        print(f"  [{idx}/{len(vehicles)}] Constructed URLs...")
                    break
    
    print(f"\n  ✅ Total: {len(image_map)} image URLs constructed")
    
    return image_map


def main():
    """Test URL construction"""
    # Test with known vehicle codes
    test_codes = [
        "UZ0051359676",  # Has image
        "UZ0049120114",  # Has image (unpublished)
        "UZ0052030962",  # Unknown
    ]
    
    print("Testing image URL construction:\n")
    
    for code in test_codes:
        url = construct_image_url(code)
        print(f"{code}:")
        print(f"  URL: {url}")
        
        # Verify
        exists = verify_image_exists(url)
        print(f"  Exists: {'✅ YES' if exists else '❌ NO'}")
        
        if not exists:
            # Try 001
            url_001 = construct_image_url(code, "001")
            exists_001 = verify_image_exists(url_001)
            print(f"  Try 001: {'✅ YES' if exists_001 else '❌ NO'} - {url_001}")
        
        print()


if __name__ == "__main__":
    main()
