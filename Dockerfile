FROM nginx:alpine

COPY . /usr/share/nginx/html
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
