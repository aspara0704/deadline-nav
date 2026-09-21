# Toll road graph prototype notice

The v0.8.1 pilot graph is derived from OpenStreetMap data distributed by
Geofabrik. The pilot input is the dated Kansai extract
`kansai-260920.osm.pbf`.

- OpenStreetMap: https://www.openstreetmap.org/copyright
- Geofabrik Japan/Kansai extracts: https://download.geofabrik.de/asia/japan/kansai.html
- License: Open Data Commons Open Database License (ODbL) 1.0
- Required attribution: © OpenStreetMap contributors

The generated JSON is an OSM-derived database and must be distributed under
the applicable ODbL terms with attribution.

## Scope and safety

This graph is only a topology/distance pilot. It contains `motorway` and
`motorway_link` ways and named `motorway_junction` nodes.

Every graph edge has `tariff: "unknown"`. The graph is therefore **not a
fare table** and must not be used by the production UI to claim an exact toll.

When an OSM motorway/motorway_link way omits `oneway`, the builder assumes
the recorded node direction only instead of inventing a reverse route. This
can make the graph incomplete, but avoids creating impossible travel paths.

v0.8.1 first validates the Kansai reference corridor, including 久御山南IC,
枚方東IC, 巨椋池IC and 京都南IC. Nationwide generation is a later build step
using the same builder with regional extracts.
