FROM node:18
RUN apt-get update \
	&& apt-get install -y wget gnupg \
	&& wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
	&& sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
	&& apt-get update \
	&& apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 \
	--no-install-recommends \
	&& rm -rf /var/lib/apt/lists/* \
	&& groupadd -r pptruser && useradd -rm -g pptruser -G audio,video pptruser
WORKDIR /opt/app
ADD *.json ./
ADD *.cjs ./
RUN npm install --omit=dev
ADD . .
RUN unlink /etc/localtime \
	&& ln -s /usr/share/zoneinfo/Europe/Moscow /etc/localtime
EXPOSE 3000
CMD ["node", "./src/index.js", "-server"]