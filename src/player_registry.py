"""Player registry for caching confirmed player matches."""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
from dataclasses import dataclass, asdict

from .config import debug_log


@dataclass
class RegisteredPlayer:
    """A player stored in the registry."""
    dupr_id: str
    dupr_name: str
    rating: Optional[float]
    location: Optional[str]
    last_updated: str
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> 'RegisteredPlayer':
        """Create from dictionary."""
        return cls(
            dupr_id=data.get('dupr_id', ''),
            dupr_name=data.get('dupr_name', ''),
            rating=data.get('rating'),
            location=data.get('location'),
            last_updated=data.get('last_updated', '')
        )


class PlayerRegistry:
    """Registry for caching confirmed player matches.
    
    Stores mappings from search names to DUPR player info,
    allowing instant lookups for previously matched players.
    """
    
    def __init__(self, registry_file: Optional[str] = None):
        """Initialize the registry.
        
        Args:
            registry_file: Path to the registry JSON file. If None, uses default location.
        """
        if registry_file is None:
            project_root = Path(__file__).parent.parent
            registry_file = project_root / "config" / "player_registry.json"
        
        self._filepath = Path(registry_file)
        self._registry: Dict[str, RegisteredPlayer] = {}
        self._dirty = False  # Track if changes need to be saved
        
        self._load()
    
    def _normalize_key(self, name: str) -> str:
        """Normalize a name for use as a registry key."""
        return name.lower().strip()
    
    def _load(self) -> None:
        """Load the registry from file."""
        if not self._filepath.exists():
            debug_log(f"Player registry not found at {self._filepath}")
            return
        
        try:
            with open(self._filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for name, player_data in data.items():
                self._registry[self._normalize_key(name)] = RegisteredPlayer.from_dict(player_data)
            
            debug_log(f"Loaded {len(self._registry)} players from registry")
            
        except (json.JSONDecodeError, IOError) as e:
            debug_log(f"Error loading player registry: {e}")
    
    def save(self) -> None:
        """Save the registry to file."""
        if not self._dirty:
            return
        
        try:
            # Ensure directory exists
            self._filepath.parent.mkdir(parents=True, exist_ok=True)
            
            # Convert to serializable format
            data = {name: player.to_dict() for name, player in self._registry.items()}
            
            with open(self._filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            
            self._dirty = False
            debug_log(f"Saved {len(self._registry)} players to registry")
            
        except IOError as e:
            debug_log(f"Error saving player registry: {e}")
    
    def get(self, search_name: str) -> Optional[RegisteredPlayer]:
        """Get a player from the registry by search name.
        
        Args:
            search_name: The name that was used to search for the player.
            
        Returns:
            RegisteredPlayer if found, None otherwise.
        """
        key = self._normalize_key(search_name)
        return self._registry.get(key)
    
    def register(
        self,
        search_name: str,
        dupr_id: str,
        dupr_name: str,
        rating: Optional[float] = None,
        location: Optional[str] = None
    ) -> None:
        """Register a player mapping.
        
        Args:
            search_name: The name used to search for the player.
            dupr_id: The DUPR ID of the matched player.
            dupr_name: The full name in DUPR.
            rating: The player's rating.
            location: The player's location.
        """
        key = self._normalize_key(search_name)
        
        player = RegisteredPlayer(
            dupr_id=dupr_id,
            dupr_name=dupr_name,
            rating=rating,
            location=location,
            last_updated=datetime.now().isoformat()
        )
        
        self._registry[key] = player
        self._dirty = True
        
        debug_log(f"Registered '{search_name}' -> '{dupr_name}' ({dupr_id})")
    
    def contains(self, search_name: str) -> bool:
        """Check if a name is in the registry.
        
        Args:
            search_name: The name to check.
            
        Returns:
            True if the name is registered.
        """
        return self._normalize_key(search_name) in self._registry
    
    def remove(self, search_name: str) -> bool:
        """Remove a player from the registry.
        
        Args:
            search_name: The name to remove.
            
        Returns:
            True if the player was removed, False if not found.
        """
        key = self._normalize_key(search_name)
        if key in self._registry:
            del self._registry[key]
            self._dirty = True
            return True
        return False
    
    def __len__(self) -> int:
        """Return the number of registered players."""
        return len(self._registry)
    
    def __contains__(self, search_name: str) -> bool:
        """Check if a name is in the registry."""
        return self.contains(search_name)


# Global instance for convenience
_registry: Optional[PlayerRegistry] = None


def get_registry() -> PlayerRegistry:
    """Get the global PlayerRegistry instance."""
    global _registry
    if _registry is None:
        _registry = PlayerRegistry()
    return _registry


def save_registry() -> None:
    """Save the global registry to file."""
    if _registry is not None:
        _registry.save()


def reset_registry() -> None:
    """Reset the global registry (useful for testing)."""
    global _registry
    _registry = None
