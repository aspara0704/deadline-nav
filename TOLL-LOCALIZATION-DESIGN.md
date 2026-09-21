# v0.8 料金ローカル化 設計メモ

## 目的

v0.7.5 までで、IC探索はローカル化し、走行中の軽量更新では Route Matrix を 0 にできた。
次の課題は高速料金である。

目標は、Deadline Navi の候補比較に必要な料金を可能な限りローカルで得て、
Google TOLLS / NAVITIME Route を「必須依存」から外すこと。

## 調査結果

### 1. NEXCO の基本料金は式で計算できる

NEXCO の高速自動車国道の普通車・対距離制区間は、概ね次の構造である。

- 利用1回あたり固定額: 150円
- 普通区間: 24.6円/km
- 大都市近郊区間: 29.52円/km
- 一部の特別区間は別料率
- 消費税 10%
- 原則10円単位で端数処理
- 100km超～200km部分は25%逓減、200km超部分は30%逓減
- 1万円超では100円未満切捨て等の端数処理

公式根拠:
- NEXCO中日本 FAQ「料金の計算方法を教えてください」
  https://highwaypost.c-nexco.co.jp/faq/toll/findout/23.html
- NEXCO東日本「高速自動車国道料金の計算式」
  https://www.driveplaza.com/assets/pdf/etc/dis/etc_dis_kanetsu/kanetsu_feecalculation.pdf

### 2. 全国を1本の式だけで完全再現することはできない

例:
- NEXCO内でも大都市近郊・特別区間・一般有料道路が混在する。
- 入口出口間に複数経路がある場合、最短経路の2倍以内なら最安料金を採る規則がある。
- 阪神高速は営業距離ベースで、普通車には下限・上限があり、端末区間等に例外がある。
- 首都高速・本四高速にも独自制度がある。
- 深夜・休日・ETC2.0・地域限定等の割引は日時・区間・車載器条件に依存し、制度改定もある。

公式根拠:
- NEXCO中日本 FAQ「複数経路」
  https://highwaypost.c-nexco.co.jp/faq/toll/findout/24.html
- 阪神高速「通行料金」
  https://www.hanshin-exp.co.jp/drivers/ryoukin/ryoukin/list/
- 国土交通省「高速道路利用案内」
  https://www.mlit.go.jp/road/yuryo/

### 3. ローカル道路グラフの土台は既存ライセンスで用意できる

現在利用している HighwayOrderedDS には、IC/JCTの順序付き地点データだけでなく
`highway_path.geojson`（路線区間の位置・所属路線・順序）もある。
データセットは CC BY-SA 3.0。

https://github.com/yH3PO4/HighwayOrderedDS

これは「IC間の距離・接続関係」の土台として使える。
ただし README 自身が完全性を △ としており、料金制度上の接続・方向・会社境界・特例を
そのまま完全に表現するものではない。

### 4. 全国ICペア表は容量だけなら不可能ではない

現行 2,085 IC の有向組合せ（同一ICを除く）は約435万組。
料金1件を32bit整数だけで持てば約17MB、5車種でも約87MB（圧縮前）のオーダー。

問題は容量より、
- 元データの入手・再配布条件
- 制度改定時の全表更新
- 時間帯割引等の組合せ爆発
- どの経路の料金かという意味付け
である。

現時点の調査では、全国全ICペアを機械可読・再配布可能な形で一括提供する公式オープンデータは確認できていない。
したがって公式Web料金表のスクレイピング結果を、そのまま同梱する実装には進まない。

## 推奨アーキテクチャ: ハイブリッド

巨大な全国ペア表一本にせず、3層に分ける。

### Layer A: ローカル exact override

特殊道路・均一区間・都市高速など、式だけでは安全に出せない区間を
出典・有効期間付きの小さなローカル表として保持する。

例:
- operator
- from / to
- vehicle
- payment
- yen
- effective_from / effective_to
- source_url
- source_note
- redistribution_review

ここでは「出典が明確で、同梱可能性を確認したデータ」だけを入れる。

### Layer B: ローカル formula engine

NEXCOの標準的な対距離料金など、公開された料金規則をコードとして表現する。

入力:
- 道路区間ごとの距離
- 料率区分
- 車種
- ETC条件
- 日時

出力:
- 金額
- exact / estimate
- 適用した規則
- 未対応例外の有無

最初は普通車・ETC・通常料金（時間帯割引なし）に限定する。

### Layer C: 外部 fallback

ローカル計算で exact を出せない場合だけ、
現在の Google TOLLS / NAVITIME Route を任意の補助として使う。

優先順位:
1. local exact
2. local formula estimate
3. Google TOLLS
4. NAVITIME
5. 料金不明

## 重要: 「料金最小」の選定ルール

estimate と exact を混在させて、単純に最安値を選ぶのは危険。

候補には必ず次を持たせる。

- `yen`
- `quality`: exact / estimate / unknown
- `source`: local-table / local-formula / google / navitime
- `rulesetVersion`
- `effectiveAt`
- `warnings[]`

初期実装では、
- exact同士なら料金比較してよい
- estimate同士なら料金差が十分大きい場合のみ比較に使う
- exact と estimate が混在する場合は「到着条件を優先した暫定候補」に留める
- unknown を0円扱いしない

という保守的な扱いにする。

## 段階案

### v0.8.0 — エンジン契約とNEXCO基本式
- 実アプリの選定ロジックにはまだ接続しない。
- 普通車・ETC・通常料金のみ。
- NEXCO標準対距離制の純粋関数を実装。
- synthetic/公式式ベースの自動テスト。
- 料金結果の quality/source/warnings 契約を確定。

### v0.8.1 — 道路グラフ生成
- HighwayOrderedDS の highway_point / highway_path からローカル道路グラフを生成。
- IC/JCT接続、方向、区間距離を検証。
- 料金区分が不明な区間は unknown とし、推測しない。

### v0.8.2 — 料金区分・例外データ
- NEXCO普通区間 / 大都市近郊 / 特別区間を出典付きで付与。
- 阪神高速・首都高・本四等は exact override または別ルールとして追加。
- 再配布条件が不明な表は同梱しない。

### v0.8.3 — アプリ統合
- priceFinalists の provider chain に local toll provider を追加。
- local exact / estimate をUIに明示。
- Google/NAVITIMEへの料金問い合わせ回数を診断表示。

### v0.8.4 — 割引
- 深夜・休日等は制度別に追加。
- 適用除外日や制度改定を ruleset version と有効期間で管理。
- 平日朝夕割引のような事後還元・登録条件依存は別扱いにする。

## 現時点での判断が必要な点

v0.8 系のプロダクト要件として、どこまでを「料金」と呼ぶかを先に決める必要がある。

A. **通常ETC料金をローカルで出せればよい**
   - 実装が最も安定。
   - 時間帯割引は後で追加。
   - Deadline Navi の「候補間の相対比較」にはまず十分。

B. **実際の請求額に近い割引後料金まで最初から必要**
   - 深夜・休日・除外日・ETC2.0・登録型割引・都市高速特例まで必要。
   - データ更新と検証負荷が大きく、v0.8.0としては範囲が広すぎる。

推奨は A から始めること。
