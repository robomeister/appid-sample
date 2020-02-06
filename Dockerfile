FROM ibmcom/ibmnode

WORKDIR "/app"

# Update base image
RUN apt-get update \
 && apt-get dist-upgrade -y \
 && apt-get install vim -y \
 && apt-get clean \
 && echo 'Finished updating image'

COPY package.json /app/
RUN cd /app; npm install --production

COPY . /app

ENV NODE_ENV production
ENV PORT 3000

EXPOSE 3000
CMD ["npm", "start"]
