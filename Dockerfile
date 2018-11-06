FROM golang:1.10-alpine3.7

COPY . /go/src/github.com/villanub/croc-hunter
COPY static/ static/

ENV GOPATH /go
RUN cd $GOPATH/src/github.com/villanub/croc-hunter && go install -v .

CMD ["croc-hunter"]

EXPOSE 8080