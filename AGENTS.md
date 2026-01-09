# AGENTS.md — Twin Kick Tracker（双子胎動メモ / GitHub Pages + Firebase）

このリポジトリは、双子の胎動を「最短で記録」し、「計測モードで所要時間を残す」ための、超シンプルなWebアプリです。  
ホスティングは GitHub Pages。データは Firebase（Firestore）で管理します。通知機能は **一切なし**。

---

## 目的（このアプリがやること）

- 起動直後に、左右の大きいボタンで胎動を1タップ記録できる
- 左ボタンは「いのちゃん」、右ボタンは「ふーちゃん」（名前は設定で変更可・夫婦で共有）
- どっちかわからない場合は「どっちかわからない」ボタンで記録
- 家族コードを発行し、夫婦が同じデータを見られる（夫が作成→妻が招待リンクで参加）
- 計測モード（カウント用）：10回などのカウント達成までの所要時間を記録
- 集計表示：**今日の所要時間 / 直近7回の平均 / 最短・最長**
- 表示の切り替え：いのちゃん／ふーちゃん（どっちかわからないは「両方に含める」＋色を変える）
- 通知・リマインド・プッシュ・バックグラウンド処理は **作らない**

---

## 技術方針（必須）

- GitHub Pages で静的配信（ビルド不要）
- HTML/CSS/JS（バニラ）で実装。可能ならES Modulesで整理してOK
- Firebase:
  - Firebase Auth: **匿名認証（Anonymous）**
  - Firestore: データ保存・共有
- 外部ライブラリは極力使わない（グラフはCanvas/SVGで小さく自作）
- 端末側には `localStorage` で「参加中の家族ID」など最低限だけ保存

---

## 画面要件（必須）

### 1) 初期画面（ホーム）

- 画面左右に大きなボタンを2つ配置
  - 左：babyLeftName（初期「いのちゃん」）
  - 右：babyRightName（初期「ふーちゃん」）
- 中央 or 下部に「どっちかわからない」ボタン
- 起動直後に即タップできること（余計な導線なし）
- タップしたら即 Firestore にイベントを1件追加（成功の軽いフィードバックはOK：小さなトーストなど）

### 2) 計測モード

- 「どちらの子で計測するか」を選べる（左/右/不明）
- 目標回数（デフォルト10回）までの所要時間を計測して保存
- 記録ボタンはホームと同じく大きく、押しやすい
- 計測中に表示する情報（最低限）
  - 経過時間
  - 現在カウント（例：3/10）
  - リセット/中止（誤操作対策に確認ダイアログは可）
- 目標回数に到達したら自動で終了し、セッションを保存

### 3) 集計（グラフ/数値）

- いのちゃん／ふーちゃん切り替え（トグル/タブ）
- 表示内容
  - 今日の所要時間（今日の“最新”セッションでOK）
  - 直近7回の平均
  - 最短・最長（全期間 or 過去90日。実装が簡単な方で良いが、どちらかに統一）
- 「どっちかわからない」の扱い
  - 集計では **左右どちらを見ても含める**
  - 表示上は色を変えて差別化（例：不明は薄い色 / 斜線 / 点線）
- グラフは豪華でなくて良い
  - 直近7回の所要時間を、小さな棒グラフかスパークラインで表示

### 4) 設定

- 左右の名前を変更できる（家族内で共有される）
- 「家族コード（表示用）」と「招待リンク（参加用）」を表示
- 「招待リンクから参加」導線
  - URLパラメータ `?family=...&token=...` を受け取って自動参加できる
- 「この端末を家族から外す」＝ローカルの家族IDをクリア（データ削除はしない）

---

## 共有（家族コード / 招待リンク）の要件（必須）

### 方針

- 夫が「家族を作成」すると
  - `familyId`（Firestore doc id）
  - `familyCode`（短い表示用コード：例 6桁英数字）
  - `joinToken`（長い参加用トークン：32文字程度）
    を発行して保存する。
- 妻は「招待リンク」で参加する（リンクに `familyId` と `joinToken` が入る）

### 参加フロー

- アプリ起動 → 匿名ログイン → URLに `family` と `token` があれば参加処理
- `families/{familyId}/members/{uid}` を作成（joinTokenも一緒に保存してよい）
- 参加後は `users/{uid}` に `familyId` を保存し、以後その家族のデータを購読

---

## Firestore データ設計（提案 / 必須で採用）

### families/{familyId}

```json
{
  "createdAt": 0,
  "updatedAt": 0,
  "familyCode": "A1B2C3",
  "joinToken": "random-long-token",
  "babyNames": { "left": "いのちゃん", "right": "ふーちゃん" }
}
```

### families/{familyId}/members/{uid}

```json
{
  "joinedAt": 0,
  "role": "member"
}
```

### families/{familyId}/events/{eventId}  // ワンタップ胎動

```json
{
  "ts": 0,
  "baby": "L" | "R" | "U",
  "createdBy": "uid"
}
```

### families/{familyId}/sessions/{sessionId}  // 計測モード

```json
{
  "startedAt": 0,
  "endedAt": 0,
  "durationSec": 0,
  "targetCount": 10,
  "baby": "L" | "R" | "U",
  "createdBy": "uid"
}
```

### users/{uid}

```json
{ "familyId": "..." }
```

---

## Firestore ルール（最小）

* 読み書きは「家族のメンバーだけ」に限定する

* 参加（members追加）は、アプリ側で joinToken を検証してから行う（クライアント実装）
  
  * 厳密なルール検証は難しいので、まずはメンバーシップで制御する

* Codexは `firestore.rules` を用意し、READMEに「本番ではルール強化」を明記

---

## リポジトリ構成（必須）

ビルド不要の構成にする：

```
/
  index.html
  styles.css
  app.js
  firebase.js        # Firebase初期化 + auth + firestore helper
  store.js           # Firestoreアクセス層（CRUD、購読）
  ui.js              # DOM描画/ルーティング
  charts.js          # 小さなグラフ描画（Canvas/SVG）
  README.md
  firestore.rules
```

※ファイル分割は任意。最終的に GitHub Pages で動けばOK。

---

## UI/ルーティング（推奨）

* Hashルーティング（例：`/#home`, `/#measure`, `/#stats`, `/#settings`）
* 初期表示はホーム
* 上部に小さなナビ（ホーム / 計測 / 集計 / 設定）を置いてOK
  ただしホームのボタンを小さくしないこと。

---

## 集計ロジック（必須）

### 表示対象の切り替え

* 表示対象が「L」のとき：`baby === "L" OR baby === "U"`
* 表示対象が「R」のとき：`baby === "R" OR baby === "U"`

### 指標

* 今日の所要時間：
  
  * 今日の日付（ローカル）で `sessions` をフィルタし、最新の `durationSec` を表示

* 直近7回の平均：
  
  * 直近7件の `durationSec` の平均（端数は四捨五入でOK）

* 最短・最長：
  
  * 対象セッションの `durationSec` の min/max（全期間 or 過去90日。どちらかに統一）

### グラフ

* 直近7件の `durationSec` を棒グラフ or 折れ線（Canvas推奨）

* 不明（U）が含まれていることを、凡例か色で分かるようにする
  
  * 例：棒の上に小さな点、またはU由来の部分だけ薄い色
  * ただし複雑にしない（「違う」ことが分かれば良い）

---

## 実装タスク（Codexがやること）

1. 静的Webアプリの骨組み作成（index/styles/app）

2. Firebase初期化（firebase.js）
   
   * Firebase SDK（CDN / module）を使う
   * Anonymous Authを必ず実装

3. 家族作成・参加
   
   * 初回起動：`users/{uid}` に familyId が無ければ「家族を作成」導線を出す
   * 家族作成：family doc 作成 + member doc 作成 + user doc 更新
   * 招待リンク：`?family=FAMILY_ID&token=JOIN_TOKEN`
   * 参加：URLパラメータ検知 → member doc 作成 → user doc 更新

4. ホーム：3ボタンで events を即保存

5. 計測モード：10回到達で sessions 保存

6. 集計：L/R切替 + 数値 + 直近7件グラフ

7. 設定：名前変更（families doc を更新）+ 家族コード/招待リンク表示

8. README：Firebaseセットアップ手順 / GitHub Pages公開手順

---

## Firebase セットアップ手順（READMEに必須で書く）

* Firebaseプロジェクト作成
* Authentication → Anonymous を有効化
* Firestore を有効化
* Webアプリ追加 → Firebase config を取得
* `firebase.js` に config を貼り付ける（GitHub Pagesなのでクライアントに入るのは前提）
* Firestore ルールを適用

---

## 受け入れ条件（必須）

* ローカルで `index.html` を開いて動く（Live Server推奨）
* GitHub Pages に置いても動く（相対パスで壊れない）
* 夫端末で家族作成 → 招待リンクをコピー → 妻端末で開く → 同じデータが見える
* ホームで3ボタンの記録が即反映される
* 計測モードで10回到達→セッション保存→集計に反映される
* 通知機能は存在しない（Service WorkerやPushは作らない）

---

## 重要な制約（守る）

* 「多機能」にしない。通知・リマインド・分析の深掘りはしない。
* 入力はワンタップ中心。迷うUIにしない。
* セキュリティは「メンバーのみ読み書き」まで。完璧を狙って詰まらない。

---

## 追加メモ（実装のコツ）

* タップ記録はオフラインでも後で送る…みたいな実装は不要（やるなら後回し）
* セッションの「今日」は、端末ローカル日付でOK
* `durationSec` は整数秒（msは切り捨てでOK）
* ボタンは片手で押せるサイズ（最低でも高さ80px以上を目安）

---

## コード生成のスタイル

* 分かりやすい変数名（L/R/U）
* UIはシンプル。見た目は落ち着いた配色で、押しやすさ優先
* コメントは「何のための処理か」が分かる短文でOK

```
::contentReference[oaicite:0]{index=0}
```
