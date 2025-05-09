# Node.jsの公式イメージを使用
FROM node:16

# 作業ディレクトリを作成
WORKDIR /usr/src/app

# 必要なパッケージをインストール
COPY package*.json ./
# コンテナ内で依存関係をインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# wait-for-it.sh をダウンロードして実行権限を付与
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

EXPOSE 3001

# アプリケーションを起動 (PostgreSQLが起動するまで待機)
CMD ["bash", "wait-for-it.sh", "postgres:5432", "-t", "120", "--", "node", "app.js"]
