# ゲーム時間追加Webアプリ

保護者がM5Stackのゲーム時間を追加するNext.jsアプリです。

## アクセス

- パスコードやログイン操作はありません。
- アプリを開くと、すぐにゲーム時間追加画面を表示します。
- 送信時の確認画面、同一オリジン確認、回数制限は維持します。

## 安全なPreview

- Branch Deployは`APP_ENV=preview`かつ`CURRENT_QUEUE_REAL_SEND=false`で動作します。
- Previewは実機M5Stack・本番送信キュー・本番Supabaseへ接続しません。
- 状態遷移と履歴はテスト端末内でモック表示します。
- Productionは必要なSecretとDBがない場合に失敗して閉じる設計です。

## 現行基盤との互換性

Production用ゲートウェイは既存`/api/transfers`へ`id`、`sendId`、`manual:<requestId>`形式の`sessionId`、`seconds`を送ります。M5Stackのclaim/ACK、端末認証、Wi-Fi、ファームウェアは変更しません。

## 今日の画像

トップ画面は、Google Driveの指定フォルダ直下にある当日分の画像枚数を表示します。

- 日付は`Asia/Tokyo`で判定します。
- ファイル名に`_YYYYMMDD_`を含み、MIME typeが`image/*`のファイルだけを数えます。
- ブラウザからDriveへ直接アクセスせず、`/api/today-image-count`がサーバー側でGoogle Drive APIを呼び出します。
- `GOOGLE_DRIVE_API_KEY`はNetlifyのサーバー環境変数に設定し、クライアントへ公開しません。
- `GOOGLE_DRIVE_IMAGE_FOLDER_ID`は対象フォルダIDです。未設定時は現在の提出フォルダを使用します。
- 取得に失敗した場合は画像カードだけ`--枚`になり、既存機能は継続します。

## 管理センター

- ヘッダーの「管理」から`/admin`を開きます。
- パスコード入力画面はありません。
- 現在は覚える君の「1日の問題数」「英語の音声・音読」「教科の出題割合」だけを管理します。
- 漢字覚える君は、Googleシート「学習記録、漢字のみ」の`管理!B2`にある「1日の問題数」だけを管理します。
- 読み取りと保存は`/api/admin/kanji-settings`がサーバー側から覚える君の共通設定APIへ中継します。
- 漢字覚える君の読み取りと保存は`/api/admin/kanji-only-settings`が行い、保存先を`管理!B2`へ固定します。
- 保存に必要な`KANJI_ADMIN_PASSCODE`はNetlifyのサーバー環境変数だけに置き、ブラウザへ返しません。
- Googleシートへの保存に必要なサービスアカウントJSONは`GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON`としてNetlifyのサーバー環境変数だけに置きます。
- Previewでは保存を模擬し、覚える君の本番設定を書き換えません。

## コマンド

```bash
npm install
npm run test
npm run typecheck
npm run build
```
