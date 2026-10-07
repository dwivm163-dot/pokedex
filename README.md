# Pokédex

A responsive retro Pokédex built with HTML, CSS, JavaScript, and Chart.js, using the included `pokemon.csv` directly.

## Run

From this folder, run:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. A web server is required because the app loads the CSV with `fetch()`.

Select a Pokémon, optionally select a comparison Pokémon, and use Radar or Bar to change the chart. Choose “No comparison” to return to a single record. The table always shows exact stat values, and both charts use the same 0–255 scale.

Both profiles fetch images from [PokéAPI](https://pokeapi.co/docs/v2#pokemon) using async functions and `fetch()`. The national Pokédex number selects the default Pokémon sprite; pixel sprites are preferred, with official artwork as a fallback. Requests are cached in memory for the session. Loading and unavailable-image messages keep the stats usable if an API or image request fails. Images require internet access; no local image directory is needed. All stats still come from `pokemon.csv`.

## Dataset mapping

| Display | CSV column |
| --- | --- |
| HP | `hp` |
| Attack | `attack` |
| Defense | `defense` |
| Special Attack | `sp_attack` |
| Special Defense | `sp_defense` |
| Speed | `speed` |
| Total | `base_total` |
| Types | `type1`, `type2` |
| Classification | `classfication` (spelling in source) |
| Other details | `pokedex_number`, `name`, `abilities`, `height_m`, `weight_kg`, `generation`, `capture_rate`, `base_happiness`, `is_legendary` |

There are 801 records and seven generations. Missing height or weight displays as “Unknown”; an empty secondary type is omitted. No Pokémon fields are added or inferred. Chart.js is pinned to 4.4.8 via jsDelivr and requires internet access; Google Fonts also uses the network, with local font fallbacks. If Chart.js is unavailable, profiles and the stats table still work.
