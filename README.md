# Twin Kick Tracker（双子胎動メモ）

双子の胎動を「最短で記録」し、「計測モードで所要時間を残す」ための超シンプルなWebアプリです。GitHub Pagesで静的配信し、データはFirebase Firestoreに保存します。通知機能はありません。

## 使い方

- ホーム: 左右の大きいボタンで即記録、中央の「どっちかわからない」も記録できます。
- 計測: 目標回数に達するまでの所要時間を保存します。
- 集計: 今日の所要時間、直近7回の平均、最短・最長を表示します。
- 設定: 左右の名前変更、家族コードと招待リンクの表示ができます。

## Firebase セットアップ手順

1. Firebaseプロジェクトを作成
2. Authentication で Anonymous（匿名認証）を有効化
3. Firestore を有効化
4. Webアプリを追加して Firebase config を取得
5. `firebase.js` の `firebaseConfig` を取得した値に置き換え
6. `firestore.rules` を適用

本番ではルール強化を推奨します（このリポジトリのルールは最小構成です）。

## GitHub Pages 公開手順

1. このリポジトリをGitHubにpush
2. Settings → Pages → Branch を `main` / `/ (root)` に設定
3. 発行されたURLにアクセス

## ローカル確認

`index.html` をブラウザで直接開くか、Live Serverなどで起動してください。

## ファイル構成

```
/
  index.html
  styles.css
  app.js
  firebase.js
  store.js
  ui.js
  charts.js
  firestore.rules
  README.md
```

