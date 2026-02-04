# FlowMatic

## プロジェクト構造

![Project Structure](./frontend/public/images/project_structure.png)

## セットアップ手順

### 1. リポジトリをクローン

```bash
git clone https://github.com/KaungSetLinn/FlowMatic.git
```

### 2. 仮想環境の作成（プロジェクトルート）

仮想環境の作成と有効化

```bash
cd C:\FlowMatic
python -m venv venv

# Mac/Linux
source venv/bin/activate
# Windows
venv\Scripts\activate
```

### 3. バックエンドセットアップ

```bash
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt

copy .env.example .env
python manage.py migrate

daphne backend.asgi:application
```

### 4. フロントエンドセットアップ

新規コマンドプロンプトを開いて:

```bash
cd frontend
npm install

copy .env.example .env

npm run dev
```

## コマンドリスト

### バックエンド（backend/）

| コマンド | 説明 |
|---------|------|
| `pip install -r requirements.txt` | 本番用パッケージをインストール |
| `pip install -r requirements-dev.txt` | 開発用パッケージをインストール |
| `python manage.py migrate` | マイグレーションを実行 |
| `python manage.py makemigrations` | マイグレーションファイルを作成 |
| `python manage.py createsuperuser` | 管理者ユーザーを作成 |
| `python manage.py test` | テストを実行 |
| `daphne backend.asgi:application` | ASGIサーバーを起動（WebSocket対応） |
| `python -m ruff check .` | リントチェック |
| `python -m ruff check . --fix` | リントエラーを自動修正 |
| `python -m ruff format .` | コードをフォーマット |

### フロントエンド（frontend/）

| コマンド | 説明 |
|---------|------|
| `npm install` | 依存パッケージをインストール |
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 本番用ビルド |
| `npm run preview` | ビルド結果をプレビュー |
| `npm run lint` | ESLintでリントチェック |
| `npm run typecheck` | TypeScript型チェック |
| `npm run format` | Prettierでコードをフォーマット |
| `npm run format:check` | フォーマットチェック（修正なし） |
