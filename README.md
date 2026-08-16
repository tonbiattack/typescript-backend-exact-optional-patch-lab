# TypeScript Backend Exact Optional PATCH Lab

バックエンドのPATCH DTOで、**プロパティの省略**と **`undefined` を値として持つプロパティ**を混同すると、未変更のはずの値をクリアしてしまう問題を再現する教材です。`exactOptionalPropertyTypes` が表す契約を、失敗テストから回帰確認まで追えます。

## 前提環境

Node.js 22系、pnpm 11系、TypeScript 5.7.2、Vitest 2.1.8を利用します。依存関係は `pnpm-lock.yaml` に固定しています。

## 再現

```bash
pnpm install
git checkout 9ee0495
pnpm run repro
```

期待値は `NO_CHANGE` ですが、修正前はフォーム入力を `{ nickname: undefined }` に変換するため、プロパティの存在を確認する更新処理が `CLEARED` を返します。型チェックは成功します。

## 修正後の検証

```bash
git checkout cd17554
pnpm run typecheck
pnpm test
```

修正では、未指定の`nickname`を空オブジェクトへ変換し、`exactOptionalPropertyTypes`を有効にします。`test/type-contracts.ts`は、`{ nickname: undefined }`が`ProfilePatch`へ代入できないことをコンパイル時に確認します。

## 構成

| パス | 役割 |
|---|---|
| `src/profile-patch.ts` | PATCH DTO変換と更新意味論 |
| `test/profile-patch.test.ts` | 省略された値がクリアされないことの振る舞いテスト |
| `test/type-contracts.ts` | exact optional propertyの対照ケース |
| `evidence/` | 失敗・修正後の実行結果 |
| `docs/article.md` | 日本語の調査記事 |

## Git履歴

| コミット | 内容 |
|---|---|
| `9ee0495` | 省略を`undefined`付きプロパティへ変換する不具合状態 |
| `cd17554` | 厳密なoptional property契約と最小修正 |

`exactOptionalPropertyTypes`は外部HTTP入力の妥当性を検証するものではありません。実際のAPIでは、JSONのスキーマ検証と合わせて利用してください。
