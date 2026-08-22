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

## コマンド

```bash
npm install
npm run test
npm run typecheck
npm run build
```
