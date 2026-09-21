# Deadline Navi v0.7.2

「間に合うなら、まだ下道で。」

v0.7.2 は、v0.7.1 から **IC候補データのローカル化だけ**を変更した版です。Route Matrix の削減、探索アルゴリズムの差分化、料金ロジックの変更はこの版では行っていません。

## v0.7.2 の変更点

- 全国ICカタログを `ic-data.min.json` として Deadline Navi と同じ GitHub Pages から配信します。
- 走行中のIC発見では **Overpass を呼びません**。
- 走行中のIC発見では **NAVITIME `/ic` を呼びません**。
- NAVITIME は従来どおり、料金取得の補助にだけ残しています。
- v0.7.1 で端末に保存済みの全国ICカタログがある場合は、一度だけ移行用のローカルデータとして利用できます。
- API使用量診断では通常、`NAVITIME IC: 0 req`、`Overpass: 0 req` になることが v0.7.2 の合格条件です。

## 全国ICカタログの生成

配布ZIPには、GitHub Actions用の `.github/workflows/build-ic-data.yml` と `tools/build-ic-data.py` が入っています。

`main` に v0.7.2 を Push すると、GitHub Actions が既存の v0.7.1 と同じデータソース `N06_Joint_fixed.geojson` を取得し、現役の通常IC・スマートICだけを抽出して `ic-data.min.json` を生成し、リポジトリへコミットします。

これにより、**アプリ実行中に外部のIC検索サービスへ問い合わせる必要がなくなります**。`ic-data.min.json` の読み込みは Deadline Navi 自身の GitHub Pages から行う静的ファイル読み込みで、Google/NAVITIME/Overpass API呼び出しではありません。

初回Push直後だけは生成処理に少し時間がかかります。Actionsの `Build bundled IC catalog` が成功し、`ic-data.min.json` が数百件以上になってから全国版として利用できます。すでにv0.7.1で全国カタログを取得済みの端末では、そのキャッシュを移行して先に動作できます。

## データ出典

全国ICカタログは HighwayOrderedDS の `N06_Joint_fixed.geojson` を、v0.7.1 と同じ条件（現役 `N06_014=9999`、通常IC/スマートIC `N06_019=1/2`）で抽出したものです。

HighwayOrderedDS は国土交通省「国土数値情報（高速道路時系列データ）」等を加工したデータセットで、データセットは CC BY-SA 3.0 として公開されています。出典・ライセンス表示はアプリにも残しています。

## この版ではまだ直していないこと

v0.7.1 の実測で確認された `Route Matrix Pro: 480 element` の削減は **v0.7.3以降**で行います。v0.7.2では、原因の切り分けを容易にするため Matrix 候補評価ロジックには極力触れていません。

## ファイル

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `version.json`
- `ic-data.min.json`
- `tools/build-ic-data.py`
- `.github/workflows/build-ic-data.yml`
- 各種アイコン

運転中の画面操作は避け、安全な場所で設定してください。
