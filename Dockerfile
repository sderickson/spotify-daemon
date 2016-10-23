FROM mhart/alpine-node:6
MAINTAINER Scott Erickson <sderickson@gmail.com>

ADD package.json package.json
ADD index.js index.js
ADD dist dist
RUN npm install --production
RUN npm install forever -g

EXPOSE 80
CMD [ "forever", "index.js" ]
