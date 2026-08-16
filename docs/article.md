# TypeScriptのPATCH DTOで未指定の項目が消える理由：`exactOptionalPropertyTypes`を最小再現から理解する

## この記事で扱う問題

バックエンドの部分更新では、クライアントがフィールドを送らないことと、フィールドを明示的に消したいことは異なる操作です。しかし、`nickname?: string` を単に「`string | undefined`」と考えると、この区別が崩れます。本教材では、空のフォーム入力が更新DTOの `{ nickname: undefined }` へ変換され、既存のニックネームが意図せずクリアされる問題を扱います。

前提はNode.js 22系、TypeScript 5.7.2、Vitest 2.1.8です。結論は、optional propertyは「プロパティがない」ことを表せますが、通常設定では明示的な`undefined`も許可されます。プロパティの存在自体に意味があるPATCH DTOでは、`exactOptionalPropertyTypes`と、値を省略する変換を組み合わせる必要があります。[1]

再現コード、失敗・修正のGit履歴、実行証拠は[typescript-backend-exact-optional-patch-lab](https://github.com/tonbiattack/typescript-backend-exact-optional-patch-lab)にあります。

## 既存題材との差分

既存のTypeScript記事には、構造的部分型による`UserId`と`OrderId`の混同を扱うものがあります。今回の失敗条件はIDの意味ではなく、PATCH入力の**プロパティが存在するか**です。修正もブランド型ではなく、optional propertyの正確な定義とDTO変換の意味論にあります。

## 期待していた挙動と実際の挙動

プロフィール更新APIでは、`nickname`がリクエストに含まれないなら既存値を変えません。`nickname`を持つプロパティが含まれる場合だけ、更新またはクリアを行います。

| 入力 | 期待する処理 | 修正前の処理 |
|---|---|---|
| `{}` | `NO_CHANGE` | `CLEARED` |
| `{ nickname: "tonbi" }` | `SET:tonbi` | `SET:tonbi` |
| `{ nickname: undefined }` | DTOとして作らせない | 作成可能 |

修正前の変換は次の通りです。

```ts
export interface ProfilePatch {
  nickname?: string;
}

export function mapFormToPatch(form: { nickname?: string }): ProfilePatch {
  return { nickname: form.nickname };
}
```

ここで`mapFormToPatch({})`は空オブジェクトではなく、`nickname`というキーを持つ`{ nickname: undefined }`を返します。更新側が`"nickname" in patch`で判断すると、未指定を「クリア要求」と誤認します。

```bash
git checkout 9ee0495
pnpm install
pnpm run repro
```

実行結果は次の通りです。

```text
Expected: "NO_CHANGE"
Received: "CLEARED"
```

## 調査：何を観測し、どの仮説を除外したか

`undefined`とプロパティの不在は、JavaScriptの実行時に同じではありません。TypeScript公式ドキュメントも、`"colorThemeOverride" in settings`の結果は、プロパティが`undefined`を持つ場合とプロパティが存在しない場合で異なると説明しています。[1]

| 仮説 | 予測 | 最小実験 | 結果 | 判定 |
|---|---|---|---|---|
| A：更新関数の分岐が誤っている | 空オブジェクトでも`CLEARED`になる | `applyPatch({})`を実行 | `NO_CHANGE` | 棄却 |
| B：DTO変換が不要なキーを作る | `mapFormToPatch({})`がキーを持つ | `"nickname" in patch`を確認 | `true` | 採用 |

> `exactOptionalPropertyTypes`を有効にすると、optional propertyは定義通りに扱われ、`undefined`が自動的には追加されません。
>
> — TypeScript TSConfig Reference [1]

## 修正：なぜこの変更で直るのか

変換時に値が未指定ならプロパティそのものを出力しません。

```ts
export function mapFormToPatch(form: { nickname?: string }): ProfilePatch {
  return form.nickname === undefined ? {} : { nickname: form.nickname };
}
```

さらに`tsconfig.json`で`exactOptionalPropertyTypes`を有効にします。

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true
  }
}
```

これにより、`ProfilePatch`が`nickname`を持つなら値は`string`である、という契約を型チェックで表せます。空の入力は`{}`、更新入力は`{ nickname: "tonbi" }`となり、プロパティの存在確認と更新意味論が一致します。

なお、明示的なnullクリアをAPI仕様として持たせたい場合は、`nickname?: string | null`のように`null`を意図的に型へ含め、`undefined`との責務を分けるべきです。

## 回帰テスト

修正後は、元の失敗ケースとニックネーム設定の対照ケースを残します。`test/type-contracts.ts`では、以下がコンパイル時に失敗することも確認します。

```ts
// @ts-expect-error
const invalidPatch: ProfilePatch = { nickname: undefined };
```

```bash
git checkout cd17554
pnpm run typecheck
pnpm test
```

```text
$ tsc --noEmit
Test Files  1 passed (1)
Tests       2 passed (2)
```

## まとめ

第一に、optional propertyの不在と`undefined`は、プロパティの存在を見るコードでは異なります。第二に、PATCH DTOの変換では、未指定のフィールドを`undefined`付きプロパティへ機械的に展開しません。第三に、プロパティの存在を更新契約に使うなら`exactOptionalPropertyTypes`を有効にし、`null`による明示的なクリアとは別の意味として設計します。

## 参考資料

[1]: https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html "TypeScript TSConfig Reference: exactOptionalPropertyTypes"
[2]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html "TypeScript 4.4 Release Notes"
