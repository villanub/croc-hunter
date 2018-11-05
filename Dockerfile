FROM golang:1.8.5-jessie as builder
# install xz
RUN apt-get update && apt-get install -y \
    xz-utils \
&& rm -rf /var/lib/apt/lists/*
# install UPX
ADD https://github.com/upx/upx/releases/download/v3.94/upx-3.94-amd64_linux.tar.xz /usr/local
RUN xz -d -c /usr/local/upx-3.94-amd64_linux.tar.xz | \
    tar -xOf - upx-3.94-amd64_linux/upx > /bin/upx && \
    chmod a+x /bin/upx
# install glide
RUN go get github.com/Masterminds/glide
# setup the working directory
WORKDIR /go/src/app
ADD glide.yaml glide.yaml
ADD glide.lock glide.lock
# install dependencies
RUN glide install
# add source code
ADD src src
# build the source
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main src/croc-hunter.go
# strip and compress the binary
RUN strip --strip-unneeded main
RUN upx main

# use a minimal alpine image
FROM alpine:3.7
# add ca-certificates in case you need them
RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*
# set working directory
WORKDIR /root
# copy the binary from builder
COPY --from=builder /go/src/app/main .
# run the binary
CMD ["./main"]


#FROM golang

#ARG VERSION
#ARG VCS_URL
#ARG VCS_REF
#ARG BUILD_DATE
#ARG BUILD_VERSION
#ARG BUILD_SOURCEVERSION

# Metadata
#LABEL org.label-schema.vcs-url="https://github.com/villanub/croc-hunter" \
#      org.label-schema.docker.dockerfile="/Dockerfile" \
#      org.label-schema.version=$BUILD_VERSION \
#      org.label-schema.vcs-ref=$VCS_REF \
#      org.label-schema.build-date=$BUILD_DATE \
#      org.label-schema.docker.schema-version="1.0" \
#      maintainer="villanub@gmail.com"

#COPY . /go/src/github.com/villanub/croc-hunter
#COPY static/ static/

#ENV GIT_SHA $VCS_REF
#ENV GOPATH /go
#RUN cd $GOPATH/src/github.com/villanub/croc-hunter && go install -v .

#CMD ["croc-hunter"]

#EXPOSE 8080