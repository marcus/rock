Server config note port 5050, for the backend use something above 5040. Cert is already installed. 
server {
    server_name beats.opentangle.com;

    location / {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Required for long polling / EventSource / WebSocket fallback
        proxy_buffering off;
        proxy_cache off;
    }


    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/beats.opentangle.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/beats.opentangle.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}

server {
    listen 80;
    server_name beats.opentangle.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}
server {
    if ($host = beats.opentangle.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    server_name beats.opentangle.com;
    listen 80;
    return 404; # managed by Certbot


}

// Example deploy for another project on the same server:
