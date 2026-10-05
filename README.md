# Pokédex

A responsive retro Pokédex built with HTML, CSS, JavaScript, and Chart.js, using the included `pokemon.csv` directly.

## Run

From this folder, run:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. A web server is required because the app loads the CSV with `fetch()`.

Select a Pokémon, optionally select a comparison Pokémon, and use Radar or Bar to change the chart. Choose “No comparison” to return to a single record. The table always shows exact stat values, and both charts use the same 0–255 scale.

Both profiles display local artwork from `images/`. Filenames match normalized Pokémon names, with explicit mappings in `app.js` for names with symbols and form-specific filenames. All 801 stats records have a matching image. Form-specific artwork uses the supplied image; stats continue to come from `pokemon.csv`. The accompanying `images/pokemon-images.csv` has names, types, and evolutions, but no image-path column. Missing or failed images display “Image unavailable” while the profile and charts remain usable.

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
