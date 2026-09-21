# GitHub Pages への更新手順（v0.7.2）

1. GitHub Desktop で `deadline-nav` を開き、念のため `Fetch origin` → 必要なら `Pull origin`
2. Finder で **Command + Shift + .** を押して隠しファイルを表示し、このフォルダの中身をローカルの `deadline-nav` に上書きする（`.github` と `tools` も含む）
3. Summary に `Update to v0.7.2 local IC catalog` などと入力
4. `Commit to main`
5. `Push origin`
6. GitHub のリポジトリ画面で **Actions → Build bundled IC catalog** が成功するまで待つ（初回だけ全国IC静的ファイルを生成）
7. Actions が `ic-data.min.json` を自動コミットしたら、GitHub Desktop で `Fetch origin` → `Pull origin`
8. 数分後、Safariで `https://aspara0704.github.io/deadline-nav/?v=072` を開く
9. 画面の版表示が `v0.7.2` であることを確認する
10. 設定 → 開発・診断で全国ICカタログが数百件以上の「アプリ同梱」になっていることを確認する
11. 1回計算し、API使用量の `NAVITIME IC` と `Overpass` が **0** のままか確認する

> Actions が失敗した場合は、その時点で実走テストを増やさず、Actions のエラー画面を確認してください。Matrix最適化はこの版の対象外です。
