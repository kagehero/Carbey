"""
Image scraper adapter - uses construct_image_urls for URL-based image resolution.
Provides CMatchImageScraper interface for compatibility with carbey.py sync --images.
"""

from typing import List, Dict

from scraper.construct_image_urls import construct_all_image_urls


class CMatchImageScraper:
    """Scrape/construct vehicle image URLs. Uses URL construction (no browser)."""

    def scrape_images(
        self,
        vehicles: List[Dict],
        max_vehicles: int = None,
        verify: bool = True
    ) -> List[Dict]:
        """
        Add main_image_url to vehicles using constructed URLs.

        Args:
            vehicles: List of vehicle dicts with vehicle_code
            max_vehicles: Limit to first N vehicles (None = all)
            verify: Verify each URL exists (slower but accurate)

        Returns:
            Updated vehicles with main_image_url where found
        """
        to_process = vehicles[:max_vehicles] if max_vehicles else vehicles
        image_map = construct_all_image_urls(to_process, verify=verify)

        for vehicle in vehicles:
            code = vehicle.get('vehicle_code')
            if code and code in image_map:
                vehicle['main_image_url'] = image_map[code]
                vehicle['image_urls'] = [image_map[code]]

        return vehicles
