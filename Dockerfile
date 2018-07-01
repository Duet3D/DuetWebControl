FROM openjdk
WORKDIR /dwc

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get update -qqy && apt-get -qqyy install nodejs zip
RUN npm install -g yuicompressor gzip uglify-js
RUN ln -s /usr/bin/yuicompressor /usr/bin/yui-compressor

CMD ["bash", "./build.sh"]
