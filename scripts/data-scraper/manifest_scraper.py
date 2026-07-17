"""GameTora manifest fetchers for support card stats and catalog types.

Uses the public JSON manifest API (no Selenium). Outputs land in src/data/.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests

DATA_DIR = Path(__file__).resolve().parents[2] / "src" / "data"
GAMETORA_MANIFESTS_URL = "https://gametora.com/data/manifests/umamusume.json"
GAMETORA_MANIFEST_DATA_BASE_URL = "https://gametora.com/data/umamusume"
UMAPYOI_SUPPORT_URL = "https://umapyoi.net/api/v1/support/{support_id}"
UMAPYOI_CHARACTER_IDS_URL = "https://umapyoi.net/api/v1/character"
UMAPYOI_CHARACTER_LIST_URL = "https://umapyoi.net/api/v1/character/list"
UMAPYOI_OUTFIT_CHARACTER_URL = "https://umapyoi.net/api/v1/outfit/character/{game_id}"

MANIFEST_TRACK_KEYS = (
    "characters",
    "support-cards",
    "support_effects",
    "skills",
)

RARITY_LABEL = {1: "R", 2: "SR", 3: "SSR"}

TYPE_LABEL = {
    "speed": "Speed",
    "stamina": "Stamina",
    "power": "Power",
    "guts": "Guts",
    "wit": "Wit",
    "intelligence": "Wit",
    "friend": "Groupe",
    "group": "Groupe",
}

# GameTora effect id → output field on supportCardStats.json
EFFECT_FIELDS = {
    1: "friendshipBonus",
    2: "moodEffect",
    8: "trainingEffectiveness",
    14: "initialFriendship",
    15: "raceBonus",
    16: "fanBonus",
    17: "hintLevel",
    18: "hintFrequency",
    19: "specialtyPriority",
    27: "failureProtection",
    28: "energyCostReduction",
}

INIT_STAT_EFFECTS = {
    9: "speed",
    10: "stamina",
    11: "power",
    12: "guts",
    13: "wit",
    30: "skillPoints",
}

# umapyoi.net's support-card `type` field uses its own vocabulary (confirmed via a live
# sample: support 30054 returns type="Wisdom"). Unrecognized values are left unmapped
# rather than guessed, since a wrong guess would silently defeat cross-validation.
UMAPYOI_TYPE_LABEL = {
    "speed": "Speed",
    "stamina": "Stamina",
    "power": "Power",
    "guts": "Guts",
    "wisdom": "Wit",
    "friend": "Groupe",
}

# umapyoi.net's per-outfit growth-rate fields, in the order characterPresets.json's
# growthBonus keys are output (confirmed via a live sample: character 1001's base outfit
# returns talent_speed=10, matching Special Week's committed Speed growth bonus of 10).
UMAPYOI_GROWTH_FIELDS = (
    ("talent_speed", "Speed"),
    ("talent_stamina", "Stamina"),
    ("talent_pow", "Power"),
    ("talent_guts", "Guts"),
    ("talent_wiz", "Wit"),
)


def fetch_manifest_index() -> Dict[str, str]:
    response = requests.get(GAMETORA_MANIFESTS_URL, timeout=60)
    response.raise_for_status()
    return response.json()


def fetch_manifest_blob(manifest_name: str, manifest_index: Optional[Dict[str, str]] = None) -> Any:
    index = manifest_index or fetch_manifest_index()
    manifest_id = index[manifest_name]
    url = f"{GAMETORA_MANIFEST_DATA_BASE_URL}/{manifest_name}.{manifest_id}.json"
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    return response.json()


def tracked_manifest_versions(manifest_index: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    index = manifest_index or fetch_manifest_index()
    return {key: index[key] for key in MANIFEST_TRACK_KEYS if key in index}


def lv50_value(effect_row: List[int]) -> Optional[int]:
    for value in reversed(effect_row[1:]):
        if value != -1:
            return value
    return None


def decode_card_stats(card: Dict[str, Any]) -> Dict[str, Any]:
    stats: Dict[str, Any] = {
        "supportId": card.get("support_id"),
        "variant": card.get("title_en"),
        "rarity": RARITY_LABEL.get(card.get("rarity"), "R"),
        "type": TYPE_LABEL.get(card.get("type"), card.get("type", "").title()),
        "releaseEn": card.get("release_en"),
    }
    init_stats: Dict[str, int] = {}

    for row in card.get("effects") or []:
        effect_id = row[0]
        value = lv50_value(row)
        if value is None:
            continue
        field = EFFECT_FIELDS.get(effect_id)
        if field:
            stats[field] = value
            continue
        init_key = INIT_STAT_EFFECTS.get(effect_id)
        if init_key:
            init_stats[init_key] = value

    if init_stats:
        stats["initStats"] = init_stats

    return stats


def card_sort_key(card: Dict[str, Any]) -> Tuple[int, str, int]:
    """Prefer highest rarity, then newest EN release, then highest support id."""
    rarity = card.get("rarity") or 0
    release = card.get("release_en") or ""
    support_id = card.get("support_id") or 0
    return (rarity, release, support_id)


def pick_best_cards(
    cards: List[Dict[str, Any]],
    character_names: Optional[set] = None,
    en_only: bool = True,
) -> Dict[str, Dict[str, Any]]:
    """Pick one representative EN card per character name."""
    filtered: List[Dict[str, Any]] = []
    for card in cards:
        name = card.get("char_name")
        if not name:
            continue
        if character_names is not None and name not in character_names:
            continue
        if en_only and not card.get("release_en"):
            continue
        filtered.append(card)

    by_name: Dict[str, List[Dict[str, Any]]] = {}
    for card in filtered:
        by_name.setdefault(card["char_name"], []).append(card)

    best: Dict[str, Dict[str, Any]] = {}
    for name, variants in by_name.items():
        chosen = max(variants, key=card_sort_key)
        best[name] = decode_card_stats(chosen)
    return best


def build_support_card_types(stats: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, str]]:
    return {
        name: {"name": name, "type": entry["type"]}
        for name, entry in stats.items()
        if entry.get("type")
    }


def fetch_umapyoi_support_card(support_id: int) -> Optional[Dict[str, Any]]:
    """Fetches a single support card entry from umapyoi.net by its GameTora support id."""
    url = UMAPYOI_SUPPORT_URL.format(support_id=support_id)
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as exc:
        logging.warning("Failed to fetch umapyoi support card %s: %s", support_id, exc)
        return None


def find_umapyoi_mismatch(
    card_name: str,
    gametora_entry: Dict[str, Any],
    umapyoi_entry: Dict[str, Any],
) -> Optional[str]:
    """Compares a GameTora-derived stats entry against its umapyoi.net counterpart.

    Returns a human-readable mismatch description, or None when type and rarity agree
    (an unrecognized umapyoi type is logged separately and treated as inconclusive).
    """
    messages: List[str] = []

    umapyoi_type_raw = umapyoi_entry.get("type")
    umapyoi_type = UMAPYOI_TYPE_LABEL.get((umapyoi_type_raw or "").lower())
    if umapyoi_type is None:
        logging.warning(
            "%s: unrecognized umapyoi type %r, skipping type cross-validation.", card_name, umapyoi_type_raw
        )
    elif umapyoi_type != gametora_entry.get("type"):
        messages.append(f"type GameTora={gametora_entry.get('type')!r} vs umapyoi={umapyoi_type!r}")

    umapyoi_rarity = umapyoi_entry.get("rarity_string")
    if umapyoi_rarity and umapyoi_rarity != gametora_entry.get("rarity"):
        messages.append(f"rarity GameTora={gametora_entry.get('rarity')!r} vs umapyoi={umapyoi_rarity!r}")

    if not messages:
        return None
    return f"{card_name}: " + "; ".join(messages)


def cross_validate_with_umapyoi(stats: Dict[str, Dict[str, Any]]) -> List[str]:
    """Fetches each card's umapyoi.net entry and logs a warning for any type/rarity disagreement.

    This is the automated check for the class of error that let a fabricated "Gold Ship
    (Guts)" entry ship undetected: any future scrape that disagrees with umapyoi's
    independently-sourced data now gets flagged immediately instead of drifting silently.

    Returns the list of mismatch descriptions (also logged as warnings) for callers that
    want to surface them (e.g. failing CI).
    """
    mismatches: List[str] = []
    for name, entry in stats.items():
        support_id = entry.get("supportId")
        if support_id is None:
            continue
        umapyoi_entry = fetch_umapyoi_support_card(support_id)
        time.sleep(0.1)
        if umapyoi_entry is None:
            continue
        mismatch = find_umapyoi_mismatch(name, entry, umapyoi_entry)
        if mismatch:
            mismatches.append(mismatch)
            logging.warning("umapyoi cross-validation mismatch: %s", mismatch)
    return mismatches


def _normalize_umapyoi_character_name(name: str) -> str:
    """Normalizes a character name for cross-referencing against umapyoi.net's roster.

    umapyoi.net's `name_en` values carry some cosmetic differences from GameTora's - e.g. zero-width
    spaces and non-breaking spaces in a couple of names, and periods in "T.M. Opera O" vs GameTora's
    "TM Opera O" - so names are compared with those stripped rather than verbatim.
    """
    return name.replace("​", "").replace("\xa0", " ").replace(".", "").strip().lower()


def fetch_umapyoi_character_name_to_game_id() -> Dict[str, int]:
    """Fetches umapyoi.net's full character roster and returns a {name_en: game_id} map."""
    ids_response = requests.get(UMAPYOI_CHARACTER_IDS_URL, timeout=30)
    ids_response.raise_for_status()
    game_ids = ids_response.json()  # [{"game_id": int, "web_id": int}, ...]; some entries lack game_id.

    list_response = requests.get(UMAPYOI_CHARACTER_LIST_URL, timeout=30)
    list_response.raise_for_status()
    roster = list_response.json()  # [{"id": int, "name_en": str, ...}, ...]

    web_id_to_name = {c["id"]: c["name_en"] for c in roster if c.get("name_en")}
    name_to_game_id: Dict[str, int] = {}
    for pair in game_ids:
        game_id = pair.get("game_id")
        name = web_id_to_name.get(pair.get("web_id"))
        if game_id is not None and name:
            name_to_game_id[name] = game_id
    return name_to_game_id


def fetch_umapyoi_character_outfits(game_id: int) -> Optional[List[Dict[str, Any]]]:
    """Fetches all outfit entries for a character from umapyoi.net by its in-game character id."""
    url = UMAPYOI_OUTFIT_CHARACTER_URL.format(game_id=game_id)
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as exc:
        logging.warning("Failed to fetch umapyoi outfits for character %s: %s", game_id, exc)
        return None


def find_umapyoi_growth_mismatch(
    character_name: str,
    gametora_growth: Dict[str, int],
    umapyoi_growth: Dict[str, int],
) -> Optional[str]:
    """Compares a GameTora-derived growthBonus against umapyoi.net's counterpart for the base outfit.

    Returns a human-readable mismatch description, or None when every stat agrees.
    """
    if umapyoi_growth == gametora_growth:
        return None
    return f"{character_name}: growthBonus GameTora={gametora_growth!r} vs umapyoi={umapyoi_growth!r}"


def cross_validate_growth_with_umapyoi(presets: Dict[str, Dict[str, Any]]) -> List[str]:
    """Fetches each base character's umapyoi.net entry and logs a warning for any growthBonus disagreement.

    umapyoi.net doesn't expose aptitude grades (distance/surface/running-style), so it can't be used to
    add or grade new presets - only to independently corroborate the growth-rate bonuses GameTora's
    character-cards manifest provides. Curated outfit/alternate-unit entries (keys like "Oguri Cap
    (Christmas)") are skipped: without aptitude data to narrow by, they can't be unambiguously matched
    to one of umapyoi's outfits for a character. Mismatches are logged for human review, not
    auto-corrected, since either source could be the stale one.

    Returns the list of mismatch descriptions (also logged as warnings) for callers that want to
    surface them (e.g. failing CI).
    """
    try:
        name_to_game_id = fetch_umapyoi_character_name_to_game_id()
    except requests.exceptions.RequestException as exc:
        logging.warning("Skipping umapyoi.net growth-bonus cross-check: could not reach umapyoi.net (%s).", exc)
        return []

    normalized_to_name = {_normalize_umapyoi_character_name(name): name for name in name_to_game_id}

    mismatches: List[str] = []
    checked = 0
    unresolved: List[str] = []
    for name, entry in presets.items():
        if "(" in name:
            continue
        game_id = name_to_game_id.get(name)
        if game_id is None:
            resolved = normalized_to_name.get(_normalize_umapyoi_character_name(name))
            game_id = name_to_game_id.get(resolved) if resolved else None
        if game_id is None:
            unresolved.append(name)
            continue

        outfits = fetch_umapyoi_character_outfits(game_id)
        time.sleep(0.1)
        if not outfits:
            unresolved.append(name)
            continue

        base_outfit = min(outfits, key=lambda o: o["id"])
        umapyoi_growth = {label: int(base_outfit.get(field, 0) or 0) for field, label in UMAPYOI_GROWTH_FIELDS}
        checked += 1

        mismatch = find_umapyoi_growth_mismatch(name, entry.get("growthBonus", {}), umapyoi_growth)
        if mismatch:
            mismatches.append(mismatch)
            logging.warning("umapyoi growth-bonus cross-validation mismatch: %s", mismatch)

    logging.info(
        "umapyoi.net growth-bonus cross-check: %s checked, %s mismatch(es), %s unresolved (%s).",
        checked,
        len(mismatches),
        len(unresolved),
        unresolved,
    )
    return mismatches


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=4, ensure_ascii=False)
        handle.write("\n")


def released_en_characters(manifest_index: Optional[Dict[str, str]] = None) -> List[str]:
    chars = fetch_manifest_blob("characters", manifest_index)
    return sorted(c["en_name"] for c in chars if c.get("playable_en") and c.get("en_name"))


def manifest_changed(previous: Dict[str, str], current: Dict[str, str]) -> bool:
    return any(previous.get(key) != current.get(key) for key in MANIFEST_TRACK_KEYS)


def update_manifest_game_data(
    *,
    en_only: bool = True,
    restrict_to_supports_json: bool = True,
    cross_validate: bool = True,
) -> Dict[str, Any]:
    """Regenerates supportCardStats.json, supportCardTypes.json, manifestVersions.json."""
    index = fetch_manifest_index()
    versions = tracked_manifest_versions(index)
    previous_versions = load_json(DATA_DIR / "manifestVersions.json", {})

    supports_names: Optional[set] = None
    supports_path = DATA_DIR / "supports.json"
    if restrict_to_supports_json and supports_path.exists():
        supports_names = set(load_json(supports_path, {}).keys())

    cards = fetch_manifest_blob("support-cards", index)
    stats = pick_best_cards(cards, character_names=supports_names, en_only=en_only)
    types = build_support_card_types(stats)

    save_json(DATA_DIR / "supportCardStats.json", stats)
    save_json(DATA_DIR / "supportCardTypes.json", types)
    save_json(DATA_DIR / "manifestVersions.json", versions)

    en_chars = released_en_characters(index)
    save_json(
        DATA_DIR / "releasedCharacters.json",
        {"updatedFromManifest": versions.get("characters"), "characters": en_chars},
    )

    umapyoi_mismatches = cross_validate_with_umapyoi(stats) if cross_validate else []

    result = {
        "manifestChanged": manifest_changed(previous_versions, versions),
        "previousVersions": previous_versions,
        "versions": versions,
        "supportStatsCount": len(stats),
        "releasedCharacterCount": len(en_chars),
        "umapyoiMismatches": umapyoi_mismatches,
    }
    logging.info(
        "Manifest update: %s support stats, %s EN characters, changed=%s, umapyoi mismatches=%s",
        len(stats),
        len(en_chars),
        result["manifestChanged"],
        len(umapyoi_mismatches),
    )
    return result


if __name__ == "__main__":
    logging.basicConfig(format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO)
    update_manifest_game_data()
