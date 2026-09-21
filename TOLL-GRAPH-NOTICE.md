# Toll road graph prototype notice

This prototype graph is derived from HighwayOrderedDS at revision
`523b06097594e58d2004928b032951f69bd45398`.

Source: https://github.com/yH3PO4/HighwayOrderedDS

The source dataset combines processed MLIT National Land Numerical Information
and Wikipedia-derived ordering information and is distributed as CC BY-SA 3.0.
See the upstream README for attribution details.

The generated graph deliberately labels every road edge tariff as `unknown`.
It is **not** a fare table and must not be used to calculate a user-visible
price until rate classes, operator boundaries, direction restrictions and
exceptions are reviewed.

Junction transfers are inferred only for identically named JCT records within
1 km across different road names. Ambiguous connections are intentionally left
unresolved rather than guessed.
