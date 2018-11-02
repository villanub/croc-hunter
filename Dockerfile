FROM golang:1.8-alpine3.6

ARG VERSION
ARG VCS_URL
ARG VCS_REF
ARG BUILD_DATE
ARG BUILD_VERSION

# Metadata
LABEL org.label-schema.vcs-url="https://github.com/villanub/croc-hunter" \
      org.label-schema.docker.dockerfile="/Dockerfile" \
      org.label-schema.version=$BUILD_VERSION \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.docker.schema-version="1.0" \
      maintainer="villanub@gmail.com"

COPY . /go/src/github.com/villanub/croc-hunter
COPY static/ static/

ENV GIT_SHA $VCS_REF
ENV GOPATH /go
RUN cd $GOPATH/src/github.com/villanub/croc-hunter && go install -v .

CMD ["croc-hunter"]

EXPOSE 8080