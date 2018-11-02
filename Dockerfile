FROM golang:1.8-alpine3.6

LABEL maintainer="villanub@gmail.com"

ARG vcs_ref=unspecified
ARG build_date=unspecified

# Metadata
LABEL org.label-schema.vcs-ref="${vcs_ref}" \
      org.label-schema.vcs-url="https://github.com/villanub/croc-hunter" \
      org.label-schema.build-date="${build_date}" \
      org.label-schema.docker.dockerfile="/Dockerfile"

COPY . /go/src/github.com/villanub/croc-hunter
COPY static/ static/

ENV GIT_SHA=$vcs_ref
ENV GOPATH /go
RUN cd $GOPATH/src/github.com/villanub/croc-hunter && go install -v .

CMD ["croc-hunter"]

EXPOSE 8080