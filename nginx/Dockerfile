FROM nginx:latest

# ログディレクトリを作成
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx

# wait-for-itスクリプトを追加
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh
