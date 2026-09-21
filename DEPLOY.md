# GitHub Pages への更新手順（v0.7.0）

GitHub Desktop を使う場合：

1. このフォルダの中身を、Mac上の `deadline-nav` リポジトリへ上書きコピー
2. GitHub Desktop の Changes で変更内容を確認
3. Summary に `Update to v0.7.0 resilient routing` などと入力
4. `Commit to main`
5. `Push origin`
6. 数分後、Safariで `https://aspara0704.github.io/deadline-nav/?v=070` を開く
7. 画面下部が `Deadline Navi v0.7.0` になっていることを確認する

`index.html` から `styles.css?v=070` / `app.js?v=070` を参照するため、旧版のCSS/JavaScriptがブラウザキャッシュに残りにくくしています。

Google APIキーとRapidAPIキーはリポジトリへ書き込まないでください。
