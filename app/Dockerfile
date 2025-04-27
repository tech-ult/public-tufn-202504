# Node.jsの公式イメージを使用
FROM node:16

# 作業ディレクトリを作成
WORKDIR /usr/src/app

# 必要なパッケージをインストール
COPY package*.json ./
RUN npm install  # コンテナ内で依存関係をインストール

# アプリケーションのソースコードをコピー
COPY . .

# wait-for-it.sh をコピー
COPY ./wait-for-it.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/wait-for-it.sh

EXPOSE 3001

# アプリケーションを起動 (PostgreSQLが起動するまで待機)
CMD ["bash", "wait-for-it.sh", "postgres:5432", "-t", "60", "--", "node", "app.js"]
