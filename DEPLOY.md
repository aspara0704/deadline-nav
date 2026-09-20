# GitHub Pages で同行ドライバーへ配布する

## 1. リポジトリを作る

GitHubで `deadline-nav` などの名前のリポジトリを作成し、このフォルダの中身をリポジトリ直下へ置きます。

APIキーはファイルへ書き込まないでください。v0.5は各端末のブラウザ内にキーを保存する設計です。

## 2. GitHub Pages を有効化

Repository → Settings → Pages → Build and deployment で `Deploy from a branch` を選び、`main` / `/(root)` を公開元に指定します。

公開URLの例:

`https://USERNAME.github.io/deadline-nav/`

## 3. Google APIキーを制限

Google CloudのAPIキー設定で Application restrictions を Websites (HTTP referrers) に変更し、公開先を許可します。

例:

`https://USERNAME.github.io/*`

API restrictions は Maps JavaScript API と Routes API のみにします。

## 4. 同行ドライバーのiPhone

1. 公開URLをSafariで開く
2. Google APIキーを入力して保存
3. NAVITIMEのX-RapidAPI-Keyを入力して保存
4. 位置情報を許可
5. 「音声テスト」を押す
6. Safariの共有メニュー → 「ホーム画面に追加」
7. 当日はホーム画面のDeadline Naviから起動し、目的地・到着時刻を設定して「自動監視を開始」

## 5. RapidAPIキーについて

X-RapidAPI-Keyは公開HTML/JavaScriptへ埋め込まないでください。信頼できる同行者の端末にだけ直接入力する運用なら、試験段階では簡単です。

不特定多数に公開する段階では、NAVITIME呼び出しをCloudflare Workers / Vercel Functions等の小さなバックエンドへ移し、RapidAPIキーをサーバー側の環境変数に置く構成へ変更してください。
