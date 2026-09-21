# 全国ICカタログの出典とライセンス

`ic-data.min.json` は、HighwayOrderedDS の `N06_Joint_fixed.geojson` から Deadline Navi 用に通常IC・スマートICの名称と座標を抽出して生成します。

- Source: HighwayOrderedDS — https://github.com/yH3PO4/HighwayOrderedDS
- Original data: 国土交通省「国土数値情報（高速道路時系列データ）」
- HighwayOrderedDS dataset license: CC BY-SA 3.0

生成された `ic-data.min.json` は元データの派生データとして、元データのライセンス条件に従って取り扱ってください。


## v0.7.2 修正版の加工

通常IC・スマートICに加え、現役の種別3で名称にICを含むJCT併設ICを抽出します。元データの収録範囲・時点による欠落は残り得ます。

巨椋池ICの名称・代表点座標は次のページから補完しました。入口ランプの座標や方向別のアクセスデータではありません。

- Wikipedia contributors, 巨椋池インターチェンジ
- https://ja.wikipedia.org/w/index.php?title=巨椋池インターチェンジ&oldid=109096812
- CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
- 加工: 名称をIC表記へ短縮し、代表点座標をJSONへ転記。

補完情報と出典は `tools/ic-supplement.json` に保持しています。上記補完を含む配布カタログはCC BY-SA 4.0で提供します。元のHighwayOrderedDS由来部分の出典とCC BY-SA 3.0表示も保持します。
