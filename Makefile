default: docker_build

DOCKER_IMAGE ?= quay.io/lachie83/croc-hunter
BUILD_NUMBER ?= $(shell git rev-parse --short HEAD)
VCS_REF ?= $(shell git rev-parse --short HEAD)

.PHONY: docker_build

docker_build:
	@docker build \
	--build-arg VCS_REF=$(VCS_REF) \
	--build-arg BUILD_DATE=$$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
	-t $(DOCKER_IMAGE):$(BUILD_NUMBER) .

.PHONY: docker_push

docker_push:
	docker tag $(DOCKER_IMAGE):$(BUILD_NUMBER) $(DOCKER_IMAGE):latest
	docker push $(DOCKER_IMAGE):$(BUILD_NUMBER)
	docker push $(DOCKER_IMAGE):latest

.PHONY: build

build:
	npm ci

.PHONY: lint

lint:
	npm run lint
